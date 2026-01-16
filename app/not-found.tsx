import Link from 'next/link'
import { Button } from '@/components/ui/Button/Button'
import styles from './not-found.module.scss'

export const metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for could not be found.',
}

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.errorCode}>404</div>
        <h1 className={styles.title}>Page Not Found</h1>
        <p className={styles.description}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          <br />
          Let&apos;s get you back on track with your fitness journey.
        </p>
        <div className={styles.actions}>
          <Link href="/">
            <Button variant="primary" size="lg">
              Go Home
            </Button>
          </Link>
          <Link href="/blog">
            <Button variant="secondary" size="lg">
              Visit Blog
            </Button>
          </Link>
          <Link href="/#pricing">
            <Button variant="tertiary" size="lg">
              View Pricing
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
