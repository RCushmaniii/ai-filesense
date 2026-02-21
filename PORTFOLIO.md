---
# === CONTROL FLAGS ===
portfolio_enabled: true
portfolio_priority: 3
portfolio_featured: true

# === CARD DISPLAY ===
title: "AI FileSense"
tagline: "Local AI file organizer — private, safe, zero config"
slug: "ai-filesense"
category: "AI Automation"
tech_stack:
  - "Tauri 2"
  - "Rust"
  - "React"
  - "TypeScript"
  - "Claude Haiku"
thumbnail: "/images/ai-filesense-thumb.jpg"
status: "Demo"

# === DETAIL PAGE ===
problem: "Most people have thousands of documents scattered across Desktop, Documents, and Downloads with no system — manual sorting takes hours and most quit in minutes. Cloud-based solutions require uploading sensitive files to third-party servers, and existing AI tools demand API keys and terminal commands that lock out non-technical users."
solution: "A lightweight Windows desktop app (~5 MB) that uses Claude Haiku to read document content and classify files into a consistent 12-folder system without files ever leaving the device. Zero configuration required — the developer provides the API key so users never touch a terminal or API console."
key_features:
  - "Content-based AI classification — reads PDFs, DOCX, PPTX, TXT, not just filenames"
  - "Full undo support — rollback a single file or entire session, even after app restart"
  - "Confidence-based routing — uncertain files go to Review for human decision, never mis-filed"
  - "Privacy-first — files stay local, only 300-char snippets sent to AI, prompt injection prevention"
  - "Zero config freemium — developer-provided API key, no accounts, no setup, 10 free scans"

# === MEDIA: PORTFOLIO SLIDES ===
slides:
  - src: "/images/ai-filesense-02.png"
    alt_en: "Turn Chaos into Clarity — AI FileSense hero slide"
    alt_es: "Convierte el Caos en Claridad — diapositiva principal de AI FileSense"
  - src: "/images/ai-filesense-03.png"
    alt_en: "We are drowning in data but starving for order"
    alt_es: "Nos ahogamos en datos pero nos falta orden"
  - src: "/images/ai-filesense-04.png"
    alt_en: "The Barriers to Organization — manual sorting, inconsistent systems, technical complexity"
    alt_es: "Las Barreras para la Organizacion — clasificacion manual, sistemas inconsistentes, complejidad tecnica"
  - src: "/images/ai-filesense-05.png"
    alt_en: "Hours of low-value decision making, ad-hoc folders that fail, AI tools requiring complex APIs"
    alt_es: "Horas de decisiones de bajo valor, carpetas improvisadas que fallan, herramientas IA que requieren APIs complejas"
  - src: "/images/ai-filesense-06.png"
    alt_en: "AI FileSense — Just click and go. Zero configuration. Powered by Claude Haiku."
    alt_es: "AI FileSense — Solo haz clic. Cero configuracion. Impulsado por Claude Haiku."
  - src: "/images/ai-filesense-07.png"
    alt_en: "Classification based on content, not just filenames — deep parsing of PDFs, DOCX, PPTX, TXT"
    alt_es: "Clasificacion basada en contenido, no solo nombres de archivo — analisis de PDFs, DOCX, PPTX, TXT"
  - src: "/images/ai-filesense-09.png"
    alt_en: "Confidence and Human Control — smart routing for uncertain files"
    alt_es: "Confianza y Control Humano — enrutamiento inteligente para archivos inciertos"
  - src: "/images/ai-filesense-10.png"
    alt_en: "AI for the Non-Technical 99% — no terminal, no API keys, no config"
    alt_es: "IA para el 99% No Tecnico — sin terminal, sin API keys, sin configuracion"
  - src: "/images/ai-filesense-11.png"
    alt_en: "Uncompromising Safety — privacy by design, injection prevention, no files ever deleted"
    alt_es: "Seguridad Sin Compromiso — privacidad por diseno, prevencion de inyeccion, ningun archivo eliminado"
  - src: "/images/ai-filesense-12.png"
    alt_en: "The Safety Net — full undo, test mode, crash recovery with atomic writes"
    alt_es: "La Red de Seguridad — deshacer completo, modo prueba, recuperacion de fallos con escrituras atomicas"
  - src: "/images/ai-filesense-13.png"
    alt_en: "From Digital Chaos to Automated Order — full system architecture"
    alt_es: "Del Caos Digital al Orden Automatizado — arquitectura completa del sistema"

# === MEDIA: VIDEO ===
video_url: "/video/AI_FileSense-brief.mp4"
video_poster: "/video/AI-FileSense-brief-poster.jpg"

# === LINKS ===
demo_url: ""
live_url: ""

# === OPTIONAL ===
metrics:
  - "$0.0015 per file classified"
  - "~5 minutes from install to organized"
  - "12 universal folder categories"
  - "10 free scans per user (backend-enforced)"
tags:
  - "ai"
  - "desktop-app"
  - "file-organization"
  - "tauri"
  - "rust"
  - "privacy-first"
  - "bilingual"
  - "windows"
date_completed: "2026-02"
---

## About This Project

AI FileSense solves a universal problem: digital file clutter. Most people have thousands of documents scattered across their Desktop, Documents, and Downloads folders with no organizational system. Manual sorting takes hours and most people abandon the effort within minutes. Cloud-based solutions like Google Drive or Dropbox require uploading sensitive personal files — tax returns, medical records, contracts — to third-party servers.

AI FileSense takes a different approach. It's a lightweight Windows desktop app (~5 MB) that uses Claude Haiku to read actual document content and classify each file into a consistent 12-folder system. Files never leave the user's computer — only filenames and 300-character text snippets are sent to the AI. Every file move is transaction-logged with full undo support, crash recovery, and a test mode that lets users preview changes before anything moves.

The key differentiator is accessibility. Unlike other AI tools that require API keys, terminal commands, and developer knowledge, AI FileSense requires zero configuration. The developer provides the Anthropic API key via a freemium model — users just click "Scan" and the AI does the rest. The app is also natively bilingual (English + Spanish/Mexico), serving the large US Hispanic market with a first-class localized experience, not a machine-translated afterthought.
