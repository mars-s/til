use crate::state::{AppState, CalendarEvent, Priority, Task, TaskStatus};
use chrono::{DateTime, Utc};
use tauri::{Emitter, State};
use uuid::Uuid;

// ── Auth commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_stored_session() -> Result<Option<(String, String)>, String> {
    crate::auth::load_session()
}

#[tauri::command]
pub async fn save_session(access_token: String, refresh_token: String) -> Result<(), String> {
    crate::auth::save_session(&access_token, &refresh_token)
}

#[tauri::command]
pub async fn clear_session() -> Result<(), String> {
    crate::auth::clear_session()
}

#[tauri::command]
pub fn get_supabase_config() -> (String, String) {
    let url = std::env::var("VITE_SUPABASE_URL")
        .or_else(|_| std::env::var("SUPABASE_URL"))
        .unwrap_or_default();
    let key = std::env::var("VITE_SUPABASE_ANON_KEY")
        .or_else(|_| std::env::var("SUPABASE_ANON_KEY"))
        .unwrap_or_default();
    (url, key)
}

/// Starts a one-shot local HTTP server for OAuth callback.
/// Returns the port number. When the browser redirects to
/// http://localhost:{port}/auth/callback?code=..., the server
/// captures the code and emits "oauth-code" event to the frontend,
/// then shuts down.
#[tauri::command]
pub async fn start_oauth_server(app: tauri::AppHandle) -> Result<u16, String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    let listener = TcpListener::bind("127.0.0.1:54321")
        .await
        .map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    eprintln!("[oauth-server] started on port {}", port);

    tokio::spawn(async move {
        if let Ok((mut stream, _)) = listener.accept().await {
            eprintln!("[oauth-server] connection accepted");
            let mut buf = vec![0u8; 8192];
            let n = stream.read(&mut buf).await.unwrap_or(0);
            let req = String::from_utf8_lossy(&buf[..n]);
            eprintln!("[oauth-server] first line: {:?}", req.lines().next());

            // Extract path from first line: "GET /auth/callback?code=... HTTP/1.1"
            let code = req.lines().next().and_then(|line| {
                let path = line.split_whitespace().nth(1)?;
                let query = path.split('?').nth(1)?;
                query.split('&').find_map(|pair| {
                    let mut kv = pair.splitn(2, '=');
                    if kv.next()? == "code" {
                        kv.next().map(|v| v.to_string())
                    } else {
                        None
                    }
                })
            });

            eprintln!("[oauth-server] extracted code: {}", if code.is_some() { "YES" } else { "NONE" });

            // Flush response before emitting event
            let html = "<html><head><style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a1a1a;color:#f5f5f5}</style></head><body><h2>Signed in! You can close this tab.</h2></body></html>";
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                html.len(),
                html
            );
            let _ = stream.write_all(response.as_bytes()).await;
            let _ = stream.flush().await;
            drop(stream);

            if let Some(code) = code {
                eprintln!("[oauth-server] emitting oauth-code event");
                match app.emit("oauth-code", code) {
                    Ok(_) => eprintln!("[oauth-server] emit OK"),
                    Err(e) => eprintln!("[oauth-server] emit FAILED: {}", e),
                }
            } else {
                eprintln!("[oauth-server] no code found — emitting oauth-error");
                let _ = app.emit("oauth-error", "No code in callback URL");
            }
        } else {
            eprintln!("[oauth-server] accept failed");
        }
    });

    Ok(port)
}

// ── Tasks ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_tasks(state: State<AppState>) -> Vec<Task> {
    state.tasks.lock().unwrap().clone()
}

#[tauri::command]
pub fn create_task(
    state: State<AppState>,
    title: String,
    scheduled_at: Option<DateTime<Utc>>,
    deadline_at: Option<DateTime<Utc>>,
    duration_minutes: Option<u32>,
    priority: Option<Priority>,
    tags: Option<Vec<String>>,
) -> Task {
    let task = Task {
        id: Uuid::new_v4(),
        title,
        status: TaskStatus::Todo,
        priority: priority.unwrap_or(Priority::Medium),
        scheduled_at,
        deadline_at,
        duration_minutes,
        tags: tags.unwrap_or_default(),
    };
    state.tasks.lock().unwrap().push(task.clone());
    task
}

#[tauri::command]
pub fn toggle_task(state: State<AppState>, id: Uuid) -> Option<Task> {
    let mut tasks = state.tasks.lock().unwrap();
    if let Some(task) = tasks.iter_mut().find(|t| t.id == id) {
        task.status = match task.status {
            TaskStatus::Todo => TaskStatus::InProgress,
            TaskStatus::InProgress => TaskStatus::Done,
            TaskStatus::Done => TaskStatus::Todo,
        };
        Some(task.clone())
    } else {
        None
    }
}

#[tauri::command]
pub fn delete_task(state: State<AppState>, id: Uuid) -> bool {
    let mut tasks = state.tasks.lock().unwrap();
    let before = tasks.len();
    tasks.retain(|t| t.id != id);
    tasks.len() < before
}

// ── NLP ────────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn parse_task(input: String) -> serde_json::Value {
    let parsed = til_core::nlp::task::parse(&input);
    serde_json::to_value(parsed).unwrap_or(serde_json::Value::Null)
}

#[tauri::command]
pub fn parse_calendar(input: String) -> serde_json::Value {
    let parsed = til_core::nlp::calendar::parse(&input);
    serde_json::to_value(parsed).unwrap_or(serde_json::Value::Null)
}

// ── Calendar Events ────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_events(state: State<AppState>) -> Vec<CalendarEvent> {
    state.events.lock().unwrap().clone()
}

#[tauri::command]
pub fn create_event(
    state: State<AppState>,
    title: String,
    start_at: DateTime<Utc>,
    end_at: DateTime<Utc>,
    is_suggestion: Option<bool>,
    color: Option<String>,
) -> CalendarEvent {
    let event = CalendarEvent {
        id: Uuid::new_v4(),
        title,
        start_at,
        end_at,
        is_suggestion: is_suggestion.unwrap_or(false),
        color,
    };
    state.events.lock().unwrap().push(event.clone());
    event
}
