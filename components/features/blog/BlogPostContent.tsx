import React from 'react'
import ReactMarkdown from 'react-markdown'
import { BlogPost } from '@/features/blog/types'
import styles from './BlogPostContent.module.scss'

interface BlogPostContentProps {
  post: BlogPost
}

export const BlogPostContent: React.FC<BlogPostContentProps> = ({ post }) => {
  return (
    <article className={styles.article}>
      <div className={styles.content}>
        <ReactMarkdown
          components={{
            // Shift all headings down by one level since page title is h1
            h1: ({ node, ...props }) => <h2 {...props} />,
            h2: ({ node, ...props }) => <h3 {...props} />,
            h3: ({ node, ...props }) => <h4 {...props} />,
            h4: ({ node, ...props }) => <h5 {...props} />,
            h5: ({ node, ...props }) => <h6 {...props} />,
            h6: ({ node, ...props }) => <h6 {...props} />,
          }}
        >
          {post.content}
        </ReactMarkdown>
      </div>
    </article>
  )
}
