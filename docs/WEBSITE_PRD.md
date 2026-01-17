# AI FileSense Website - Product Requirements Document

## Repository Information

**Repo Name:** `ai-filesense-website`

**Description:** Marketing website for AI FileSense - AI-powered local file organization for Windows. Landing page, downloads, privacy policy, terms of service, and changelog.

**Domain:** `aifilesense.com`

---

## Product Overview

### What is AI FileSense?

AI FileSense is a desktop application for Windows that uses AI to intelligently organize and find files on your computer. Unlike cloud-based solutions, your files never leave your computer — only filenames and small text snippets are sent to AI for classification.

### Target Audience

1. **Primary:** Windows users with cluttered desktops and document folders
2. **Secondary:** Small business owners managing client documents
3. **Tertiary:** Students and professionals with years of accumulated files

### Core Value Proposition

> "Finally organize your files — without uploading them to the cloud."

---

## Features & Benefits

### Core Features

| Feature | Description | User Benefit |
|---------|-------------|--------------|
| **Smart Scanning** | Scans Desktop, Documents, Downloads | Find all your scattered files in one place |
| **AI Classification** | Categorizes files by content, not just name | No more guessing what's in each file |
| **Multiple Organization Styles** | Life Areas, Timeline, Projects | Organize YOUR way, not a preset way |
| **Preview Before Moving** | See exactly what will happen | Never lose a file — full control |
| **One-Click Undo** | Reverse any organization instantly | Risk-free organizing |
| **Smart Search** | Find files by describing them | "That tax PDF from last year" actually works |
| **Bilingual** | English + Spanish (Mexico) | Accessible to more users |

### Privacy Features

| Feature | Description | User Benefit |
|---------|-------------|--------------|
| **Local-First** | All files stay on your computer | Your data is YOUR data |
| **No Account Required** | No signup, no cloud sync | Start organizing in 2 minutes |
| **Your Own API Key** | You control the AI costs | Transparent pricing, no surprises |
| **Encrypted Settings** | API keys stored securely | Peace of mind |

### Technical Features

| Feature | Description | User Benefit |
|---------|-------------|--------------|
| **Incremental Indexing** | Only re-scans changed files | Fast subsequent scans |
| **Batch AI Processing** | 20-100 files per API call | Cost-efficient AI usage |
| **SQLite Database** | Local, portable, reliable | Your index is always available |
| **Full Undo History** | Transaction log of all moves | Go back to any previous state |

---

## Pricing Model

### Free Tier (Launch)
- **1,000 files** AI classification included
- Unlimited local scanning and indexing
- Full organization features
- Full search features
- One-click undo

### Future Paid Tiers (Post-Launch)

| Tier | Files | Price | Target User |
|------|-------|-------|-------------|
| Free | 1,000 | $0 | Try it out |
| Personal | 10,000 | $9.99/year | Home user |
| Professional | 50,000 | $29.99/year | Power user |
| Unlimited | Unlimited | $49.99/year | Business |

*Note: Users provide their own Anthropic API key. File limits refer to AI-classified files, not total indexed files.*

---

## Website Structure

### Information Architecture

```
aifilesense.com/
├── / (Landing Page)
├── /features
├── /pricing
├── /download
├── /privacy
├── /terms
├── /changelog
├── /support
│   ├── /support/faq
│   ├── /support/getting-started
│   └── /support/contact
└── /blog (future)
```

---

## Page Specifications

### 1. Landing Page (`/`)

**Purpose:** Convert visitors to downloads

**Sections:**

#### Hero Section
- **Headline:** "AI-Powered File Organization for Windows"
- **Subheadline:** "Finally organize your Desktop, Documents, and Downloads — without uploading anything to the cloud."
- **CTA Button:** "Download Free" (prominent)
- **Secondary CTA:** "See How It Works"
- **Trust Badge:** "Your files never leave your computer"
- **Hero Image:** App screenshot showing organized folder tree

#### Problem Section
- **Headline:** "Sound Familiar?"
- Pain points with icons:
  - 📁 "Hundreds of files dumped on your Desktop"
  - 🔍 "Can never find that document you need"
  - 😫 "Tried organizing but gave up after 10 minutes"
  - ☁️ "Don't want to upload personal files to the cloud"

#### Solution Section
- **Headline:** "Meet AI FileSense"
- **Subheadline:** "Smart organization that respects your privacy"
- 3-step process with illustrations:
  1. **Scan** — "Point it at your folders"
  2. **Preview** — "See the AI's organization plan"
  3. **Organize** — "One click to a clean computer"

#### Features Grid
- 6 feature cards with icons:
  - 🧠 Smart AI Classification
  - 🔒 100% Local & Private
  - ↩️ One-Click Undo
  - 🌐 English + Spanish
  - ⚡ Fast & Lightweight
  - 💰 Free for 1,000 Files

#### Social Proof Section (Post-Launch)
- User testimonials
- Download count
- Star rating

#### Pricing Preview
- Simple comparison: Free vs Paid
- Emphasis on generous free tier
- "No credit card required"

#### Final CTA
- **Headline:** "Ready for a Cleaner Desktop?"
- Download button
- System requirements note

#### Footer
- Links: Features, Pricing, Download, Privacy, Terms, Changelog, Contact
- Copyright
- Social links (future)

---

### 2. Features Page (`/features`)

**Purpose:** Detail all capabilities for evaluation

**Sections:**

#### AI Classification
- How it works (diagram)
- Category examples (Work, Medical, Finances, etc.)
- Accuracy expectations

#### Organization Styles
- Life Areas (screenshot + description)
- Timeline Archive (screenshot + description)
- Quick Sort (screenshot + description)

#### Privacy & Security
- Local-first architecture diagram
- What data is sent to AI (transparency)
- What data stays local

#### Search Capabilities
- Natural language examples
- "Used to be on Desktop" feature
- Filter options

#### Technical Specs
- Supported file types
- System requirements
- Database location

---

### 3. Pricing Page (`/pricing`)

**Purpose:** Clear pricing, convert to download

**Sections:**

#### Pricing Cards
```
┌─────────────────┬─────────────────┬─────────────────┐
│      FREE       │    PERSONAL     │  PROFESSIONAL   │
│    $0/forever   │   $9.99/year    │   $29.99/year   │
├─────────────────┼─────────────────┼─────────────────┤
│ 1,000 files     │ 10,000 files    │ 50,000 files    │
│ All features    │ All features    │ All features    │
│ Community       │ Email support   │ Priority support│
│ support         │                 │                 │
├─────────────────┼─────────────────┼─────────────────┤
│ [Download Free] │ [Coming Soon]   │ [Coming Soon]   │
└─────────────────┴─────────────────┴─────────────────┘
```

#### FAQ Section
- "What counts as a file?"
- "Do I need to pay for the AI?"
- "What happens after 1,000 files?"
- "Can I use my own API key?"

#### API Cost Transparency
- Explain that users provide Anthropic API key
- Estimated costs per 1,000 files (~$0.50-1.00)
- Link to Anthropic pricing

---

### 4. Download Page (`/download`)

**Purpose:** Get users to install

**Sections:**

#### Download Button
- Large, prominent button
- File size indicator
- Version number

#### System Requirements
- Windows 10/11 (64-bit)
- 4GB RAM minimum
- 100MB disk space
- Internet for AI features

#### Installation Steps
1. Download the installer
2. Run the .exe file
3. Follow the setup wizard
4. Get your Anthropic API key
5. Start organizing!

#### Getting API Key
- Step-by-step with screenshots
- Link to Anthropic console
- Estimated setup time: 5 minutes

#### Checksums
- SHA256 hash for security verification

---

### 5. Privacy Policy (`/privacy`)

**Purpose:** Legal compliance, build trust

**Content:** (Already created in docs/PRIVACY_POLICY.md)

**Key Sections:**
- Summary (TL;DR at top)
- What data we process
- What data is sent to AI
- What we DON'T do
- Your rights
- Contact info

---

### 6. Terms of Service (`/terms`)

**Purpose:** Legal protection

**Content:** (Already created in docs/TERMS_OF_SERVICE.md)

**Key Sections:**
- Service description
- Free tier terms
- User responsibilities
- Disclaimers
- Liability limits

---

### 7. Changelog (`/changelog`)

**Purpose:** Show progress, build confidence

**Format:**
```markdown
## v1.0.0 (January 2025)
### Added
- Initial release
- AI-powered file classification
- 3 organization styles
- English + Spanish support
- One-click undo

### Security
- Local-first architecture
- Encrypted API key storage
```

---

### 8. Support Pages (`/support/*`)

#### FAQ (`/support/faq`)
- General questions
- Troubleshooting
- Billing/pricing
- Privacy/security

#### Getting Started (`/support/getting-started`)
- Video walkthrough (future)
- Step-by-step guide with screenshots
- Common first-time issues

#### Contact (`/support/contact`)
- Email form
- Response time expectations
- Links to FAQ first

---

## Design Specifications

### Brand Identity

#### Colors
```css
--primary: #2563eb;      /* Blue - trust, technology */
--primary-dark: #1d4ed8;
--accent: #10b981;       /* Green - success, go */
--background: #ffffff;
--foreground: #0f172a;
--muted: #64748b;
--border: #e2e8f0;
```

#### Typography
- **Headings:** Inter (bold, clean)
- **Body:** Inter (readable)
- **Code:** JetBrains Mono

#### Logo
- "AI" in a rounded square + "FileSense" wordmark
- Blue primary color
- Works on light/dark backgrounds

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Performance Targets
- Lighthouse score: 95+
- First contentful paint: < 1.5s
- Time to interactive: < 3s

---

## Technical Stack (Recommended)

### Framework
- **Next.js 14** (App Router) OR **Astro**
- Static site generation for speed
- Easy deployment

### Styling
- **Tailwind CSS** (matches desktop app)
- **shadcn/ui** components (optional)

### Hosting
- **Vercel** (recommended for Next.js)
- OR **Netlify**
- Free tier sufficient for launch

### Analytics
- **Plausible** or **Fathom** (privacy-friendly)
- No Google Analytics (matches privacy focus)

### Forms
- **Formspree** or **Netlify Forms** for contact

---

## Content Requirements

### Copywriting Tone
- **Clear:** No jargon, simple explanations
- **Confident:** We solve a real problem
- **Trustworthy:** Emphasize privacy, transparency
- **Friendly:** Approachable, not corporate

### Screenshots Needed
1. Main app window (clean state)
2. Folder selection screen
3. Scanning in progress
4. Organization preview (folder tree)
5. Results/success screen
6. Before/after desktop comparison

### Graphics Needed
1. Hero illustration (or app screenshot)
2. 3-step process icons
3. Feature icons (6)
4. Privacy/security diagram
5. Organization style previews

---

## Launch Checklist

### Pre-Launch
- [ ] All pages built and responsive
- [ ] Privacy Policy finalized
- [ ] Terms of Service finalized
- [ ] Download links working
- [ ] Analytics installed
- [ ] Contact form tested
- [ ] SEO meta tags added
- [ ] Open Graph images created
- [ ] Favicon set

### Launch
- [ ] Domain connected
- [ ] SSL certificate active
- [ ] Desktop app links updated to real URLs
- [ ] Soft launch to small group
- [ ] Gather initial feedback

### Post-Launch
- [ ] Monitor analytics
- [ ] Collect testimonials
- [ ] Add blog (optional)
- [ ] Social media presence
- [ ] Product Hunt launch (optional)

---

## Success Metrics

### Primary KPIs
- Downloads per week
- Download-to-install conversion
- Weekly active users (via opt-in analytics in app)

### Secondary KPIs
- Page views
- Time on site
- Bounce rate
- Support ticket volume

---

## Timeline Estimate

| Phase | Tasks | Duration |
|-------|-------|----------|
| Setup | Repo, hosting, domain | 1 day |
| Design | Colors, layout, components | 2-3 days |
| Content | Copy, screenshots, graphics | 2-3 days |
| Development | All pages | 3-5 days |
| Testing | Cross-browser, mobile, forms | 1-2 days |
| Launch | Deploy, verify, announce | 1 day |

**Total: 10-15 days** for MVP website

---

## Future Enhancements

1. **Blog** — SEO content, tips, updates
2. **Video Demo** — Embedded walkthrough
3. **User Testimonials** — Social proof
4. **Comparison Page** — vs Dropbox, vs manual
5. **Affiliate Program** — User referrals
6. **Multi-language** — Website in Spanish too
7. **Mac Version** — Expand platform support

---

*Document Version: 1.0*
*Created: January 2025*
