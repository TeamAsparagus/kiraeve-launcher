#!/usr/bin/env python3
"""
Asparagus Launcher - Admin Control Console Server
Allows administrators to generate game keys, activate/revoke games for users, and manage player accounts.
Credentials: username: admin / password: changeme123
"""

import http.server
import json
import os
import random
import secrets
import string
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENV_PATH = os.path.join(ROOT_DIR, ".env")

def load_env(path: str):
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip("'\""))

load_env(ENV_PATH)

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://ntpzvcybfulilwxjlxng.supabase.co")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "changeme123")

ACTIVE_SESSIONS = set()

def req_supabase(endpoint: str, method="GET", payload=None):
    if not SERVICE_KEY:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is missing in .env")
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
            body = res.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8")
        raise RuntimeError(f"Database Error ({e.code}): {err}")

def generate_key_code(game_id: str) -> str:
    prefix = "ANIME" if "anime" in game_id else "ASPARAGUS"
    chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    p1 = "".join(random.choices(chars, k=4))
    p2 = "".join(random.choices(chars, k=4))
    return f"{prefix}-{p1}-{p2}"

class AdminRequestHandler(http.server.BaseHTTPRequestHandler):
    def send_json(self, status: int, data: dict):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def send_html(self, html: str):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html.encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def parse_body(self) -> dict:
        content_len = int(self.headers.get("Content-Length", 0))
        if content_len == 0:
            return {}
        raw = self.rfile.read(content_len).decode("utf-8")
        try:
            return json.loads(raw)
        except:
            return {}

    def is_authenticated(self) -> bool:
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:].strip()
            return token in ACTIVE_SESSIONS
        return False

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path

        if path == "/" or path == "/index.html":
            self.send_html(ADMIN_HTML)
            return

        if path == "/api/stats":
            if not self.is_authenticated():
                self.send_json(401, {"ok": False, "error": "Unauthorized"})
                return
            try:
                users = req_supabase("profiles?select=uid")
                keys = req_supabase("product_keys?select=is_redeemed")
                entitlements = req_supabase("user_game_entitlements?select=id")
                avail_keys = sum(1 for k in keys if not k.get("is_redeemed"))
                redeemed_keys = sum(1 for k in keys if k.get("is_redeemed"))
                self.send_json(200, {
                    "ok": True,
                    "stats": {
                        "total_users": len(users),
                        "total_keys": len(keys),
                        "available_keys": avail_keys,
                        "redeemed_keys": redeemed_keys,
                        "total_entitlements": len(entitlements)
                    }
                })
            except Exception as e:
                self.send_json(500, {"ok": False, "error": str(e)})
            return

        if path == "/api/users":
            if not self.is_authenticated():
                self.send_json(401, {"ok": False, "error": "Unauthorized"})
                return
            try:
                users = req_supabase("profiles?select=uid,username,email,created_at,level&order=created_at.desc")
                entitlements = req_supabase("user_game_entitlements?select=user_uid,game_id")
                
                # Map entitlements
                ent_map = {}
                for e in entitlements:
                    uid = e.get("user_uid")
                    ent_map.setdefault(uid, []).append(e.get("game_id"))

                for u in users:
                    u["games"] = ent_map.get(u["uid"], [])

                self.send_json(200, {"ok": True, "users": users})
            except Exception as e:
                self.send_json(500, {"ok": False, "error": str(e)})
            return

        if path == "/api/keys":
            if not self.is_authenticated():
                self.send_json(401, {"ok": False, "error": "Unauthorized"})
                return
            try:
                keys = req_supabase("product_keys?select=code,game_id,is_redeemed,redeemed_by_uid,created_at&order=created_at.desc")
                self.send_json(200, {"ok": True, "keys": keys})
            except Exception as e:
                self.send_json(500, {"ok": False, "error": str(e)})
            return

        self.send_json(404, {"error": "Not Found"})

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        body = self.parse_body()

        if path == "/api/login":
            username = body.get("username", "").strip()
            password = body.get("password", "").strip()
            if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
                token = secrets.token_hex(24)
                ACTIVE_SESSIONS.add(token)
                self.send_json(200, {"ok": True, "token": token, "admin": ADMIN_USERNAME})
            else:
                self.send_json(401, {"ok": False, "error": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"})
            return

        if path == "/api/logout":
            auth = self.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                token = auth[7:].strip()
                ACTIVE_SESSIONS.discard(token)
            self.send_json(200, {"ok": True})
            return

        # Protected endpoints below
        if not self.is_authenticated():
            self.send_json(401, {"ok": False, "error": "Unauthorized"})
            return

        if path == "/api/grant":
            uid = body.get("uid", "").strip().upper()
            game_id = body.get("game_id", "anime-battle").strip()
            if not uid:
                self.send_json(400, {"ok": False, "error": "กรุณาระบุ UID ของผู้เล่น"})
                return

            try:
                # Check user
                profiles = req_supabase(f"profiles?uid=eq.{uid}&select=uid,username")
                if not profiles:
                    self.send_json(404, {"ok": False, "error": f"ไม่พบผู้เล่นรหัส UID: {uid} ในระบบ"})
                    return

                username = profiles[0]["username"]
                payload = {"user_uid": uid, "game_id": game_id}
                try:
                    req_supabase("user_game_entitlements", method="POST", payload=payload)
                    self.send_json(200, {
                        "ok": True,
                        "message": f"เปิดสิทธิ์เกม '{game_id}' ให้ {username} ({uid}) สำเร็จแล้ว!"
                    })
                except Exception as e:
                    if "duplicate" in str(e).lower() or "uq_user_game" in str(e):
                        self.send_json(200, {
                            "ok": True,
                            "message": f"{username} ({uid}) มีสิทธิ์เกม '{game_id}' อยู่แล้ว"
                        })
                    else:
                        raise e
            except Exception as e:
                self.send_json(500, {"ok": False, "error": str(e)})
            return

        if path == "/api/revoke":
            uid = body.get("uid", "").strip().upper()
            game_id = body.get("game_id", "anime-battle").strip()
            if not uid:
                self.send_json(400, {"ok": False, "error": "กรุณาระบุ UID"})
                return
            try:
                req_supabase(f"user_game_entitlements?user_uid=eq.{uid}&game_id=eq.{game_id}", method="DELETE")
                self.send_json(200, {"ok": True, "message": f"ถอนสิทธิ์เกม '{game_id}' จาก UID {uid} สำเร็จ"})
            except Exception as e:
                self.send_json(500, {"ok": False, "error": str(e)})
            return

        if path == "/api/create-keys":
            game_id = body.get("game_id", "anime-battle").strip()
            count = int(body.get("count", 1))
            count = max(1, min(count, 100))

            try:
                created = []
                for _ in range(count):
                    code = generate_key_code(game_id)
                    payload = {
                        "code": code,
                        "game_id": game_id,
                        "is_redeemed": False,
                    }
                    req_supabase("product_keys", method="POST", payload=payload)
                    created.append(code)

                self.send_json(200, {
                    "ok": True,
                    "game_id": game_id,
                    "count": len(created),
                    "keys": created
                })
            except Exception as e:
                self.send_json(500, {"ok": False, "error": str(e)})
            return

        self.send_json(404, {"error": "Not Found"})

ADMIN_HTML = """<!DOCTYPE html>
<html lang="th" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Asparagus Admin Control Console</title>
  <link rel="icon" type="image/png" href="/logo.png">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Chakra Petch', sans-serif; background-color: #0b0e14; color: #c7d5e0; }
    .mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-screen flex flex-col">

  <!-- Login Overlay -->
  <div id="login-view" class="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0e14] p-4">
    <div class="w-full max-w-sm bg-[#151c27] border border-[#2a3a4f] rounded-xl shadow-2xl p-7 space-y-6">
      <div class="text-center space-y-2">
        <div class="w-14 h-14 mx-auto rounded-xl bg-[#1e2a3b] border border-[#2e425a] flex items-center justify-center text-3xl shadow-inner">
          🥦
        </div>
        <h1 class="text-xl font-black text-white uppercase tracking-wider">Asparagus Admin</h1>
        <p class="text-xs text-[#8f98a0]">ลงชื่อเข้าใช้เพื่อจัดการระบบคีย์และผู้เล่น</p>
      </div>

      <div id="login-error" class="hidden p-3 rounded bg-red-950/60 border border-red-500/50 text-xs text-red-200"></div>

      <form id="login-form" class="space-y-4">
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-[#1999ff] uppercase tracking-wider block">Username</label>
          <input type="text" id="username-input" value="admin" required
            class="w-full bg-[#0d121a] border border-[#253346] focus:border-[#1999ff] rounded px-3 py-2 text-xs text-white focus:outline-none transition-colors">
        </div>

        <div class="space-y-1">
          <label class="text-[11px] font-bold text-[#1999ff] uppercase tracking-wider block">Password</label>
          <input type="password" id="password-input" value="changeme123" required
            class="w-full bg-[#0d121a] border border-[#253346] focus:border-[#1999ff] rounded px-3 py-2 text-xs text-white focus:outline-none transition-colors">
        </div>

        <button type="submit" id="login-btn"
          class="w-full py-2.5 rounded bg-gradient-to-r from-[#1999ff] to-[#0078d4] hover:brightness-110 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#1999ff]/25 cursor-pointer">
          Sign In
        </button>
      </form>
    </div>
  </div>

  <!-- Main Console View -->
  <div id="main-view" class="hidden flex-1 flex flex-col">
    <!-- Top Navigation Bar -->
    <header class="h-14 bg-[#141b26] border-b border-[#212c3b] flex items-center justify-between px-6 select-none flex-shrink-0">
      <div class="flex items-center gap-3">
        <span class="text-2xl">🥦</span>
        <div>
          <span class="font-black text-white text-sm tracking-wider uppercase">ASPARAGUS CONTROL CENTER</span>
          <span class="ml-2 text-[10px] font-mono px-2 py-0.5 rounded bg-[#1f2d40] text-[#66c0f4] border border-[#2a3c54]">ADMIN v1.0.3</span>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 text-xs text-[#8f98a0]">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Logged in as <strong class="text-white" id="admin-name">admin</strong></span>
        </div>
        <button id="logout-btn" class="px-3 py-1.5 rounded bg-[#202937] hover:bg-red-950/40 hover:text-red-300 border border-[#2a3a4f] text-xs font-semibold text-[#8f98a0] transition-colors cursor-pointer">
          Sign Out
        </button>
      </div>
    </header>

    <!-- Stats Bar -->
    <div class="bg-[#0f141d] border-b border-[#1f2937] px-6 py-4">
      <div class="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-[#141b26] p-4 rounded-lg border border-[#212c3b]">
          <span class="text-[11px] font-bold text-[#8f98a0] uppercase block">ผู้เล่นที่ลงทะเบียนทั้งหมด</span>
          <span id="stat-users" class="text-2xl font-black text-white mono mt-1 block">...</span>
        </div>
        <div class="bg-[#141b26] p-4 rounded-lg border border-[#212c3b]">
          <span class="text-[11px] font-bold text-emerald-400 uppercase block">คีย์ที่พร้อมใช้งาน (Available)</span>
          <span id="stat-avail-keys" class="text-2xl font-black text-emerald-400 mono mt-1 block">...</span>
        </div>
        <div class="bg-[#141b26] p-4 rounded-lg border border-[#212c3b]">
          <span class="text-[11px] font-bold text-[#8f98a0] uppercase block">คีย์ที่ถูกใช้งานแล้ว (Redeemed)</span>
          <span id="stat-redeemed-keys" class="text-2xl font-black text-amber-400 mono mt-1 block">...</span>
        </div>
        <div class="bg-[#141b26] p-4 rounded-lg border border-[#212c3b]">
          <span class="text-[11px] font-bold text-[#1999ff] uppercase block">การเปิดสิทธิ์เกมสะสม (Active Entitlements)</span>
          <span id="stat-entitlements" class="text-2xl font-black text-[#1999ff] mono mt-1 block">...</span>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="bg-[#141b26] border-b border-[#212c3b] px-6">
      <div class="max-w-6xl mx-auto flex items-center gap-6">
        <button class="nav-tab active py-3 text-xs font-bold uppercase tracking-wider text-[#1999ff] border-b-2 border-[#1999ff] cursor-pointer" data-tab="tab-generate">
          ⚡ สร้างคีย์เปิดเกม (Generate Keys)
        </button>
        <button class="nav-tab py-3 text-xs font-bold uppercase tracking-wider text-[#8f98a0] hover:text-white cursor-pointer" data-tab="tab-grant">
          👤 ปลดล็อกเกมให้ผู้เล่น (Direct Activate)
        </button>
        <button class="nav-tab py-3 text-xs font-bold uppercase tracking-wider text-[#8f98a0] hover:text-white cursor-pointer" data-tab="tab-users">
          👥 รายชื่อผู้เล่นทั้งหมด (Users List)
        </button>
        <button class="nav-tab py-3 text-xs font-bold uppercase tracking-wider text-[#8f98a0] hover:text-white cursor-pointer" data-tab="tab-keys">
          🔑 คลังคีย์ทั้งหมด (Keys Inventory)
        </button>
      </div>
    </div>

    <!-- Tab Contents Container -->
    <main class="flex-1 p-6 overflow-y-auto">
      <div class="max-w-6xl mx-auto">

        <!-- TAB 1: Key Generator -->
        <section id="tab-generate" class="tab-content space-y-6">
          <div class="bg-[#141b26] border border-[#212c3b] rounded-xl p-6 space-y-5">
            <div>
              <h2 class="text-base font-bold text-white uppercase tracking-wider">สร้างคีย์เปิดใช้งานเกม (Product Key Generator)</h2>
              <p class="text-xs text-[#8f98a0] mt-0.5">คีย์ที่สร้างจะถูกบันทึกลงฐานข้อมูล Supabase อัตโนมัติ สามารถก๊อปปี้ส่งให้ลูกค้าใน Discord นำไปใส่ใน Launcher ได้ทันที</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div class="space-y-1">
                <label class="text-[11px] font-bold text-[#1999ff] uppercase tracking-wider block">เลือกเกมที่ต้องการ</label>
                <select id="gen-game" class="w-full bg-[#0d121a] border border-[#253346] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1999ff]">
                  <option value="anime-battle">Anime Battle (Official)</option>
                </select>
              </div>

              <div class="space-y-1">
                <label class="text-[11px] font-bold text-[#1999ff] uppercase tracking-wider block">จำนวนคีย์ที่ต้องการสร้าง</label>
                <select id="gen-count" class="w-full bg-[#0d121a] border border-[#253346] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1999ff]">
                  <option value="1">1 คีย์ (สำหรับลูกค้า 1 ราย)</option>
                  <option value="5">5 คีย์</option>
                  <option value="10">10 คีย์</option>
                  <option value="25">25 คีย์ (ชุดใหญ่)</option>
                  <option value="50">50 คีย์</option>
                </select>
              </div>

              <div class="flex items-end">
                <button id="btn-generate" class="w-full py-2.5 rounded bg-gradient-to-r from-[#1999ff] to-[#0078d4] hover:brightness-110 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#1999ff]/25 cursor-pointer">
                  ⚡ สร้างคีย์เดี๋ยวนี้ (Generate)
                </button>
              </div>
            </div>

            <!-- Result Box -->
            <div id="gen-result" class="hidden space-y-3 pt-3 border-t border-[#212c3b]">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-emerald-400">✓ สร้างคีย์สำเร็จเรียบร้อย!</span>
                <button id="btn-copy-all" class="px-3 py-1 rounded bg-[#202937] hover:bg-[#2e3b4e] border border-[#2a3c54] text-xs text-white font-bold transition-colors cursor-pointer">
                  คัดลอกคีย์ทั้งหมด (Copy All)
                </button>
              </div>
              <textarea id="gen-keys-area" readonly rows="5" class="w-full bg-[#0d121a] border border-[#253346] rounded p-3 text-xs font-mono text-emerald-300 focus:outline-none"></textarea>
            </div>
          </div>
        </section>

        <!-- TAB 2: Direct Activation -->
        <section id="tab-grant" class="tab-content hidden space-y-6">
          <div class="bg-[#141b26] border border-[#212c3b] rounded-xl p-6 space-y-5">
            <div>
              <h2 class="text-base font-bold text-white uppercase tracking-wider">เปิดใช้งานเกมให้ผู้เล่นโดยตรงผ่าน UID (Direct Activate)</h2>
              <p class="text-xs text-[#8f98a0] mt-0.5">เหมาะสำหรับกรณีผู้เล่นแจ้งชำระเงินใน Discord โดยระบุ UID ทำให้ผู้เล่นเปิดแอปมาแล้วพบตัวเกมในคลังพร้อมเล่นทันทีโดยไม่ต้องใส่คีย์</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div class="space-y-1">
                <label class="text-[11px] font-bold text-[#1999ff] uppercase tracking-wider block">UID ของผู้เล่น</label>
                <input type="text" id="grant-uid" placeholder="เช่น KE-RQTL6W"
                  class="w-full bg-[#0d121a] border border-[#253346] rounded px-3 py-2 text-xs font-mono uppercase text-white focus:outline-none focus:border-[#1999ff]">
              </div>

              <div class="space-y-1">
                <label class="text-[11px] font-bold text-[#1999ff] uppercase tracking-wider block">เลือกเกมที่ต้องการเปิดสิทธิ์</label>
                <select id="grant-game" class="w-full bg-[#0d121a] border border-[#253346] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1999ff]">
                  <option value="anime-battle">Anime Battle</option>
                </select>
              </div>

              <div class="flex items-end">
                <button id="btn-grant" class="w-full py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-600/25 cursor-pointer">
                  ✓ ปลดล็อกเกมให้ผู้เล่น (Activate)
                </button>
              </div>
            </div>

            <div id="grant-msg" class="hidden p-3 rounded text-xs"></div>
          </div>
        </section>

        <!-- TAB 3: Users List -->
        <section id="tab-users" class="tab-content hidden space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-bold text-white uppercase tracking-wider">รายชื่อผู้เล่นทั้งหมดในระบบ</h2>
            <button id="btn-refresh-users" class="px-3 py-1.5 rounded bg-[#202937] hover:bg-[#2b3749] border border-[#2a3a4f] text-xs text-white cursor-pointer">
              ↻ รีเฟรชข้อมูล
            </button>
          </div>

          <div class="bg-[#141b26] border border-[#212c3b] rounded-xl overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-[#0f141d] border-b border-[#212c3b] text-[#8f98a0] font-bold uppercase text-[10px]">
                  <tr>
                    <th class="p-3.5">UID</th>
                    <th class="p-3.5">ชื่อผู้ใช้ (Username)</th>
                    <th class="p-3.5">อีเมล (Email)</th>
                    <th class="p-3.5">วันที่สมัคร</th>
                    <th class="p-3.5">เกมที่ครอบครอง</th>
                    <th class="p-3.5 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody id="users-table-body" class="divide-y divide-[#1c2635]">
                  <tr><td colspan="6" class="p-6 text-center text-[#8f98a0]">กำลังโหลดรายชื่อผู้เล่น...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- TAB 4: Keys Inventory -->
        <section id="tab-keys" class="tab-content hidden space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-bold text-white uppercase tracking-wider">คลังรหัสคีย์ทั้งหมดในระบบ</h2>
            <button id="btn-refresh-keys" class="px-3 py-1.5 rounded bg-[#202937] hover:bg-[#2b3749] border border-[#2a3a4f] text-xs text-white cursor-pointer">
              ↻ รีเฟรชข้อมูล
            </button>
          </div>

          <div class="bg-[#141b26] border border-[#212c3b] rounded-xl overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-[#0f141d] border-b border-[#212c3b] text-[#8f98a0] font-bold uppercase text-[10px]">
                  <tr>
                    <th class="p-3.5">Key Code</th>
                    <th class="p-3.5">เกม</th>
                    <th class="p-3.5">สถานะ</th>
                    <th class="p-3.5">ผู้เปิดใช้งาน (Redeemed By UID)</th>
                    <th class="p-3.5 text-right">คัดลอก</th>
                  </tr>
                </thead>
                <tbody id="keys-table-body" class="divide-y divide-[#1c2635]">
                  <tr><td colspan="5" class="p-6 text-center text-[#8f98a0]">กำลังโหลดประวัติคีย์...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>
    </main>
  </div>

  <script>
    let token = localStorage.getItem("asparagus_admin_token") || "";

    const loginView = document.getElementById("login-view");
    const mainView = document.getElementById("main-view");
    const loginForm = document.getElementById("login-form");
    const loginError = document.getElementById("login-error");

    async function apiReq(url, method = "GET", data = null) {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = "Bearer " + token;
      const opts = { method, headers };
      if (data) opts.body = JSON.stringify(data);
      const res = await fetch(url, opts);
      return await res.json();
    }

    function checkAuth() {
      if (token) {
        loginView.classList.add("hidden");
        mainView.classList.remove("hidden");
        loadAll();
      } else {
        loginView.classList.remove("hidden");
        mainView.classList.add("hidden");
      }
    }

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      loginError.classList.add("hidden");
      const username = document.getElementById("username-input").value.trim();
      const password = document.getElementById("password-input").value.trim();
      try {
        const res = await apiReq("/api/login", "POST", { username, password });
        if (res.ok) {
          token = res.token;
          localStorage.setItem("asparagus_admin_token", token);
          checkAuth();
        } else {
          loginError.textContent = res.error || "เข้าสู่ระบบไม่สำเร็จ";
          loginError.classList.remove("hidden");
        }
      } catch (err) {
        loginError.textContent = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: " + err.message;
        loginError.classList.remove("hidden");
      }
    });

    document.getElementById("logout-btn").addEventListener("click", async () => {
      await apiReq("/api/logout", "POST");
      token = "";
      localStorage.removeItem("asparagus_admin_token");
      checkAuth();
    });

    // Tab Switching
    document.querySelectorAll(".nav-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-tab").forEach(b => {
          b.classList.remove("text-[#1999ff]", "border-b-2", "border-[#1999ff]");
          b.classList.add("text-[#8f98a0]");
        });
        btn.classList.add("text-[#1999ff]", "border-b-2", "border-[#1999ff]");
        btn.classList.remove("text-[#8f98a0]");

        document.querySelectorAll(".tab-content").forEach(tc => tc.classList.add("hidden"));
        document.getElementById(btn.dataset.tab).classList.remove("hidden");
      });
    });

    // Load Stats
    async function loadStats() {
      const res = await apiReq("/api/stats");
      if (res.ok) {
        document.getElementById("stat-users").textContent = res.stats.total_users;
        document.getElementById("stat-avail-keys").textContent = res.stats.available_keys;
        document.getElementById("stat-redeemed-keys").textContent = res.stats.redeemed_keys;
        document.getElementById("stat-entitlements").textContent = res.stats.total_entitlements;
      }
    }

    // Key Generator
    document.getElementById("btn-generate").addEventListener("click", async () => {
      const game_id = document.getElementById("gen-game").value;
      const count = parseInt(document.getElementById("gen-count").value);
      const res = await apiReq("/api/create-keys", "POST", { game_id, count });
      if (res.ok) {
        const area = document.getElementById("gen-keys-area");
        area.value = res.keys.join("\\n");
        document.getElementById("gen-result").classList.remove("hidden");
        loadStats();
        loadKeys();
      } else {
        alert("สร้างคีย์ไม่สำเร็จ: " + res.error);
      }
    });

    document.getElementById("btn-copy-all").addEventListener("click", () => {
      const area = document.getElementById("gen-keys-area");
      navigator.clipboard.writeText(area.value);
      alert("คัดลอกคีย์ทั้งหมดเรียบร้อยแล้ว!");
    });

    // Direct Grant
    document.getElementById("btn-grant").addEventListener("click", async () => {
      const uid = document.getElementById("grant-uid").value.trim().toUpperCase();
      const game_id = document.getElementById("grant-game").value;
      const msgBox = document.getElementById("grant-msg");
      msgBox.classList.add("hidden");

      if (!uid) {
        alert("กรุณาระบุ UID ของผู้เล่น");
        return;
      }

      const res = await apiReq("/api/grant", "POST", { uid, game_id });
      msgBox.classList.remove("hidden");
      if (res.ok) {
        msgBox.className = "p-3 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs";
        msgBox.textContent = res.message;
        document.getElementById("grant-uid").value = "";
        loadStats();
        loadUsers();
      } else {
        msgBox.className = "p-3 rounded bg-red-950/60 border border-red-500/50 text-red-200 text-xs";
        msgBox.textContent = res.error;
      }
    });

    // Load Users
    async function loadUsers() {
      const tbody = document.getElementById("users-table-body");
      const res = await apiReq("/api/users");
      if (!res.ok) return;

      tbody.innerHTML = "";
      res.users.forEach(u => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-[#1a2332] transition-colors";
        
        const hasAnime = (u.games || []).includes("anime-battle");
        
        tr.innerHTML = `
          <td class="p-3.5 font-mono font-bold text-[#66c0f4]">${u.uid}</td>
          <td class="p-3.5 font-bold text-white">${u.username}</td>
          <td class="p-3.5 text-[#8f98a0]">${u.email || "-"}</td>
          <td class="p-3.5 text-[#8f98a0]">${(u.created_at || "").substring(0, 10)}</td>
          <td class="p-3.5">
            ${hasAnime
              ? '<span class="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-[10px]">Anime Battle</span>'
              : '<span class="text-[10px] text-[#6b7280]">ยังไม่มีเกม</span>'}
          </td>
          <td class="p-3.5 text-right space-x-2">
            ${!hasAnime
              ? `<button onclick="quickGrant('${u.uid}')" class="px-2.5 py-1 rounded bg-[#1999ff] hover:bg-[#0078d4] text-white font-bold text-[10px] uppercase cursor-pointer">
                  + ปลดล็อกเกม
                </button>`
              : `<button onclick="quickRevoke('${u.uid}')" class="px-2.5 py-1 rounded bg-[#202937] hover:bg-red-950/60 text-red-300 border border-[#2a3a4f] hover:border-red-500/40 font-bold text-[10px] uppercase cursor-pointer">
                  ถอนสิทธิ์
                </button>`}
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    async function quickGrant(uid) {
      if (!confirm(`ต้องการเปิดสิทธิ์เกม Anime Battle ให้ผู้เล่น UID ${uid} ใช่หรือไม่?`)) return;
      const res = await apiReq("/api/grant", "POST", { uid, game_id: "anime-battle" });
      alert(res.message || res.error);
      loadStats();
      loadUsers();
    }

    async function quickRevoke(uid) {
      if (!confirm(`ต้องการถอนสิทธิ์เกม Anime Battle ออกจาก UID ${uid} ใช่หรือไม่?`)) return;
      const res = await apiReq("/api/revoke", "POST", { uid, game_id: "anime-battle" });
      alert(res.message || res.error);
      loadStats();
      loadUsers();
    }

    // Load Keys
    async function loadKeys() {
      const tbody = document.getElementById("keys-table-body");
      const res = await apiReq("/api/keys");
      if (!res.ok) return;

      tbody.innerHTML = "";
      res.keys.forEach(k => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-[#1a2332] transition-colors";
        tr.innerHTML = `
          <td class="p-3.5 font-mono font-bold text-white">${k.code}</td>
          <td class="p-3.5 text-[#8f98a0]">${k.game_id}</td>
          <td class="p-3.5">
            ${k.is_redeemed
              ? '<span class="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold text-[10px]">REDEEMED</span>'
              : '<span class="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-[10px]">AVAILABLE</span>'}
          </td>
          <td class="p-3.5 font-mono text-[#66c0f4]">${k.redeemed_by_uid || "-"}</td>
          <td class="p-3.5 text-right">
            <button onclick="navigator.clipboard.writeText('${k.code}'); alert('คัดลอกคีย์ ${k.code} แล้ว!');" class="p-1 px-2 rounded bg-[#202937] hover:bg-[#2b3749] text-xs text-white border border-[#2a3a4f] cursor-pointer">
              Copy
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    document.getElementById("btn-refresh-users").addEventListener("click", loadUsers);
    document.getElementById("btn-refresh-keys").addEventListener("click", loadKeys);

    function loadAll() {
      loadStats();
      loadUsers();
      loadKeys();
    }

    checkAuth();
  </script>
</body>
</html>
"""

def start_server(port=5178):
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), AdminRequestHandler)
    print("=" * 60)
    print("  ASPARAGUS LAUNCHER - ADMIN CONTROL CONSOLE")
    print("=" * 60)
    print(f"  > URL: http://127.0.0.1:{port}")
    print(f"  > Username: {ADMIN_USERNAME}")
    print(f"  > Password: {ADMIN_PASSWORD}")
    print("=" * 60)
    print("  Ready! Press Ctrl+C to terminate.")

    # Try opening Edge in app mode (looks like a standalone desktop app window!)
    def open_app():
        time.sleep(0.6)
        edge_cmd = f'start msedge --app=http://127.0.0.1:{port}'
        if os.system(edge_cmd) != 0:
            webbrowser.open(f"http://127.0.0.1:{port}")

    threading.Thread(target=open_app, daemon=True).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nAdmin server stopped.")

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5178
    start_server(port)
