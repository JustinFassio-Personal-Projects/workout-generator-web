import React from 'react'
import ReactMarkdown from 'react-markdown'
import { BlogPost } from '@/features/blog/types'
import { formatDate } from '@/features/blog/lib/formatDate'

interface BlogPostContentProps {
  post: BlogPost
}

export const BlogPostContent: React.FC<BlogPostContentProps> = ({ post }) => {
  const publishedDate = new Date(post.date)
  const isoDate = publishedDate.toISOString()

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-6">
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
          {post.category}
        </span>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
        <div className="flex items-center gap-4 text-gray-600 mb-6">
          <time dateTime={isoDate}>{formatDate(post.date)}</time>
          <span aria-hidden="true">•</span>
          <span>By {post.author}</span>
        </div>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>
      <div className="prose prose-lg max-w-none">
        <div className="text-gray-700 leading-relaxed">
          <ReactMarkdown
            components={{
              // Shift all headings down by one level since page title is h1
              h1: ({ node, ...props }) => <h2 {...props} />,
              h2: ({ node, ...props }) => <h3 {...props} />,
              h3: ({ node, ...props }) => <h4 {...props} />,
              h4: ({ node, ...props }) => <h5 {...props} />,
              h5: ({ node, ...props }) => <h6 {...props} />,
              h6: ({ node, ...props }) => <h6 {...props} className="font-bold" />,
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </div>
    </article>
  )
}
