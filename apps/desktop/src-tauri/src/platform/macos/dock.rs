use cocoa::appkit::{
    NSApp, NSApplication, NSApplicationActivationPolicy, NSApplicationActivationPolicyAccessory,
    NSApplicationActivationPolicyRegular,
};
use cocoa::base::{nil, BOOL, NO, YES};
use objc::{msg_send, sel, sel_impl};

fn set_activation_policy(policy: NSApplicationActivationPolicy) -> Result<(), String> {
    unsafe {
        let app = NSApp();
        if app == nil {
            return Err("NSApp is not available".to_string());
        }

        let result = NSApplication::setActivationPolicy_(app, policy);
        if result != YES {
            return Err("unable to set activation policy".to_string());
        }
    }

    Ok(())
}

pub fn show_dock_icon() -> Result<(), String> {
    set_activation_policy(NSApplicationActivationPolicyRegular)
}

pub fn hide_dock_icon() -> Result<(), String> {
    set_activation_policy(NSApplicationActivationPolicyAccessory)
}

/// Returns `true` when the application is the frontmost (active) app.
///
/// When macOS launches a hidden Login Item the app is NOT active, so this
/// can be used to distinguish a user-initiated launch from an autostart one.
pub fn is_app_active() -> bool {
    unsafe {
        let app = NSApp();
        if app == nil {
            return false;
        }
        let active: BOOL = msg_send![app, isActive];
        active != NO
    }
}
