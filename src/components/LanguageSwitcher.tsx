import { useI18n, languages, Language } from '../i18n';
import { Globe } from 'lucide-react';

export function LanguageSwitcher({ minimal = false }: { minimal?: boolean }) {
  const { language, setLanguage, t } = useI18n();

  if (minimal) {
    return (
      <button
        onClick={() => setLanguage(language === 'en' ? 'es-MX' : 'en')}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        aria-label={t('welcome.selectLanguage')}
      >
        <Globe className="w-4 h-4" />
        <span>{languages[language].nativeName}</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-muted-foreground">
        {t('settings.language')}
      </label>
      <div className="flex gap-2">
        {(Object.keys(languages) as Language[]).map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${language === lang
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }
            `}
          >
            {languages[lang].nativeName}
          </button>
        ))}
      </div>
    </div>
  );
}
