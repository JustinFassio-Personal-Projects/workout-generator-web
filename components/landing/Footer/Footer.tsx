'use client'

import React from 'react'
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  Mail,
  Send
} from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import styles from './Footer.module.scss'

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  const navigationLinks = {
    product: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Testimonials', href: '#testimonials' },
    ],
    company: [
      { label: 'About Us', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
    resources: [
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

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
  ]

  return (
    <footer id="footer" className={styles.footer}>
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
                    <a href={link.href} className={styles.link}>
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
                    <a href={link.href} className={styles.link}>
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
                    <a href={link.href} className={styles.link}>
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
                    <a href={link.href} className={styles.link}>
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
            <form className={styles.newsletterForm}>
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
          </p>
        </div>
      </div>
    </footer>
  )
}

