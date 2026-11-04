#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(windows)]
fn init_windows_aumid() {
  let aumid: Vec<u16> = "com.controlfynz.app\0".encode_utf16().collect();
  unsafe {
    windows_sys::Win32::UI::Shell::SetCurrentProcessExplicitAppUserModelID(aumid.as_ptr());
  }
}

fn main() {
  #[cfg(windows)]
  init_windows_aumid();

  app_lib::run();
}
