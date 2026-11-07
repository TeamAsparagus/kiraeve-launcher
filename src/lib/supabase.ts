import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_CONFIG_KEY = "kiraeve_supabase_config_v1";

export interface SupabaseRuntimeConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseRuntimeConfig {
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
        return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
      }
    }
  } catch {}

  return {
    url: (import.meta.env.VITE_SUPABASE_URL || "").trim(),
    anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim(),
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return (
    Boolean(url) &&
    Boolean(anonKey) &&
    url.startsWith("https://") &&
    !url.includes("placeholder") &&
    !url.includes("your-project")
  );
}

let currentClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseConfig();
  const validUrl =
    url && url.startsWith("https://")
      ? url
      : "https://placeholder-project.supabase.co";
  const validKey = anonKey || "placeholder-anon-key";

  if (!currentClient) {
    currentClient = createClient(validUrl, validKey);
  }
  return currentClient;
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();
  if (!cleanUrl || !cleanKey) {
    localStorage.removeItem(SUPABASE_CONFIG_KEY);
  } else {
    localStorage.setItem(
      SUPABASE_CONFIG_KEY,
      JSON.stringify({ url: cleanUrl, anonKey: cleanKey })
    );
  }
  currentClient = null;
}

export async function testSupabaseConnection(
  url?: string,
  anonKey?: string
): Promise<{ ok: boolean; message: string }> {
  const targetUrl = (url ?? getSupabaseConfig().url).trim();
  const targetKey = (anonKey ?? getSupabaseConfig().anonKey).trim();

  if (!targetUrl.startsWith("https://") || !targetKey) {
    return {
      ok: false,
      message: "กรุณาระบุ Supabase URL (https://...) และ Anon Key ให้ครบถ้วน",
    };
  }

  try {
    const tempClient = createClient(targetUrl, targetKey);
    const { error } = await tempClient.from("games").select("id").limit(1);
    if (error) {
      return {
        ok: false,
        message: `เชื่อมต่อสำเร็จแต่ไม่พบตาราง games (${error.message}): กรุณารันไฟล์ supabase/schema.sql ใน SQL Editor`,
      };
    }
    return {
      ok: true,
      message: "เชื่อมต่อ Supabase Cloud และตรวจสอบตารางฐานข้อมูลสำเร็จ!",
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `ไม่สามารถเชื่อมต่อ Supabase ได้: ${err.message || err}`,
    };
  }
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
