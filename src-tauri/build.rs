// Build script to embed environment variables at compile time
// This is needed for the freemium model where the developer's API key
// is bundled with the app, not configured by users.

fn main() {
    // Tell cargo to rerun if .env changes
    println!("cargo:rerun-if-changed=../.env");

    // Try to load .env file and pass to compiler
    if let Ok(content) = std::fs::read_to_string("../.env") {
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }

            if let Some(eq_pos) = line.find('=') {
                let key = line[..eq_pos].trim();
                let mut value = line[eq_pos + 1..].trim();

                // Remove surrounding quotes
                if (value.starts_with('"') && value.ends_with('"'))
                    || (value.starts_with('\'') && value.ends_with('\''))
                {
                    value = &value[1..value.len() - 1];
                }

                // Pass to rustc as an env variable for option_env! macro
                if key == "ANTHROPIC_API_KEY" || key == "ANTHROPIC_SECRET_KEY" {
                    // Clean the value (remove any whitespace that might have been copied)
                    let clean_value: String = value.chars().filter(|c| !c.is_whitespace()).collect();
                    println!("cargo:rustc-env={}={}", key, clean_value);
                }
            }
        }
    }

    tauri_build::build()
}
