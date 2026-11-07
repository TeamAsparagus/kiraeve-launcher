#!/usr/bin/env python3
"""
Kiraeve Launcher - Game Entitlement & Product Key Manager.
Grant games to players via UID or generate Activation Keys for Discord sales.
"""

import argparse
import json
import os
import random
import string
import sys
import urllib.request
import urllib.error

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

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://ntpzvcybfulilwxjlxng.supabase.co")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SERVICE_KEY:
    print("Error: SUPABASE_SERVICE_ROLE_KEY is required in .env")
    sys.exit(1)

def req_supabase(endpoint: str, method="GET", payload=None) -> list | dict:
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{endpoint.lstrip('/')}"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            resp_body = res.read().decode("utf-8")
            if not resp_body:
                return {}
            return json.loads(resp_body)
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        raise RuntimeError(f"Supabase Error ({e.code}): {err_msg}")

def generate_key_code(game_id: str) -> str:
    prefix = "ANIME" if "anime" in game_id else "KIRA"
    chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    part1 = "".join(random.choices(chars, k=4))
    part2 = "".join(random.choices(chars, k=4))
    return f"{prefix}-{part1}-{part2}"

def cmd_list_users():
    users = req_supabase("profiles?select=uid,username,email,created_at&order=created_at.desc")
    print("\n=== Registered Launcher Users ===")
    print(f"{'UID':<12} | {'Username':<20} | {'Email':<25}")
    print("-" * 62)
    for u in users:
        print(f"{u['uid']:<12} | {u['username']:<20} | {u.get('email') or 'N/A':<25}")
    print(f"\nTotal: {len(users)} users.")

def cmd_grant(uid: str, game_id: str):
    uid = uid.strip().upper()
    # Check if user exists
    profiles = req_supabase(f"profiles?uid=eq.{uid}&select=uid,username")
    if not profiles:
        print(f"Error: User with UID '{uid}' not found in database!")
        return

    username = profiles[0]["username"]
    payload = {"user_uid": uid, "game_id": game_id}
    try:
        req_supabase("user_game_entitlements", method="POST", payload=payload)
        print(f"\n[SUCCESS] Granted game '{game_id}' to user '{username}' (UID: {uid})!")
        print("The player can now see the game unlocked and ready to play in their Launcher.")
    except Exception as e:
        if "duplicate" in str(e).lower() or "uq_user_game" in str(e):
            print(f"User '{username}' ({uid}) already owns '{game_id}'.")
        else:
            print(f"Error granting game: {e}")

def cmd_revoke(uid: str, game_id: str):
    uid = uid.strip().upper()
    try:
        req_supabase(f"user_game_entitlements?user_uid=eq.{uid}&game_id=eq.{game_id}", method="DELETE")
        print(f"\n[SUCCESS] Revoked game '{game_id}' from UID '{uid}'.")
    except Exception as e:
        print(f"Error revoking game: {e}")

def cmd_create_key(game_id: str, count: int):
    print(f"\nGenerating {count} activation key(s) for '{game_id}'...")
    created_keys = []
    for _ in range(count):
        code = generate_key_code(game_id)
        payload = {
            "code": code,
            "game_id": game_id,
            "is_redeemed": False,
        }
        req_supabase("product_keys", method="POST", payload=payload)
        created_keys.append(code)

    print("\n=== Generated Activation Keys (Send to buyers) ===")
    for k in created_keys:
        print(f"  > {k}")
    print("\nPlayers can activate these keys in the Launcher via 'ใส่คีย์ (Redeem)'.")

def cmd_list_keys(game_id: str = None):
    endpoint = "product_keys?select=code,game_id,is_redeemed,redeemed_by_uid,redeemed_at&order=created_at.desc"
    if game_id:
        endpoint += f"&game_id=eq.{game_id}"
    keys = req_supabase(endpoint)
    print("\n=== Product Activation Keys ===")
    print(f"{'Key Code':<20} | {'Game':<15} | {'Status':<10} | {'Redeemed By UID':<15}")
    print("-" * 65)
    for k in keys:
        status = "REDEEMED" if k["is_redeemed"] else "AVAILABLE"
        by_uid = k.get("redeemed_by_uid") or "-"
        print(f"{k['code']:<20} | {k['game_id']:<15} | {status:<10} | {by_uid:<15}")
    print(f"\nTotal: {len(keys)} keys.")

def main():
    parser = argparse.ArgumentParser(description="Kiraeve Launcher Game Entitlements & Key Manager")
    subparsers = parser.add_subparsers(dest="action", help="Action to execute")

    # users
    subparsers.add_parser("users", help="List registered players and their UIDs")

    # grant
    grant_p = subparsers.add_parser("grant", help="Grant a game directly to a player by UID")
    grant_p.add_argument("--uid", required=True, help="Player UID (e.g. KE-XXXXXX)")
    grant_p.add_argument("--game", default="anime-battle", help="Game ID (default: anime-battle)")

    # revoke
    revoke_p = subparsers.add_parser("revoke", help="Revoke a game from a player by UID")
    revoke_p.add_argument("--uid", required=True, help="Player UID")
    revoke_p.add_argument("--game", default="anime-battle", help="Game ID")

    # create-key
    key_p = subparsers.add_parser("create-key", help="Generate activation keys for Discord sales")
    key_p.add_argument("--game", default="anime-battle", help="Game ID (default: anime-battle)")
    key_p.add_argument("--count", type=int, default=1, help="Number of keys to generate (default: 1)")

    # list-keys
    lkey_p = subparsers.add_parser("keys", help="List activation keys and redemption status")
    lkey_p.add_argument("--game", default=None, help="Filter by Game ID")

    args = parser.parse_args()

    if args.action == "users":
        cmd_list_users()
    elif args.action == "grant":
        cmd_grant(args.uid, args.game)
    elif args.action == "revoke":
        cmd_revoke(args.uid, args.game)
    elif args.action == "create-key":
        cmd_create_key(args.game, args.count)
    elif args.action == "keys":
        cmd_list_keys(args.game)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
