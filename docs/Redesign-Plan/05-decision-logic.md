# Decision Logic

> **Document:** 05-decision-logic.md  
> **Purpose:** Define how user inputs and scan signals determine recommendations

---

## Overview

The decision logic maps three types of inputs to outputs:

1. **User Questions (Q1, Q2, Q3)** — Optional personalization
2. **Scan Signals** — Document analysis results
3. **System Defaults** — Fallback when inputs missing

```
┌─────────────────────────────────────────────────────────────┐
│                        INPUTS                               │
├─────────────────────────────────────────────────────────────┤
│  Q1: User Type          │  Q2: Lookup Style   │  Q3: Auto  │
│  (freelancer, student,  │  (topic, time,      │  (safe,    │
│   parent, etc.)         │   project, unknown) │   balanced,│
│                         │                     │   aggressive)
├─────────────────────────────────────────────────────────────┤
│                      SCAN SIGNALS                           │
│  • Total documents      • Detected topics                   │
│  • Date spread          • Detected entities                 │
│  • Average confidence   • Duplicate rate                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       OUTPUTS                               │
├─────────────────────────────────────────────────────────────┤
│  • Recommended Mode (simple / timeline / smart_groups)      │
│  • Confidence Threshold (0.50 - 0.85)                       │
│  • Folder Selection (which folders to create)               │
│  • Explanation Text (why this recommendation)               │
└─────────────────────────────────────────────────────────────┘
```

---

## Input Definitions

### Q1: User Type

| Value | Description | Folder Implications |
|-------|-------------|---------------------|
| `parent` | Home & family admin | Add `Family` folder |
| `student` | Education focus | Add `School` folder |
| `teacher` | Education professional | Add `School` folder |
| `corporate` | Office/corporate job | Standard `Work` folder |
| `freelancer` | Independent contractor | Add `Clients` folder, lean toward Smart Groups |
| `smb_owner` | Small business owner | Add `Clients` folder, lean toward Smart Groups |
| `retired` | Retired individual | Simpler structure, more Archive |
| `creative` | Photo/video/design work | Lean toward Timeline mode |
| `other` | Custom/unspecified | Use scan signals only |
| `null` | Question skipped | Use scan signals only |

### Q2: Lookup Style

| Value | Description | Mode Implication |
|-------|-------------|------------------|
| `by_topic` | "I look for files by what they're about" | → Simple mode |
| `by_time` | "I look for files by when I used them" | → Timeline mode |
| `by_project` | "I look for files by client or project" | → Smart Groups mode |
| `unknown` | "I don't know / just clean it up" | → Infer from Q1 + scan |

### Q3: Automation Level

| Value | Confidence Threshold | Behavior |
|-------|---------------------|----------|
| `safe` | 0.85 | More documents go to Review |
| `balanced` | 0.70 | Standard threshold (default) |
| `aggressive` | 0.50 | More automatic moves |

---

## Scan Signal Definitions

```python
@dataclass
class ScanSummary:
    total_docs: int                    # Total documents scanned
    date_spread_years: int             # Range of document dates
    detected_topics: list[TopicCount]  # Topics found with counts
    detected_entities: list[Entity]    # Clients, companies, projects
    avg_confidence: float              # Mean classification confidence
    duplicate_rate: float              # Estimated duplicate percentage
    
@dataclass
class TopicCount:
    topic: str      # e.g., "Work", "Money", "Health"
    count: int      # Documents matching
    confidence: float

@dataclass  
class Entity:
    type: str       # "client", "company", "project"
    value: str      # e.g., "Acme Corp"
    doc_count: int  # Documents mentioning
```

---

## Mode Recommendation Logic

### Primary Decision Tree

```python
def recommend_mode(q1: str, q2: str, q3: str, scan: ScanSummary) -> str:
    """
    Returns: 'simple' | 'timeline' | 'smart_groups'
    
    Priority:
    1. Q2 explicit preference (strongest signal)
    2. Q1 user type + scan signals (inference)
    3. Default to simple (safest)
    """
    
    # ═══════════════════════════════════════════════════════════
    # PRIORITY 1: Q2 is explicit preference—respect it
    # ═══════════════════════════════════════════════════════════
    if q2 == "by_project":
        return "smart_groups"
    if q2 == "by_time":
        return "timeline"
    if q2 == "by_topic":
        return "simple"
    
    # ═══════════════════════════════════════════════════════════
    # PRIORITY 2: Q2 is "unknown"—infer from Q1 + scan
    # ═══════════════════════════════════════════════════════════
    
    # Freelancers/SMBs with multiple clients → Smart Groups
    if q1 in ("freelancer", "smb_owner"):
        if len(scan.detected_entities) >= 3:
            return "smart_groups"
    
    # Large date spread + few distinct topics → Timeline
    if scan.date_spread_years >= 5:
        if len(scan.detected_topics) <= 4:
            return "timeline"
    
    # Creative users often prefer chronological
    if q1 == "creative":
        return "timeline"
    
    # ═══════════════════════════════════════════════════════════
    # PRIORITY 3: Default to Simple (safest for most users)
    # ═══════════════════════════════════════════════════════════
    return "simple"
```

### Decision Matrix (Visual)

| Q2 Value | Q1 Value | Scan Signals | → Mode |
|----------|----------|--------------|--------|
| `by_topic` | Any | Any | **Simple** |
| `by_time` | Any | Any | **Timeline** |
| `by_project` | Any | Any | **Smart Groups** |
| `unknown` | `freelancer` | 3+ entities | **Smart Groups** |
| `unknown` | `smb_owner` | 3+ entities | **Smart Groups** |
| `unknown` | `creative` | Any | **Timeline** |
| `unknown` | Any | 5+ year spread, ≤4 topics | **Timeline** |
| `unknown` | Any | Otherwise | **Simple** |

---

## Confidence Threshold Logic

```python
def get_confidence_threshold(q3: str) -> float:
    """
    Documents below this threshold route to Review.
    """
    thresholds = {
        "safe": 0.85,       # Conservative—more Review
        "balanced": 0.70,   # Default
        "aggressive": 0.50  # Liberal—more auto-moves
    }
    return thresholds.get(q3, 0.70)  # Default to balanced
```

### Threshold Impact

| Threshold | Typical Review % | User Experience |
|-----------|------------------|-----------------|
| 0.85 (safe) | 25-35% | "Lots to review, but very accurate" |
| 0.70 (balanced) | 10-20% | "Good balance of auto and review" |
| 0.50 (aggressive) | 5-10% | "Most files auto-organized" |

---

## Folder Selection Logic

```python
def select_folders(mode: str, q1: str, scan: ScanSummary) -> list[str]:
    """
    Returns ordered list of folder names to create.
    Always includes 'Review' as last folder.
    Max 10 folders total.
    """
    
    # ═══════════════════════════════════════════════════════════
    # BASE FOLDER SETS BY MODE
    # ═══════════════════════════════════════════════════════════
    BASE_FOLDERS = {
        "simple": ["Work", "Money", "Home", "Health", "Archive", "Review"],
        "timeline": ["2025", "2024", "2023", "Older", "Review"],
        "smart_groups": ["Clients", "Projects", "Money", "Archive", "Review"]
    }
    
    folders = BASE_FOLDERS[mode].copy()
    
    # ═══════════════════════════════════════════════════════════
    # PERSONALIZATION ADDITIONS BASED ON Q1
    # ═══════════════════════════════════════════════════════════
    
    # Students and teachers get School folder
    if q1 in ("student", "teacher"):
        if "School" not in folders:
            folders.insert(2, "School")
    
    # Parents get Family folder
    if q1 == "parent":
        if "Family" not in folders:
            folders.insert(3, "Family")
    
    # Freelancers/SMBs get Clients (if not already in smart_groups)
    if q1 in ("freelancer", "smb_owner"):
        if "Clients" not in folders:
            folders.insert(1, "Clients")
    
    # ═══════════════════════════════════════════════════════════
    # SCAN-BASED ADDITIONS
    # ═══════════════════════════════════════════════════════════
    
    # Add Legal if contracts detected
    if any(t.topic == "Legal" and t.count >= 10 for t in scan.detected_topics):
        if "Legal" not in folders:
            folders.insert(-1, "Legal")  # Before Review
    
    # ═══════════════════════════════════════════════════════════
    # CLEANUP: Remove empty, enforce limits
    # ═══════════════════════════════════════════════════════════
    
    # Remove folders with no documents (except Review)
    folders = [f for f in folders 
               if f == "Review" or has_documents_for_folder(f, scan)]
    
    # Enforce maximum 10 folders
    if len(folders) > 10:
        # Keep first 9 + Review
        folders = folders[:9]
        if "Review" not in folders:
            folders.append("Review")
    
    return folders


def has_documents_for_folder(folder: str, scan: ScanSummary) -> bool:
    """Check if any documents would go to this folder."""
    # Timeline mode: check date spread
    if folder.isdigit():
        year = int(folder)
        return any(doc.year == year for doc in scan.documents)
    if folder == "Older":
        return any(doc.year < 2022 for doc in scan.documents)
    
    # Topic folders: check detected topics
    for topic in scan.detected_topics:
        if topic.topic == folder and topic.count > 0:
            return True
    
    return False
```

---

## Mode Confidence Calculation

```python
def calculate_mode_confidence(q2: str, scan: ScanSummary) -> float:
    """
    How confident are we in the mode recommendation?
    Higher when user explicitly chose (Q2) vs inferred.
    """
    
    # Explicit choice = high confidence
    if q2 in ("by_topic", "by_time", "by_project"):
        return 0.95
    
    # Inferred from strong signals
    if len(scan.detected_entities) >= 5:
        return 0.85  # Strong entity signal → Smart Groups
    
    if scan.date_spread_years >= 7:
        return 0.80  # Strong time signal → Timeline
    
    # Default inference
    return 0.70
```

---

## Full Orchestration

```python
def generate_organization_plan(
    q1: str | None,
    q2: str | None, 
    q3: str | None,
    scan: ScanSummary
) -> OrganizationPlan:
    """
    Main entry point: generates complete organization plan.
    """
    
    # Apply defaults for missing inputs
    q1 = q1 or "other"
    q2 = q2 or "unknown"
    q3 = q3 or "balanced"
    
    # ═══════════════════════════════════════════════════════════
    # STEP 1: Determine mode
    # ═══════════════════════════════════════════════════════════
    mode = recommend_mode(q1, q2, q3, scan)
    mode_confidence = calculate_mode_confidence(q2, scan)
    
    # ═══════════════════════════════════════════════════════════
    # STEP 2: Get confidence threshold
    # ═══════════════════════════════════════════════════════════
    threshold = get_confidence_threshold(q3)
    
    # ═══════════════════════════════════════════════════════════
    # STEP 3: Select folders
    # ═══════════════════════════════════════════════════════════
    folder_names = select_folders(mode, q1, scan)
    
    # ═══════════════════════════════════════════════════════════
    # STEP 4: Assign documents to folders
    # ═══════════════════════════════════════════════════════════
    folders = []
    review_count = 0
    
    for folder_name in folder_names:
        if folder_name == "Review":
            continue  # Handle last
        
        # Get documents for this folder
        matched_docs = [
            d for d in scan.classified_documents
            if d.suggested_folder == folder_name 
            and d.confidence >= threshold
        ]
        
        folders.append(Folder(
            name=folder_name,
            document_count=len(matched_docs),
            sample_files=[d.filename for d in matched_docs[:3]],
            subfolders=get_subfolders(folder_name, matched_docs)
        ))
    
    # Everything below threshold → Review
    review_docs = [
        d for d in scan.classified_documents
        if d.confidence < threshold
    ]
    review_count = len(review_docs)
    
    folders.append(Folder(
        name="Review",
        document_count=review_count,
        sample_files=[d.filename for d in review_docs[:3]]
    ))
    
    # ═══════════════════════════════════════════════════════════
    # STEP 5: Generate explanation
    # ═══════════════════════════════════════════════════════════
    explanation = generate_explanation(mode, q1, scan)
    
    # ═══════════════════════════════════════════════════════════
    # STEP 6: Build personalization log
    # ═══════════════════════════════════════════════════════════
    personalization = []
    if q1 and q1 != "other":
        personalization.append(f"user_type:{q1}")
    if q2 and q2 != "unknown":
        personalization.append(f"lookup_style:{q2}")
    if q3 and q3 != "balanced":
        personalization.append(f"automation:{q3}")
    
    return OrganizationPlan(
        mode=mode,
        mode_confidence=mode_confidence,
        folders=folders,
        review_count=review_count,
        explanation=explanation,
        personalization_applied=personalization
    )
```

---

## Quick Fix Question Generation

```python
def generate_quick_fix_questions(
    scan: ScanSummary, 
    max_questions: int = 3
) -> list[QuickFixQuestion]:
    """
    Generate 2-5 high-impact questions to improve classification.
    Only ask about patterns affecting many documents.
    """
    
    questions = []
    
    # ═══════════════════════════════════════════════════════════
    # FIND HIGH-IMPACT ENTITIES
    # ═══════════════════════════════════════════════════════════
    entities = sorted(
        scan.detected_entities,
        key=lambda e: e.doc_count,
        reverse=True
    )
    
    for entity in entities[:max_questions]:
        # Only ask if affects 10+ documents
        if entity.doc_count < 10:
            continue
        
        questions.append(QuickFixQuestion(
            type="entity_classification",
            entity_name=entity.value,
            doc_count=entity.doc_count,
            sample_files=get_sample_files_for_entity(entity, scan)[:3],
            options=get_options_for_entity(entity)
        ))
    
    return questions


def get_options_for_entity(entity: Entity) -> list[QuickFixOption]:
    """Generate options based on entity type."""
    
    if entity.type == "company":
        return [
            QuickFixOption(id="work", label="Work (my employer)"),
            QuickFixOption(id="client", label="Client (my client)"),
            QuickFixOption(id="vendor", label="Vendor (I pay them)"),
            QuickFixOption(id="skip", label="Skip"),
        ]
    
    if entity.type == "project":
        return [
            QuickFixOption(id="work", label="Work project"),
            QuickFixOption(id="personal", label="Personal project"),
            QuickFixOption(id="skip", label="Skip"),
        ]
    
    # Default
    return [
        QuickFixOption(id="work", label="Work"),
        QuickFixOption(id="personal", label="Personal"),
        QuickFixOption(id="skip", label="Skip"),
    ]
```

---

## Edge Cases

### No Documents Found

```python
if scan.total_docs == 0:
    return OrganizationPlan(
        mode="simple",
        mode_confidence=1.0,
        folders=[],
        review_count=0,
        explanation="No documents found in the selected locations.",
        personalization_applied=[]
    )
```

### All Documents Low Confidence

```python
if scan.avg_confidence < 0.5:
    # Route everything to Review, suggest manual organization
    return OrganizationPlan(
        mode="simple",
        mode_confidence=0.5,
        folders=[Folder(name="Review", document_count=scan.total_docs)],
        review_count=scan.total_docs,
        explanation="These documents need manual review. We couldn't identify clear patterns.",
        personalization_applied=[]
    )
```

### Conflicting Signals

```python
# User says "by_topic" but has 10 distinct clients
if q2 == "by_topic" and len(scan.detected_entities) >= 10:
    # Respect user choice but note the conflict
    explanation = "Organizing by topic as requested. Tip: Smart Groups might help manage your multiple clients."
```

---

## Summary

| Decision | Primary Signal | Fallback | Default |
|----------|---------------|----------|---------|
| Mode | Q2 (explicit choice) | Q1 + scan inference | Simple |
| Threshold | Q3 (automation level) | — | 0.70 (balanced) |
| Folders | Mode + Q1 personalization | Scan-detected topics | Base set for mode |
| Explanation | Mode + Q1 combination | — | Generic for mode |
