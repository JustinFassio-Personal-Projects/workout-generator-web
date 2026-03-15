# Redirects migrated from nextjs-backend (next.config.js)

This list is the 1:1 mapping of every redirect from `apps/nextjs-backend/next.config.js` for use on astro-site (e.g. in `vercel.json`). All are **permanent (301)**.

**External base:** Redirects to the app use `https://app.aiworkoutgenerator.com` (nextjs-backend’s `NEXT_PUBLIC_APP_URL`). If astro-site uses a different app URL, replace that base in `vercel.json`.

---

## 1. Folder wildcards (WordPress / legacy)

| Source | Destination |
|--------|-------------|
| `/workout-summary/:path*` | `/generate` |
| `/fitness-program/:path*` | `/generate` |
| `/workouts/:path*` | `/generate` |
| `/project/:path*` | `/generate` |
| `/project_tag/:path*` | `/generate` |
| `/project_category/:path*` | `/generate` |
| `/author/:path*` | `/` |
| `/category/:path*` | `/blog` |

---

## 2. Home

| Source | Destination |
|--------|-------------|
| `/home` | `/` |
| `/home/` | `/` |

---

## 3. Blog post slugs (root → /blog/:slug)

| Source | Destination |
|--------|-------------|
| `/ai-will-revolutionize-your-approach-to-fitness` | `/blog/ai-will-revolutionize-your-approach-to-fitness` |
| `/ai-will-revolutionize-your-approach-to-fitness/` | `/blog/ai-will-revolutionize-your-approach-to-fitness` |
| `/the-power-of-functional-fitness` | `/blog/the-power-of-functional-fitness` |
| `/the-power-of-functional-fitness/` | `/blog/the-power-of-functional-fitness` |
| `/ai-fitness-trainers` | `/blog/ai-fitness-trainers` |
| `/ai-fitness-trainers/` | `/blog/ai-fitness-trainers` |
| `/tacp-school-house-workout-1990s` | `/blog/tacp-school-house-workout-1990s` |
| `/tacp-school-house-workout-1990s/` | `/blog/tacp-school-house-workout-1990s` |
| `/football-accelleration-decelleration-workout` | `/blog/football-accelleration-decelleration-workout` |
| `/football-accelleration-decelleration-workout/` | `/blog/football-accelleration-decelleration-workout` |
| `/can-ai-generated-workouts-boost-gym-revenue` | `/blog/can-ai-generated-workouts-boost-gym-revenue` |
| `/can-ai-generated-workouts-boost-gym-revenue/` | `/blog/can-ai-generated-workouts-boost-gym-revenue` |
| `/mobility-exercises-for-golfers` | `/blog/mobility-exercises-for-golfers` |
| `/mobility-exercises-for-golfers/` | `/blog/mobility-exercises-for-golfers` |
| `/ai-generated-dumbbell-chest-workout` | `/blog/ai-generated-dumbbell-chest-workout` |
| `/ai-generated-dumbbell-chest-workout/` | `/blog/ai-generated-dumbbell-chest-workout` |
| `/ai-generated-high-intensity-workout` | `/blog/ai-generated-high-intensity-workout` |
| `/ai-generated-high-intensity-workout/` | `/blog/ai-generated-high-intensity-workout` |
| `/ai-generated-micro-workout` | `/blog/ai-generated-micro-workout` |
| `/ai-generated-micro-workout/` | `/blog/ai-generated-micro-workout` |
| `/ai-workout-female-38yrs-active-runner-high-intensity` | `/blog/ai-workout-female-38yrs-active-runner-high-intensity` |
| `/ai-workout-female-38yrs-active-runner-high-intensity/` | `/blog/ai-workout-female-38yrs-active-runner-high-intensity` |

---

## 4. External → app (login/signup)

| Source | Destination |
|--------|-------------|
| `/login` | `https://app.aiworkoutgenerator.com/login` |
| `/login/` | `https://app.aiworkoutgenerator.com/login` |
| `/react-login` | `https://app.aiworkoutgenerator.com/login` |
| `/react-login/` | `https://app.aiworkoutgenerator.com/login` |
| `/workout-generator-registration` | `https://app.aiworkoutgenerator.com/signup` |
| `/workout-generator-registration/` | `https://app.aiworkoutgenerator.com/signup` |
| `/build/login` | `https://app.aiworkoutgenerator.com/login` |
| `/features/login` | `https://app.aiworkoutgenerator.com/login` |
| `/features/login/` | `https://app.aiworkoutgenerator.com/login` |
| `/register` | `https://app.aiworkoutgenerator.com/signup` |
| `/register/` | `https://app.aiworkoutgenerator.com/signup` |

---

## 5. Marketing → hash / home

| Source | Destination |
|--------|-------------|
| `/pricing` | `/#pricing` |
| `/pricing/` | `/#pricing` |
| `/purchase` | `/#pricing` |
| `/purchase/` | `/#pricing` |
| `/how-it-works` | `/#journey` |
| `/how-it-works/` | `/#journey` |
| `/ai-generated-workouts` | `/` |
| `/ai-generated-workouts/` | `/` |
| `/explorer` | `/` |
| `/explorer/` | `/` |
| `/trailblazer` | `/` |
| `/trailblazer/` | `/` |
| `/workout-generator-app` | `/` |
| `/workout-generator-app/` | `/` |
| `/blog/` | `/blog` |

---

## 6. Other → home

| Source | Destination |
|--------|-------------|
| `/api-documentation` | `/` |
| `/api-documentation/` | `/` |
| `/contact` | `/` |
| `/privacy-policy` | `/` |
| `/privacy-policy/` | `/` |
| `/physical-information` | `/` |
| `/physical-information/` | `/` |
| `/prompt` | `/` |
| `/prompt/` | `/` |
| `/membership-account/:path*` | `/` |

---

## Total

- **8** wildcard/pattern redirects  
- **2** home redirects  
- **22** blog-post redirects (11 slugs × 2 for trailing slash)  
- **11** app login/signup redirects  
- **15** marketing/hash/home redirects  
- **10** other → home redirects  

**68** redirect entries in total (same as in next.config.js).

---

## Note on `/generate`

The wildcard redirects in **§1** send traffic to **`/generate`**. If astro-site does not have a `/generate` page, add one redirect in `vercel.json` so that `/generate` (and any path under it) goes to the app, e.g.:

- `{ "source": "/generate", "destination": "https://app.aiworkoutgenerator.com/generate", "permanent": true }`
- `{ "source": "/generate/:path*", "destination": "https://app.aiworkoutgenerator.com/generate/:path*", "permanent": true }`

Adjust the app URL if your production app base is different.
