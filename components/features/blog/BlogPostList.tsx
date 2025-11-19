import React from 'react'
import { BlogPostCard } from './BlogPostCard'
import { BlogPost } from '@/features/blog/types'

interface BlogPostListProps {
  posts: BlogPost[]
}

export const BlogPostList: React.FC<BlogPostListProps> = ({ posts }) => {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No blog posts found.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <BlogPostCard key={post.id} post={post} />
      ))}
    </div>
  )
}

