export type VideoCategory =
  | 'brand'
  | 'featured-exercise'
  | 'featured-workout'
  | 'exercise-of-the-week'
  | 'workout-of-the-week'
  | 'promotional'

export interface Video {
  id: string
  title: string
  description?: string
  videoUrl: string
  thumbnailUrl?: string
  category: VideoCategory
  duration?: number // in seconds
  featured?: boolean // for brand video or featured videos
}

// Note: thumbnailUrl is used for video poster and VideoObject structured data.
// Use an existing public image until per-video thumbnails (e.g. public/videos/*.jpg) are added.
const VIDEO_PLACEHOLDER_THUMB = '/og-image.jpg'

export const videos: Video[] = [
  {
    id: '1',
    title: 'Brand Video',
    description: 'Experience our mission and vision',
    videoUrl: '/videos/brand-video.mp4',
    thumbnailUrl: VIDEO_PLACEHOLDER_THUMB,
    category: 'brand',
    duration: 10,
    featured: true,
  },
  {
    id: '2',
    title: 'Featured Exercise Video 1',
    description: 'Learn proper form and technique',
    videoUrl: '/videos/featured-exercise-1.mp4',
    thumbnailUrl: VIDEO_PLACEHOLDER_THUMB,
    category: 'featured-exercise',
    featured: true,
  },
  {
    id: '3',
    title: 'Featured Exercise Video 2',
    description: 'Master advanced movements',
    videoUrl: '/videos/featured-exercise-2.mp4',
    thumbnailUrl: VIDEO_PLACEHOLDER_THUMB,
    category: 'featured-exercise',
    featured: true,
  },
  {
    id: '4',
    title: 'Kettlebell Complex',
    description: 'Complete workout routine',
    videoUrl: '/videos/featured-workout-1.mp4',
    thumbnailUrl: VIDEO_PLACEHOLDER_THUMB,
    category: 'featured-workout',
    featured: true,
  },
  {
    id: '5',
    title: 'HIIT Workout',
    description: 'Advanced training session',
    videoUrl: '/videos/featured-workout-2.mp4',
    thumbnailUrl: VIDEO_PLACEHOLDER_THUMB,
    category: 'featured-workout',
    featured: true,
  },
]

export const getVideosByCategory = (category: VideoCategory): Video[] => {
  return videos.filter(video => video.category === category)
}

export const getFeaturedVideo = (): Video | undefined => {
  return videos.find(video => video.featured && video.category === 'brand')
}

export const getFeaturedExerciseVideos = (): Video[] => {
  return videos.filter(video => video.category === 'featured-exercise' && video.featured)
}

export const getFeaturedWorkoutVideos = (): Video[] => {
  return videos.filter(video => video.category === 'featured-workout' && video.featured)
}

export const getVideoById = (id: string): Video | undefined => {
  return videos.find(video => video.id === id)
}
