/**
 * Sanitizes paragraph/simple HTML for exercise cues and biomechanics content.
 */

import { normalizeMathSymbols } from '@/lib/normalize-math-symbols';
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'span'];

export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeParagraphHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['class', 'style'],
  });
}

function stripWrappingQuotes(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/^'+/, '')
    .replace(/'+$/, '')
    .replace(/'; '/g, '; ')
    .replace(/'. '/g, '. ')
    .replace(/ ' /g, ' ');
}

function markdownToHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let out = text.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return out;
}

export function formatParagraphContent(text: string): string {
  const stripped = stripWrappingQuotes(text);
  const normalized = normalizeMathSymbols(stripped);
  const withBreaks = normalized.replace(/\n/g, '<br>');
  return sanitizeParagraphHtml(markdownToHtml(withBreaks));
}
