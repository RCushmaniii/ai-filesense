# AI Personalization Strategy

> **Document:** 01-ai-personalization-strategy.md  
> **Purpose:** Define how to balance AI flexibility with predictable, safe outcomes

---

## The Core Principle

**Free-text personalization should improve the recommendation, not replace the guardrails.**

Letting users describe themselves naturally ("I'm a biology professor" / "I'm a freelancer") helps the AI infer:
- What categories matter (e.g., "students / research / grants" vs "clients / invoices")
- What filenames they'll recognize
- What "Work vs Personal" means for them

This feels "AI-native" while maintaining safety.

---

## Where Pure Free-Text Goes Wrong

If you do **pure free text + AI decides everything**, you risk:

| Problem | Example |
|---------|---------|
| Over-personalized taxonomy | 37 weird folders no one understands |
| Inconsistent naming | "Finance" vs "Money" vs "Accounting" across runs |
| User distrust | "Why did you move this?" |
| Prompt injection | Unsafe instructions in filenames or documents |

**Solution:** Let the user speak freely, but force AI output through fixed system limits.

---

## The Hybrid Approach: "AI Personalization Layer"

Keep preset modes, but add a personalization step that influences:

| Influenced | Not Influenced |
|------------|----------------|
| Which mode is recommended | Maximum folder count (always ≤10) |
| Which subfolders get created | Maximum depth (always ≤2) |
| What labels to use (synonym normalization) | Safety model and guardrails |
| Confidence thresholds | Preview/undo requirements |

---

## The 2-3 Question Flow

A simple flow that feels AI-native without overwhelming users.

### Question 1: User Context (Optional Free Text)

**"What do you use this computer for?"**

Small hint text: *"This helps me name folders in a way that makes sense to you."*

**Clickable chips (single-select):**
- 🏠 Home & Family
- 🎓 Student  
- 💼 Work
- 📸 Creative
- 🧑‍💼 Freelancer
- 🏪 Small Business
- 👴 Retired
- ✏️ Other (type your own)

**Why this question works:**
- Maps directly to file reality (family admin, client work, school, media)
- More useful than "What's your job?" because it's about file behavior
- Optional—user can skip entirely

---

### Question 2: Lookup Style (Single Tap)

**"How do you usually look for files?"**

| Option | Maps To |
|--------|---------|
| By **topic** (Work / Money / Health) | Simple mode |
| By **time** (last week / last year) | Timeline mode |
| By **project/client** | Smart Groups mode |
| "I don't know—just clean it up" | Simple mode (default) |

**Why this question works:**
- Single most predictive preference question
- Directly determines recommended mode
- "I don't know" is a valid, shame-free option

---

### Question 3: Automation Level (Optional)

**"How automatic should I be?"**

| Option | Behavior |
|--------|----------|
| **Safe** | More documents go to Review |
| **Balanced** (recommended) | Standard confidence threshold |
| **Aggressive** | Moves more automatically |

**Why this question works:**
- Replaces multiple settings with one choice
- Maps to confidence threshold behind the scenes
- Most users stay on Balanced

---

## Behind the Scenes: Constrained Output

Even with free-text input, AI output is constrained to:

```
HARD CONSTRAINTS (never violate):
├── Maximum 10 top-level folders
├── Maximum depth: 2 levels
├── Folder names from APPROVED_VOCABULARY only
├── Route confidence < 0.7 to "Review"
├── Never invent new folder names
└── Output is a PLAN PROPOSAL, not execution
```

The AI generates a **plan proposal**, not a brand-new filing ideology.

---

## What This Looks Like in the UI

After the questions, show:

```
┌─────────────────────────────────────────────────────────┐
│  Here's the cleanup plan I recommend                    │
│                                                         │
│  Recommended style: Simple                              │
│  Why: "You have lots of mixed documents + personal      │
│        records"                                         │
│                                                         │
│  Preview:                                               │
│    • Work (320)                                         │
│    • Money (210)                                        │
│    • Home (130)                                         │
│    • Review (64)                                        │
│                                                         │
│  [ Simple ]  [ By Date ]  [ Smart Groups ]              │
│     ^^^                                                 │
│  selected                                               │
└─────────────────────────────────────────────────────────┘
```

Users can flip between modes without re-answering questions.

---

## Implementation Recommendation

**Hybrid approach:**

1. **Default path:** "Start scan → show recommended plan" (no questions)
2. **Optional path:** "Personalize" (2 questions) as enhancement

This avoids blocking impatient users while delivering the AI-native experience for those who want it.

---

## What Gets Personalized vs. Fixed

| Aspect | Fixed (Guardrails) | Personalized (AI Layer) |
|--------|-------------------|------------------------|
| Max folders | 10 | Which 10 are selected |
| Max depth | 2 | Subfolder names |
| Folder names | From vocabulary only | Synonyms normalized |
| Review routing | Always exists | Threshold varies (Q3) |
| Mode options | 3 presets only | Which is recommended |
| Safety features | Preview, undo, logs | Never changed |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | Better Approach |
|--------------|--------------|-----------------|
| "Describe your ideal folder structure" | Leads to chaos, inconsistency | Offer presets, let AI recommend |
| No constraints on AI output | Unpredictable results | Strict vocabulary + limits |
| Required personalization | Blocks impatient users | Make it optional |
| Complex multi-step wizard | High abandonment | 2-3 questions max |
| Showing AI "thinking" | Creates anxiety | Show confident recommendation |

---

## Summary

The AI personalization layer delivers the "wow" feeling of intelligent organization while maintaining:
- Predictable outcomes (constrained vocabulary)
- User trust (nothing moves without approval)
- Simplicity (optional 2-3 questions, not required)
- Safety (guardrails never bypassed)
