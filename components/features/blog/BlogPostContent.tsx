import React from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { BlogPost } from '@/features/blog/types'
import { categoryToSlug } from '@/features/blog/lib/getBlogPosts'
import styles from './BlogPostContent.module.scss'

interface BlogPostContentProps {
  post: BlogPost
}

export const BlogPostContent: React.FC<BlogPostContentProps> = ({ post }) => {
  const categorySlug = categoryToSlug(post.category)

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

      {/* Related Topics Section */}
      <aside className={styles.relatedTopics}>
        <h3 className={styles.relatedTopicsTitle}>Explore More Topics</h3>
        <div className={styles.topicLinks}>
          <Link href={`/blog/category/${categorySlug}`} className={styles.categoryLink}>
            More in {post.category}
          </Link>
          {post.tags.length > 0 && (
            <div className={styles.tagLinks}>
              {post.tags.map(tag => (
                <Link
                  key={tag}
                  href={`/blog?search=${encodeURIComponent(tag)}`}
                  className={styles.tagLink}
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      </aside>
    </article>
  )
}
