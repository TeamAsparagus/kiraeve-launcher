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
    let title = to_wide("Space Odyssey: Kira v1.0.4 - Deep Space Simulation");
    let msg = to_wide(
        "★ SPACE ODYSSEY: KIRA ★\n\n\
        Status: Orbital Station Initialized\n\
        Atmosphere: Nominal (Oxygen 98%)\n\
        Cargo: 450 Units Titanium Ore\n\n\
        Controls: Mouse / Flight Stick / Keyboard\n\
        Status: Active Simulation Process\n\n\
        [Click OK when done playing to record playtime]"
    );
    unsafe {
        MessageBoxW(null_mut(), msg.as_ptr(), title.as_ptr(), 0x40);
    }
}
