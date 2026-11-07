import { supabase, isSupabaseConfigured } from "./supabase";
import { UserProfile, Friend, Game } from "../types";

export interface StoredAccount {
  id: string;
  uid: string;
  username: string;
  email: string;
  passwordHash: string;
  avatar_url: string;
  background_url?: string;
  bio: string;
  level: number;
  created_at: string;
  unlockedGameIds: string[];
  installedGameIds: string[];
  friends: Friend[];
}

interface LocalDatabase {
  accounts: StoredAccount[];
  redeemedKeys: Record<string, { uid: string; redeemedAt: string }>;
  activeUserUid: string | null;
}

const DB_STORAGE_KEY = "kiraeve_production_db_v1";

function loadDb(): LocalDatabase {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to read local database:", e);
  }
  return {
    accounts: [],
    redeemedKeys: {},
    activeUserUid: null,
  };
}

function saveDb(db: LocalDatabase): void {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error("Failed to save local database:", e);
  }
}

export function generateDefaultAvatar(username: string): string {
  const initial = (username[0] || "K").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="20" fill="#171d25"/><circle cx="64" cy="64" r="42" fill="#1a9fff" fill-opacity="0.15" stroke="#66c0f4" stroke-width="2.5"/><text x="50%" y="54%" font-family="system-ui,sans-serif" font-weight="900" font-size="48" fill="#66c0f4" dominant-baseline="middle" text-anchor="middle">${initial}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function hashPassword(password: string): string {
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = (hash * 33) ^ password.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function generateUniqueUid(existingAccounts: StoredAccount[]): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  while (true) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const candidate = `KE-${code}`;
    if (!existingAccounts.some((acc) => acc.uid === candidate)) {
      return candidate;
    }
  }
}

function toUserProfile(acc: StoredAccount): UserProfile {
  return {
    id: acc.id,
    uid: acc.uid,
    username: acc.username,
    email: acc.email,
    avatar_url: acc.avatar_url,
    background_url: acc.background_url,
    bio: acc.bio,
    level: acc.level,
    status: "online",
  };
}

async function fetchCloudFriends(ownerUid: string): Promise<Friend[]> {
  const { data: relations } = await supabase
    .from("user_friends")
    .select("friend_uid, owner_uid")
    .or(`owner_uid.eq.${ownerUid},friend_uid.eq.${ownerUid}`);

  if (!relations || relations.length === 0) return [];
  const friendUids = Array.from(
    new Set(
      relations.map((r) => (r.owner_uid === ownerUid ? r.friend_uid : r.owner_uid))
    )
  ).filter((id) => id !== ownerUid);

  if (friendUids.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("uid, username, avatar_url, status")
    .in("uid", friendUids);

  if (!profiles) return [];
  return profiles.map((p) => ({
    uid: p.uid,
    username: p.username,
    avatar_url: p.avatar_url || generateDefaultAvatar(p.username),
    status: (p.status as any) || "online",
  }));
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export const authService = {
  /**
   * Fetches games catalog from Supabase Cloud when configured (with 4.5s resilience timeout)
   */
  async fetchCatalog(fallbackCatalog: Game[]): Promise<Game[]> {
    if (!isSupabaseConfigured()) return fallbackCatalog;
    try {
      const fetchPromise = (async () => {
        const { data, error } = await supabase
          .from("games")
          .select("*")
          .eq("is_active", true);

        if (error || !data || data.length === 0) return fallbackCatalog;

        return data.map((row) => {
          const fallback = fallbackCatalog.find((f) => f.id === row.id);
          const defaultManifest =
            row.id === "anime-battle"
              ? "https://pub-62352b30a9014afa94bda00163ab4d79.r2.dev/games/anime-battle/manifest.json"
              : undefined;

          return {
            id: row.id,
            title: row.title,
            description: row.description || fallback?.description || "",
            banner_url: row.banner_url || fallback?.banner_url || "",
            screenshots:
              row.screenshots && row.screenshots.length > 0
                ? row.screenshots
                : fallback?.screenshots,
            github_repo: row.github_repo,
            manifest_url: fallback?.manifest_url || defaultManifest,
            exe_target: row.exe_target,
            version: row.version || fallback?.version || "v1.0.0",
            category: row.category || fallback?.category || "Action",
            tags: row.tags && row.tags.length > 0 ? row.tags : fallback?.tags,
            is_active: row.is_active,
            is_unlocked: false,
            is_installed: false,
          };
        });
      })();

      return await withTimeout(fetchPromise, 4500, fallbackCatalog);
    } catch {
      return fallbackCatalog;
    }
  },

  /**
   * Fetches fresh user entitlements directly from Supabase Cloud
   */
  async fetchUserEntitlements(uid: string): Promise<string[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from("user_game_entitlements")
        .select("game_id")
        .eq("user_uid", uid);
      if (error || !data) return [];
      return data.map((e) => e.game_id);
    } catch {
      return [];
    }
  },

  /**
   * Restores active session on app startup
   */
  async getActiveSession(): Promise<{
    user: UserProfile;
    unlockedGameIds: string[];
    installedGameIds: string[];
    friends: Friend[];
  } | null> {
    const db = loadDb();

    if (isSupabaseConfigured()) {
      try {
        const cloudSessionPromise = (async () => {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", data.session.user.id)
              .single();

            if (profile) {
              const { data: entitlements } = await supabase
                .from("user_game_entitlements")
                .select("game_id")
                .eq("user_uid", profile.uid);

              const cloudFriends = await fetchCloudFriends(profile.uid);
              const localAcc = db.accounts.find((a) => a.uid === profile.uid);

              const avatar =
                !profile.avatar_url || profile.avatar_url.includes("unsplash.com")
                  ? generateDefaultAvatar(profile.username)
                  : profile.avatar_url;

              return {
                user: {
                  id: profile.id,
                  uid: profile.uid,
                  username: profile.username,
                  email: profile.email,
                  avatar_url: avatar,
                  background_url: profile.background_url,
                  bio: profile.bio || "Asparagus Player",
                  level: profile.level || 1,
                  status: "online" as const,
                },
                unlockedGameIds: entitlements?.map((e) => e.game_id) || [],
                installedGameIds: localAcc?.installedGameIds || [],
                friends: cloudFriends,
              };
            }
          }
          return null;
        })();

        const sessionResult = await withTimeout(cloudSessionPromise, 4500, null);
        if (sessionResult) return sessionResult;
      } catch (err) {
        console.warn("Supabase auth session check failed or timed out:", err);
      }
    }

    if (!db.activeUserUid) return null;

    // Check cloud for the active UID first
    if (isSupabaseConfigured()) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("uid", db.activeUserUid)
          .maybeSingle();

        if (profile) {
          const { data: entitlements } = await supabase
            .from("user_game_entitlements")
            .select("game_id")
            .eq("user_uid", profile.uid);

          const cloudFriends = await fetchCloudFriends(profile.uid);
          const localAcc = db.accounts.find((a) => a.uid === profile.uid);

          const avatar =
            !profile.avatar_url || profile.avatar_url.includes("unsplash.com")
              ? generateDefaultAvatar(profile.username)
              : profile.avatar_url;

          return {
            user: {
              id: profile.id,
              uid: profile.uid,
              username: profile.username,
              email: profile.email,
              avatar_url: avatar,
              background_url: profile.background_url,
              bio: profile.bio || "Asparagus Player",
              level: profile.level || 1,
              status: "online",
            },
            unlockedGameIds: entitlements?.map((e) => e.game_id) || [],
            installedGameIds: localAcc?.installedGameIds || [],
            friends: cloudFriends,
          };
        }
      } catch (err) {
        console.warn("Failed fetching cloud profile for active user, falling back to local:", err);
      }
    }

    const acc = db.accounts.find((a) => a.uid === db.activeUserUid);
    if (!acc) return null;

    return {
      user: toUserProfile(acc),
      unlockedGameIds: acc.unlockedGameIds,
      installedGameIds: acc.installedGameIds || [],
      friends: acc.friends || [],
    };
  },

  /**
   * Registers a brand-new user account with collision check & permanent UID
   */
  async register(
    username: string,
    email: string,
    password: string,
    rememberMe: boolean
  ): Promise<{
    user: UserProfile;
    unlockedGameIds: string[];
    installedGameIds: string[];
    friends: Friend[];
  }> {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 2) {
      throw new Error("กรุณาตั้งชื่อในเกม (Display Name) อย่างน้อย 2 ตัวอักษร");
    }
    if (!cleanEmail.includes("@")) {
      throw new Error("รูปแบบอีเมลไม่ถูกต้อง (ต้องมี @)");
    }
    if (password.length < 6 && isSupabaseConfigured()) {
      throw new Error("รหัสผ่านสำหรับ Supabase Cloud ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
    }
    if (password.length < 4) {
      throw new Error("รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร");
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { username: cleanUsername },
        },
      });
      if (error) throw new Error(error.message);
      if (data.user) {
        let profile = null;
        for (let attempt = 0; attempt < 6; attempt++) {
          const { data: p } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .maybeSingle();

          if (p) {
            profile = p;
            break;
          }
          await new Promise((r) => setTimeout(r, 400));
        }

        if (profile) {
          const { data: entitlements } = await supabase
            .from("user_game_entitlements")
            .select("game_id")
            .eq("user_uid", profile.uid);

          const avatar =
            !profile.avatar_url || profile.avatar_url.includes("unsplash.com")
              ? generateDefaultAvatar(profile.username)
              : profile.avatar_url;

          return {
            user: {
              id: profile.id,
              uid: profile.uid,
              username: profile.username,
              email: profile.email,
              avatar_url: avatar,
              background_url: profile.background_url,
              bio: profile.bio || "Asparagus Player",
              level: profile.level || 1,
              status: "online",
            },
            unlockedGameIds:
              entitlements && entitlements.length > 0
                ? entitlements.map((e) => e.game_id)
                : [],
            installedGameIds: [],
            friends: [],
          };
        }
      }
    }

    const db = loadDb();
    if (
      db.accounts.some(
        (a) =>
          a.email.toLowerCase() === cleanEmail ||
          a.username.toLowerCase() === cleanUsername.toLowerCase()
      )
    ) {
      throw new Error("ชื่อผู้ใช้หรืออีเมลนี้ถูกสมัครใช้งานไปแล้ว กรุณาเข้าสู่ระบบแทน");
    }

    const newUid = generateUniqueUid(db.accounts);
    const newAccount: StoredAccount = {
      id: `usr_${Date.now()}`,
      uid: newUid,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: hashPassword(password),
      avatar_url: generateDefaultAvatar(cleanUsername),
      bio: "Asparagus Player",
      level: 1,
      created_at: new Date().toISOString(),
      unlockedGameIds: [],
      installedGameIds: [],
      friends: [],
    };

    db.accounts.push(newAccount);
    db.activeUserUid = rememberMe ? newAccount.uid : null;
    saveDb(db);

    return {
      user: toUserProfile(newAccount),
      unlockedGameIds: newAccount.unlockedGameIds,
      installedGameIds: newAccount.installedGameIds,
      friends: newAccount.friends,
    };
  },

  /**
   * Logs in an existing user and verifies password
   */
  async login(
    identifier: string,
    password: string,
    rememberMe: boolean
  ): Promise<{
    user: UserProfile;
    unlockedGameIds: string[];
    installedGameIds: string[];
    friends: Friend[];
  }> {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId || !password) {
      throw new Error("กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่านให้ครบถ้วน");
    }

    const db = loadDb();

    if (isSupabaseConfigured()) {
      let loginEmail = cleanId;
      if (!cleanId.includes("@")) {
        // Resolve username or UID to email via secure RPC
        const { data: resolvedEmail } = await supabase.rpc("get_email_by_identifier", {
          p_identifier: cleanId,
        });

        if (resolvedEmail) {
          loginEmail = resolvedEmail;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });
      if (error) throw new Error(error.message);
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (profile) {
          const { data: entitlements } = await supabase
            .from("user_game_entitlements")
            .select("game_id")
            .eq("user_uid", profile.uid);

          const cloudFriends = await fetchCloudFriends(profile.uid);
          const localAcc = db.accounts.find((a) => a.uid === profile.uid);

          const avatar =
            !profile.avatar_url || profile.avatar_url.includes("unsplash.com")
              ? generateDefaultAvatar(profile.username)
              : profile.avatar_url;

          return {
            user: {
              id: profile.id,
              uid: profile.uid,
              username: profile.username,
              email: profile.email,
              avatar_url: avatar,
              background_url: profile.background_url,
              bio: profile.bio || "Asparagus Player",
              level: profile.level || 1,
              status: "online",
            },
            unlockedGameIds: entitlements?.map((e) => e.game_id) || [],
            installedGameIds: localAcc?.installedGameIds || [],
            friends: cloudFriends,
          };
        }
      }
    }

    const acc = db.accounts.find(
      (a) =>
        a.email.toLowerCase() === cleanId ||
        a.username.toLowerCase() === cleanId ||
        a.uid.toLowerCase() === cleanId
    );

    if (!acc) {
      throw new Error(
        "ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณากดแท็บ 'สมัครสมาชิกใหม่ (Register)' เพื่อสร้างบัญชีก่อน"
      );
    }

    if (acc.passwordHash !== hashPassword(password)) {
      throw new Error("รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
    }

    db.activeUserUid = rememberMe ? acc.uid : null;
    saveDb(db);

    return {
      user: toUserProfile(acc),
      unlockedGameIds: acc.unlockedGameIds,
      installedGameIds: acc.installedGameIds || [],
      friends: acc.friends || [],
    };
  },

  /**
   * Logs out current session
   */
  async logout(): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    const db = loadDb();
    db.activeUserUid = null;
    saveDb(db);
  },

  /**
   * Updates user profile persistently in Supabase Cloud & Local DB
   */
  async updateProfile(updated: UserProfile): Promise<UserProfile> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.rpc("update_profile_info", {
          p_uid: updated.uid,
          p_username: updated.username,
          p_avatar_url: updated.avatar_url || "",
          p_bio: updated.bio || "",
          p_status: updated.status || "online",
        });
      } catch (err) {
        console.warn("RPC update_profile_info fallback to direct update:", err);
        await supabase
          .from("profiles")
          .update({
            username: updated.username,
            avatar_url: updated.avatar_url,
            background_url: updated.background_url,
            bio: updated.bio,
            status: updated.status || "online",
          })
          .eq("uid", updated.uid);
      }
    }

    const db = loadDb();
    const idx = db.accounts.findIndex((a) => a.uid === updated.uid);
    if (idx !== -1) {
      db.accounts[idx] = {
        ...db.accounts[idx],
        username: updated.username,
        avatar_url: updated.avatar_url || db.accounts[idx].avatar_url,
        background_url: updated.background_url ?? db.accounts[idx].background_url,
        bio: updated.bio || db.accounts[idx].bio,
      };
      saveDb(db);
    }
    return updated;
  },

  /**
   * Fetches fresh friends list for active user
   */
  async fetchFriends(ownerUid: string): Promise<Friend[]> {
    if (isSupabaseConfigured()) {
      return await fetchCloudFriends(ownerUid);
    }
    const db = loadDb();
    const acc = db.accounts.find((a) => a.uid === ownerUid);
    return acc?.friends || [];
  },

  /**
   * Fetches full profile of any player by UID (for viewing friend profiles)
   */
  async fetchUserProfileByUid(uid: string): Promise<UserProfile | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("uid", uid)
          .maybeSingle();

        if (p) {
          const avatar =
            !p.avatar_url || p.avatar_url.includes("unsplash.com")
              ? generateDefaultAvatar(p.username)
              : p.avatar_url;

          return {
            id: p.id,
            uid: p.uid,
            username: p.username,
            email: p.email,
            avatar_url: avatar,
            background_url: p.background_url,
            bio: p.bio || "Asparagus Player",
            level: p.level || 1,
            status: (p.status as any) || "online",
          };
        }
      } catch (err) {
        console.warn("fetchUserProfileByUid cloud error:", err);
      }
    }

    const db = loadDb();
    const acc = db.accounts.find((a) => a.uid === uid);
    if (acc) {
      return toUserProfile(acc);
    }
    return null;
  },

  /**
   * Redeems a Product Key via Supabase RPC (when configured) or Local DB
   */
  async redeemKey(
    userUid: string,
    rawKey: string
  ): Promise<{ ok: boolean; message: string; unlockedGameIds?: string[] }> {
    const code = rawKey.trim().toUpperCase();

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.rpc("redeem_product_key", {
        p_code: code,
        p_user_uid: userUid,
      });

      if (error) {
        return { ok: false, message: `ไม่สามารถตรวจสอบคีย์ได้: ${error.message}` };
      }

      if (data && data.ok) {
        const { data: entitlements } = await supabase
          .from("user_game_entitlements")
          .select("game_id")
          .eq("user_uid", userUid);

        return {
          ok: true,
          message: data.message,
          unlockedGameIds: entitlements?.map((e) => e.game_id) || [],
        };
      }

      return {
        ok: false,
        message: data?.message || "รหัสคีย์ไม่ถูกต้องหรือถูกใช้งานไปแล้ว",
      };
    }

    const db = loadDb();
    const accIdx = db.accounts.findIndex((a) => a.uid === userUid);
    if (accIdx === -1) {
      return { ok: false, message: "ไม่พบบัญชีผู้ใช้ปัจจุบัน" };
    }

    if (db.redeemedKeys[code]) {
      return {
        ok: false,
        message: `รหัสคีย์นี้ถูกใช้งานไปแล้วโดย UID: ${db.redeemedKeys[code].uid}`,
      };
    }

    let targetGames: string[] = [];
    if (
      code.includes("ANIME") ||
      code.includes("BATTLE") ||
      code === "ASPARAGUS-ALL" ||
      code === "ASPARAGUS-VIP" ||
      code === "KIRAEVE-ALL" ||
      code === "KIRAEVE-VIP"
    ) {
      targetGames = ["anime-battle"];
    } else {
      return {
        ok: false,
        message: "รหัสผลิตภัณฑ์ไม่ถูกต้อง กรุณาติดต่อซื้อรหัสคีย์ผ่าน Discord",
      };
    }

    const currentUnlocked = new Set(db.accounts[accIdx].unlockedGameIds);
    targetGames.forEach((g) => currentUnlocked.add(g));
    db.accounts[accIdx].unlockedGameIds = Array.from(currentUnlocked);

    if (code !== "KIRAEVE-ALL" && code !== "ASPARAGUS-ALL") {
      db.redeemedKeys[code] = {
        uid: userUid,
        redeemedAt: new Date().toISOString(),
      };
    }

    saveDb(db);
    return {
      ok: true,
      message: "เปิดใช้งานรหัสคีย์สำเร็จ! เกมถูกผูกเข้ากับ UID ของคุณถาวรแล้ว",
      unlockedGameIds: db.accounts[accIdx].unlockedGameIds,
    };
  },

  /**
   * Saves installed game state for the user
   */
  setGameInstalled(userUid: string, gameId: string, installed: boolean): void {
    const db = loadDb();
    const accIdx = db.accounts.findIndex((a) => a.uid === userUid);
    if (accIdx === -1) return;

    const set = new Set(db.accounts[accIdx].installedGameIds || []);
    if (installed) {
      set.add(gameId);
    } else {
      set.delete(gameId);
    }
    db.accounts[accIdx].installedGameIds = Array.from(set);
    saveDb(db);
  },

  /**
   * Adds a friend by UID via Supabase Cloud (when configured) or Local DB
   */
  async addFriend(
    userUid: string,
    targetUidRaw: string
  ): Promise<{ ok: boolean; message: string; friends?: Friend[] }> {
    const targetUid = targetUidRaw.trim().toUpperCase();
    if (!targetUid.startsWith("KE-") || targetUid.length < 6) {
      return { ok: false, message: "รูปแบบ UID ไม่ถูกต้อง (ตัวอย่าง: KE-8F3A2B)" };
    }
    if (targetUid === userUid) {
      return { ok: false, message: "ไม่สามารถเพิ่ม UID ของตัวเองเป็นเพื่อนได้" };
    }

    if (isSupabaseConfigured()) {
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("uid, username, avatar_url, status")
        .eq("uid", targetUid)
        .maybeSingle();

      if (!targetProfile) {
        return { ok: false, message: `ไม่พบผู้เล่นที่มีรหัส UID: ${targetUid} ในระบบ Cloud` };
      }

      // Add bidirectional mutual friendship via security definer RPC
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("add_friend_bidirectional", {
        p_friend_uid: targetUid,
        p_caller_uid: userUid,
      });

      if (rpcErr || (rpcRes && !rpcRes.ok)) {
        return {
          ok: false,
          message: rpcRes?.message || rpcErr?.message || "ไม่สามารถเพิ่มเพื่อนได้",
        };
      }

      const updatedFriends = await fetchCloudFriends(userUid);
      return {
        ok: true,
        message: `เพิ่ม ${targetProfile.username} (${targetUid}) เป็นเพื่อนสำเร็จ!`,
        friends: updatedFriends,
      };
    }

    const db = loadDb();
    const accIdx = db.accounts.findIndex((a) => a.uid === userUid);
    if (accIdx === -1) {
      return { ok: false, message: "ไม่พบบัญชีผู้ใช้ปัจจุบัน" };
    }

    const existingFriends = db.accounts[accIdx].friends || [];
    if (existingFriends.some((f) => f.uid === targetUid)) {
      return { ok: false, message: "ผู้เล่นคนนี้อยู่ในรายชื่อเพื่อนของคุณแล้ว" };
    }

    const targetAccount = db.accounts.find((a) => a.uid === targetUid);
    if (!targetAccount) {
      return {
        ok: false,
        message: `ไม่พบบัญชีผู้เล่นรหัส ${targetUid} ในฐานข้อมูล`,
      };
    }

    const newFriend: Friend = {
      uid: targetAccount.uid,
      username: targetAccount.username,
      avatar_url: targetAccount.avatar_url,
      status: "online",
    };

    const updatedFriends = [newFriend, ...existingFriends];
    db.accounts[accIdx].friends = updatedFriends;
    saveDb(db);

    return {
      ok: true,
      message: `เพิ่ม ${newFriend.username} (${targetUid}) เข้าสู่รายชื่อเพื่อนแล้ว`,
      friends: updatedFriends,
    };
  },
};
