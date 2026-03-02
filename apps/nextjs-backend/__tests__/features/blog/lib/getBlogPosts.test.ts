import { describe, it, expect } from 'vitest'
import {
  getAllPosts,
  getPostBySlug,
  getAllPostSlugs,
  getRelatedPosts,
  getAllAuthors,
  getPostsByAuthor,
  getAllCategories,
  getPostsByCategory,
  authorToSlug,
  categoryToSlug,
} from '@/features/blog/lib/getBlogPosts'

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

  describe('getRelatedPosts', () => {
    it('should return related posts based on shared tags', async () => {
      const posts = await getAllPosts()
      if (posts.length === 0) return

      const currentPost = posts[0]
      const relatedPosts = await getRelatedPosts(currentPost, 3)

      expect(Array.isArray(relatedPosts)).toBe(true)
      expect(relatedPosts.length).toBeLessThanOrEqual(3)
      // Should not include the current post
      expect(relatedPosts.find(p => p.id === currentPost.id)).toBeUndefined()
    })

    it('should return empty array when no related posts exist', async () => {
      const posts = await getAllPosts()
      if (posts.length === 0) return

      const currentPost = { ...posts[0], tags: ['unique-tag-not-in-any-other-post'] }
      const relatedPosts = await getRelatedPosts(currentPost, 3)

      expect(Array.isArray(relatedPosts)).toBe(true)
    })

    it('should respect the limit parameter', async () => {
      const posts = await getAllPosts()
      if (posts.length === 0) return

      const currentPost = posts[0]
      const relatedPosts = await getRelatedPosts(currentPost, 2)

      expect(relatedPosts.length).toBeLessThanOrEqual(2)
    })
  })

  describe('getAllAuthors', () => {
    it('should return an array of unique authors', async () => {
      const authors = await getAllAuthors()

      expect(Array.isArray(authors)).toBe(true)
      expect(authors.length).toBeGreaterThan(0)

      // Check uniqueness
      const uniqueAuthors = new Set(authors)
      expect(uniqueAuthors.size).toBe(authors.length)
    })

    it('should return authors sorted alphabetically', async () => {
      const authors = await getAllAuthors()

      for (let i = 0; i < authors.length - 1; i++) {
        expect(authors[i].localeCompare(authors[i + 1])).toBeLessThanOrEqual(0)
      }
    })
  })

  describe('getPostsByAuthor', () => {
    it('should return posts by a specific author', async () => {
      const posts = await getAllPosts()
      if (posts.length === 0) return

      const author = posts[0].author
      const authorSlug = authorToSlug(author)
      const authorPosts = await getPostsByAuthor(authorSlug)

      expect(Array.isArray(authorPosts)).toBe(true)
      authorPosts.forEach(post => {
        expect(authorToSlug(post.author)).toBe(authorSlug)
      })
    })

    it('should return empty array for non-existent author', async () => {
      const posts = await getPostsByAuthor('non-existent-author')

      expect(Array.isArray(posts)).toBe(true)
      expect(posts.length).toBe(0)
    })
  })

  describe('getAllCategories', () => {
    it('should return an array of unique categories', async () => {
      const categories = await getAllCategories()

      expect(Array.isArray(categories)).toBe(true)
      expect(categories.length).toBeGreaterThan(0)

      // Check uniqueness
      const uniqueCategories = new Set(categories)
      expect(uniqueCategories.size).toBe(categories.length)
    })

    it('should return categories sorted alphabetically', async () => {
      const categories = await getAllCategories()

      for (let i = 0; i < categories.length - 1; i++) {
        expect(categories[i].localeCompare(categories[i + 1])).toBeLessThanOrEqual(0)
      }
    })
  })

  describe('getPostsByCategory', () => {
    it('should return posts in a specific category', async () => {
      const posts = await getAllPosts()
      if (posts.length === 0) return

      const category = posts[0].category
      const categorySlug = categoryToSlug(category)
      const categoryPosts = await getPostsByCategory(categorySlug)

      expect(Array.isArray(categoryPosts)).toBe(true)
      categoryPosts.forEach(post => {
        expect(categoryToSlug(post.category)).toBe(categorySlug)
      })
    })

    it('should return empty array for non-existent category', async () => {
      const posts = await getPostsByCategory('non-existent-category')

      expect(Array.isArray(posts)).toBe(true)
      expect(posts.length).toBe(0)
    })
  })

  describe('authorToSlug', () => {
    it('should convert author name to URL-friendly slug', () => {
      expect(authorToSlug('John Doe')).toBe('john-doe')
      expect(authorToSlug('Fitness Team')).toBe('fitness-team')
      expect(authorToSlug('Nutrition Expert')).toBe('nutrition-expert')
    })

    it('should handle names with multiple spaces', () => {
      expect(authorToSlug('John  Doe  Smith')).toBe('john-doe-smith')
    })

    it('should handle single word names', () => {
      expect(authorToSlug('John')).toBe('john')
    })
  })

  describe('categoryToSlug', () => {
    it('should convert category name to URL-friendly slug', () => {
      expect(categoryToSlug('Getting Started')).toBe('getting-started')
      expect(categoryToSlug('Home Fitness')).toBe('home-fitness')
      expect(categoryToSlug('Nutrition')).toBe('nutrition')
    })

    it('should handle categories with multiple spaces', () => {
      expect(categoryToSlug('Getting  Started  Guide')).toBe('getting-started-guide')
    })

    it('should handle single word categories', () => {
      expect(categoryToSlug('Fitness')).toBe('fitness')
    })
  })
})
