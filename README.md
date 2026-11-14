# ក្រុមខ្មែរតែមួយ (Khmer Team One) - Team Registration Management System

A bilingual **Team Registration Management System** built with **React 19, Vite 8, Tailwind CSS v4, and Supabase PostgreSQL**, styled with a modern Sports Management UI (`#101C32` Navy Blue, `#2563EB` Accent Blue, `#F8FAFC` Light Gray).

---

## Key Features

1. **Sports Management UI & Official Branding**:
   - Official **ក្រុមខ្មែរតែមួយ (Khmer Team One)** circular emblem preserved (`public/logo.jpg`) alongside real club squad photos (`public/images/club-pitch.jpg`, `team-red.jpg`, `team-blue.jpg`).
   - Full **English & Khmer (`Kantumruy Pro`)** bilingual interface with one-click switcher (`ខ្មែរ | EN`).

2. **Image Integration (Local Mode & Supabase Storage)**:
   - **Event Cover Images**: Upload or pick a club preset banner on event create/edit.
   - **Team Logos**: Custom square badges per Team A, Team B, and Team C.
   - **Player Avatars**: Optional profile picture upload during registration or admin edit.
   - Enforces **JPG / PNG / WEBP** format and **3 MB** maximum file size with automatic image fallbacks.

3. **Member Registration & Live Read-Only Roster**:
   - Visual Team A / B / C selection cards with team colors, logos, captains, player counts, and taken player numbers.
   - Duplicate player name and duplicate player key number validation.
   - Search and team filter controls across the live roster.

4. **Reports & Exports**:
   - Printable **Event Report** with mobile cards and desktop tables.
   - **A4 Vector PDF Export** (`jsPDF` + `jspdf-autotable`) and **2x Retina PNG Export** (`Canvas 2D`).
   - QR Code share modal with downloadable QR code.

5. **Security-Hardened Supabase Backend**:
   - Non-destructive migration (`supabase/migrations/20261114_upgrade_security_and_images.sql`) revokes direct anonymous table privileges and routes admin reads/writes through `SECURITY DEFINER` RPCs validated against `admin_sessions`.
   - Image uploads in Supabase mode run through the `upload-media` Edge Function using server-side `SUPABASE_SERVICE_ROLE_KEY`.

---

## Quick Run Locally (Windows & VS Code)

```powershell
cd "D:\Year  4\team-registration-system"
npm install
npm run dev
```

- Open `http://localhost:5173/` in your browser.
- Default Admin Access Code in local seed mode: `REACH701631`.
- Verification commands:
  - `npm run lint`
  - `npm run build`
  - `node test_calculations.js`

---

## Live Supabase Setup & Migration Steps

When `.env` is left blank, the app runs in **Local Storage Engine** mode automatically. To enable live Supabase PostgreSQL & Storage:

1. **Run Schema & Security Migration** in the Supabase SQL Editor:
   - Run `supabase/migrations/20261114_upgrade_security_and_images.sql` and `supabase/migrations/20261114_club_members.sql` on an existing database (non-destructive), or `supabase/schema.sql` followed by those migrations for a fresh database.
2. **Create Public Media Storage Bucket**:
   - Run `supabase/storage_setup.sql` in the Supabase SQL Editor to configure the `team-media` bucket (3 MB limit, JPG/PNG/WEBP).
3. **Deploy the `upload-media` Edge Function**:
   ```powershell
   supabase functions deploy upload-media
   ```
   Ensure the Edge Function has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets configured in Supabase (never put `SUPABASE_SERVICE_ROLE_KEY` in `.env` or frontend files).
4. **Set Environment Variables** in `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   VITE_APP_URL=https://your-deployed-app-url.com
   ```
