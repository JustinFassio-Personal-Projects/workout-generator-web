/**
 * Sanitizes HTML content for deep research before persistence.
 * Mitigates stored XSS when rendered via set:html on the public site.
 * Allows typical article markup (headings, lists, links, code blocks); strips script, iframe, etc.
 */

import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'ul', 'ol', 'li', 'br',
  'strong', 'em', 'b', 'i', 'u', 's',
  'a', 'blockquote', 'pre', 'code', 'span', 'div', 'img',
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel', 'class'],
  img: ['src', 'alt', 'title', 'width', 'height', 'class'],
  span: ['class'],
  div: ['class'],
  p: ['class'],
  code: ['class'],
  pre: ['class'],
};

export function sanitizeDeepResearchHtml(html: string): string {
  if (typeof html !== 'string') return '';
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
  });
}
