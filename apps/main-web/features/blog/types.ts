export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  date: string
  author: string
  category: string
  tags: string[]
  image?: string
  dateModified?: string
}

export interface BlogCategory {
  id: string
  name: string
  slug: string
}
