import React from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card/Card'
import { BlogPost } from '@/features/blog/types'
import { formatDate } from '@/features/blog/lib/formatDate'

interface BlogPostCardProps {
  post: BlogPost
}

export const BlogPostCard: React.FC<BlogPostCardProps> = ({ post }) => {
  return (
    <Card hover={true}>
      <Link href={`/blog/${post.slug}`} className="block h-full">
        <div className="p-6 flex flex-col h-full">
          <div className="mb-2">
            <span className="text-sm text-gray-500 font-medium">
              {post.category}
            </span>
          </div>
          <h3 className="text-xl font-bold mb-2 text-gray-900 hover:text-blue-600 transition-colors">
            {post.title}
          </h3>
          <p className="text-gray-600 mb-4 flex-grow">
            {post.excerpt}
          </p>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-sm text-gray-500">
              {formatDate(post.date)}
            </span>
            <span className="text-sm text-blue-600 font-medium">
              Read more →
            </span>
          </div>
        </div>
      </Link>
    </Card>
  )
}

