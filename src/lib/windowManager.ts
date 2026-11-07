import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

/**
 * Resizes the native launcher window to the compact Steam-style login dialog (480x380)
 */
export async function resizeForLogin(isRegister: boolean = false): Promise<void> {
  try {
    await invoke("resize_for_login", { isRegister });
    return;
  } catch {}

  try {
    const win = getCurrentWindow();
    const height = isRegister ? 490 : 380;
    await win.setResizable(false);
    await win.setSize(new LogicalSize(480, height));
    await win.center();
  } catch (err) {
    // Running in browser or non-Tauri mode
  }
}

/**
 * Expands the native launcher window to the full desktop gaming client (1200x760)
 */
export async function resizeForMainApp(): Promise<void> {
  try {
    await invoke("resize_for_main_app");
    return;
  } catch {}

  try {
    const win = getCurrentWindow();
    await win.setResizable(true);
    await win.setSize(new LogicalSize(1200, 760));
    await win.center();
  } catch (err) {
    // Running in browser or non-Tauri mode
  }
}
