use keyring::Entry;

const SERVICE: &str = "til-app";
const ACCOUNT: &str = "supabase-session";

pub fn save_session(access_token: &str, refresh_token: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string())?;
    let value = format!("{}:{}", access_token, refresh_token);
    entry.set_password(&value).map_err(|e| e.to_string())
}

pub fn load_session() -> Result<Option<(String, String)>, String> {
    let entry = Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(value) => {
            let parts: Vec<&str> = value.splitn(2, ':').collect();
            if parts.len() == 2 {
                Ok(Some((parts[0].to_string(), parts[1].to_string())))
            } else {
                Ok(None)
            }
        }
        Err(_) => Ok(None),
    }
}

pub fn clear_session() -> Result<(), String> {
    let entry = Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string())?;
    entry.delete_password().map_err(|e| e.to_string())
}
