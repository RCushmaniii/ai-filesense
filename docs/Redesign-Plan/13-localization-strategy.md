# Localization Strategy

> **Document:** 13-localization-strategy.md  
> **Purpose:** Define multi-language support for USA/English (en-US) and Mexico/Spanish (es-MX)

---

## Overview

### Supported Locales

| Locale | Language | Region | Priority |
|--------|----------|--------|----------|
| `en-US` | English | United States | Primary (default) |
| `es-MX` | Spanish | Mexico | Secondary |

### Design Principles

1. **Native-quality translations** — Not machine-translated; culturally appropriate
2. **Consistent terminology** — Same term for same concept throughout
3. **UI flexibility** — Layouts accommodate text expansion (Spanish ~30% longer)
4. **Right defaults** — Auto-detect locale, easy to switch
5. **Shared assets** — Icons, colors work across cultures

---

## Architecture

### File Structure

```
src/
├── locales/
│   ├── en-US/
│   │   ├── common.json         # Shared strings
│   │   ├── onboarding.json     # Onboarding flow
│   │   ├── scanning.json       # Scan screens
│   │   ├── organization.json   # Organization screens
│   │   ├── settings.json       # Settings
│   │   ├── errors.json         # Error messages
│   │   └── notifications.json  # Toast notifications
│   └── es-MX/
│       ├── common.json
│       ├── onboarding.json
│       ├── scanning.json
│       ├── organization.json
│       ├── settings.json
│       ├── errors.json
│       └── notifications.json
├── i18n/
│   ├── index.ts               # i18n configuration
│   ├── detector.ts            # Locale detection
│   └── formatter.ts           # Number/date formatting
└── components/
    └── LocaleProvider.tsx     # React context for locale
```

### i18n Library

**Recommended:** `i18next` + `react-i18next`

```typescript
// i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enUSCommon from '../locales/en-US/common.json';
import enUSOnboarding from '../locales/en-US/onboarding.json';
import esMXCommon from '../locales/es-MX/common.json';
import esMXOnboarding from '../locales/es-MX/onboarding.json';
// ... other imports

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'en-US': {
        common: enUSCommon,
        onboarding: enUSOnboarding,
        // ...
      },
      'es-MX': {
        common: esMXCommon,
        onboarding: esMXOnboarding,
        // ...
      }
    },
    fallbackLng: 'en-US',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
```

---

## String Resources

### common.json — Shared Strings

```json
// en-US/common.json
{
  "app": {
    "name": "Document Organizer",
    "tagline": "Automatically organize your documents"
  },
  "actions": {
    "continue": "Continue",
    "back": "Back",
    "cancel": "Cancel",
    "save": "Save",
    "done": "Done",
    "skip": "Skip",
    "retry": "Retry",
    "undo": "Undo",
    "apply": "Apply",
    "close": "Close",
    "browse": "Browse",
    "add": "Add",
    "remove": "Remove",
    "edit": "Edit",
    "delete": "Delete",
    "search": "Search",
    "refresh": "Refresh",
    "export": "Export",
    "import": "Import"
  },
  "status": {
    "loading": "Loading...",
    "saving": "Saving...",
    "processing": "Processing...",
    "complete": "Complete",
    "error": "Error",
    "success": "Success"
  },
  "time": {
    "just_now": "Just now",
    "minutes_ago": "{{count}} minute ago",
    "minutes_ago_plural": "{{count}} minutes ago",
    "hours_ago": "{{count}} hour ago",
    "hours_ago_plural": "{{count}} hours ago",
    "days_ago": "{{count}} day ago",
    "days_ago_plural": "{{count}} days ago",
    "today": "Today",
    "yesterday": "Yesterday"
  },
  "units": {
    "files": "{{count}} file",
    "files_plural": "{{count}} files",
    "folders": "{{count}} folder",
    "folders_plural": "{{count}} folders",
    "documents": "{{count}} document",
    "documents_plural": "{{count}} documents",
    "items": "{{count}} item",
    "items_plural": "{{count}} items"
  },
  "folders": {
    "work": "Work",
    "money": "Money",
    "home": "Home",
    "health": "Health",
    "legal": "Legal",
    "school": "School",
    "family": "Family",
    "clients": "Clients",
    "projects": "Projects",
    "archive": "Archive",
    "review": "Review"
  },
  "file_types": {
    "pdf": "PDF files",
    "word": "Word documents",
    "text": "Text files",
    "all": "All documents"
  },
  "confidence": {
    "high": "High confidence",
    "medium": "Medium confidence",
    "low": "Low confidence",
    "needs_review": "Needs review"
  }
}
```

```json
// es-MX/common.json
{
  "app": {
    "name": "Organizador de Documentos",
    "tagline": "Organiza tus documentos automáticamente"
  },
  "actions": {
    "continue": "Continuar",
    "back": "Atrás",
    "cancel": "Cancelar",
    "save": "Guardar",
    "done": "Listo",
    "skip": "Omitir",
    "retry": "Reintentar",
    "undo": "Deshacer",
    "apply": "Aplicar",
    "close": "Cerrar",
    "browse": "Explorar",
    "add": "Agregar",
    "remove": "Quitar",
    "edit": "Editar",
    "delete": "Eliminar",
    "search": "Buscar",
    "refresh": "Actualizar",
    "export": "Exportar",
    "import": "Importar"
  },
  "status": {
    "loading": "Cargando...",
    "saving": "Guardando...",
    "processing": "Procesando...",
    "complete": "Completado",
    "error": "Error",
    "success": "Éxito"
  },
  "time": {
    "just_now": "Ahora mismo",
    "minutes_ago": "Hace {{count}} minuto",
    "minutes_ago_plural": "Hace {{count}} minutos",
    "hours_ago": "Hace {{count}} hora",
    "hours_ago_plural": "Hace {{count}} horas",
    "days_ago": "Hace {{count}} día",
    "days_ago_plural": "Hace {{count}} días",
    "today": "Hoy",
    "yesterday": "Ayer"
  },
  "units": {
    "files": "{{count}} archivo",
    "files_plural": "{{count}} archivos",
    "folders": "{{count}} carpeta",
    "folders_plural": "{{count}} carpetas",
    "documents": "{{count}} documento",
    "documents_plural": "{{count}} documentos",
    "items": "{{count}} elemento",
    "items_plural": "{{count}} elementos"
  },
  "folders": {
    "work": "Trabajo",
    "money": "Finanzas",
    "home": "Hogar",
    "health": "Salud",
    "legal": "Legal",
    "school": "Escuela",
    "family": "Familia",
    "clients": "Clientes",
    "projects": "Proyectos",
    "archive": "Archivo",
    "review": "Revisar"
  },
  "file_types": {
    "pdf": "Archivos PDF",
    "word": "Documentos Word",
    "text": "Archivos de texto",
    "all": "Todos los documentos"
  },
  "confidence": {
    "high": "Alta confianza",
    "medium": "Confianza media",
    "low": "Baja confianza",
    "needs_review": "Necesita revisión"
  }
}
```

---

### onboarding.json — Onboarding Flow

```json
// en-US/onboarding.json
{
  "welcome": {
    "title": "Welcome to Document Organizer",
    "subtitle": "We'll help you organize your PDFs, Word docs, and text files—automatically.",
    "features": {
      "local": "Everything stays on your computer",
      "preview": "You review changes before anything moves",
      "undo": "Undo anytime"
    },
    "cta": "Get Started",
    "time_estimate": "Setup takes about 2 minutes"
  },
  "how_it_works": {
    "title": "Here's how it works",
    "step1": {
      "title": "Scan",
      "description": "We analyze your documents to understand what they are (invoices, contracts, etc.)"
    },
    "step2": {
      "title": "Preview",
      "description": "You see exactly where each file will go before anything moves"
    },
    "step3": {
      "title": "Organize",
      "description": "Approve the plan, and we organize your files into clear folders"
    },
    "step4": {
      "title": "Maintain",
      "description": "New documents get organized automatically (optional)"
    }
  },
  "privacy": {
    "title": "Your privacy matters",
    "local_processing": {
      "title": "Local processing",
      "description": "Your documents never leave your computer. All analysis happens right here."
    },
    "no_cloud": {
      "title": "No cloud uploads",
      "description": "We don't send your files anywhere. No account required."
    },
    "analytics": {
      "title": "Optional analytics",
      "description": "We collect anonymous usage stats to improve the app. No document contents—ever.",
      "checkbox": "Help improve Document Organizer",
      "checkbox_hint": "(anonymous usage analytics)",
      "details_link": "What data is collected?"
    }
  },
  "permissions": {
    "title": "We need access to your folders",
    "description": "To organize your documents, we need permission to read and move files in these locations:",
    "folders": {
      "documents": "Documents folder",
      "desktop": "Desktop",
      "downloads": "Downloads"
    },
    "never_list": {
      "title": "We will NEVER:",
      "items": [
        "Delete your files",
        "Access folders you don't approve",
        "Make changes without your permission"
      ]
    },
    "grant_access": "Grant Access",
    "skip": "Skip for now—I'll choose later"
  },
  "personalization": {
    "title": "One quick question (optional)",
    "question": "What best describes how you use this computer?",
    "hint": "This helps us organize your files in a way that makes sense for you.",
    "options": {
      "home": "Home & Family",
      "student": "Student",
      "work": "Work",
      "creative": "Creative",
      "freelancer": "Freelancer",
      "small_business": "Small Business",
      "retired": "Retired",
      "other": "Other"
    }
  },
  "ready": {
    "title": "You're all set!",
    "description": "Document Organizer is ready to help you:",
    "features": [
      "Scan your documents",
      "Suggest an organization plan",
      "Keep things tidy going forward"
    ],
    "cta": "Start Organizing Now",
    "tour_link": "Take a tour first"
  }
}
```

```json
// es-MX/onboarding.json
{
  "welcome": {
    "title": "Bienvenido a Organizador de Documentos",
    "subtitle": "Te ayudaremos a organizar tus PDFs, documentos Word y archivos de texto—automáticamente.",
    "features": {
      "local": "Todo permanece en tu computadora",
      "preview": "Revisas los cambios antes de que se muevan",
      "undo": "Deshaz en cualquier momento"
    },
    "cta": "Comenzar",
    "time_estimate": "La configuración toma aproximadamente 2 minutos"
  },
  "how_it_works": {
    "title": "Así es como funciona",
    "step1": {
      "title": "Escanear",
      "description": "Analizamos tus documentos para entender qué son (facturas, contratos, etc.)"
    },
    "step2": {
      "title": "Previsualizar",
      "description": "Ves exactamente dónde irá cada archivo antes de que se mueva"
    },
    "step3": {
      "title": "Organizar",
      "description": "Aprueba el plan y organizamos tus archivos en carpetas claras"
    },
    "step4": {
      "title": "Mantener",
      "description": "Los documentos nuevos se organizan automáticamente (opcional)"
    }
  },
  "privacy": {
    "title": "Tu privacidad importa",
    "local_processing": {
      "title": "Procesamiento local",
      "description": "Tus documentos nunca salen de tu computadora. Todo el análisis sucede aquí mismo."
    },
    "no_cloud": {
      "title": "Sin subidas a la nube",
      "description": "No enviamos tus archivos a ningún lado. No se requiere cuenta."
    },
    "analytics": {
      "title": "Analíticas opcionales",
      "description": "Recopilamos estadísticas de uso anónimas para mejorar la aplicación. Nunca el contenido de tus documentos.",
      "checkbox": "Ayudar a mejorar Organizador de Documentos",
      "checkbox_hint": "(analíticas de uso anónimas)",
      "details_link": "¿Qué datos se recopilan?"
    }
  },
  "permissions": {
    "title": "Necesitamos acceso a tus carpetas",
    "description": "Para organizar tus documentos, necesitamos permiso para leer y mover archivos en estas ubicaciones:",
    "folders": {
      "documents": "Carpeta Documentos",
      "desktop": "Escritorio",
      "downloads": "Descargas"
    },
    "never_list": {
      "title": "NUNCA haremos:",
      "items": [
        "Eliminar tus archivos",
        "Acceder a carpetas que no apruebes",
        "Hacer cambios sin tu permiso"
      ]
    },
    "grant_access": "Permitir Acceso",
    "skip": "Omitir por ahora—lo elegiré después"
  },
  "personalization": {
    "title": "Una pregunta rápida (opcional)",
    "question": "¿Qué describe mejor cómo usas esta computadora?",
    "hint": "Esto nos ayuda a organizar tus archivos de una manera que tenga sentido para ti.",
    "options": {
      "home": "Hogar y Familia",
      "student": "Estudiante",
      "work": "Trabajo",
      "creative": "Creativo",
      "freelancer": "Freelancer",
      "small_business": "Pequeño Negocio",
      "retired": "Jubilado",
      "other": "Otro"
    }
  },
  "ready": {
    "title": "¡Todo listo!",
    "description": "Organizador de Documentos está listo para ayudarte a:",
    "features": [
      "Escanear tus documentos",
      "Sugerir un plan de organización",
      "Mantener todo ordenado en adelante"
    ],
    "cta": "Comenzar a Organizar",
    "tour_link": "Hacer un recorrido primero"
  }
}
```

---

### errors.json — Error Messages

```json
// en-US/errors.json
{
  "file_operations": {
    "FILE_NOT_FOUND": {
      "title": "File not found",
      "message": "This file was moved or deleted before processing.",
      "action": "Continue"
    },
    "FILE_LOCKED": {
      "title": "File is in use",
      "message": "This file is open in another application. Close it and try again, or skip for now.",
      "actions": {
        "skip": "Skip this file",
        "retry": "Retry",
        "skip_all": "Skip all locked files"
      }
    },
    "ACCESS_DENIED": {
      "title": "Permission denied",
      "message": "You don't have permission to move files from this location. This might be a protected system folder.",
      "actions": {
        "skip": "Skip",
        "remove_folder": "Remove folder from scan",
        "run_as_admin": "Run as Administrator"
      }
    },
    "DISK_FULL": {
      "title": "Not enough disk space",
      "message": "Your destination drive is almost full.",
      "details": {
        "space_needed": "Space needed:",
        "space_available": "Space available:"
      },
      "options": {
        "free_space": "Free up space (opens Disk Cleanup)",
        "change_destination": "Choose a different destination",
        "organize_fewer": "Organize fewer files (only high-confidence)",
        "cancel": "Cancel organization"
      }
    },
    "PATH_TOO_LONG": {
      "title": "Path too long",
      "message": "The file path exceeds Windows limits.",
      "actions": {
        "shorten": "Shorten name",
        "skip": "Skip"
      }
    },
    "DUPLICATE_EXISTS": {
      "title": "File already exists",
      "message": "A file with this name already exists at the destination.",
      "comparison": {
        "existing": "Existing file",
        "new": "New file"
      },
      "actions": {
        "keep_existing": "Keep existing",
        "replace": "Replace",
        "keep_both": "Keep both (rename)"
      },
      "apply_all": "Apply to all duplicates"
    }
  },
  "system": {
    "SERVICE_UNAVAILABLE": {
      "title": "Service unavailable",
      "message": "The background service is not responding. Try restarting the application."
    },
    "CLASSIFICATION_FAILED": {
      "title": "Classification error",
      "message": "We couldn't analyze this document. It will be placed in the Review folder."
    }
  },
  "batch_summary": {
    "title": "Organization completed with some issues",
    "success": "Successfully organized:",
    "skipped_locked": "Skipped (file in use):",
    "skipped_permission": "Skipped (permission denied):",
    "failed": "Failed:",
    "note": "Skipped files remain in their original locations. You can retry them later from the Activity Log.",
    "actions": {
      "view_skipped": "View skipped files",
      "view_log": "View Activity Log",
      "done": "Done"
    }
  }
}
```

```json
// es-MX/errors.json
{
  "file_operations": {
    "FILE_NOT_FOUND": {
      "title": "Archivo no encontrado",
      "message": "Este archivo fue movido o eliminado antes de procesarlo.",
      "action": "Continuar"
    },
    "FILE_LOCKED": {
      "title": "Archivo en uso",
      "message": "Este archivo está abierto en otra aplicación. Ciérralo e intenta de nuevo, o sáltalo por ahora.",
      "actions": {
        "skip": "Saltar este archivo",
        "retry": "Reintentar",
        "skip_all": "Saltar todos los archivos bloqueados"
      }
    },
    "ACCESS_DENIED": {
      "title": "Permiso denegado",
      "message": "No tienes permiso para mover archivos de esta ubicación. Puede ser una carpeta protegida del sistema.",
      "actions": {
        "skip": "Saltar",
        "remove_folder": "Quitar carpeta del escaneo",
        "run_as_admin": "Ejecutar como Administrador"
      }
    },
    "DISK_FULL": {
      "title": "Espacio insuficiente en disco",
      "message": "Tu disco de destino está casi lleno.",
      "details": {
        "space_needed": "Espacio necesario:",
        "space_available": "Espacio disponible:"
      },
      "options": {
        "free_space": "Liberar espacio (abre Limpieza de disco)",
        "change_destination": "Elegir otro destino",
        "organize_fewer": "Organizar menos archivos (solo alta confianza)",
        "cancel": "Cancelar organización"
      }
    },
    "PATH_TOO_LONG": {
      "title": "Ruta demasiado larga",
      "message": "La ruta del archivo excede los límites de Windows.",
      "actions": {
        "shorten": "Acortar nombre",
        "skip": "Saltar"
      }
    },
    "DUPLICATE_EXISTS": {
      "title": "El archivo ya existe",
      "message": "Ya existe un archivo con este nombre en el destino.",
      "comparison": {
        "existing": "Archivo existente",
        "new": "Archivo nuevo"
      },
      "actions": {
        "keep_existing": "Conservar existente",
        "replace": "Reemplazar",
        "keep_both": "Conservar ambos (renombrar)"
      },
      "apply_all": "Aplicar a todos los duplicados"
    }
  },
  "system": {
    "SERVICE_UNAVAILABLE": {
      "title": "Servicio no disponible",
      "message": "El servicio en segundo plano no responde. Intenta reiniciar la aplicación."
    },
    "CLASSIFICATION_FAILED": {
      "title": "Error de clasificación",
      "message": "No pudimos analizar este documento. Se colocará en la carpeta Revisar."
    }
  },
  "batch_summary": {
    "title": "Organización completada con algunos problemas",
    "success": "Organizados exitosamente:",
    "skipped_locked": "Saltados (archivo en uso):",
    "skipped_permission": "Saltados (permiso denegado):",
    "failed": "Fallidos:",
    "note": "Los archivos saltados permanecen en su ubicación original. Puedes reintentarlos desde el Registro de Actividad.",
    "actions": {
      "view_skipped": "Ver archivos saltados",
      "view_log": "Ver Registro de Actividad",
      "done": "Listo"
    }
  }
}
```

---

## Number and Date Formatting

### Locale-Specific Formatting

```typescript
// i18n/formatter.ts

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatFileSize(bytes: number, locale: string): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${formatNumber(Math.round(size * 10) / 10, locale)} ${units[unitIndex]}`;
}

export function formatDate(date: Date, locale: string, style: 'short' | 'long' = 'short'): string {
  const options: Intl.DateTimeFormatOptions = style === 'short' 
    ? { month: 'short', day: 'numeric', year: 'numeric' }
    : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: locale === 'en-US'  // 12-hour for US, 24-hour for Mexico
  }).format(date);
}

export function formatDuration(seconds: number, locale: string): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (locale === 'es-MX') {
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} min`;
  }
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes} min`;
}
```

### Format Examples

| Value | en-US | es-MX |
|-------|-------|-------|
| 1584 | 1,584 | 1,584 |
| 1234567 | 1,234,567 | 1,234,567 |
| 2.5 MB | 2.5 MB | 2.5 MB |
| Jan 14, 2025 | Jan 14, 2025 | 14 ene 2025 |
| 2:30 PM | 2:30 PM | 14:30 |
| $1,234.56 | $1,234.56 | $1,234.56 MXN |

---

## UI Text Expansion

Spanish text is typically 20-30% longer than English. Design for this.

### Problem Areas and Solutions

| Component | English | Spanish | Solution |
|-----------|---------|---------|----------|
| Buttons | "Continue" (8) | "Continuar" (9) | Min-width + padding |
| Tab labels | "Settings" (8) | "Configuración" (13) | Flexible tabs |
| Table headers | "Confidence" (10) | "Confianza" (9) | Abbreviate if needed |
| Tooltips | Full text | Full text | Max-width container |
| Error titles | Short | Short | Same length typically |

### CSS Approach

```css
/* Allow text to wrap in buttons if absolutely necessary */
.btn {
  min-width: 100px;
  padding: 8px 16px;
  white-space: nowrap;
}

/* Flexible navigation tabs */
.tab-nav {
  display: flex;
  flex-wrap: wrap;
}

.tab-nav .tab {
  flex: 1 1 auto;
  min-width: 80px;
  text-align: center;
}

/* Truncate with ellipsis where space is critical */
.filename-display {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Responsive text sizing for very long strings */
@media (max-width: 1024px) {
  .long-label {
    font-size: 0.9em;
  }
}
```

---

## AI Classification Localization

### Folder Names in Classification

The AI uses English folder vocabulary internally. Localization happens at display time.

```typescript
// Map internal folder keys to localized display names
function getLocalizedFolderName(key: string, t: TFunction): string {
  return t(`folders.${key.toLowerCase()}`);
}

// Example usage
const folderKey = "WORK";  // Internal
const displayName = getLocalizedFolderName(folderKey, t);  // "Trabajo" in es-MX
```

### Document Type Tags

```json
// en-US
{
  "document_types": {
    "invoice": "Invoice",
    "contract": "Contract",
    "resume": "Resume",
    "tax": "Tax Document",
    "receipt": "Receipt",
    "letter": "Letter",
    "report": "Report",
    "notes": "Notes",
    "statement": "Statement",
    "application": "Application",
    "policy": "Policy",
    "manual": "Manual",
    "unknown": "Unknown"
  }
}

// es-MX
{
  "document_types": {
    "invoice": "Factura",
    "contract": "Contrato",
    "resume": "Currículum",
    "tax": "Documento Fiscal",
    "receipt": "Recibo",
    "letter": "Carta",
    "report": "Reporte",
    "notes": "Notas",
    "statement": "Estado de Cuenta",
    "application": "Solicitud",
    "policy": "Póliza",
    "manual": "Manual",
    "unknown": "Desconocido"
  }
}
```

---

## Locale Detection

### Detection Priority

1. User preference (stored in settings)
2. Windows system locale
3. Fallback to `en-US`

```typescript
// i18n/detector.ts

async function detectLocale(): Promise<string> {
  // 1. Check stored preference
  const stored = await getStoredLocale();
  if (stored && SUPPORTED_LOCALES.includes(stored)) {
    return stored;
  }
  
  // 2. Check system locale
  const systemLocale = getSystemLocale();  // e.g., "es-MX", "en-US"
  
  // Map similar locales
  const localeMap: Record<string, string> = {
    'es': 'es-MX',
    'es-ES': 'es-MX',
    'es-AR': 'es-MX',
    'es-CO': 'es-MX',
    'en': 'en-US',
    'en-GB': 'en-US',
    'en-CA': 'en-US',
  };
  
  const mapped = localeMap[systemLocale] || systemLocale;
  
  if (SUPPORTED_LOCALES.includes(mapped)) {
    return mapped;
  }
  
  // 3. Fallback
  return 'en-US';
}

function getSystemLocale(): string {
  // Windows API or Electron's app.getLocale()
  return navigator.language || 'en-US';
}
```

---

## Translation Workflow

### Process

```
1. Developer adds new string in en-US
   └── Uses descriptive key: "scanning.progress.analyzing"
   
2. Mark for translation
   └── Add to translation queue/file
   
3. Translator receives context
   └── Key, English text, screenshot, max length
   
4. Translation review
   └── Native speaker reviews in-context
   
5. Import to es-MX files
   └── Automated via translation management tool
   
6. QA testing
   └── Verify in-app with screenshots
```

### Translation File Format

```json
{
  "_meta": {
    "locale": "es-MX",
    "last_updated": "2025-01-14",
    "translator": "Professional Translation Service",
    "coverage": "100%"
  },
  "strings": {
    "...": "..."
  }
}
```

### Translation Guidelines for es-MX

| Guideline | Example |
|-----------|---------|
| Use "tú" (informal) not "usted" | "Tus documentos" not "Sus documentos" |
| Mexican Spanish vocabulary | "Computadora" not "Ordenador" |
| Consistent terminology | Always "carpeta" for folder |
| Neutral gender where possible | "Archivos organizados" |
| No literal translations | Adapt idioms appropriately |

---

## String Management

### Key Naming Convention

```
{namespace}.{screen/component}.{element}.{variant}

Examples:
- common.actions.continue
- onboarding.welcome.title
- scanning.progress.analyzing
- errors.file_operations.FILE_LOCKED.title
- settings.organization.mode.simple.description
```

### Missing String Handling

```typescript
i18n.init({
  // ...
  saveMissing: true,
  missingKeyHandler: (lng, ns, key, fallbackValue) => {
    console.warn(`Missing translation: ${lng}/${ns}/${key}`);
    // In dev: show key name
    // In prod: show English fallback
    if (process.env.NODE_ENV === 'development') {
      return `[${key}]`;
    }
    return fallbackValue;
  }
});
```

---

## Testing Localization

### Automated Checks

```typescript
// tests/i18n.test.ts

describe('Localization', () => {
  const locales = ['en-US', 'es-MX'];
  const namespaces = ['common', 'onboarding', 'scanning', 'errors'];
  
  test('All keys exist in all locales', () => {
    const enKeys = getAllKeys('en-US');
    
    locales.forEach(locale => {
      const localeKeys = getAllKeys(locale);
      const missing = enKeys.filter(k => !localeKeys.includes(k));
      
      expect(missing).toEqual([]);
    });
  });
  
  test('No empty strings', () => {
    locales.forEach(locale => {
      const strings = getAllStrings(locale);
      const empty = Object.entries(strings)
        .filter(([k, v]) => v === '' || v === null);
      
      expect(empty).toEqual([]);
    });
  });
  
  test('Interpolation variables match', () => {
    const enStrings = getAllStrings('en-US');
    
    locales.forEach(locale => {
      const localeStrings = getAllStrings(locale);
      
      Object.keys(enStrings).forEach(key => {
        const enVars = extractVariables(enStrings[key]);
        const localeVars = extractVariables(localeStrings[key]);
        
        expect(localeVars.sort()).toEqual(enVars.sort());
      });
    });
  });
});
```

### Visual Testing

- Screenshot comparison for both locales
- Check for text overflow
- Verify layout at different screen sizes

---

## Summary

| Aspect | Implementation |
|--------|----------------|
| Locales | en-US (default), es-MX |
| Framework | i18next + react-i18next |
| Detection | Stored pref → System → Fallback |
| File format | JSON, namespaced |
| Pluralization | Built-in i18next rules |
| Formatting | Intl API (dates, numbers) |
| Text expansion | CSS flex + min-width |
| Quality | Automated tests + visual QA |
