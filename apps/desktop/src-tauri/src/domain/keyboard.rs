use serde::Serialize;

pub const EVT_KEYS_HELD: &str = "keys_held";
pub const EVT_KEYBOARD_LISTENER_ERROR: &str = "keyboard_listener_error";

#[derive(Clone, Serialize)]
pub struct KeysHeldPayload {
    pub keys: Vec<String>,
}

#[derive(Clone, Serialize)]
pub struct KeyboardListenerErrorPayload {
    pub message: String,
    pub consecutive_failures: u32,
}
