export interface Testimonial {
  id: string
  name: string
  role: string
  company?: string
  avatar?: string // Optional field, will be implemented later
  quote: string
  title?: string // Optional title/headline for the testimonial
  rating: number
}

export const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Toni L.',
    role: 'Elite 25',
    company: 'San Diego, CA',
    title: 'Inspired by the Methods',
    // avatar: '', // Commented out for now, will add later
    quote:
      'I was so impressed and inspired by the methods. Very passionate about fitness, health, and safety as well as progress. Thorough when explaining each exercise and its benefit, attentive in monitoring form and execution, and always remained positive and motivational.',
    rating: 5,
  },
  {
    id: '2',
    name: 'Danielle B.',
    role: 'Honolulu, HI',
    title: 'Never Gets Boring',
    // avatar: '', // Commented out for now, will add later
    quote:
      'I often get bored with workouts, especially in the gym, but for TWO YEARS I have been trained, challenged, encouraged, entertained and surprised by how enjoyable (but hard!) the workouts are. Not only do I feel strong and amazing after every workout, but the variety keeps me coming back.',
    rating: 5,
  },
  {
    id: '3',
    name: 'Tanya C.',
    role: 'San Diego, CA',
    title: 'Life-Changing Results',
    // avatar: '', // Commented out for now, will add later
    quote:
      "I've completely changed my life over the last ten months. Lost 20 lbs and am way more fit than I have been in a long time! The workouts are challenging and help you push and support yourself to reach new levels.",
    rating: 5,
  },
  {
    id: '4',
    name: 'Dennis B.',
    role: 'San Diego, CA',
    title: 'Motivated Without Feeling Tortured',
    // avatar: '', // Commented out for now, will add later
    quote:
      "This is the first time I've attempted a boot-camp style workout program, and the coaching keeps the group motivated through the entire workout. The style keeps me focused without feeling like I'm being tortured. I believe in myself and my ability to stick with this program long-term.",
    rating: 5,
  },
]
