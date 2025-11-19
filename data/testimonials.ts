export interface Testimonial {
  id: string
  name: string
  role: string
  company?: string
  avatar: string
  quote: string
  rating: number
}

export const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    role: 'Fitness Coach',
    company: 'FitLife Studio',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    quote: 'This platform has completely transformed how I create workout plans for my clients. The variety and customization options are incredible!',
    rating: 5,
  },
  {
    id: '2',
    name: 'Michael Chen',
    role: 'Personal Trainer',
    company: 'Elite Fitness',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    quote: 'As a trainer, I love how easy it is to generate personalized workouts. My clients are seeing amazing results!',
    rating: 5,
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    role: 'Yoga Instructor',
    company: 'Zen Wellness',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    quote: 'The flexibility to create workouts for different fitness levels makes this tool invaluable. Highly recommend!',
    rating: 5,
  },
  {
    id: '4',
    name: 'David Thompson',
    role: 'Gym Owner',
    company: 'PowerHouse Gym',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    quote: 'We use this for all our members. The interface is clean, and the workouts are always fresh and challenging.',
    rating: 5,
  },
  {
    id: '5',
    name: 'Jessica Martinez',
    role: 'Fitness Enthusiast',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica',
    quote: 'I\'ve tried many workout apps, but this one stands out. The variety keeps me motivated and engaged every day.',
    rating: 5,
  },
  {
    id: '6',
    name: 'Robert Kim',
    role: 'Strength Coach',
    company: 'Iron Forge Training',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Robert',
    quote: 'The ability to customize workouts based on equipment and goals is a game-changer. My athletes love it!',
    rating: 5,
  },
  {
    id: '7',
    name: 'Amanda White',
    role: 'Wellness Consultant',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amanda',
    quote: 'This platform makes fitness accessible to everyone. The guided approach helps beginners feel confident.',
    rating: 5,
  },
  {
    id: '8',
    name: 'James Wilson',
    role: 'CrossFit Coach',
    company: 'BoxFit Academy',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
    quote: 'The workout generator saves me hours every week. I can focus on coaching instead of planning.',
    rating: 5,
  },
]

