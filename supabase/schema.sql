-- ==============================================================================
-- Kiraeve Game Launcher - Complete Production Database Schema, RPC & RLS
-- ==============================================================================

-- 1. Helper function: Generate unique 6-char alphanumeric UID (e.g. KE-8F3A2B)
create or replace function public.generate_unique_user_uid()
returns text
language plpgsql
as $$
declare
  chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result text := '';
  i integer := 0;
  candidate text;
  found boolean;
begin
  loop
    result := '';
    for i in 1..6 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    end loop;
    candidate := 'KE-' || result;

    select exists(select 1 from public.profiles where uid = candidate) into found;
    if not found then
      return candidate;
    end if;
  end loop;
end;
$$;

-- 2. Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  uid text unique not null default public.generate_unique_user_uid(),
  email text,
  username text not null,
  avatar_url text,
  background_url text,
  bio text default 'Kiraeve Launcher Player',
  level integer default 1 not null,
  status text default 'online' not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_profiles_uid on public.profiles(uid);

-- 3. Games Catalog Table
create table if not exists public.games (
  id text primary key,
  title text not null,
  description text,
  banner_url text,
  screenshots text[] default '{}',
  github_repo text not null,
  exe_target text not null,
  version text default 'v1.0.0',
  category text default 'Action',
  tags text[] default '{}',
  is_active boolean default true not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 4. User Game Entitlements Table
create table if not exists public.user_game_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_uid text not null references public.profiles(uid) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  granted_at timestamptz default timezone('utc'::text, now()) not null,
  constraint uq_user_game unique (user_uid, game_id)
);

create index if not exists idx_entitlements_lookup on public.user_game_entitlements(user_uid, game_id);

-- 5. Product Keys Table
create table if not exists public.product_keys (
  code text primary key,
  game_id text not null references public.games(id) on delete cascade,
  is_redeemed boolean default false not null,
  redeemed_by_uid text references public.profiles(uid),
  redeemed_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 6. Friends Table
create table if not exists public.user_friends (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null references public.profiles(uid) on delete cascade,
  friend_uid text not null references public.profiles(uid) on delete cascade,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  constraint uq_friendship unique (owner_uid, friend_uid)
);

create index if not exists idx_friends_owner on public.user_friends(owner_uid);

-- 7. Auto-create Profile & Starter Game Entitlement Trigger on Auth Signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_uid text;
  raw_meta jsonb;
  resolved_name text;
  resolved_avatar text;
begin
  assigned_uid := public.generate_unique_user_uid();
  raw_meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  
  resolved_name := coalesce(
    raw_meta->>'username',
    raw_meta->>'user_name',
    raw_meta->>'full_name',
    raw_meta->>'name',
    split_part(new.email, '@', 1)
  );

  resolved_avatar := coalesce(
    raw_meta->>'avatar_url',
    raw_meta->>'picture',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
  );

  insert into public.profiles (id, uid, email, username, avatar_url)
  values (
    new.id,
    assigned_uid,
    new.email,
    resolved_name,
    resolved_avatar
  );

  -- Grant starter free game (kiraeve-pilot) automatically
  insert into public.user_game_entitlements (user_uid, game_id)
  values (assigned_uid, 'kiraeve-pilot')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8. Atomic Product Key Redemption RPC Function
create or replace function public.redeem_product_key(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_uid text;
  v_key record;
begin
  -- Find caller's permanent UID
  select uid into v_caller_uid
  from public.profiles
  where id = auth.uid();

  if v_caller_uid is null then
    return jsonb_build_object('ok', false, 'message', 'ไม่พบข้อมูลโปรไฟล์ผู้ใช้ในระบบ');
  end if;

  -- Lock & lookup product key
  select * into v_key
  from public.product_keys
  where upper(code) = upper(trim(p_code))
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'รหัสผลิตภัณฑ์ไม่ถูกต้อง กรุณาติดต่อซื้อคีย์ผ่าน Discord');
  end if;

  if v_key.is_redeemed then
    return jsonb_build_object('ok', false, 'message', 'รหัสคีย์นี้ถูกใช้งานไปแล้วโดย UID: ' || coalesce(v_key.redeemed_by_uid, 'Unknown'));
  end if;

  -- Mark key as redeemed
  update public.product_keys
  set is_redeemed = true,
      redeemed_by_uid = v_caller_uid,
      redeemed_at = timezone('utc'::text, now())
  where code = v_key.code;

  -- Grant game entitlement to caller UID
  insert into public.user_game_entitlements (user_uid, game_id)
  values (v_caller_uid, v_key.game_id)
  on conflict (user_uid, game_id) do nothing;

  return jsonb_build_object(
    'ok', true,
    'message', 'เปิดใช้งานรหัสคีย์สำเร็จ! เกมถูกผูกเข้ากับ UID (' || v_caller_uid || ') ถาวรแล้ว',
    'game_id', v_key.game_id
  );
end;
$$;

-- 9. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.user_game_entitlements enable row level security;
alter table public.product_keys enable row level security;
alter table public.user_friends enable row level security;

-- Profiles Policies
drop policy if exists "Anyone authenticated can read profiles by UID" on public.profiles;
create policy "Anyone authenticated can read profiles by UID"
  on public.profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Games Policies
drop policy if exists "Anyone can view active games" on public.games;
create policy "Anyone can view active games"
  on public.games for select
  using (is_active = true);

-- Entitlements Policies
drop policy if exists "Users can view their own entitlements" on public.user_game_entitlements;
create policy "Users can view their own entitlements"
  on public.user_game_entitlements for select
  using (
    user_uid in (
      select p.uid from public.profiles p where p.id = auth.uid()
    )
  );

-- Friends Policies
drop policy if exists "Users can view their own friends" on public.user_friends;
create policy "Users can view their own friends"
  on public.user_friends for select
  using (
    owner_uid in (
      select p.uid from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists "Users can add their own friends" on public.user_friends;
create policy "Users can add their own friends"
  on public.user_friends for insert
  with check (
    owner_uid in (
      select p.uid from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists "Users can delete their own friends" on public.user_friends;
create policy "Users can delete their own friends"
  on public.user_friends for delete
  using (
    owner_uid in (
      select p.uid from public.profiles p where p.id = auth.uid()
    )
  );

-- 10. Seed Production Games Catalog
insert into public.games (id, title, description, banner_url, github_repo, exe_target, version, category, tags, is_active)
values
  (
    'kiraeve-pilot',
    'Kiraeve Pilot',
    'High-speed zero-gravity tactical action game featuring reactive thruster physics, orbital combat arenas, and procedural environments.',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1400&q=80',
    'kiraeve/kiraeve-pilot',
    'KiraevePilot.exe',
    'v1.0.2',
    'Sci-Fi Action',
    ARRAY['Action', 'Indie', 'Zero-G', 'Singleplayer'],
    true
  ),
  (
    'kira-space-odyssey',
    'Space Odyssey: Kira',
    'Deep space survival simulation featuring zero-gravity exploration, modular orbital station construction, and intergalactic trading routes.',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=80',
    'kiraeve/space-odyssey',
    'SpaceOdyssey.exe',
    'v1.0.4',
    'Space Simulation',
    ARRAY['Simulation', 'Open World', 'Sci-Fi', 'Base Building'],
    true
  ),
  (
    'neon-cyber-drift',
    'Cyber Drift 2088',
    'High-octane synthwave racing game with retro-futuristic hovercrafts, customizable plasma engines, and neon-lit megacity highways.',
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1400&q=80',
    'kiraeve/cyber-drift',
    'CyberDrift.exe',
    'v0.9.5',
    'Arcade Racing',
    ARRAY['Racing', 'Cyberpunk', 'Multiplayer', 'Synthwave'],
    true
  )
on conflict (id) do nothing;

-- 11. Seed Initial Product Keys
insert into public.product_keys (code, game_id)
values
  ('KIRA-ODYSSEY-001', 'kira-space-odyssey'),
  ('KIRA-ODYSSEY-002', 'kira-space-odyssey'),
  ('KIRA-CYBER-001', 'neon-cyber-drift'),
  ('KIRA-CYBER-002', 'neon-cyber-drift')
on conflict (code) do nothing;
