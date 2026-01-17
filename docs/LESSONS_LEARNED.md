# Lessons Learned

## 2026-01-17: API Key Whitespace Issue (Redux)

### Summary
API classification failed with "invalid x-api-key" error even though the .env file appeared correct.

### Root Cause
A space character was embedded at position 81 within the API key value in the .env file. This was likely introduced during copy-paste and was invisible when viewing the file normally.

### Fix Applied
Updated `lib.rs` to automatically strip ALL whitespace from any environment variable containing "KEY" or "SECRET" in its name:

```rust
let final_value = if key.contains("KEY") || key.contains("SECRET") {
    let cleaned: String = value.chars().filter(|c| !c.is_whitespace()).collect();
    cleaned
} else {
    value.to_string()
};
```

### Lesson
- API keys should NEVER contain whitespace - defensively strip it when loading
- When debugging "invalid key" errors, check the actual byte length and scan for hidden characters
- Copy-paste from web consoles can introduce invisible characters

---

## 2026-01-14: The Great .env Debugging Disaster

### Summary
AI classification appeared to work ("API call successful!") but no classifications were stored to the database. Files were being organized with rule-based fallback instead of AI categories.

### Root Causes (Multiple)

#### 1. Two .env Files
- **Problem:** There were two `.env` files:
  - `ai-filesense/.env` (project root) - correct 108-char API key
  - `ai-filesense/src-tauri/.env` - truncated 79-char API key
- **Effect:** The app found `src-tauri/.env` first and used the broken key
- **Fix:** Deleted `src-tauri/.env`, app now correctly reads from project root
- **Lesson:** Always check the **absolute path** when debugging file reads. Add debug output showing the full resolved path.

#### 2. file_id String/Number Mismatch
- **Problem:** The prompt sent `file_id` as a string: `"file_id": "1"`
- **Effect:** The AI echoed the format back. Rust expected `i64`, got string, JSON parsing silently failed.
- **Fix:**
  1. Send file_id as number in prompt: `"file_id": 1` (no quotes)
  2. Added flexible deserializer that accepts both strings and numbers
- **Lesson:** When interfacing with LLMs, validate that your output schema matches what you're parsing. Add explicit debug logging for parse failures.

#### 3. Silent Failures
- **Problem:** "API call successful!" was logged, but parsing failed silently afterward
- **Effect:** Appeared to work, but no data was stored
- **Fix:** Added debug logging after each step: parsing, classification count, database inserts
- **Lesson:** Log at every stage of a pipeline, not just entry/exit points.

### Debug Techniques That Worked

1. **Check the database directly:**
   ```sql
   SELECT COUNT(*) FROM ai_metadata;  -- Was 0, should have been 148
   ```

2. **Print raw API response:**
   ```rust
   println!("[DEBUG] Raw API response: {}", &response_text.chars().take(500).collect::<String>());
   ```

3. **Show absolute file paths:**
   ```rust
   let abs_path = std::path::Path::new(path).canonicalize();
   println!("[DEBUG] Reading from: {}", abs_path);
   ```

4. **Print all lines in .env file:**
   ```rust
   for (i, line) in text.lines().enumerate() {
       println!("[DEBUG] Line {}: {} (len:{})", i, &line[..40], line.len());
   }
   ```

### Code Changes Made

1. **lib.rs:** Replaced dotenvy with custom .env parser that:
   - Handles BOM (Byte Order Mark)
   - Shows absolute path being read
   - Prints all lines for debugging
   - Handles quoted values

2. **ai.rs:** Added `deserialize_file_id` helper that accepts both string and number:
   ```rust
   #[serde(deserialize_with = "deserialize_file_id")]
   pub file_id: i64,
   ```

3. **ai.rs:** Fixed prompt to send file_id as number:
   ```rust
   // Before (broken): r#"{{"file_id": "{}", ...}}"#
   // After (fixed):   r#"{{"file_id": {}, ...}}"#
   ```

### Prevention Checklist

- [ ] Only one `.env` file in project (not in subfolders)
- [ ] Debug logging shows absolute paths for file operations
- [ ] JSON parsing failures are logged with the actual content that failed
- [ ] Database counts are checked after batch operations
- [ ] LLM response format is validated against expected schema
