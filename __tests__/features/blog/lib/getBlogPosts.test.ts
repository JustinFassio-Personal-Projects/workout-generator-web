import { describe, it, expect } from 'vitest'
import { getAllPosts, getPostBySlug, getAllPostSlugs } from '@/features/blog/lib/getBlogPosts'

describe('getBlogPosts', () => {
  describe('getAllPosts', () => {
    it('should return all blog posts sorted by date (newest first)', async () => {
      const posts = await getAllPosts()

      expect(posts).toBeDefined()
      expect(Array.isArray(posts)).toBe(true)
      expect(posts.length).toBeGreaterThan(0)

      // Verify posts are sorted by date (newest first)
      for (let i = 0; i < posts.length - 1; i++) {
        const currentDate = new Date(posts[i].date).getTime()
        const nextDate = new Date(posts[i + 1].date).getTime()
        expect(currentDate).toBeGreaterThanOrEqual(nextDate)
      }
    })

    it('should return posts with required fields', async () => {
      const posts = await getAllPosts()

      posts.forEach(post => {
        expect(post).toHaveProperty('id')
        expect(post).toHaveProperty('slug')
        expect(post).toHaveProperty('title')
        expect(post).toHaveProperty('excerpt')
        expect(post).toHaveProperty('content')
        expect(post).toHaveProperty('date')
        expect(post).toHaveProperty('author')
        expect(post).toHaveProperty('category')
        expect(post).toHaveProperty('tags')
        expect(Array.isArray(post.tags)).toBe(true)
      })
    })
  })

  describe('getPostBySlug', () => {
    it('should return a post when slug exists', async () => {
      const post = await getPostBySlug('getting-started-with-ai-workouts')

      expect(post).toBeDefined()
      expect(post?.slug).toBe('getting-started-with-ai-workouts')
      expect(post?.title).toBeDefined()
    })

    it('should return null when slug does not exist', async () => {
      const post = await getPostBySlug('non-existent-slug')

      expect(post).toBeNull()
    })
  })

  describe('getAllPostSlugs', () => {
    it('should return an array of all post slugs', async () => {
      const slugs = await getAllPostSlugs()

      expect(Array.isArray(slugs)).toBe(true)
      expect(slugs.length).toBeGreaterThan(0)
      slugs.forEach(slug => {
        expect(typeof slug).toBe('string')
        expect(slug.length).toBeGreaterThan(0)
      })
    })

    it('should return slugs that match actual posts', async () => {
      const slugs = await getAllPostSlugs()
      const posts = await getAllPosts()

      expect(slugs.length).toBe(posts.length)

      slugs.forEach(slug => {
        const post = posts.find(p => p.slug === slug)
        expect(post).toBeDefined()
      })
    })
  })
})
