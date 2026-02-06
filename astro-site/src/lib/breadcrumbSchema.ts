/**
 * Build schema.org BreadcrumbList JSON-LD for Astro pages.
 * Matches Next.js shape: @context, @type, itemListElement with ListItem (position, name, item).
 */
export interface BreadcrumbItem {
  name: string
  url: string
}

export function buildBreadcrumbSchema(
  baseUrl: string,
  items: BreadcrumbItem[]
): { '@context': string; '@type': string; itemListElement: object[] } {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
