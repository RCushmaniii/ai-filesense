import { useI18n, languages, Language } from '../i18n';
import { Globe } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export function LanguageSwitcher({ minimal = false }: { minimal?: boolean }) {
  const { language, setLanguage, t } = useI18n();

  if (minimal) {
    const isSpanish = language === 'es-MX';
    return (
      <div
        className="flex items-center gap-1.5 px-3 py-2"
        aria-label={t('welcome.selectLanguage')}
      >
        <span
          className={`text-xs font-mono transition-colors ${
            !isSpanish ? 'font-semibold text-foreground' : 'text-muted-foreground'
          }`}
        >
          EN
        </span>
        <Switch
          checked={isSpanish}
          onCheckedChange={(checked) => setLanguage(checked ? 'es-MX' : 'en')}
          className="scale-75"
        />
        <span
          className={`text-xs font-mono transition-colors ${
            isSpanish ? 'font-semibold text-foreground' : 'text-muted-foreground'
          }`}
        >
          ES
        </span>
      </div>
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
