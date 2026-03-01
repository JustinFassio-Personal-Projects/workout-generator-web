'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Dumbbell,
  Weight,
  Grip,
  Zap,
  Cable,
  User,
  ArrowRight,
  Check,
  Search,
  X,
} from 'lucide-react'
import { buildEquipmentWizardUrl, EQUIPMENT_TYPES } from '@/lib/buildEquipmentWizardUrl'
import { getPreselectValueForEquipmentId } from '@/lib/equipmentPreselect'
import { equipmentData, allCategories } from '@/data/equipment'
import styles from './page.module.scss'
import { Button } from '@/components/ui/Button/Button'

// ItemList schema for SEO - includes all equipment
const itemListSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: equipmentData.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: `${item.name} Workout Generator`,
    description: `AI-generated workout plans using ${item.name.toLowerCase()}.`,
    url: `https://aiworkoutgenerator.com/equipment#${item.id}`,
  })),
}

export default function EquipmentPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  // Preselect values only so featured (wizardType) and catalog (getPreselectValueForEquipmentId) share keys.
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(new Set())

  const toggleEquipment = (preselectValue: string) => {
    setSelectedEquipmentIds(prev => {
      const next = new Set(prev)
      if (next.has(preselectValue)) next.delete(preselectValue)
      else next.add(preselectValue)
      return next
    })
  }

  // Filter equipment based on search and category
  const filteredEquipment = useMemo(() => {
    let filtered = equipmentData

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        item =>
          item.name.toLowerCase().includes(query) ||
          item.categories.some(cat => cat.toLowerCase().includes(query)) ||
          item.subCategory?.toLowerCase().includes(query)
      )
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(item => item.categories.includes(selectedCategory))
    }

    return filtered
  }, [searchQuery, selectedCategory])

  // Group filtered equipment by primary category
  const groupedEquipment = useMemo(() => {
    const grouped: Record<string, typeof equipmentData> = {}
    filteredEquipment.forEach(item => {
      if (!grouped[item.primaryCategory]) {
        grouped[item.primaryCategory] = []
      }
      grouped[item.primaryCategory].push(item)
    })
    return grouped
  }, [filteredEquipment])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory(null)
  }

  // Featured equipment cards for hero section
  const featuredEquipment = [
    {
      id: 'dumbbells',
      name: 'Dumbbells',
      icon: Dumbbell,
      description: 'Home gym staple for isolation and compound movements',
      wizardType: EQUIPMENT_TYPES.DUMBBELLS,
    },
    {
      id: 'kettlebells',
      name: 'Kettlebells',
      icon: Weight,
      description: 'Dynamic swinging movements and functional conditioning',
      wizardType: EQUIPMENT_TYPES.KETTLEBELLS,
    },
    {
      id: 'barbell',
      name: 'Barbell & Plates',
      icon: Grip,
      description: 'Essential for squats, deadlifts, and bench press',
      wizardType: EQUIPMENT_TYPES.BARBELL,
    },
    {
      id: 'bands',
      name: 'Resistance Bands',
      icon: Zap,
      description: 'Portable resistance for full-body training',
      wizardType: EQUIPMENT_TYPES.BANDS,
    },
    {
      id: 'machines',
      name: 'Cables / Machines',
      icon: Cable,
      description: 'Constant tension system for endless variations',
      wizardType: EQUIPMENT_TYPES.MACHINES,
    },
    {
      id: 'bodyweight',
      name: 'Bodyweight',
      icon: User,
      description: 'No equipment needed - travel-friendly workouts',
      wizardType: EQUIPMENT_TYPES.BODYWEIGHT,
    },
  ]

  return (
    <>
      {/* JSON-LD Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <main
        className={`${styles.main} ${selectedEquipmentIds.size > 0 ? styles.mainWithStickyBar : ''}`}
      >
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContainer}>
            <h1 className={styles.heroTitle}>Build Muscle with the Gear You Own.</h1>
            <p className={styles.heroSubtitle}>
              Select your available equipment below, and our AI will adjust volume, intensity, and
              exercise selection to match your home gym, hotel gym, or commercial facility.
            </p>
          </div>
        </section>

        {/* Featured Equipment Grid */}
        <section className={styles.featuredSection}>
          <div className={styles.featuredContainer}>
            <h2 className={styles.sectionTitle}>Popular Equipment</h2>
            <div className={styles.featuredGrid}>
              {featuredEquipment.map(card => {
                const IconComponent = card.icon
                const isSelected = selectedEquipmentIds.has(card.wizardType)
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => toggleEquipment(card.wizardType)}
                    className={`${styles.card} ${styles.cardSelectable} ${isSelected ? styles.cardSelected : ''}`}
                    id={card.id}
                    aria-pressed={isSelected}
                  >
                    <div className={styles.cardIcon}>
                      <IconComponent className={styles.icon} />
                    </div>
                    <h3 className={styles.cardTitle}>{card.name}</h3>
                    <p className={styles.cardDescription}>{card.description}</p>
                    <div className={styles.cardAction}>
                      {isSelected ? (
                        <>
                          <Check className={styles.cardCheck} aria-hidden />
                          <span className={styles.cardLinkText}>Selected</span>
                        </>
                      ) : (
                        <>
                          <span className={styles.cardLinkText}>Select</span>
                          <ArrowRight className={styles.cardArrow} />
                        </>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Full Equipment Catalog */}
        <section className={styles.catalogSection}>
          <div className={styles.catalogContainer}>
            <div className={styles.catalogHeader}>
              <h2 className={styles.sectionTitle}>
                Complete Equipment Catalog ({equipmentData.length} items)
              </h2>
              <p className={styles.catalogSubtitle}>
                Browse our full library of supported equipment. Search by name, category, or
                equipment type.
              </p>
            </div>

            {/* Search and Filter Bar */}
            <div className={styles.filterBar}>
              <div className={styles.searchWrapper}>
                <Search className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search equipment (e.g., 'Trap Bar', 'TRX', 'Kettlebell')"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className={styles.clearButton}
                    aria-label="Clear search"
                  >
                    <X className={styles.clearIcon} />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className={styles.categoryFilters}>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`${styles.categoryButton} ${
                    selectedCategory === null ? styles.categoryButtonActive : ''
                  }`}
                >
                  All Categories
                </button>
                {allCategories.slice(0, 10).map(category => (
                  <button
                    key={category}
                    onClick={() =>
                      setSelectedCategory(selectedCategory === category ? null : category)
                    }
                    className={`${styles.categoryButton} ${
                      selectedCategory === category ? styles.categoryButtonActive : ''
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>

              {(searchQuery || selectedCategory) && (
                <div className={styles.activeFilters}>
                  <span className={styles.activeFiltersLabel}>Active filters:</span>
                  {searchQuery && (
                    <span className={styles.filterTag}>
                      Search: &quot;{searchQuery}&quot;
                      <button onClick={() => setSearchQuery('')} className={styles.filterTagRemove}>
                        <X />
                      </button>
                    </span>
                  )}
                  {selectedCategory && (
                    <span className={styles.filterTag}>
                      Category: {selectedCategory}
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={styles.filterTagRemove}
                      >
                        <X />
                      </button>
                    </span>
                  )}
                  <button onClick={clearFilters} className={styles.clearAllButton}>
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Equipment Grid by Category */}
            {filteredEquipment.length === 0 ? (
              <div className={styles.noResults}>
                <p>No equipment found matching your search.</p>
                <button onClick={clearFilters} className={styles.clearFiltersButton}>
                  Clear filters
                </button>
              </div>
            ) : (
              Object.entries(groupedEquipment).map(([category, items]) => (
                <div key={category} className={styles.categorySection}>
                  <h3 className={styles.categoryTitle}>
                    {category} ({items.length})
                  </h3>
                  <div className={styles.equipmentGrid}>
                    {items.map(item => {
                      const IconComponent = item.icon
                      const preselectValue = getPreselectValueForEquipmentId(item.id)
                      const isSelected = selectedEquipmentIds.has(preselectValue)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleEquipment(preselectValue)}
                          className={`${styles.equipmentCard} ${styles.equipmentCardSelectable} ${isSelected ? styles.equipmentCardSelected : ''}`}
                          id={item.id}
                          aria-pressed={isSelected}
                        >
                          <div className={styles.equipmentIcon}>
                            <IconComponent className={styles.equipmentIconSvg} />
                          </div>
                          <h4 className={styles.equipmentName}>{item.name}</h4>
                          {item.subCategory && (
                            <span className={styles.equipmentSubCategory}>{item.subCategory}</span>
                          )}
                          <div className={styles.equipmentTags}>
                            {item.categories.slice(0, 3).map(tag => (
                              <span key={tag} className={styles.equipmentTag}>
                                {tag}
                              </span>
                            ))}
                            {item.categories.length > 3 && (
                              <span className={styles.equipmentTagMore}>
                                +{item.categories.length - 3}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <div className={styles.equipmentCardCheckWrap} aria-hidden>
                              <Check className={styles.equipmentCardCheck} />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Pillar Content Section */}
        <section className={styles.pillarSection}>
          <div className={styles.pillarContainer}>
            {/* Dumbbell Content */}
            <div className={styles.pillarBlock}>
              <h2 className={styles.pillarTitle}>Home Gym & Dumbbell AI Workouts</h2>
              <p className={styles.pillarText}>
                Don&apos;t have a rack? Our generator creates hypertrophy-focused plans using only
                dumbbells. We adjust the rep ranges to ensure you reach failure safely without heavy
                loads. A 30lb dumbbell press is not the same as a barbell press—our AI understands
                the biomechanical differences and adjusts your program accordingly.
              </p>
            </div>

            {/* Bodyweight Content */}
            <div className={styles.pillarBlock}>
              <h2 className={styles.pillarTitle}>Bodyweight & Calisthenics (No Equipment)</h2>
              <p className={styles.pillarText}>
                Travel-friendly workouts that use trainer-verified progression, not just random
                jumping jacks. Our AI creates structured bodyweight programs that progressively
                challenge your strength and mobility, whether you&apos;re in a hotel room or your
                living room.
              </p>
            </div>

            {/* Commercial Gym Content */}
            <div className={styles.pillarBlock}>
              <h2 className={styles.pillarTitle}>Commercial Gym Access</h2>
              <p className={styles.pillarText}>
                Unlock the full potential of machine-based training. Our AI leverages cable
                machines, leg presses, and isolation equipment to create comprehensive programs that
                maximize muscle growth and strength gains.
              </p>
            </div>
          </div>
        </section>

        {/* Trainer Logic Section */}
        <section className={styles.trainerSection}>
          <div className={styles.trainerContainer}>
            <h2 className={styles.trainerTitle}>Why Equipment Matters: Trainer Logic</h2>
            <p className={styles.trainerText}>
              A 30lb dumbbell press is not the same as a barbell press. Our AI understands the
              biomechanical differences and adjusts your program accordingly. Created by{' '}
              <Link href="/about" className={styles.trainerLink}>
                Justin Fassio
              </Link>
              , ACSM-certified personal trainer with 30 years of experience.
            </p>
            <ul className={styles.trainerList}>
              <li className={styles.trainerListItem}>
                <Check className={styles.checkIcon} />
                <span>Smart substitutions for missing gear</span>
              </li>
              <li className={styles.trainerListItem}>
                <Check className={styles.checkIcon} />
                <span>Biomechanically-aware exercise selection</span>
              </li>
              <li className={styles.trainerListItem}>
                <Check className={styles.checkIcon} />
                <span>Equipment-specific volume and intensity adjustments</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className={styles.finalCtaSection}>
          <div className={styles.finalCtaContainer}>
            <h2 className={styles.finalCtaTitle}>Ready to build your plan?</h2>
            <p className={styles.finalCtaText}>
              Select your equipment in the wizard and get a customized workout plan in seconds.
            </p>
            <div className={styles.finalCtaButtons}>
              <Link href="/onboard">
                <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right">
                  Start Workout Builder
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Sticky CTA when equipment selected */}
      {selectedEquipmentIds.size > 0 && (
        <div className={styles.stickyBar}>
          <div className={styles.stickyBarContent}>
            <span className={styles.stickyBarText}>
              {selectedEquipmentIds.size} equipment selected
            </span>
            <Link
              href={buildEquipmentWizardUrl(Array.from(selectedEquipmentIds).sort())}
              className={styles.stickyBarButton}
            >
              Get Started
              <ArrowRight className={styles.stickyBarArrow} aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
