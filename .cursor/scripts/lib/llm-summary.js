#!/usr/bin/env node
/**
 * Session summary helper.
 *
 * Transcript-derived LLM summaries are disabled in this repository. The
 * upstream helper sent conversation text to `claude -p`. Local transcript
 * parsing helpers remain for callers that only read the file.
 */

'use strict';

const fs = require('fs');

const MAX_TRANSCRIPT_CHARS = 7000;
const MAX_TURNS = 25;
// Harness notice shown after a safety-classifier stop; it is not a user ask (#3867).
const CLASSIFIER_NOTICE = /^Your response above was stopped by a safety classifier\s*[—–-]\s*this is not a tool or API error\.?(?:\s+The rest of it was withheld, and tool calls in it that had not finished did not run\.\s+Do not produce that content again, even reworded\.)?$/i;

function getLLMModel() {
  return process.env.ECC_LLM_SUMMARY_MODEL || 'haiku';
}

function getContextThreshold() {
  const raw = parseInt(process.env.ECC_LLM_SUMMARY_CONTEXT_THRESHOLD || '20', 10);
  return Number.isFinite(raw) && raw > 0 && raw <= 100 ? raw : 20;
}

/**
 * True when a user-turn text is the harness notice left after a
 * safety-classifier stop. Anchored to the whole message so user text that
 * quotes or follows the notice is kept. Whitespace runs (including
 * newlines) are collapsed first so every caller matches the same text.
 */
function isClassifierNotice(text) {
  return CLASSIFIER_NOTICE.test(String(text).replace(/\s+/g, ' ').trim());
}

/**
 * Extract the last MAX_TURNS user+assistant turns from a JSONL transcript.
 * Returns null when the transcript is missing or has no parseable turns.
 */
function extractConversationText(transcriptPath) {
  let content;
  try {
    content = fs.readFileSync(transcriptPath, 'utf8');
  } catch {
    return null;
  }

  const lines = content.split('\n').filter(Boolean);
  let turns = [];

  // Older records cannot change a summary once its most recent turns are full.
  for (let index = lines.length - 1; index >= 0 && turns.length < MAX_TURNS; index--) {
    let entryTurns = [];
    try {
      const entry = JSON.parse(lines[index]);
      const isUser = entry.type === 'user' || entry.message?.role === 'user';
      const isAssistant = entry.type === 'assistant';

      if (isUser) {
        const rawContent = entry.message?.content ?? entry.content;
        const text =
          typeof rawContent === 'string'
            ? rawContent
            : Array.isArray(rawContent)
              ? rawContent
                  .filter(c => c?.type === 'text')
                  .map(c => c.text)
                  .join(' ')
              : '';
        const cleaned = text.replace(/\n+/g, ' ').trim();
        if (cleaned && !isClassifierNotice(cleaned)) {
          entryTurns = [...entryTurns, { role: 'User', text: cleaned.slice(0, 400) }];
        }
      }

      if (isAssistant && Array.isArray(entry.message?.content)) {
        const textParts = entry.message.content
          .filter(b => b?.type === 'text')
          .map(b => b.text)
          .join(' ')
          .replace(/\n+/g, ' ')
          .trim();
        if (textParts) {
          entryTurns = [...entryTurns, { role: 'Claude', text: textParts.slice(0, 600) }];
        }
      }
    } catch {
      // Skip unparseable lines
    }
    turns = [...entryTurns, ...turns];
  }

  if (turns.length === 0) return null;

  const recent = turns.slice(-MAX_TURNS);
  const formatted = recent.map(t => `**${t.role}:** ${t.text}`).join('\n\n');
  return formatted.length > MAX_TRANSCRIPT_CHARS ? '...(前略)\n\n' + formatted.slice(-MAX_TRANSCRIPT_CHARS) : formatted;
}

/**
 * Read the remaining context budget percentage for summary scheduling.
 * Use the earlier of confirmed capacity and a native compaction budget.
 * With inferred capacity, only an explicit native budget can supply a safe
 * scheduling boundary; otherwise return null rather than certify a guess.
 */
function getContextRemainingPct(transcriptPath) {
  try {
    const { readLatestContextTokens, resolveContextWindow } = require('./transcript-context');
    const usage = readLatestContextTokens(transcriptPath);
    if (!usage) return null;
    const resolution = resolveContextWindow(usage.tokens, usage.model);
    const nativeBudget = Number(process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW || '');
    const hasNativeBudget = Number.isSafeInteger(nativeBudget) && nativeBudget > 0;
    const budget = resolution.inferred
      ? (hasNativeBudget ? nativeBudget : 0)
      : (hasNativeBudget ? Math.min(resolution.windowTokens, nativeBudget) : resolution.windowTokens);
    if (!Number.isSafeInteger(budget) || budget <= 0) return null;
    return Math.round((1 - usage.tokens / budget) * 100);
  } catch {
    return null;
  }
}

/**
 * Generate a session summary using `claude -p`.
 * Returns the summary string, or null on failure or when recursion guard is active.
 */
function generateSessionSummary(_transcriptPath, { onSkip = () => {} } = {}) {
  // This repository disables transcript-derived LLM summaries. The upstream
  // helper shells out to `claude -p`, which sends conversation text off-machine.
  onSkip('off-machine LLM summary disabled');
  return null;
}

module.exports = { generateSessionSummary, extractConversationText, isClassifierNotice, getContextRemainingPct, getContextThreshold, getLLMModel };
