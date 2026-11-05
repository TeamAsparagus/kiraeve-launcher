---
name: supabase-launcher
description: >
  Supabase architecture, schema design, authentication, and Row Level Security (RLS)
  for Kiraeve Game Launcher. Manages profiles, games catalog, and user UID entitlements.
  Trigger: /supabase-launcher, /supabase.
argument-hint: "[schema|auth|entitlements]"
---

# Supabase Launcher Skill (Auth & Entitlements)

Conventions, database schemas, and security policies for Kiraeve Game Launcher's Supabase backend.

## 1. Data Model & Tables

### `profiles`
Stores extended user profile with permanent custom UID.
- `id`: `uuid primary key references auth.users(id) on delete cascade`
- `uid`: `text unique not null` (e.g. `KE-10001` or short deterministic identifier)
- `username`: `text`
- `avatar_url`: `text`
- `created_at`: `timestamptz default now()`

### `games`
Catalog of games registered in the launcher.
- `id`: `text primary key` (slug, e.g. `kira-project-alpha`)
- `title`: `text not null`
- `description`: `text`
- `banner_url`: `text`
- `github_repo`: `text not null` (e.g. `username/repo-name`)
- `exe_target`: `text not null` (relative binary path inside archive, e.g. `Game.exe`)
- `is_active`: `boolean default true`
- `created_at`: `timestamptz default now()`

### `user_game_entitlements`
Defines game access per user UID.
- `id`: `uuid primary key default gen_random_uuid()`
- `user_uid`: `text not null references profiles(uid) on delete cascade`
- `game_id`: `text not null references games(id) on delete cascade`
- `granted_at`: `timestamptz default now()`
- Unique constraint: `(user_uid, game_id)`

## 2. Row Level Security (RLS) Policies
- **`profiles`**:
  - Select: Public or authenticated user can view their own profile.
  - Insert / Update: Restricted to trigger or user matching `auth.uid() = id`.
- **`games`**:
  - Select: Authenticated users can view active games.
  - Insert / Update / Delete: Admin only (service role).
- **`user_game_entitlements`**:
  - Select: User can only view records where `user_uid` matches their own profile's `uid`.
  - Insert / Update / Delete: Admin only (service role).

## 3. Client Verification Flow
1. User logs in with Google or Discord OAuth.
2. Launcher queries `profiles` using authenticated session to retrieve user's permanent `uid`.
3. Launcher queries `user_game_entitlements` joining `games` where `user_uid = profile.uid`.
4. Launcher unlocks play/download buttons only for authorized games.
