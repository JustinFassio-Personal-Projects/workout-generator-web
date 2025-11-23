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

export const videos: Video[] = [
  {
    id: '1',
    title: 'Brand Video',
    description: 'Experience our mission and vision',
    videoUrl: '/videos/brand-video.mp4', // Add your brand video file to public/videos/
    thumbnailUrl: '/videos/brand-video.jpg', // Optional: add a thumbnail image
    category: 'brand',
    duration: 10,
    featured: true,
  },
  {
    id: '2',
    title: 'Featured Exercise Video 1',
    description: 'Learn proper form and technique',
    videoUrl: '/videos/featured-exercise-1.mp4', // Add your video file to public/videos/
    category: 'featured-exercise',
    featured: true,
  },
  {
    id: '3',
    title: 'Featured Exercise Video 2',
    description: 'Master advanced movements',
    videoUrl: '/videos/featured-exercise-2.mp4', // Add your video file to public/videos/
    category: 'featured-exercise',
    featured: true,
  },
  {
    id: '4',
    title: 'Kettlebell Complex',
    description: 'Complete workout routine',
    videoUrl: '/videos/featured-workout-1.mp4', // Add your video file to public/videos/
    category: 'featured-workout',
    featured: true,
  },
  {
    id: '5',
    title: 'HIIT Workout',
    description: 'Advanced training session',
    videoUrl: '/videos/featured-workout-2.mp4', // Add your video file to public/videos/
    category: 'featured-workout',
    featured: true,
  },
  // Future videos can be added here:
  // {
  //   id: '5',
  //   title: 'Exercise of the Week: Push-ups',
  //   description: 'Master the perfect push-up form',
  //   videoUrl: '/videos/exercise-of-the-week/push-up-tutorial.mp4',
  //   thumbnailUrl: '/videos/exercise-of-the-week/push-up-tutorial.jpg',
  //   category: 'exercise-of-the-week',
  //   duration: 60,
  // },
  // {
  //   id: '6',
  //   title: 'Workout of the Week: HIIT Challenge',
  //   description: '20-minute high-intensity workout',
  //   videoUrl: '/videos/workout-of-the-week/hiit-challenge.mp4',
  //   thumbnailUrl: '/videos/workout-of-the-week/hiit-challenge.jpg',
  //   category: 'workout-of-the-week',
  //   duration: 1200,
  // },
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
