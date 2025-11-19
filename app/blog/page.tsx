import { BlogPostList } from '@/components/features/blog/BlogPostList'
import { getAllPosts } from '@/features/blog/lib/getBlogPosts'

export default async function BlogPage() {
  const posts = await getAllPosts()

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Blog</h1>
        <p className="text-lg text-gray-600">
          Discover fitness tips, workout strategies, and expert advice to help you achieve your goals.
        </p>
      </div>
      <BlogPostList posts={posts} />
    </div>
  )
}

