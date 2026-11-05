# Project Context & Decisions (NAT)

> Last Updated: 2026-11-03T03:36:00+07:00
> Status: Active (Navigation Cleaned & Verified)
> Mode: Production Implementation

## 1. Project Overview & Goal
Build a dedicated desktop Game Launcher (Steam-like client) for the creator's games.
The launcher handles authentication, game entitlements via user UID, game downloading, auto-updating via GitHub, and launching game executables.

## 2. Confirmed Features (Steam Match)
- **Top Caption Bar & Window Controls**:
  - Top row: `Steam  View  Friends  Games  Help` micro-menu on the left, native-styled Windows controls (`-`, `□`, `✕`) flush against top-right corner.
  - Second row: Main Steam tabs (`STORE`, `LIBRARY`, `COMMUNITY`, `[USERNAME]`, `SUPPORT`) without back/forward clutter.
  - Right: Authentic Steam User Profile widget with avatar, status frame, username, UID, dropdown chevron, and friends button.
  - User Dropdown: View profile, Account details & settings, Sign out of account.
- **Steam Profile Page**:
  - Full-page Steam Community layout with large avatar, status frame, Level 15 badge, recent activity, badges showcase, bio, and permanent UID copy.
  - Direct local file upload for Avatar and Background image.
  - Working Sign Out button.
- **Friends List with Name Search**:
  - Real-time search by **Username**, UID, or current playing game.
  - Status tabs: All, In-Game, Online, Offline.
- **Dedicated Help & Support Page**:
  - Searchable FAQs, troubleshooting guides, quick links for activation and settings, account diagnostics.
- **UX Animations & Polish**:
  - Smooth page entrance animations (`animate-page-enter`).
  - Subtle card glow and elevation on hover (`steam-card-glow`).
  - Interactive click and transition states across all buttons and tabs.

## 3. Technology Stack & Rationale
| Component | Technology | Rationale / Key Reason |
| :--- | :--- | :--- |
| Launcher Core | Tauri 2.0 (Rust) | Ultra-lightweight (~15MB), low RAM, fast native process spawning and file I/O |
| Frontend UI | React + Vite + Tailwind CSS + Lucide | Authentic Steam dark navy palette (`#171d25`, `#1b2838`, `#2a475e`, `#66c0f4`) |
| Backend & Auth | Supabase (PostgreSQL + Auth + Edge Functions) | Managed OAuth, RLS security, and secure Edge proxy for private repo downloads |
| Distribution | GitHub Private Releases | Free private asset storage; download requests signed/proxied by Supabase |

## 4. Current Implementation State
- [x] Back & Forward buttons removed from header.
- [x] Steam Client UX fully overhauled & live:
  - Redesigned Top Header & User Widget with Steam Account dropdown.
  - Window controls aligned flush to top-right corner with 44px hitboxes.
  - Working Sign Out flow in Header dropdown, Profile page, and Settings.
  - `HelpPage.tsx` implemented and wired to Help menu & top Support tab.
  - `FriendsModal.tsx` upgraded with real-time Username & Game search + status filters.
  - `ProfilePage.tsx` upgraded with local Avatar/Background file upload and Sign Out button.
  - `StorePage.tsx` and `GameDetails.tsx` polished with Steam card glows and page animations.
- [x] Verified zero TypeScript/build errors (`pnpm build` exited 0).
- [x] Live Dev Server running at `http://localhost:1420`.
- [x] Supabase SQL schema created in `supabase/schema.sql`.
- [x] Tauri 2.0 Rust backend scaffolded (`src-tauri/`).
- [ ] Visual Studio C++ Desktop workload for final .exe compilation.
