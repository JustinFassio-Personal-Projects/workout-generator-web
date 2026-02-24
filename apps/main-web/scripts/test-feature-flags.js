/**
 * Feature Flags Testing Script
 *
 * This script can be run in the browser console to test feature flag functionality.
 * Copy and paste the entire script into the browser console on the production site.
 */

;(function testFeatureFlags() {
  console.log('🧪 Starting Feature Flags Test...\n')

  // Test 1: Check if FlagRestorer is working
  console.log('Test 1: Checking FlagRestorer component...')
  const flagElements = document.querySelectorAll('[data-vercel-flag]')
  console.log(
    `Found ${flagElements.length} flag(s) in DOM:`,
    Array.from(flagElements).map(el => ({
      name: el.getAttribute('data-vercel-flag'),
      value: el.getAttribute('data-vercel-flag-value'),
    }))
  )

  // Test 2: Check localStorage for flags
  console.log('\nTest 2: Checking localStorage for flags...')
  const localStorageFlags = Object.keys(localStorage)
    .filter(key => key.startsWith('vercel-flag-'))
    .map(key => ({
      key,
      value: localStorage.getItem(key),
    }))
  console.log(`Found ${localStorageFlags.length} flag(s) in localStorage:`, localStorageFlags)

  // Test 3: Test flag emission
  console.log('\nTest 3: Testing flag emission...')
  const testFlagName = 'test-flag-emission'
  const testFlagValue = 'test-value'

  // Simulate emitFlagToDOM
  const existingFlag = document.querySelector(`[data-vercel-flag="${testFlagName}"]`)
  if (existingFlag) {
    existingFlag.setAttribute('data-vercel-flag-value', testFlagValue)
    console.log('✅ Updated existing test flag')
  } else {
    const flagElement = document.createElement('div')
    flagElement.setAttribute('data-vercel-flag', testFlagName)
    flagElement.setAttribute('data-vercel-flag-value', testFlagValue)
    flagElement.style.display = 'none'
    document.body.appendChild(flagElement)
    console.log('✅ Created new test flag element')
  }

  // Verify test flag
  const testFlag = document.querySelector(`[data-vercel-flag="${testFlagName}"]`)
  if (testFlag && testFlag.getAttribute('data-vercel-flag-value') === testFlagValue) {
    console.log('✅ Test flag emission successful')
  } else {
    console.error('❌ Test flag emission failed')
  }

  // Test 4: Test localStorage storage
  console.log('\nTest 4: Testing localStorage storage...')
  const testStorageKey = 'vercel-flag-test-storage'
  const testStorageValue = 'test-storage-value'
  try {
    localStorage.setItem(testStorageKey, testStorageValue)
    const retrieved = localStorage.getItem(testStorageKey)
    if (retrieved === testStorageValue) {
      console.log('✅ localStorage storage successful')
      localStorage.removeItem(testStorageKey) // Cleanup
    } else {
      console.error('❌ localStorage storage failed')
    }
  } catch (error) {
    console.error('❌ localStorage storage error:', error)
  }

  // Test 5: Verify expected flag names
  console.log('\nTest 5: Verifying expected flag names...')
  const expectedFlags = [
    'intro-start-building-clicked',
    'intro-learn-more-clicked',
    'user-logged-in',
    'user-account-created',
  ]

  expectedFlags.forEach(flagName => {
    const inDOM = document.querySelector(`[data-vercel-flag="${flagName}"]`) !== null
    const inStorage = localStorage.getItem(`vercel-flag-${flagName}`) !== null
    console.log(`  ${flagName}:`, {
      inDOM: inDOM ? '✅' : '❌',
      inStorage: inStorage ? '✅' : '❌',
    })
  })

  // Test 6: Check for analytics tracking
  console.log('\nTest 6: Checking for analytics integration...')
  if (typeof window !== 'undefined' && window.va) {
    console.log('✅ Vercel Analytics detected')
  } else {
    console.log('⚠️  Vercel Analytics not detected (may be normal if not loaded yet)')
  }

  // Summary
  console.log('\n📊 Test Summary:')
  console.log(`  DOM Flags: ${flagElements.length}`)
  console.log(`  localStorage Flags: ${localStorageFlags.length}`)
  console.log(`  Test Flag Emission: ${testFlag ? '✅' : '❌'}`)
  console.log('\n✅ Feature Flags Test Complete!')
  console.log('\n💡 Next Steps:')
  console.log('  1. Click "Generate My AI Workout" button')
  console.log('  2. Check for intro-start-building-clicked flag')
  console.log('  3. Click "See How It Works" button')
  console.log('  4. Check for intro-learn-more-clicked flag')
  console.log('  5. Reload page and verify flags persist')
})()
