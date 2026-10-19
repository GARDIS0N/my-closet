# MyCloset — Intelligent Digital Wardrobe & AI Stylist

[![GitHub Pages](https://img.shields.io/badge/Live_Demo-GitHub_Pages-1E392A?style=for-the-badge&logo=github)](https://gardis0n.github.io/my-closet/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

🌐 **Live Demo**: [https://gardis0n.github.io/my-closet/](https://gardis0n.github.io/my-closet/)

**MyCloset** is a modern, responsive digital wardrobe and AI styling application built with React 19, TypeScript, Vite, Tailwind CSS, and Supabase. It allows users to digitize their actual clothing pieces, curate custom looks on an interactive flatlay canvas, schedule outfits onto a calendar, and receive intelligent daily styling recommendations based on weather, color harmony, and occasion.

---

## 🌟 Key Features

### 1. Curated Fashion Design & UX
- **Luxury Aesthetic**: Clean off-white/cream palette (`#FAF7F2`), rich charcoal typography (`#1C1917`), subtle forest-green accents (`#1E392A`), and gold highlights (`#C2A674`).
- **Responsive Layout**: Dedicated bottom navigation bar on mobile phones and structured sidebar on desktop.
- **Micro-Interactions**: Skeleton loaders, smooth modals, confirmation before deletions, and toast alerts.

### 2. Personal AI Virtual Dressing Room (Try-On Studio)
- **Personal Silhouette Persona**: Securely upload and manage private full-body photos with lighting, angle, and backdrop guidelines.
- **Privacy & Consent Checklist**: Mandatory permission confirmation; images stored in private encrypted storage.
- **Garment Segmentation**: Accurately maps upper body, lower body, and outerwear, while docking footwear and accessories in dedicated accompanying sidebars.
- **Interactive Split-Comparison Slider**: Drag to compare user persona vs. virtual try-on simulation with real-time slider controls.
- **Honest AI Simulation Transparency**: Clear labeling as "AI Simulation (Preview)" with transparent provider status reporting.
- **Multi-Look Comparison Gallery**: Compare up to 2 looks side-by-side, favorite, and schedule.

### 3. Bulk Wardrobe Digitizer with Computer Vision
- **Multi-File Batch Uploads**: Drag and drop or select dozens of garments in a single session with mobile-optimized compression.
- **Gemini Vision Auto-Classification**: Auto-detects clothing category, dominant colors, accent colors, style, seasonality, and editorial descriptions.
- **Duplicate Detection**: Automatically flags similar garments against existing wardrobe items and within the upload batch.
- **Batch Review & Confirmation**: Edit any field before finalizing all items to the wardrobe with a single click.

### 4. Automated Outfit Combinations Engine
- **Full Wardrobe Combinatorial Search**: Automatically creates complete 2-to-5 piece looks pairing tops, bottoms, shoes, and outerwear.
- **Color Coordination & Silhouette Balance**: Evaluates neutral anchors, complementary pairs, and monochrome elegance.
- **Occasion Proposals**: Instantly generate tailored looks for Campus, Work, Dates, Casual Outings, and Formal Events.
- **100% Real Garment Integrity**: Never fabricates fictional clothes; every item links to real user records.
- **Clean Garment Integrity**: Exclusively selects garments marked `clean` (never recommends laundry items).
- **Custom Filters**: User can specify "Must Wear" pieces or items to avoid.
- **1-Click Actions**: "Wear Today" (schedules into calendar) or "Save as Outfit".

### 6. Outfit Calendar & Schedule
- **Calendar Views**: Interactive month, week, and day views.
- **Schedule Outfits**: Assign any saved outfit to a date with daily agenda notes.
- **Duplicate Prevention**: Detects if an outfit is already assigned to a date and confirms before duplicates.
- **Wear Tracking**: Mark outfits as worn today to update garment wear statistics.
- **Look History**: Archives past looks with date badges.

### 7. Personalized Dashboard
- **Contextual Greeting**: Time-aware greeting (`Good morning`, `Good afternoon`, `Good evening`).
- **Live Wardrobe Stats**: Total garments, clean pieces, laundry count, and saved looks.
- **Today's Look Card**: Instant view of today's scheduled outfit with 1-click worn logging.
- **Featured Recommendation**: Prominent daily recommendation tailored to the user's preferred style.
- **Recent Additions & Favorites**: Quick carousel previews.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript
- **Bundler & Build**: Vite 8, Rolldown
- **Styling**: Tailwind CSS 4, Google Fonts (*Playfair Display* & *Plus Jakarta Sans*)
- **Icons**: Lucide React
- **Database & Storage**:
  - **Cloud Mode**: Supabase (PostgreSQL, Row Level Security, Supabase Storage)
  - **Local Mode**: IndexedDB (`idb`) persistent storage adapter with client-side image compression
- **Deployment**: Vercel ready (`vercel.json`)

---

## 🚀 Quick Start & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

If you do not have Supabase credentials yet, **MyCloset will run automatically in Local Persistent Mode using IndexedDB**. All uploaded photos, garments, outfits, and calendar schedules will persist across browser reloads!

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```

### 5. Run Test Suite
```bash
npm test
```

---

## 🗄️ Supabase Cloud Database Setup

To enable Supabase Cloud synchronization:

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Paste the contents of `supabase/migrations/20261018000000_mycloset_schema.sql` and run it.
4. Go to **Project Settings > API** and copy your `Project URL` and `anon public` key.
5. Add them to `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
6. Reload the app. The bottom indicator in the sidebar/settings will confirm **Supabase Cloud Synchronized**!

---

## ☁️ Deploying to Vercel

1. Push your repository to GitHub / GitLab / Bitbucket.
2. In Vercel, click **Add New Project** and select this repository.
3. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**. Vercel will build using `vite build` and serve from `dist/` with full SPA rewrite routing handled by `vercel.json`.
