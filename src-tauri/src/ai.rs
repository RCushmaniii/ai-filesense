use crate::category::Category;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::time::Duration;

/// AI provider configuration
#[derive(Debug, Clone)]
pub struct AIConfig {
    pub api_key: String,
    pub model: String,
    pub base_url: String,
}

/// Settings structure matching what's saved in settings.json
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct SavedSettings {
    anthropic_api_key: Option<String>,
    anthropic_model: Option<String>,
}

impl AIConfig {
    /// Create config from settings file or environment variables
    pub fn from_env() -> Result<Self, String> {
        // Try to read from settings file first (user-configured)
        let settings_api_key = Self::read_from_settings();

        // Try sources in order:
        // 1. User settings (highest priority - allows override)
        // 2. Runtime environment variables
        let api_key = settings_api_key
            .or_else(|| env::var("ANTHROPIC_SECRET_KEY").ok())
            .or_else(|| env::var("ANTHROPIC_API_KEY").ok())
            .ok_or("API key not configured. Please add your Anthropic API key in Settings.")?;

        // Trim any whitespace that might have been included
        let api_key = api_key.trim().to_string();

        let model = env::var("ANTHROPIC_MODEL")
            .unwrap_or_else(|_| "claude-haiku-4-5-20251001".to_string());

        Ok(Self {
            api_key,
            model,
            base_url: "https://api.anthropic.com/v1".to_string(),
        })
    }

    /// Try to read API key from settings file
    fn read_from_settings() -> Option<String> {
        // Try common app data locations (including Tauri's typical paths)
        let possible_paths = [
            dirs::data_dir().map(|p| p.join("com.aifileense.app").join("settings.json")),
            dirs::config_dir().map(|p| p.join("com.aifileense.app").join("settings.json")),
            // Also try APPDATA directly (Windows)
            std::env::var("APPDATA").ok().map(|p| std::path::PathBuf::from(p).join("com.aifileense.app").join("settings.json")),
        ];

        for path_opt in possible_paths.iter().flatten() {
            if path_opt.exists() {
                if let Ok(contents) = fs::read_to_string(path_opt) {
                    if let Ok(settings) = serde_json::from_str::<SavedSettings>(&contents) {
                        if let Some(key) = settings.anthropic_api_key {
                            if !key.is_empty() {
                                return Some(key);
                            }
                        }
                    }
                }
            }
        }

        None
    }
}

// Category and DocumentType are now imported from their own modules
// See: category.rs and document_type.rs

/// File info sent to AI for classification
#[derive(Debug, Clone, Serialize)]
pub struct FileForClassification {
    pub id: i64,
    pub filename: String,
    pub extension: Option<String>,
    pub size: i64,
    pub created_at: Option<String>,
    pub modified_at: Option<String>,
    pub snippet: Option<String>,
}

/// Helper to deserialize file_id from either string or number
fn deserialize_file_id<'de, D>(deserializer: D) -> Result<i64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::{self, Visitor};

    struct FileIdVisitor;

    impl<'de> Visitor<'de> for FileIdVisitor {
        type Value = i64;

        fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
            formatter.write_str("a number or string representing a number")
        }

        fn visit_i64<E>(self, v: i64) -> Result<i64, E> {
            Ok(v)
        }

        fn visit_u64<E>(self, v: u64) -> Result<i64, E> {
            Ok(v as i64)
        }

        fn visit_str<E>(self, v: &str) -> Result<i64, E>
        where
            E: de::Error,
        {
            v.parse().map_err(de::Error::custom)
        }
    }

    deserializer.deserialize_any(FileIdVisitor)
}

/// AI classification result for a single file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileClassification {
    #[serde(deserialize_with = "deserialize_file_id")]
    pub file_id: i64,
    pub category: Category,
    pub subcategory: Option<String>,
    pub tags: Vec<String>,
    pub summary: String,
    pub confidence: f64,
    pub suggested_folder: Option<String>,
}

/// Batch classification result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchClassificationResult {
    pub classifications: Vec<FileClassification>,
    pub tokens_used: u32,
    pub credits_used: f64,
}

/// Anthropic API message format
#[derive(Debug, Serialize)]
struct AnthropicMessage {
    role: String,
    content: String,
}

/// Anthropic API request
#[derive(Debug, Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<AnthropicMessage>,
}

/// Anthropic API response
#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    content: Vec<ContentBlock>,
    usage: Option<Usage>,
}

#[derive(Debug, Deserialize)]
struct ContentBlock {
    text: String,
}

#[derive(Debug, Deserialize)]
struct Usage {
    input_tokens: u32,
    output_tokens: u32,
}

/// AI Client for file classification
pub struct AIClient {
    config: AIConfig,
    http_client: Client,
}

impl AIClient {
    pub fn new(config: AIConfig) -> Result<Self, String> {
        let http_client = Client::builder()
            .timeout(Duration::from_secs(60))
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
        Ok(Self {
            config,
            http_client,
        })
    }

    /// Test the API connection with a minimal request
    pub async fn test_connection(&self) -> Result<(), String> {
        let request = AnthropicRequest {
            model: self.config.model.clone(),
            max_tokens: 10,
            messages: vec![AnthropicMessage {
                role: "user".to_string(),
                content: "Hi".to_string(),
            }],
        };

        let response = self
            .http_client
            .post(format!("{}/messages", self.config.base_url))
            .header("x-api-key", &self.config.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Connection failed: {}", e))?;

        if response.status().is_success() {
            Ok(())
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            if status.as_u16() == 401 {
                Err("Invalid API key".to_string())
            } else {
                Err(format!("API error ({}): {}", status, error_text))
            }
        }
    }

    /// Classify a batch of files
    pub async fn classify_files(
        &self,
        files: Vec<FileForClassification>,
    ) -> Result<BatchClassificationResult, String> {
        if files.is_empty() {
            return Ok(BatchClassificationResult {
                classifications: vec![],
                tokens_used: 0,
                credits_used: 0.0,
            });
        }

        // Build the prompt
        let prompt = self.build_classification_prompt(&files);

        // Call Anthropic API
        let request = AnthropicRequest {
            model: self.config.model.clone(),
            max_tokens: 4096,
            messages: vec![AnthropicMessage {
                role: "user".to_string(),
                content: prompt,
            }],
        };

        let response = self
            .http_client
            .post(format!("{}/messages", self.config.base_url))
            .header("x-api-key", &self.config.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("API request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("API error: {}", error_text));
        }

        let response_text_raw = response.text().await
            .map_err(|e| format!("Failed to read API response: {}", e))?;

        let api_response: AnthropicResponse = serde_json::from_str(&response_text_raw)
            .map_err(|e| format!("Failed to parse API response: {}. Raw: {}", e, &response_text_raw.chars().take(200).collect::<String>()))?;

        // Parse the response
        let response_text = api_response
            .content
            .first()
            .map(|c| c.text.clone())
            .unwrap_or_default();

        let classifications = self.parse_classification_response(&response_text, &files)?;

        let tokens_used = api_response
            .usage
            .map(|u| u.input_tokens + u.output_tokens)
            .unwrap_or(0);

        // Estimate credits (rough: 1 credit per 1000 tokens for Haiku)
        let credits_used = tokens_used as f64 / 1000.0;

        Ok(BatchClassificationResult {
            classifications,
            tokens_used,
            credits_used,
        })
    }

    fn build_classification_prompt(&self, files: &[FileForClassification]) -> String {
        // Build file list using serde_json for proper escaping (prevents prompt injection
        // from filenames or snippets containing quotes, backslashes, control chars)
        #[derive(Serialize)]
        struct PromptFileEntry {
            file_id: i64,
            filename: String,
            preview_text: String,
        }

        let mut file_list = String::new();
        for file in files.iter() {
            let preview = file.snippet.as_deref().unwrap_or("");
            let entry = PromptFileEntry {
                file_id: file.id,
                filename: format!(
                    "{}.{}",
                    file.filename,
                    file.extension.as_deref().unwrap_or("")
                ),
                preview_text: preview.chars().take(300).collect::<String>(),
            };
            if let Ok(json) = serde_json::to_string(&entry) {
                file_list.push_str(&json);
                file_list.push('\n');
            }
        }

        format!(
            r#"You are a File Classification Engine. Classify files into 12 canonical smart folders.

### INPUT FORMAT
Array of objects with:
- `file_id` (number, required)
- `filename` (string, required)
- `preview_text` (string, optional - extracted content or description)

### OUTPUT SCHEMA (Strict)
Return a single JSON object:
{{
  "classifications": [
    {{
      "file_id": number,           // Preserve exactly from input
      "category": string,          // From CATEGORIES only
      "subcategory": string|null,  // From SUBCATEGORY_MAP or dynamically created
      "tags": string[],            // 2-5 lowercase, no spaces, alphanumeric + hyphens
      "summary": string,           // Max 80 chars, sentence case, no filename regurgitation
      "confidence": number,        // 0.50-0.98 range (never 1.0)
      "suggested_folder": string   // Forward slashes, no leading/trailing slash
    }}
  ]
}}

### CATEGORIES (Use ONLY these 12 categories)
["Work", "Money", "Home", "Health", "Legal", "School", "Family", "Clients", "Projects", "Travel", "Archive", "Review"]

### WHAT BELONGS IN EACH CATEGORY
| Category | When to Use | Typical Contents |
|----------|-------------|------------------|
| Work | Employment and career | Resumes, job offers, performance reviews, payslips, benefits, HR docs |
| Money | Finances and banking | Bank statements, taxes, investments, receipts, bills, invoices, budgets |
| Home | Property and housing | Mortgage, rent, utilities, repairs, warranties, car titles, deeds |
| Health | Medical and wellness | Medical records, prescriptions, lab results, health insurance, dental |
| Legal | Contracts and legal | Agreements, contracts, court docs, licenses, wills, IDs |
| School | Education and learning | Courses, certificates, transcripts, research, degrees, training |
| Family | Personal relationships | Family correspondence, kids' records, personal letters, photos |
| Clients | Business clients | Client docs, vendor contracts, customer correspondence, invoices |
| Projects | Active projects | Project deliverables, milestones, project-specific documents |
| Travel | Trips and travel docs | Passports, visas, boarding passes, hotel bookings, itineraries, travel insurance |
| Archive | Historical/inactive | Old docs (4+ years), completed projects, historical records |
| Review | Low-confidence items | User decision required, uncertain files |

### SUBCATEGORY_MAP (Use these values, null, or create dynamic subfolders)
{{
  "Work": ["Resumes", "Performance", "Payslips", "Benefits", "Training"],
  "Money": ["Banking", "Taxes", "Investments", "Receipts", "Bills", "Insurance"],
  "Home": ["Property", "Vehicle", "Maintenance", "Utilities", "Warranties"],
  "Health": ["Records", "Prescriptions", "Insurance", "LabResults", "Appointments"],
  "Legal": ["Contracts", "Agreements", "Licenses", "IDs", "Wills"],
  "School": ["Courses", "Certifications", "Research", "Transcripts", "Applications"],
  "Family": null,
  "Clients": null,
  "Projects": null,
  "Travel": ["Flights", "Hotels", "Itineraries", "Visas", "Bookings"],
  "Archive": ["2024", "2023", "2022", "2021", "Older"],
  "Review": null
}}

For categories with null subfolders (Family, Clients, Projects), create dynamic subfolders:
- Family: Use person names (e.g., "Mom", "Kids", "Spouse")
- Clients: Use client/company names (e.g., "Acme Corp", "BigCo")
- Projects: Use project names (e.g., "Q4 Report", "Website Redesign")

### CLASSIFICATION RULES (First Match Wins)

**PRIORITY 1: CONTENT SIGNALS (from preview_text)**
| Signal | Category |
|--------|----------|
| Resume, CV, job offer, employment, HR, payslip, performance review | Work |
| Bank statement, tax return, W-2, 1099, invoice, receipt, payment | Money |
| Mortgage, deed, title, rent, lease, utility bill, home repair, warranty | Home |
| Medical, prescription, diagnosis, lab result, HIPAA, patient, doctor | Health |
| Contract, agreement, NDA, court, lawsuit, attorney, legal, license, ID | Legal |
| Course, certificate, transcript, degree, training, university, education | School |
| Child, kids, spouse, family, personal letter, family member names | Family |
| Client, vendor, customer, "Bill To:", business invoice, company | Clients |
| "Project:", deliverable, milestone, project name | Projects |
| Passport, visa, boarding pass, flight, hotel, itinerary, travel insurance | Travel |
| 4+ years old, historical, archived, completed, inactive | Archive |

**PRIORITY 2: CONTEXTUAL (when content unclear)**
- Employment context → Work
- Money/payment context → Money
- Home/property context → Home
- Medical context → Health
- Contract/ID context → Legal
- Education context → School
- Family context → Family
- Client/business context → Clients
- Project-based context → Projects
- Travel/trip context → Travel
- Old/historical context → Archive
- Completely unclear → Review

### CONFIDENCE CALIBRATION
| Score | Criteria |
|-------|----------|
| 0.80-0.98 | Clear category keyword in content + filename reinforces |
| 0.50-0.79 | Reasonable guess from filename or partial content match |
| 0.35-0.49 | Uncertain - file should go to Review |

**CRITICAL**: If confidence < 0.35, set category to "Review"

### FOLDER STRUCTURE
Pattern: `Category/Subcategory` (max 2 levels)

Examples:
- `Health/Records`
- `Money/Taxes`
- `Work/Resumes`
- `Clients/Acme Corp`
- `Projects/Website Redesign`
- `Archive/2024`
- `Review` (for uncertain files)

### TAG GENERATION RULES
1. Extract from: filename words, preview keywords, detected entities
2. Format: lowercase, alphanumeric + hyphens only
3. Include: year if present, document type, key entities
4. Exclude: generic words, the category name itself

### OUTPUT RULES
1. Return ONLY the JSON object—no markdown, no explanation
2. Validate all file_ids are preserved exactly
3. Ensure every category value exists in CATEGORIES
4. If confidence < 0.35, category MUST be "Review"

FILES TO CLASSIFY:
{file_list}"#,
            file_list = file_list
        )
    }

    fn parse_classification_response(
        &self,
        response: &str,
        files: &[FileForClassification],
    ) -> Result<Vec<FileClassification>, String> {
        // Try to extract JSON from the response
        let json_str = if response.contains("```json") {
            response
                .split("```json")
                .nth(1)
                .and_then(|s| s.split("```").next())
                .unwrap_or(response)
        } else if response.contains("```") {
            response
                .split("```")
                .nth(1)
                .unwrap_or(response)
        } else {
            response
        };

        // Parse directly into our types - Category enum provides automatic validation
        #[derive(Deserialize)]
        struct ParsedResponse {
            classifications: Vec<FileClassification>,
        }

        let parsed: ParsedResponse = serde_json::from_str(json_str.trim())
            .map_err(|e| format!("Failed to parse classification JSON: {}. Response: {}", e, json_str))?;

        // Apply confidence clamping (0.50-0.98 per schema) and route low-confidence to Review
        let review_threshold = Category::review_confidence_threshold();
        let mut classifications: Vec<FileClassification> = parsed
            .classifications
            .into_iter()
            .map(|mut c| {
                c.confidence = c.confidence.clamp(0.50, 0.98);
                // Route low-confidence items to Review
                if c.confidence < review_threshold {
                    c.category = Category::Review;
                    c.suggested_folder = Some("Review".to_string());
                }
                c
            })
            .collect();

        // Fill in any missing files with defaults - route to Review
        for file in files {
            if !classifications.iter().any(|c| c.file_id == file.id) {
                classifications.push(FileClassification {
                    file_id: file.id,
                    category: Category::Review,
                    subcategory: None,
                    tags: vec!["unclassified".to_string()],
                    summary: format!("Unclassified file: {}", file.filename),
                    confidence: 0.50,
                    suggested_folder: Some("Review".to_string()),
                });
            }
        }

        Ok(classifications)
    }
}

/// Estimate credits needed for a batch of files
pub fn estimate_credits(file_count: usize) -> f64 {
    // Rough estimate: ~500 tokens per file (prompt + response)
    // Haiku pricing is very cheap, so 1 credit ≈ 1000 tokens
    (file_count as f64 * 0.5).ceil()
}

// ============================================================================
// AI-Powered Clarification Question Generation (Screen 7)
// ============================================================================

/// User personalization answers from onboarding (Q1-Q4)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalizationAnswers {
    /// Q1: User roles (multi-select)
    pub user_roles: Vec<String>,
    /// Q2: How user looks up files
    pub lookup_style: Option<String>,
    /// Q3: Folder structure depth preference
    pub folder_depth: Option<String>,
    /// Q4: Archive policy for old files
    pub archive_policy: Option<String>,
}

/// File summary for question generation context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSummary {
    pub id: i64,
    pub filename: String,
    pub category: String,
    pub subcategory: Option<String>,
    pub confidence: f64,
    pub summary: Option<String>,
}

/// Category statistics for AI context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryStats {
    pub category: String,
    pub count: i64,
    pub avg_confidence: f64,
    pub low_confidence_count: i64,
}

/// Question option from AI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionOption {
    pub id: String,
    pub label_en: String,
    pub label_es: String,
    #[serde(default)]
    pub is_recommended: bool,
    #[serde(default)]
    pub is_skip: bool,
    pub target_category: Option<String>,
}

/// Candidate destination for affected files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateDestination {
    pub category: String,
    pub confidence: f64,
}

/// AI-generated clarification question
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClarificationQuestion {
    pub id: String,
    pub question_type: String,  // "single-select", "multi-select", "text-input", "yes-no"
    pub question_en: String,
    pub question_es: String,
    pub why_en: String,
    pub why_es: String,
    pub options: Option<Vec<QuestionOption>>,
    pub placeholder: Option<String>,
    pub suggestion: Option<String>,
    pub max_selections: Option<i32>,
    pub affected_file_ids: Vec<i64>,
    pub affected_filenames: Vec<String>,
    pub candidate_destinations: Vec<CandidateDestination>,
    pub priority: i32,  // 1-5 (1 = Safety, 5 = Duplicates)
}

/// AI response for question generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionGenerationResult {
    pub questions: Vec<ClarificationQuestion>,
    pub tokens_used: u32,
}

impl AIClient {
    /// Generate clarification questions using AI
    pub async fn generate_clarification_questions(
        &self,
        personalization: &PersonalizationAnswers,
        category_stats: &[CategoryStats],
        low_confidence_files: &[FileSummary],
        ambiguous_groups: &[Vec<FileSummary>],
    ) -> Result<QuestionGenerationResult, String> {
        // Build the dynamic system prompt
        let prompt = self.build_question_generation_prompt(
            personalization,
            category_stats,
            low_confidence_files,
            ambiguous_groups,
        );

        // Call Anthropic API
        let request = AnthropicRequest {
            model: self.config.model.clone(),
            max_tokens: 4096,
            messages: vec![AnthropicMessage {
                role: "user".to_string(),
                content: prompt,
            }],
        };

        let response = self
            .http_client
            .post(format!("{}/messages", self.config.base_url))
            .header("x-api-key", &self.config.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("API request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("API error: {}", error_text));
        }

        let response_text_raw = response.text().await
            .map_err(|e| format!("Failed to read API response: {}", e))?;

        let api_response: AnthropicResponse = serde_json::from_str(&response_text_raw)
            .map_err(|e| format!("Failed to parse API response: {}", e))?;

        let response_text = api_response
            .content
            .first()
            .map(|c| c.text.clone())
            .unwrap_or_default();

        // Parse the questions from AI response
        let questions = self.parse_question_response(&response_text)?;

        let tokens_used = api_response
            .usage
            .map(|u| u.input_tokens + u.output_tokens)
            .unwrap_or(0);

        Ok(QuestionGenerationResult {
            questions,
            tokens_used,
        })
    }

    fn build_question_generation_prompt(
        &self,
        personalization: &PersonalizationAnswers,
        category_stats: &[CategoryStats],
        low_confidence_files: &[FileSummary],
        ambiguous_groups: &[Vec<FileSummary>],
    ) -> String {
        // Build user context section
        let user_context = self.build_user_context(personalization);

        // Build file context section
        let file_context = self.build_file_context(category_stats, low_confidence_files, ambiguous_groups);

        format!(
            r#"You are a Clarification Question Generator for a file organization app. Your job is to generate 0-5 smart questions that help resolve ambiguities in file classification.

## STRICT CONSTRAINTS (MUST FOLLOW)

1. **Question Limits**:
   - Maximum 5 questions total
   - Maximum 1 text-input (freeform) question
   - Maximum 2 multi-select questions
   - If no clarification needed, return empty array

2. **Question Priority Order** (generate in this order):
   - Priority 1: SAFETY - Identity docs (passport, SSN), medical, legal
   - Priority 2: HIERARCHY - Work vs School, personal vs professional
   - Priority 3: LABELING - Project/client naming
   - Priority 4: BULK INTENT - Groups of similar files
   - Priority 5: DUPLICATES - How to handle duplicate files

3. **Question Types**:
   - `single-select`: 2-4 mutually exclusive options
   - `multi-select`: 2-4 options, can select multiple (max_selections required)
   - `text-input`: Freeform text with placeholder and optional AI suggestion
   - `yes-no`: Binary choice

4. **Skip Behavior**: Every question with options MUST include a skip/review option as the last choice

5. **Confidence Threshold**: Only ask about files with confidence < 0.70

## USER CONTEXT
{user_context}

## FILE CLASSIFICATION DATA
{file_context}

## QUESTION TEMPLATES

### Category Tie-Break (single-select)
Use when: Multiple files could reasonably belong to 2 categories
Example: "These files could be Work or School. Which fits better?"

### Identity/Legal/Money/Home (single-select)
Use when: Important documents need correct categorization (car docs, insurance, etc.)
Example: "This group looks car-related. Are these loan/insurance (Money), registration/title (Legal), or maintenance (Home)?"

### Projects vs Clients (single-select)
Use when: Files might be client work or internal projects
Example: "Are these files for a client or an internal project?"

### Name the Group (text-input)
Use when: Project/Client files need a subfolder name
Example: "What should we call this project?"
Provide: placeholder text, AI-suggested name if pattern detected

### Split vs Keep Together (single-select)
Use when: Group might need to be split across categories
Example: "Should we keep these together or split by type?"

### Duplicate Intent (single-select)
Use when: Duplicate files detected
Example: "We found duplicates. Keep newest, keep all, or review each?"

## OUTPUT FORMAT (Strict JSON)

Return ONLY a JSON object with this structure:
{{
  "questions": [
    {{
      "id": "unique_id",
      "question_type": "single-select|multi-select|text-input|yes-no",
      "question_en": "English question text",
      "question_es": "Spanish question text",
      "why_en": "Short explanation in English (why this matters)",
      "why_es": "Short explanation in Spanish",
      "options": [
        {{
          "id": "option_id",
          "label_en": "English label",
          "label_es": "Spanish label",
          "is_recommended": true|false,
          "is_skip": false,
          "target_category": "Category|null"
        }}
      ],
      "placeholder": "For text-input only",
      "suggestion": "AI suggestion for text-input",
      "max_selections": 2,
      "affected_file_ids": [1, 2, 3],
      "affected_filenames": ["file1.pdf", "file2.pdf"],
      "candidate_destinations": [
        {{"category": "Work", "confidence": 0.65}},
        {{"category": "School", "confidence": 0.60}}
      ],
      "priority": 2
    }}
  ]
}}

## RULES

1. Return ONLY valid JSON - no markdown, no explanation
2. Every question must have bilingual text (English + Spanish)
3. affected_file_ids must contain actual file IDs from the input
4. Options must have the skip option last with is_skip: true
5. Mark ONE option as is_recommended: true (the AI's best guess)
6. For text-input: always include placeholder, optionally include suggestion
7. priority must be 1-5 based on the priority order above
8. If no questions are needed, return: {{"questions": []}}

## IMPORTANT

- Do NOT ask about files with confidence >= 0.80 (they're fine)
- Do NOT ask more than 5 questions total
- Focus on HIGH-IMPACT clarifications that affect many files
- Spanish translations must be natural, not literal

Now analyze the file data and generate appropriate questions."#,
            user_context = user_context,
            file_context = file_context
        )
    }

    fn build_user_context(&self, personalization: &PersonalizationAnswers) -> String {
        let roles = if personalization.user_roles.is_empty() {
            "Not specified".to_string()
        } else {
            personalization.user_roles.join(", ")
        };

        let lookup = personalization.lookup_style.as_deref().unwrap_or("Not specified");
        let depth = personalization.folder_depth.as_deref().unwrap_or("Not specified");
        let archive = personalization.archive_policy.as_deref().unwrap_or("Not specified");

        // Provide guidance based on personalization
        let mut guidance = Vec::new();

        // Role-based guidance
        for role in &personalization.user_roles {
            match role.as_str() {
                "student" | "teacher" => guidance.push("- Likely has School-related files, watch for Work vs School ambiguity"),
                "parent" => guidance.push("- Likely has Family and kids-related documents"),
                "freelancer" | "business" => guidance.push("- Likely has Clients folder, watch for Projects vs Clients"),
                "office" => guidance.push("- Likely has more Work files than average"),
                "creative" => guidance.push("- May have project-based organization, watch for Projects naming"),
                _ => {}
            }
        }

        // Lookup style guidance
        match lookup {
            "topic" => guidance.push("- Prefers topic-based organization, prioritize clear categories"),
            "time" => guidance.push("- Prefers timeline organization, consider year-based Archive questions"),
            "project" => guidance.push("- Prefers project-based organization, prioritize naming questions"),
            _ => {}
        }

        // Archive policy guidance
        match archive {
            "archive" => guidance.push("- Wants old files archived, consider Archive category for old documents"),
            "keep" => guidance.push("- Prefers keeping files in place, minimize Archive suggestions"),
            _ => {}
        }

        let guidance_str = if guidance.is_empty() {
            "No specific guidance".to_string()
        } else {
            guidance.join("\n")
        };

        format!(
            r#"User Profile:
- Roles: {roles}
- Lookup preference: {lookup}
- Folder depth preference: {depth}
- Archive policy: {archive}

Guidance based on profile:
{guidance_str}"#,
            roles = roles,
            lookup = lookup,
            depth = depth,
            archive = archive,
            guidance_str = guidance_str
        )
    }

    fn build_file_context(
        &self,
        category_stats: &[CategoryStats],
        low_confidence_files: &[FileSummary],
        ambiguous_groups: &[Vec<FileSummary>],
    ) -> String {
        // Category breakdown
        let mut category_section = String::from("### Category Breakdown\n");
        for stat in category_stats {
            category_section.push_str(&format!(
                "- {}: {} files (avg confidence: {:.0}%, {} low confidence)\n",
                stat.category,
                stat.count,
                stat.avg_confidence * 100.0,
                stat.low_confidence_count
            ));
        }

        // Low confidence files
        let mut low_conf_section = String::from("\n### Low Confidence Files (need clarification)\n");
        if low_confidence_files.is_empty() {
            low_conf_section.push_str("None - all files classified with high confidence.\n");
        } else {
            for file in low_confidence_files.iter().take(30) {
                low_conf_section.push_str(&format!(
                    "- ID:{} \"{}\" → {} ({:.0}%){}\n",
                    file.id,
                    file.filename,
                    file.category,
                    file.confidence * 100.0,
                    file.summary.as_ref().map(|s| format!(" - {}", s)).unwrap_or_default()
                ));
            }
            if low_confidence_files.len() > 30 {
                low_conf_section.push_str(&format!("... and {} more\n", low_confidence_files.len() - 30));
            }
        }

        // Ambiguous groups (files that might belong together)
        let mut groups_section = String::from("\n### Potentially Related File Groups\n");
        if ambiguous_groups.is_empty() {
            groups_section.push_str("No obvious groupings detected.\n");
        } else {
            for (i, group) in ambiguous_groups.iter().enumerate().take(5) {
                groups_section.push_str(&format!("\nGroup {}:\n", i + 1));
                for file in group.iter().take(5) {
                    groups_section.push_str(&format!(
                        "  - ID:{} \"{}\" → {} ({:.0}%)\n",
                        file.id,
                        file.filename,
                        file.category,
                        file.confidence * 100.0
                    ));
                }
                if group.len() > 5 {
                    groups_section.push_str(&format!("  ... and {} more in this group\n", group.len() - 5));
                }
            }
        }

        format!("{}{}{}", category_section, low_conf_section, groups_section)
    }

    fn parse_question_response(&self, response: &str) -> Result<Vec<ClarificationQuestion>, String> {
        // Try to extract JSON from the response
        let json_str = if response.contains("```json") {
            response
                .split("```json")
                .nth(1)
                .and_then(|s| s.split("```").next())
                .unwrap_or(response)
        } else if response.contains("```") {
            response
                .split("```")
                .nth(1)
                .unwrap_or(response)
        } else {
            response
        };

        #[derive(Deserialize)]
        struct ParsedResponse {
            questions: Vec<ClarificationQuestion>,
        }

        let parsed: ParsedResponse = serde_json::from_str(json_str.trim())
            .map_err(|e| format!("Failed to parse questions JSON: {}. Response: {}", e, json_str.chars().take(500).collect::<String>()))?;

        // Validate and enforce constraints
        let mut questions = parsed.questions;

        // Enforce max 5 questions
        questions.truncate(5);

        // Enforce max 1 text-input
        let mut text_input_count = 0;
        questions.retain(|q| {
            if q.question_type == "text-input" {
                text_input_count += 1;
                text_input_count <= 1
            } else {
                true
            }
        });

        // Enforce max 2 multi-select
        let mut multi_select_count = 0;
        questions.retain(|q| {
            if q.question_type == "multi-select" {
                multi_select_count += 1;
                multi_select_count <= 2
            } else {
                true
            }
        });

        // Sort by priority
        questions.sort_by_key(|q| q.priority);

        Ok(questions)
    }
}
