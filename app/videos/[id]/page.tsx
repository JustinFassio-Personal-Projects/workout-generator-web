import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getVideoById, videos, getVideosByCategory } from '@/data/videos'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'

// Use consistent baseUrl format (non-www by default) to avoid www/non-www URL mismatches
// All video URLs in structured data will use this format for consistency
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

// Static upload date for structured data
const STATIC_UPLOAD_DATE = '2024-01-01T00:00:00.000Z'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  return videos.map(video => ({
    id: video.id,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const video = getVideoById(id)

  if (!video) {
    return {
      title: 'Video Not Found - Workout Generator',
    }
  }

  // Normalize video URL to ensure consistent format (no www/non-www mismatch)
  const videoUrl = video.videoUrl.startsWith('http')
    ? video.videoUrl
    : `${baseUrl}${video.videoUrl}`

  const thumbnailUrl = video.thumbnailUrl
    ? video.thumbnailUrl.startsWith('http')
      ? video.thumbnailUrl
      : `${baseUrl}${video.thumbnailUrl}`
    : `${baseUrl}/og-image.jpg`

  const url = `${baseUrl}/videos/${video.id}`
  const title = `${video.title} | Workout Generator`
  const description = video.description || video.title

  return {
    title,
    description,
    openGraph: {
      title: video.title,
      description,
      type: 'video.other',
      url,
      images: [
        {
          url: thumbnailUrl,
          width: 1200,
          height: 630,
          alt: video.title,
        },
      ],
    },
    twitter: {
      card: 'player',
      title: video.title,
      description,
      images: [thumbnailUrl],
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function VideoWatchPage({ params }: PageProps) {
  const { id } = await params
  const video = getVideoById(id)

  if (!video) {
    notFound()
  }

  // Normalize video URL to ensure consistent format (no www/non-www mismatch)
  const videoUrl = video.videoUrl.startsWith('http')
    ? video.videoUrl
    : `${baseUrl}${video.videoUrl}`

  const thumbnailUrl = video.thumbnailUrl
    ? video.thumbnailUrl.startsWith('http')
      ? video.thumbnailUrl
      : `${baseUrl}${video.thumbnailUrl}`
    : undefined

  // Generate VideoObject structured data for SEO
  const videoSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: video.description || video.title,
    ...(thumbnailUrl && { thumbnailUrl }),
    uploadDate: STATIC_UPLOAD_DATE,
    contentUrl: videoUrl,
    embedUrl: videoUrl,
    ...(video.duration && { duration: `PT${video.duration}S` }),
  }

  // Get related videos from the same category
  const relatedVideos = getVideosByCategory(video.category)
    .filter(v => v.id !== video.id)
    .slice(0, 3)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }}
      />
      <div className="min-h-screen bg-brand-dark text-white">
        {/* Back Button */}
        <div className="container mx-auto px-4 py-6">
          <Link href="/#videos">
            <Button variant="secondary" size="md" className="mb-4">
              <ArrowLeft size={20} className="mr-2" />
              Back to Videos
            </Button>
          </Link>
        </div>

        {/* Main Video Player */}
        <div className="container mx-auto px-4 pb-8">
          <div className="max-w-4xl mx-auto">
            {/* Video Player */}
            <div className="bg-brand-darker rounded-2xl overflow-hidden mb-6 shadow-2xl">
              <video
                className="w-full aspect-video"
                controls
                autoPlay
                playsInline
                poster={thumbnailUrl}
                title={video.title}
                aria-label={video.title}
              >
                <source src={videoUrl} type="video/mp4" />
                <p>
                  Your browser does not support the video tag. You can still view the video at{' '}
                  <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                    this link
                  </a>
                  .
                </p>
              </video>
            </div>

            {/* Video Metadata */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{video.title}</h1>
              {video.description && (
                <p className="text-lg text-gray-300 mb-4">{video.description}</p>
              )}
              {video.duration && (
                <p className="text-sm text-gray-400">Duration: {video.duration} seconds</p>
              )}
            </div>

            {/* Related Videos */}
            {relatedVideos.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6">Related Videos</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {relatedVideos.map(relatedVideo => {
                    const relatedVideoUrl = relatedVideo.videoUrl.startsWith('http')
                      ? relatedVideo.videoUrl
                      : `${baseUrl}${relatedVideo.videoUrl}`
                    const relatedThumbnailUrl = relatedVideo.thumbnailUrl
                      ? relatedVideo.thumbnailUrl.startsWith('http')
                        ? relatedVideo.thumbnailUrl
                        : `${baseUrl}${relatedVideo.thumbnailUrl}`
                      : undefined

                    return (
                      <Link
                        key={relatedVideo.id}
                        href={`/videos/${relatedVideo.id}`}
                        className="block bg-brand-darker rounded-lg overflow-hidden hover:scale-105 transition-transform"
                      >
                        <div className="aspect-video bg-gray-800 relative">
                          {relatedThumbnailUrl ? (
                            <img
                              src={relatedThumbnailUrl}
                              alt={relatedVideo.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-gray-500">No thumbnail</span>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold mb-2 line-clamp-2">{relatedVideo.title}</h3>
                          {relatedVideo.description && (
                            <p className="text-sm text-gray-400 line-clamp-2">
                              {relatedVideo.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
