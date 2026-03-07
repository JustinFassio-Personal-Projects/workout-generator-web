/**
 * Converts LaTeX-style inline math and common commands to Unicode for display.
 */

export interface NormalizeMathSymbolsOptions {
  htmlSafe?: boolean;
}

const LATEX_TO_UNICODE: [string | RegExp, string][] = [
  ['$\\tau$', 'τ'],
  ['$\\theta$', 'θ'],
  ['\\times', '×'],
  ['$r$', 'r'],
  ['$F$', 'F'],
];

export function normalizeMathSymbols(text: string, options?: NormalizeMathSymbolsOptions): string {
  if (!text || typeof text !== 'string') return '';
  const htmlSafe = options?.htmlSafe === true;
  let out = text;
  for (const [pattern, replacement] of LATEX_TO_UNICODE) {
    if (typeof pattern === 'string') out = out.split(pattern).join(replacement);
    else out = out.replace(pattern, replacement);
  }
  if (!htmlSafe) out = out.replace(/\$([^$]+)\$/g, '$1');
  return out;
}
