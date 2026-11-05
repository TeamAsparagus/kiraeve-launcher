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
    let title = to_wide("Kiraeve Pilot v1.0.2 - Tactical Action Arena");
    let msg = to_wide(
        "★ KIRAEVE PILOT - ZERO-G TACTICAL ARENA ★\n\n\
        Status: Game Running (Native Win64 Process)\n\
        Physics Engine: 60 FPS Reactive Thrusters\n\
        Player: Kiraeve Pilot Commander\n\n\
        Controls: WASD (Fly), Space (Plasma Cannons)\n\
        Mission: Eliminate Rogue Drones\n\n\
        [Click OK when done playing to record playtime]"
    );
    unsafe {
        MessageBoxW(null_mut(), msg.as_ptr(), title.as_ptr(), 0x40);
    }
}
