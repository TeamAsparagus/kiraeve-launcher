import { openUrl } from "@tauri-apps/plugin-opener";

/**
 * Safely redirects and opens any external URL in the user's default desktop browser
 * (e.g. Chrome, Edge, Brave, Firefox), preventing the Tauri WebView2 frame from
 * hijacking the window or blocking popup requests.
 */
export async function openExternal(url: string): Promise<void> {
  try {
    await openUrl(url);
  } catch {
    // Fallback if running outside Tauri native runtime
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
