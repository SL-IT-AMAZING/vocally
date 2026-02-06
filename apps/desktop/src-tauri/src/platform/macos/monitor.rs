use crate::domain::{MonitorAtCursor, ScreenVisibleArea};
use cocoa::appkit::{CGFloat, NSEvent, NSScreen};
use cocoa::base::nil;
use cocoa::foundation::NSArray;
use objc::{msg_send, sel, sel_impl};

pub fn get_bottom_pill_offset() -> f64 {
    8.0
}

/// Get complete screen information for the screen under the cursor.
/// Returns all values in Tauri-compatible coordinates (top-left origin, logical pixels).
///
/// This is the single source of truth for positioning overlays on multi-monitor setups.
pub fn get_screen_info_at_cursor() -> Option<ScreenInfoAtCursor> {
    unsafe {
        let mouse_loc = NSEvent::mouseLocation(nil);
        let screens = NSScreen::screens(nil);
        let count = NSArray::count(screens);

        if count == 0 {
            return None;
        }

        // Get primary screen height for coordinate conversion (Cocoa uses bottom-left origin)
        let primary_screen: cocoa::base::id = msg_send![screens, objectAtIndex: 0u64];
        let primary_frame = NSScreen::frame(primary_screen);
        let primary_height = primary_frame.size.height;

        for i in 0..count {
            let screen: cocoa::base::id = msg_send![screens, objectAtIndex: i];
            let frame = NSScreen::frame(screen);

            // Check if cursor is on this screen (Cocoa coordinates)
            if mouse_loc.x >= frame.origin.x
                && mouse_loc.x < frame.origin.x + frame.size.width
                && mouse_loc.y >= frame.origin.y
                && mouse_loc.y < frame.origin.y + frame.size.height
            {
                let visible = NSScreen::visibleFrame(screen);
                let backing_scale: CGFloat = msg_send![screen, backingScaleFactor];

                // Convert to Tauri coordinates (top-left origin)
                // In Cocoa: y=0 is at bottom. In Tauri: y=0 is at top.
                // Tauri Y = primaryHeight - cocoaY - height

                let screen_x = frame.origin.x;
                let screen_y = primary_height - frame.origin.y - frame.size.height;
                let screen_width = frame.size.width;
                let screen_height = frame.size.height;

                // Visible frame in Tauri coordinates
                let visible_x = visible.origin.x;
                let visible_y = primary_height - visible.origin.y - visible.size.height;
                let visible_width = visible.size.width;
                let visible_height = visible.size.height;

                // Cursor in Tauri coordinates
                let cursor_x = mouse_loc.x;
                let cursor_y = primary_height - mouse_loc.y;

                return Some(ScreenInfoAtCursor {
                    screen_x,
                    screen_y,
                    screen_width,
                    screen_height,
                    visible_x,
                    visible_y,
                    visible_width,
                    visible_height,
                    cursor_x,
                    cursor_y,
                    scale_factor: backing_scale,
                    primary_height,
                });
            }
        }
    }
    None
}

#[derive(Debug, Clone)]
pub struct ScreenInfoAtCursor {
    pub screen_x: f64,
    pub screen_y: f64,
    pub screen_width: f64,
    pub screen_height: f64,
    pub visible_x: f64,
    pub visible_y: f64,
    pub visible_width: f64,
    pub visible_height: f64,
    pub cursor_x: f64,
    pub cursor_y: f64,
    pub scale_factor: f64,
    pub primary_height: f64,
}

pub fn get_screen_visible_area() -> ScreenVisibleArea {
    if let Some(info) = get_screen_info_at_cursor() {
        ScreenVisibleArea {
            top_inset: info.visible_y - info.screen_y,
            bottom_inset: (info.screen_y + info.screen_height)
                - (info.visible_y + info.visible_height),
            left_inset: info.visible_x - info.screen_x,
            right_inset: (info.screen_x + info.screen_width)
                - (info.visible_x + info.visible_width),
        }
    } else {
        ScreenVisibleArea::default()
    }
}

pub fn get_monitor_at_cursor() -> Option<MonitorAtCursor> {
    unsafe {
        let mouse_loc = NSEvent::mouseLocation(nil);
        let screens = NSScreen::screens(nil);
        let count = NSArray::count(screens);

        if count == 0 {
            return None;
        }

        let primary_screen: cocoa::base::id = msg_send![screens, objectAtIndex: 0u64];
        let primary_frame = NSScreen::frame(primary_screen);
        let primary_height = primary_frame.size.height;

        for i in 0..count {
            let screen: cocoa::base::id = msg_send![screens, objectAtIndex: i];
            let frame = NSScreen::frame(screen);

            if mouse_loc.x >= frame.origin.x
                && mouse_loc.x < frame.origin.x + frame.size.width
                && mouse_loc.y >= frame.origin.y
                && mouse_loc.y < frame.origin.y + frame.size.height
            {
                let visible = NSScreen::visibleFrame(screen);
                let backing_scale: CGFloat = msg_send![screen, backingScaleFactor];

                let cocoa_visible_top = visible.origin.y + visible.size.height;
                let visible_y = primary_height - cocoa_visible_top;

                return Some(MonitorAtCursor {
                    x: frame.origin.x,
                    y: frame.origin.y,
                    width: frame.size.width,
                    height: frame.size.height,
                    visible_x: visible.origin.x,
                    visible_y,
                    visible_width: visible.size.width,
                    visible_height: visible.size.height,
                    scale_factor: backing_scale,
                    cursor_x: mouse_loc.x,
                    cursor_y: mouse_loc.y,
                    primary_height,
                });
            }
        }
    }
    None
}
