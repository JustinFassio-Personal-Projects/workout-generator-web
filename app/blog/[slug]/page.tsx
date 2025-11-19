import { BlogPostContent } from '@/components/features/blog/BlogPostContent'
import { getPostBySlug, getAllPostSlugs } from '@/features/blog/lib/getBlogPosts'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

export default async function BlogPostPage({ 
  params 
}: { 
  params: { slug: string } 
}) {
  const post = await getPostBySlug(params.slug)

  if (!post) {
    notFound()
  }

  return <BlogPostContent post={post} />
}

