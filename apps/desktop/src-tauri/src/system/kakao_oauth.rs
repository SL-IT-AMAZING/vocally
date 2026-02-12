use base64::Engine;
use rand::{rngs::OsRng, RngCore};
use std::{
    collections::HashMap,
    io::{self, Read, Write},
    net::{TcpListener, TcpStream},
    thread::sleep,
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter, EventTarget};
use url::Url;

pub const KAKAO_AUTH_EVENT: &str = "voquill:kakao-auth";
const CALLBACK_PATH: &str = "/callback";
const HTTP_SERVER_TIMEOUT: Duration = Duration::from_secs(120);

#[derive(Debug, serde::Serialize, Clone)]
pub struct KakaoAuthCodePayload {
    pub code: String,
}

pub fn start_kakao_oauth_listener(app_handle: &AppHandle) -> Result<u16, String> {
    let listener = TcpListener::bind(("127.0.0.1", 0))
        .map_err(|err| format!("Failed to bind Kakao OAuth callback listener: {err}"))?;

    let port = listener
        .local_addr()
        .map_err(|err| format!("Unable to read Kakao OAuth listener port: {err}"))?
        .port();

    let mut state_bytes = [0u8; 32];
    OsRng.fill_bytes(&mut state_bytes);
    let expected_state = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(state_bytes);

    let handle = app_handle.clone();
    tauri::async_runtime::spawn_blocking(move || {
        match run_local_http_server(listener, HTTP_SERVER_TIMEOUT) {
            Ok(code) => {
                let _ = handle.emit_to(
                    EventTarget::any(),
                    KAKAO_AUTH_EVENT,
                    KakaoAuthCodePayload { code },
                );
            }
            Err(err) => {
                eprintln!("[kakao_oauth] listener error: {err}");
            }
        }
    });

    let _ = expected_state;

    Ok(port)
}

fn run_local_http_server(listener: TcpListener, timeout: Duration) -> Result<String, String> {
    listener
        .set_nonblocking(true)
        .map_err(|err| format!("Kakao OAuth listener configuration failure: {err}"))?;

    let start = Instant::now();
    while Instant::now().duration_since(start) < timeout {
        match listener.accept() {
            Ok((mut stream, _)) => match handle_request(&mut stream) {
                Ok(Some(code)) => return Ok(code),
                Ok(None) => continue,
                Err(err) => return Err(err),
            },
            Err(err) if err.kind() == io::ErrorKind::WouldBlock => {
                sleep(Duration::from_millis(50));
                continue;
            }
            Err(err) => return Err(format!("Kakao OAuth listener failed: {err}")),
        }
    }

    Err("Timed out waiting for Kakao authentication".to_string())
}

fn handle_request(stream: &mut TcpStream) -> Result<Option<String>, String> {
    let mut buffer = [0u8; 4096];
    let bytes_read = stream
        .read(&mut buffer)
        .map_err(|err| format!("Failed to read Kakao OAuth callback request: {err}"))?;

    if bytes_read == 0 {
        return Err("Received empty Kakao OAuth callback request".to_string());
    }

    let request = std::str::from_utf8(&buffer[..bytes_read])
        .map_err(|err| format!("Invalid Kakao OAuth callback payload: {err}"))?;

    let mut lines = request.split("\r\n");
    let request_line = lines
        .next()
        .ok_or_else(|| "Malformed Kakao OAuth callback request".to_string())?;

    let mut parts = request_line.split_whitespace();
    let _method = parts
        .next()
        .ok_or_else(|| "Malformed Kakao OAuth request line".to_string())?;
    let raw_path = parts
        .next()
        .ok_or_else(|| "Malformed Kakao OAuth request line".to_string())?;

    let full_url = format!("http://localhost{raw_path}");
    let parsed = Url::parse(&full_url)
        .map_err(|err| format!("Failed to parse Kakao OAuth callback URL: {err}"))?;

    if parsed.path() != CALLBACK_PATH {
        respond(stream, 404, "Not found")?;
        return Ok(None);
    }

    let query: HashMap<_, _> = parsed.query_pairs().into_owned().collect();
    let code = query.get("code");

    if let Some(error) = query.get("error") {
        let description = query
            .get("error_description")
            .map(|d| d.as_str())
            .unwrap_or("Unknown error");
        respond(
            stream,
            400,
            &format!("Authentication failed: {description}"),
        )?;
        return Err(format!("Kakao OAuth error: {error} — {description}"));
    }

    if code.is_none() {
        respond(stream, 400, "Missing authorization code")?;
        return Ok(None);
    }

    respond(
        stream,
        200,
        "<html><body><h1>Sign-in complete. You can close this window.</h1></body></html>",
    )?;
    Ok(Some(code.unwrap().clone()))
}

fn respond(stream: &mut TcpStream, status: u16, body: &str) -> Result<(), String> {
    let reason = match status {
        200 => "OK",
        400 => "Bad Request",
        404 => "Not Found",
        _ => "OK",
    };

    let response = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Length: {}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n{body}",
        body.len(),
    );

    stream
        .write_all(response.as_bytes())
        .map_err(|err| format!("Failed to send Kakao OAuth response: {err}"))
}
