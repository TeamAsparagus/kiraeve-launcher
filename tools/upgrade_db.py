import os
import json
import urllib.request
import sys

def load_env(env_path: str):
    if not os.path.exists(env_path):
        return
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip("'\""))

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_env(os.path.join(ROOT_DIR, ".env"))

TOKEN = os.getenv("SUPABASE_ACCESS_TOKEN")
REF = "ntpzvcybfulilwxjlxng"

if not TOKEN:
    print("Error: SUPABASE_ACCESS_TOKEN missing")
    sys.exit(1)

SQL = """
-- 1. Friend Select Policy allows both sides
drop policy if exists "Users can view their own friends" on public.user_friends;
create policy "Users can view their own friends"
  on public.user_friends for select
  using (
    owner_uid in (select p.uid from public.profiles p where p.id = auth.uid())
    or
    friend_uid in (select p.uid from public.profiles p where p.id = auth.uid())
  );

-- 2. Bidirectional Friend Addition RPC
create or replace function public.add_friend_bidirectional(p_friend_uid text, p_caller_uid text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_uid text;
  v_friend record;
begin
  if auth.uid() is not null then
    select uid into v_caller_uid from public.profiles where id = auth.uid();
  end if;
  if v_caller_uid is null and p_caller_uid is not null then
    select uid into v_caller_uid from public.profiles where upper(uid) = upper(trim(p_caller_uid));
  end if;

  if v_caller_uid is null then
    return jsonb_build_object('ok', false, 'message', 'User profile not found');
  end if;

  if upper(trim(p_friend_uid)) = upper(v_caller_uid) then
    return jsonb_build_object('ok', false, 'message', 'Cannot add yourself as friend');
  end if;

  select * into v_friend from public.profiles where upper(uid) = upper(trim(p_friend_uid));
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Player UID not found: ' || p_friend_uid);
  end if;

  insert into public.user_friends (owner_uid, friend_uid)
  values (v_caller_uid, v_friend.uid)
  on conflict (owner_uid, friend_uid) do nothing;

  insert into public.user_friends (owner_uid, friend_uid)
  values (v_friend.uid, v_caller_uid)
  on conflict (owner_uid, friend_uid) do nothing;

  return jsonb_build_object('ok', true, 'message', 'Friend added successfully', 'friend_username', v_friend.username);
end;
$$;

-- 3. Robust Key Redemption RPC
create or replace function public.redeem_product_key(p_code text, p_user_uid text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_uid text;
  v_key record;
begin
  if auth.uid() is not null then
    select uid into v_caller_uid from public.profiles where id = auth.uid();
  end if;
  if v_caller_uid is null and p_user_uid is not null then
    select uid into v_caller_uid from public.profiles where upper(uid) = upper(trim(p_user_uid));
  end if;

  if v_caller_uid is null then
    return jsonb_build_object('ok', false, 'message', 'User profile not found');
  end if;

  select * into v_key
  from public.product_keys
  where upper(code) = upper(trim(p_code))
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Invalid product key. Buy key via Discord');
  end if;

  if v_key.is_redeemed then
    return jsonb_build_object('ok', false, 'message', 'Key already redeemed');
  end if;

  update public.product_keys
  set is_redeemed = true,
      redeemed_by_uid = v_caller_uid,
      redeemed_at = timezone('utc'::text, now())
  where code = v_key.code;

  insert into public.user_game_entitlements (user_uid, game_id)
  values (v_caller_uid, v_key.game_id)
  on conflict (user_uid, game_id) do nothing;

  return jsonb_build_object(
    'ok', true,
    'message', 'Key redeemed successfully! Game unlocked on UID ' || v_caller_uid,
    'game_id', v_key.game_id
  );
end;
$$;

-- 4. Robust Update Profile RPC
create or replace function public.update_profile_info(p_uid text, p_username text, p_avatar_url text, p_bio text, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set username = coalesce(nullif(trim(p_username), ''), username),
      avatar_url = coalesce(nullif(trim(p_avatar_url), ''), avatar_url),
      bio = coalesce(p_bio, bio),
      status = coalesce(nullif(trim(p_status), ''), status),
      updated_at = timezone('utc'::text, now())
  where upper(uid) = upper(trim(p_uid));

  return jsonb_build_object('ok', true);
end;
$$;
"""

url = f"https://api.supabase.com/v1/projects/{REF}/database/query"
req = urllib.request.Request(
    url,
    data=json.dumps({"query": SQL}).encode("utf-8"),
    headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as resp:
        print("MIGRATION APPLIED SUCCESSFULLY:", resp.read().decode())
except Exception as e:
    print("MIGRATION ERROR:", e)
