export interface Testimonial {
  id: string
  name: string
  role: string
  company?: string
  avatar?: string // Commented out for now, will add later
  quote: string
  title?: string // Optional title/headline for the testimonial
  rating: number
}

export const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Don Murphy',
    role: "Gold's Gym",
    title: 'Transformational Technology',
    // avatar: '', // Commented out for now, will add later
    quote:
      'Without a doubt, this is the future of how workouts should be created for people of all fitness levels.',
    rating: 5,
  },
  {
    id: '2',
    name: 'Larry King',
    role: 'Founder and CEO',
    company: 'Shapenet',
    title: 'This is a Home Run',
    // avatar: '', // Commented out for now, will add later
    quote: 'People should see this as an amazing way to get completely customized workout guidance',
    rating: 5,
  },
  {
    id: '3',
    name: 'Rick Eff',
    role: 'Owner',
    company: 'Sweat PT',
    title: 'The New Standard',
    // avatar: '', // Commented out for now, will add later
    quote: 'The future of the fitness industry is bright when you can deliver workouts like this.',
    rating: 5,
  },
  {
    id: '4',
    name: 'Jamie Johnson',
    role: 'Indigo Yoga',
    title: 'Really Impressed',
    // avatar: '', // Commented out for now, will add later
    quote:
      'Unfortunately, we drop the ball too often on great workouts. This product helps resolve that.',
    rating: 5,
  },
]
