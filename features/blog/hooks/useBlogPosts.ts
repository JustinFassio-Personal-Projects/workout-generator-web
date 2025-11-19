'use client'

import { useState, useEffect } from 'react'
import { BlogPost } from '../types'

export function useBlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    fetch(`${baseUrl}/api/blog`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch blog posts')
        }
        return res.json()
      })
      .then(setPosts)
      .catch(err => {
        console.error('Error fetching blog posts:', err)
        setError(err)
      })
      .finally(() => setLoading(false))
  }, [])

  return { posts, loading, error }
}
