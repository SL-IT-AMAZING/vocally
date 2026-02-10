use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Manager, WebviewWindowBuilder};

pub const PILL_OVERLAY_LABEL: &str = "pill-overlay";
pub const PILL_OVERLAY_WIDTH: f64 = 256.0;
pub const PILL_OVERLAY_HEIGHT: f64 = 96.0;
pub const MIN_PILL_WIDTH: f64 = 48.0;
pub const MIN_PILL_HEIGHT: f64 = 6.0;
pub const MIN_PILL_HOVER_PADDING: f64 = 4.0;
pub const EXPANDED_PILL_WIDTH: f64 = 120.0;
pub const EXPANDED_PILL_HEIGHT: f64 = 32.0;
pub const EXPANDED_PILL_HOVERABLE_WIDTH: f64 = EXPANDED_PILL_WIDTH + 16.0;
pub const EXPANDED_PILL_HOVERABLE_HEIGHT: f64 = EXPANDED_PILL_HEIGHT + 16.0;

pub const TOAST_OVERLAY_LABEL: &str = "toast-overlay";
pub const TOAST_OVERLAY_WIDTH: f64 = 380.0;
pub const TOAST_OVERLAY_HEIGHT: f64 = 164.0;
pub const TOAST_OVERLAY_TOP_OFFSET: f64 = 0.0;
pub const TOAST_OVERLAY_RIGHT_OFFSET: f64 = 0.0;

pub const AGENT_OVERLAY_LABEL: &str = "agent-overlay";
pub const AGENT_OVERLAY_WIDTH: f64 = 332.0;
pub const AGENT_OVERLAY_HEIGHT: f64 = 632.0;
pub const AGENT_OVERLAY_LEFT_OFFSET: f64 = 16.0;
pub const AGENT_OVERLAY_TOP_OFFSET: f64 = 16.0;

const CURSOR_POLL_INTERVAL_MS: u64 = 60;
const DEFAULT_SCREEN_WIDTH: f64 = 1920.0;
const DEFAULT_SCREEN_HEIGHT: f64 = 1080.0;

fn get_primary_screen_size(app: &tauri::AppHandle) -> (f64, f64) {
    if let Some(monitor) = app.primary_monitor().ok().flatten() {
        let size = monitor.size();
        let scale = monitor.scale_factor();
        (size.width as f64 / scale, size.height as f64 / scale)
    } else {
        (DEFAULT_SCREEN_WIDTH, DEFAULT_SCREEN_HEIGHT)
    }
}

fn build_overlay_webview_url(
    app: &tauri::AppHandle,
    query_param: &str,
) -> tauri::Result<tauri::WebviewUrl> {
    #[cfg(debug_assertions)]
    {
        if let Some(mut dev_url) = app.config().build.dev_url.clone() {
            let query = match dev_url.query() {
                Some(existing) if !existing.is_empty() => format!("{existing}&{query_param}=1"),
                _ => format!("{query_param}=1"),
            };
            dev_url.set_query(Some(&query));
            return Ok(tauri::WebviewUrl::External(dev_url));
        }
    }

    Ok(tauri::WebviewUrl::App(
        format!("index.html?{query_param}=1").into(),
    ))
}

fn create_overlay_window(
    app: &tauri::AppHandle,
    label: &str,
    width: f64,
    height: f64,
    url: tauri::WebviewUrl,
) -> tauri::Result<()> {
    let (screen_width, screen_height) = get_primary_screen_size(app);

    let x = (screen_width - width) / 2.0;
    let y = screen_height * 0.75;

    let builder = {
        let builder = WebviewWindowBuilder::new(app, label, url)
            .decorations(false)
            .always_on_top(true)
            .transparent(true)
            .skip_taskbar(true)
            .resizable(false)
            .shadow(false)
            .focusable(false)
            .inner_size(width, height)
            .position(x, y);

        #[cfg(not(target_os = "linux"))]
        {
            builder.visible(false)
        }
        #[cfg(target_os = "linux")]
        {
            builder
        }
    };

    let window = builder.build()?;

    if let Err(err) = crate::platform::window::configure_overlay_non_activating(&window) {
        eprintln!("Failed to configure {label} as non-activating: {err}");
    }

    Ok(())
}

pub fn ensure_pill_overlay_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    if app.get_webview_window(PILL_OVERLAY_LABEL).is_some() {
        return Ok(());
    }

    let url = build_overlay_webview_url(app, "pill-overlay")?;
    create_overlay_window(
        app,
        PILL_OVERLAY_LABEL,
        PILL_OVERLAY_WIDTH,
        PILL_OVERLAY_HEIGHT,
        url,
    )?;

    Ok(())
}

pub fn ensure_toast_overlay_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    if app.get_webview_window(TOAST_OVERLAY_LABEL).is_some() {
        return Ok(());
    }

    let (screen_width, _screen_height) = get_primary_screen_size(app);

    let url = build_overlay_webview_url(app, "toast-overlay")?;

    let x = screen_width - TOAST_OVERLAY_WIDTH - TOAST_OVERLAY_RIGHT_OFFSET;
    let y = TOAST_OVERLAY_TOP_OFFSET;

    let builder = WebviewWindowBuilder::new(app, TOAST_OVERLAY_LABEL, url)
        .decorations(false)
        .always_on_top(true)
        .transparent(true)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(false)
        .focusable(false)
        .inner_size(TOAST_OVERLAY_WIDTH, TOAST_OVERLAY_HEIGHT)
        .position(x, y);

    let window = builder.build()?;

    if let Err(err) = crate::platform::window::configure_overlay_non_activating(&window) {
        eprintln!("Failed to configure {TOAST_OVERLAY_LABEL} as non-activating: {err}");
    }

    Ok(())
}

pub fn ensure_agent_overlay_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    if app.get_webview_window(AGENT_OVERLAY_LABEL).is_some() {
        return Ok(());
    }

    let url = build_overlay_webview_url(app, "agent-overlay")?;

    let x = AGENT_OVERLAY_LEFT_OFFSET;
    let y = AGENT_OVERLAY_TOP_OFFSET;

    let builder = {
        let builder = WebviewWindowBuilder::new(app, AGENT_OVERLAY_LABEL, url)
            .decorations(false)
            .always_on_top(true)
            .transparent(true)
            .skip_taskbar(true)
            .resizable(false)
            .shadow(false)
            .focusable(false)
            .inner_size(AGENT_OVERLAY_WIDTH, AGENT_OVERLAY_HEIGHT)
            .position(x, y);

        #[cfg(not(target_os = "linux"))]
        {
            builder.visible(false)
        }
        #[cfg(target_os = "linux")]
        {
            builder
        }
    };

    let window = builder.build()?;

    if let Err(err) = crate::platform::window::configure_overlay_non_activating(&window) {
        eprintln!("Failed to configure {AGENT_OVERLAY_LABEL} as non-activating: {err}");
    }

    Ok(())
}

struct CursorFollowerState {
    pill_hovered: AtomicBool,
    pill_expanded: AtomicBool,
}

fn update_cursor_follower(app: &tauri::AppHandle, state: &CursorFollowerState) {
    use crate::domain::OverlayAnchor;
    use tauri::Manager;

    #[cfg(target_os = "macos")]
    let screen_info = crate::platform::monitor::get_screen_info_at_cursor();

    #[cfg(target_os = "macos")]
    let Some(info) = screen_info
    else {
        return;
    };

    #[cfg(target_os = "macos")]
    let (visible_x, visible_y, visible_width, visible_height, cursor_x, cursor_y, primary_height) = (
        info.visible_x,
        info.visible_y,
        info.visible_width,
        info.visible_height,
        info.cursor_x,
        info.cursor_y,
        info.primary_height,
    );

    // Full screen frame (includes dock/menu bar area) used for pill overlay positioning.
    // The pill is always-on-top so it renders above the dock; using visibleFrame causes
    // the pill to stay "stuck" above the dock gap when entering/exiting fullscreen on macOS.
    #[cfg(target_os = "macos")]
    let (pill_frame_x, pill_frame_width, pill_frame_bottom) = (
        info.screen_x,
        info.screen_width,
        info.screen_y + info.screen_height,
    );

    #[cfg(not(target_os = "macos"))]
    let (
        visible_x,
        visible_y,
        visible_width,
        visible_height,
        pill_frame_x,
        pill_frame_width,
        pill_frame_bottom,
        cursor_x,
        cursor_y,
    ) = {
        let Ok(cursor_pos) = app.cursor_position() else {
            return;
        };
        let Ok(Some(tauri_monitor)) = app.monitor_from_point(cursor_pos.x, cursor_pos.y) else {
            return;
        };
        let monitor_pos = tauri_monitor.position();
        let monitor_size = tauri_monitor.size();
        let scale = tauri_monitor.scale_factor();
        let insets = crate::platform::monitor::get_screen_visible_area();

        let logical_x = monitor_pos.x as f64 / scale;
        let logical_y = monitor_pos.y as f64 / scale;
        let logical_width = monitor_size.width as f64 / scale;
        let logical_height = monitor_size.height as f64 / scale;

        (
            logical_x + insets.left_inset,
            logical_y + insets.top_inset,
            logical_width - insets.left_inset - insets.right_inset,
            logical_height - insets.top_inset - insets.bottom_inset,
            logical_x,
            logical_width,
            logical_y + logical_height,
            cursor_pos.x,
            cursor_pos.y,
        )
    };

    let bottom_offset = crate::platform::monitor::get_bottom_pill_offset();

    #[cfg(target_os = "macos")]
    let position_overlay =
        |window: &tauri::WebviewWindow, anchor: OverlayAnchor, w: f64, h: f64, margin: f64| {
            let (x, y) = match anchor {
                OverlayAnchor::BottomCenter => {
                    let x = visible_x + (visible_width - w) / 2.0;
                    let y = visible_y + visible_height - h - margin;
                    (x, y)
                }
                OverlayAnchor::TopRight => {
                    let x = visible_x + visible_width - w - margin;
                    let y = visible_y + margin;
                    (x, y)
                }
                OverlayAnchor::TopLeft => {
                    let x = visible_x + margin;
                    let y = visible_y + margin;
                    (x, y)
                }
            };
            crate::platform::window::set_window_position_native(window, x, y, primary_height);
        };

    #[cfg(not(target_os = "macos"))]
    let position_overlay =
        |window: &tauri::WebviewWindow, anchor: OverlayAnchor, w: f64, h: f64, margin: f64| {
            let (x, y) = match anchor {
                OverlayAnchor::BottomCenter => {
                    let x = visible_x + (visible_width - w) / 2.0;
                    let y = visible_y + visible_height - h - margin;
                    (x, y)
                }
                OverlayAnchor::TopRight => {
                    let x = visible_x + visible_width - w - margin;
                    let y = visible_y + margin;
                    (x, y)
                }
                OverlayAnchor::TopLeft => {
                    let x = visible_x + margin;
                    let y = visible_y + margin;
                    (x, y)
                }
            };
            let _ =
                window.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(x, y)));
        };

    if let Some(pill_window) = app.get_webview_window(PILL_OVERLAY_LABEL) {
        let pill_x = pill_frame_x + (pill_frame_width - PILL_OVERLAY_WIDTH) / 2.0;
        let pill_y = pill_frame_bottom - PILL_OVERLAY_HEIGHT - bottom_offset;

        #[cfg(debug_assertions)]
        {
            static LAST_LOG: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);
            let last = LAST_LOG.load(std::sync::atomic::Ordering::Relaxed);
            if now > last + 3 {
                LAST_LOG.store(now, std::sync::atomic::Ordering::Relaxed);
                eprintln!(
                    "[pill] cursor=({:.0}, {:.0}) frame_bottom={:.0} pill_pos=({:.0}, {:.0})",
                    cursor_x, cursor_y, pill_frame_bottom, pill_x, pill_y
                );
            }
        }

        #[cfg(target_os = "macos")]
        crate::platform::window::set_window_position_native(
            &pill_window,
            pill_x,
            pill_y,
            primary_height,
        );

        #[cfg(not(target_os = "macos"))]
        let _ = pill_window.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(
            pill_x, pill_y,
        )));
    }

    if let Some(toast_window) = app.get_webview_window(TOAST_OVERLAY_LABEL) {
        position_overlay(
            &toast_window,
            OverlayAnchor::TopRight,
            TOAST_OVERLAY_WIDTH,
            TOAST_OVERLAY_HEIGHT,
            TOAST_OVERLAY_RIGHT_OFFSET,
        );
    }

    if let Some(agent_window) = app.get_webview_window(AGENT_OVERLAY_LABEL) {
        position_overlay(
            &agent_window,
            OverlayAnchor::TopLeft,
            AGENT_OVERLAY_WIDTH,
            AGENT_OVERLAY_HEIGHT,
            AGENT_OVERLAY_LEFT_OFFSET,
        );
    }

    if let Some(pill_window) = app.get_webview_window(PILL_OVERLAY_LABEL) {
        let overlay_state = app.state::<crate::state::OverlayState>();
        let hover_enabled = overlay_state.is_pill_hover_enabled();
        let was_expanded = state.pill_expanded.load(Ordering::Relaxed);

        let (hover_width, hover_height) = if was_expanded {
            (
                EXPANDED_PILL_HOVERABLE_WIDTH,
                EXPANDED_PILL_HOVERABLE_HEIGHT,
            )
        } else {
            (
                MIN_PILL_WIDTH + MIN_PILL_HOVER_PADDING * 2.0,
                MIN_PILL_HEIGHT + MIN_PILL_HOVER_PADDING * 2.0,
            )
        };

        let new_hovered = if hover_enabled {
            let pill_x = pill_frame_x + (pill_frame_width - hover_width) / 2.0;
            let pill_y = pill_frame_bottom - hover_height - bottom_offset;
            cursor_x >= pill_x
                && cursor_x <= pill_x + hover_width
                && cursor_y >= pill_y
                && cursor_y <= pill_y + hover_height
        } else {
            false
        };

        let was_hovered = state.pill_hovered.load(Ordering::Relaxed);
        let hovered_changed = new_hovered != was_hovered;
        if hovered_changed {
            state.pill_hovered.store(new_hovered, Ordering::Relaxed);
        }

        let is_active = !overlay_state.is_idle();
        let new_expanded = new_hovered || is_active;

        let was_expanded = state.pill_expanded.load(Ordering::Relaxed);
        let expanded_changed = new_expanded != was_expanded;
        if expanded_changed {
            let _ = crate::platform::window::set_overlay_click_through(&pill_window, !new_expanded);
            state.pill_expanded.store(new_expanded, Ordering::Relaxed);
        }

        if hovered_changed || expanded_changed {
            let payload = crate::domain::PillExpandedPayload {
                expanded: new_expanded,
                hovered: new_hovered,
            };
            let _ = app.emit(crate::domain::EVT_PILL_EXPANDED, payload);
        }
    }
}

#[cfg(target_os = "linux")]
pub fn start_cursor_follower(app: tauri::AppHandle) {
    use gtk::glib::{self, ControlFlow};
    use std::sync::Arc;
    use std::time::Duration;

    let state = Arc::new(CursorFollowerState {
        pill_hovered: AtomicBool::new(false),
        pill_expanded: AtomicBool::new(false),
    });

    glib::timeout_add_local(Duration::from_millis(CURSOR_POLL_INTERVAL_MS), move || {
        update_cursor_follower(&app, &state);
        ControlFlow::Continue
    });
}

#[cfg(not(target_os = "linux"))]
pub fn start_cursor_follower(app: tauri::AppHandle) {
    use std::time::Duration;

    std::thread::spawn(move || {
        let state = CursorFollowerState {
            pill_hovered: AtomicBool::new(false),
            pill_expanded: AtomicBool::new(false),
        };

        loop {
            std::thread::sleep(Duration::from_millis(CURSOR_POLL_INTERVAL_MS));
            update_cursor_follower(&app, &state);
        }
    });
}
