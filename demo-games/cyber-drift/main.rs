#![windows_subsystem = "windows"]

use std::ptr::null_mut;

#[link(name = "user32")]
unsafe extern "system" {
    fn MessageBoxW(hwnd: *mut (), text: *const u16, caption: *const u16, utype: u32) -> i32;
}

fn to_wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

fn main() {
    let title = to_wide("Cyber Drift 2088 v0.9.5 - Arcade Synthwave Racing");
    let msg = to_wide(
        "★ CYBER DRIFT 2088 - NEON GRAND PRIX ★\n\n\
        Status: Plasma Engine Ignited\n\
        Vehicle: Hovercraft Hyper-9\n\
        Track: Neo-Tokyo Sector 7 Highway\n\n\
        Controls: A/D (Drift), W (Nitro Boost)\n\
        Multiplayer: Connected\n\n\
        [Click OK when done playing to record playtime]"
    );
    unsafe {
        MessageBoxW(null_mut(), msg.as_ptr(), title.as_ptr(), 0x40);
    }
}
