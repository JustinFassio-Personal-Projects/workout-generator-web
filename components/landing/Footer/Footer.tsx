'use client'

import React, { FormEvent } from 'react'
import { Facebook, Twitter, Instagram, Linkedin, Mail, Send, Youtube, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { trackVercelEvent, trackNavigationClick } from '@/lib/analytics'
import styles from './Footer.module.scss'

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  const handleNewsletterSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    trackVercelEvent('Newsletter Subscribe', {
      location: 'footer',
      form_type: 'newsletter',
    })
    // Form submission logic would go here
  }

  const handleSocialLinkClick = (platform: string) => {
    trackVercelEvent('Social Link Click', {
      platform,
      location: 'footer',
    })
  }

  const handleFooterLinkClick = (
    href: string,
    category: 'product' | 'company' | 'resources' | 'legal',
    label: string
  ) => {
    trackNavigationClick(href, 'footer_link', 'footer', {
      category,
      link_label: label,
    })
  }

  const navigationLinks = {
    product: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Testimonials', href: '#testimonials' },
    ],
    company: [
      { label: 'Founder Story', href: '/founder-story' },
      { label: 'About Us', href: '#' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
    resources: [
      { label: 'Equipment', href: '/equipment' },
      { label: 'Documentation', href: '#' },
      { label: 'Help Center', href: '#' },
      { label: 'Community', href: '#' },
      { label: 'API', href: '#' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Cookie Policy', href: '#' },
    ],
  }

  // Social links
  const socialLinks = [
    { icon: Youtube, href: 'https://www.youtube.com/@aiworkoutgen', label: 'YouTube' },
    { icon: Instagram, href: 'https://www.instagram.com/aiworkoutgenerator/', label: 'Instagram' },
    {
      icon: Linkedin,
      href: 'https://www.linkedin.com/in/justinfassio/',
      label: 'LinkedIn Personal',
    },
    {
      icon: Linkedin,
      href: 'https://www.linkedin.com/company/ai-workout-generator/',
      label: 'LinkedIn Company',
    },
    { icon: Facebook, href: 'https://www.facebook.com/aiworkoutgenerator', label: 'Facebook' },
    { icon: Twitter, href: 'https://x.com/AI_Workout', label: 'Twitter' },
    {
      icon: Star,
      href: 'https://www.yelp.com/biz/san-diego-core-fitness-san-diego-san-diego?osq=San+Diego+Core+Fitness',
      label: 'Yelp Reviews',
    },
  ]

  // LocalBusiness Structured Data
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'AI Workout Generator',
    image: 'https://aiworkoutgenerator.com/og-image.jpg',
    '@id': 'https://aiworkoutgenerator.com',
    url: 'https://aiworkoutgenerator.com',
    telephone: '', // Add if available
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'San Diego',
      addressRegion: 'CA',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 32.7157, // San Diego coordinates
      longitude: -117.1611,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
    sameAs: [
      'https://www.linkedin.com/company/ai-workout-generator/',
      'https://x.com/AI_Workout',
      'https://www.instagram.com/aiworkoutgenerator/',
      'https://www.youtube.com/@aiworkoutgen',
      'https://www.facebook.com/aiworkoutgenerator',
      'https://www.yelp.com/biz/san-diego-core-fitness-san-diego-san-diego?osq=San+Diego+Core+Fitness',
    ],
  }

  return (
    <footer id="footer" className={styles.footer}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <div className={styles.container}>
        <div className={styles.topSection}>
          <div className={styles.brand}>
            <div className={styles.logo}>
              <span className={styles.logoText}>Workout</span>
              <span className={styles.logoAccent}>Generator</span>
            </div>
            <p className={styles.tagline}>
              Transform your fitness journey with AI-powered workout plans.
            </p>
            <div className={styles.socialLinks}>
              {socialLinks.map((social, index) => {
                const Icon = social.icon
                return (
                  <a
                    key={index}
                    href={social.href}
                    aria-label={social.label}
                    className={styles.socialLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleSocialLinkClick(social.label)}
                  >
                    <Icon size={20} />
                  </a>
                )
              })}
            </div>
          </div>

          <div className={styles.linksGrid}>
            <div className={styles.linksColumn}>
              <h4 className={styles.columnTitle}>Product</h4>
              <ul className={styles.linksList}>
                {navigationLinks.product.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className={styles.link}
                      onClick={() => handleFooterLinkClick(link.href, 'product', link.label)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.linksColumn}>
              <h4 className={styles.columnTitle}>Company</h4>
              <ul className={styles.linksList}>
                {navigationLinks.company.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className={styles.link}
                      onClick={() => handleFooterLinkClick(link.href, 'company', link.label)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.linksColumn}>
              <h4 className={styles.columnTitle}>Resources</h4>
              <ul className={styles.linksList}>
                {navigationLinks.resources.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className={styles.link}
                      onClick={() => handleFooterLinkClick(link.href, 'resources', link.label)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.linksColumn}>
              <h4 className={styles.columnTitle}>Legal</h4>
              <ul className={styles.linksList}>
                {navigationLinks.legal.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className={styles.link}
                      onClick={() => handleFooterLinkClick(link.href, 'legal', link.label)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={styles.newsletter}>
            <h4 className={styles.columnTitle}>Newsletter</h4>
            <p className={styles.newsletterText}>
              Stay updated with the latest fitness tips and features.
            </p>
            <form className={styles.newsletterForm} onSubmit={handleNewsletterSubmit}>
              <div className={styles.inputWrapper}>
                <Mail size={20} className={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="Enter your email"
                  className={styles.input}
                  required
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={Send}
                iconPosition="right"
                className={styles.submitButton}
              >
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        <div className={styles.bottomSection}>
          <p className={styles.copyright}>
            © {currentYear} Workout Generator. All rights reserved.
            <a href="/admin" className={styles.adminAccess} aria-label="Admin">
              ◆
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
