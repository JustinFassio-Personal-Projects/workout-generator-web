/**
 * Injects the anatomical muscle diagram image (img tag) into the deep dive document.
 * Server-side; used by deep-dive-html API. Inserts after the first "Muscle Map"
 * heading (h2 or h3), or at the start of body if not found.
 */

export function injectMuscleDiagramImage(
  html: string,
  imageUrl: string | null | undefined
): string {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) return html;
  const trimmed = imageUrl.trim();
  // Only allow http(s) or relative URLs to prevent script injection (e.g. javascript:)
  if (!/^(https?:|\/)/i.test(trimmed)) return html;
  const escaped = trimmed.replace(/"/g, '&quot;');
  const diagramHtml = `<figure class="muscle-engagement-diagram flex flex-col gap-4 my-6" role="img"><img src="${escaped}" alt="Muscles engaged" style="max-width:min(100%,280px);" /></figure>`;

  const muscleMapH2 = /(<h2[^>]*>\s*Muscle\s+Map\s*<\/h2>)/i;
  const muscleMapH3 = /(<h3[^>]*>\s*Muscle\s+Map\s*<\/h3>)/i;
  if (muscleMapH2.test(html)) {
    return html.replace(muscleMapH2, `$1${diagramHtml}`);
  }
  if (muscleMapH3.test(html)) {
    return html.replace(muscleMapH3, `$1${diagramHtml}`);
  }
  const bodyOpen = html.match(/<body[^>]*>/i);
  if (bodyOpen) {
    return html.replace(bodyOpen[0], bodyOpen[0] + diagramHtml);
  }
  return html;
}
