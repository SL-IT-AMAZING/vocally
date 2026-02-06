use crate::platform::macos::dock;
use cocoa::appkit::{NSApp, NSApplication, NSWindow, NSWindowCollectionBehavior};
use cocoa::base::{id, nil, NO as COCOA_NO, YES};
use std::sync::mpsc;
use tauri::WebviewWindow;

pub fn surface_main_window(window: &WebviewWindow) -> Result<(), String> {
    let window_for_handle = window.clone();
    let (tx, rx) = mpsc::channel();

    window
        .run_on_main_thread(move || {
            let result = (|| -> Result<(), String> {
                if let Err(err) = dock::show_dock_icon() {
                    eprintln!("Failed to show dock icon: {err}");
                }

                let ns_window_ptr = window_for_handle
                    .ns_window()
                    .map_err(|err| err.to_string())?;

                unsafe {
                    let ns_window = ns_window_ptr as id;
                    let ns_app = NSApp();
                    if ns_app != nil {
                        NSApplication::activateIgnoringOtherApps_(ns_app, YES);
                    }

                    ns_window.deminiaturize_(nil);
                    ns_window.makeKeyWindow();
                    ns_window.orderFrontRegardless();
                }

                if let Err(err) = window_for_handle.unminimize() {
                    eprintln!("Failed to unminimize window: {err}");
                }
                if let Err(err) = window_for_handle.show() {
                    eprintln!("Failed to show window: {err}");
                }
                if let Err(err) = window_for_handle.set_focus() {
                    eprintln!("Failed to focus window: {err}");
                }

                Ok(())
            })();

            let _ = tx.send(result);
        })
        .map_err(|err| err.to_string())?;

    let result = rx
        .recv()
        .map_err(|_| "failed to surface window on main thread".to_string())?;

    result
}

pub fn show_overlay_no_focus(window: &WebviewWindow) -> Result<(), String> {
    let window_for_handle = window.clone();
    let (tx, rx) = mpsc::channel();

    window
        .run_on_main_thread(move || {
            let result = (|| -> Result<(), String> {
                let ns_window_ptr = window_for_handle
                    .ns_window()
                    .map_err(|err| err.to_string())?;

                unsafe {
                    use objc::{msg_send, sel, sel_impl};
                    
                    let ns_window = ns_window_ptr as id;

                    let current_style_mask: u64 = msg_send![ns_window, styleMask];
                    let new_style_mask = current_style_mask | (1 << 7);
                    let _: () = msg_send![ns_window, setStyleMask: new_style_mask];
                    
                    #[link(name = "CoreGraphics", kind = "framework")]
                    extern "C" {
                        fn CGWindowLevelForKey(key: i32) -> i32;
                    }
                    const K_CG_MAXIMUM_WINDOW_LEVEL_KEY: i32 = 14;
                    let max_level = CGWindowLevelForKey(K_CG_MAXIMUM_WINDOW_LEVEL_KEY);
                    ns_window.setLevel_((max_level - 1) as i64);
                    
                    ns_window.setCollectionBehavior_(
                        NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
                            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary
                            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
                            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorIgnoresCycle,
                    );
                    
                    let _: () = msg_send![ns_window, setOpaque: COCOA_NO];
                    let _: () = msg_send![ns_window, setHasShadow: COCOA_NO];
                    
                    ns_window.orderFrontRegardless();
                }
                
                if let Err(err) = window_for_handle.show() {
                    eprintln!("Failed to show overlay window: {err}");
                }

                Ok(())
            })();

            let _ = tx.send(result);
        })
        .map_err(|err| err.to_string())?;

    let result = rx
        .recv()
        .map_err(|_| "failed to show overlay on main thread".to_string())?;

    result
}

pub fn configure_overlay_non_activating(window: &WebviewWindow) -> Result<(), String> {
    let window_for_handle = window.clone();
    let (tx, rx) = mpsc::channel();

    window
        .run_on_main_thread(move || {
            let result = (|| -> Result<(), String> {
                let ns_window_ptr = window_for_handle
                    .ns_window()
                    .map_err(|err| err.to_string())?;

                unsafe {
                    use objc::{msg_send, sel, sel_impl};

                    let ns_window = ns_window_ptr as id;

                    let _: () = msg_send![ns_window, setHidesOnDeactivate: COCOA_NO];
                    let _: () = msg_send![ns_window, _setPreventsActivation: YES];
                }

                Ok(())
            })();

            let _ = tx.send(result);
        })
        .map_err(|err| err.to_string())?;

    rx.recv()
        .map_err(|_| "failed to configure overlay on main thread".to_string())?
}

pub fn set_overlay_click_through(
    window: &WebviewWindow,
    click_through: bool,
) -> Result<(), String> {
    window
        .set_ignore_cursor_events(click_through)
        .map_err(|err| err.to_string())
}

pub fn set_window_position_native(window: &WebviewWindow, x: f64, y: f64, primary_height: f64) {
    use cocoa::foundation::NSPoint;
    use objc::{msg_send, sel, sel_impl};

    let window_clone = window.clone();
    let _ = window.run_on_main_thread(move || {
        let Ok(ns_window_ptr) = window_clone.ns_window() else {
            return;
        };

        let cocoa_y = primary_height - y;
        let point = NSPoint::new(x, cocoa_y);

        let ns_window = ns_window_ptr as id;
        unsafe {
            let _: () = msg_send![ns_window, setFrameTopLeftPoint: point];
        }
    });
}
