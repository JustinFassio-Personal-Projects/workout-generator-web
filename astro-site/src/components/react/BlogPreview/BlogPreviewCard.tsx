/**
 * Card for blog preview section - matches BlogCard.astro structure (glass-card, category, title, excerpt, date, author).
 */
export interface BlogPreviewPost {
  slug: string
  title: string
  excerpt: string
  date: string
  author: string
  category: string
  image?: string
  tags?: string[]
}

interface BlogPreviewCardProps {
  post: BlogPreviewPost
  className?: string
}

export function BlogPreviewCard({ post, className = '' }: BlogPreviewCardProps) {
  const formattedDate = post.date
    ? new Date(post.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''
  const tags = post.tags ?? []

  return (
    <article className={`glass-card overflow-hidden group ${className}`.trim()}>
      <a href={`/blog/${post.slug}`} className="block">
        {post.image && (
          <div className="aspect-video overflow-hidden bg-[var(--glass-bg-hover)]">
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
              {post.category}
            </span>
          </div>
          <h2 className="text-xl font-bold mb-3 group-hover:text-[var(--color-accent)] transition-colors line-clamp-2">
            {post.title}
          </h2>
          <p
            className="text-secondary text-sm mb-4 line-clamp-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            {post.excerpt}
          </p>
          <div
            className="flex items-center justify-between text-xs text-muted"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>{post.author}</span>
            <time dateTime={post.date}>{formattedDate}</time>
          </div>
          {tags.length > 0 && (
            <div
              className="flex flex-wrap gap-2 mt-4 pt-4 border-t"
              style={{ borderColor: 'var(--glass-border-base)' }}
            >
              {tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  #{tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  +{tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </a>
    </article>
  )
}
