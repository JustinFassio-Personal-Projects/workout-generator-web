import { NextResponse } from 'next/server'
import { getAllPosts } from '@/features/blog/lib/getBlogPosts'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

export async function GET() {
  const posts = await getAllPosts()

  // Generate RSS 2.0 XML
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Workout Generator Blog</title>
    <description>Fitness tips, workout strategies, and AI-powered training advice</description>
    <link>${baseUrl}/blog</link>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <language>en-US</language>
    <managingEditor>contact@aiworkoutgenerator.com (Workout Generator)</managingEditor>
    <webMaster>contact@aiworkoutgenerator.com (Workout Generator)</webMaster>
    <image>
      <url>${baseUrl}/logo.png</url>
      <title>Workout Generator Blog</title>
      <link>${baseUrl}/blog</link>
    </image>${posts
      .map(post => {
        const pubDate = post.dateModified || post.date
        const postUrl = `${baseUrl}/blog/${post.slug}`
        const postImage = post.image ? `${baseUrl}${post.image}` : `${baseUrl}/og-image.jpg`

        return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.excerpt}]]></description>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${new Date(pubDate).toUTCString()}</pubDate>
      <author>contact@aiworkoutgenerator.com (${post.author})</author>
      <category>${post.category}</category>${
        post.image
          ? `
      <enclosure url="${postImage}" type="image/jpeg" length="0"/>`
          : ''
      }
    </item>`
      })
      .join('')}
  </channel>
</rss>`

  return new NextResponse(rssXml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
