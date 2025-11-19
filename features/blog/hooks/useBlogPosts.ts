'use client'

import { useState, useEffect } from 'react'
import { BlogPost } from '../types'
import { getAllPosts } from '../lib/getBlogPosts'

export function useBlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    getAllPosts()
      .then(setPosts)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return { posts, loading, error }
}
