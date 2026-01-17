/**
 * Welcome Screen (Landing Page)
 *
 * Purpose: Brand introduction and trust building
 * - Product name and logo
 * - Encouraging messaging
 * - Trust statements (files stay local, nothing moves without approval)
 * - Language selection
 * - Get Started button
 *
 * NO file type selection here - that happens on the next screen (Step 1).
 */

import { useTranslation } from '@/i18n';
import { useAppState } from '@/store/appState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import {
  Sparkles,
  Shield,
  Eye,
  Undo2,
  ChevronRight,
} from 'lucide-react';

export function WelcomeScreen() {
  const { t, language } = useTranslation();
  const { dispatch } = useAppState();

  const isSpanish = language === 'es-MX';

  const handleGetStarted = () => {
    // Complete welcome and move to folder/file type selection (Step 1)
    dispatch({ type: 'COMPLETE_WELCOME' });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-10">
        {/* Logo and Brand */}
        <div className="text-center space-y-6">
          <div className="mx-auto h-24 w-24 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Sparkles className="h-12 w-12 text-primary-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">
              {t('app.name')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('app.tagline')}
            </p>
          </div>
        </div>

        {/* Main messaging */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold">
            {t('welcome.title')}
          </h2>
          <p className="text-muted-foreground text-lg">
            {t('welcome.subtitle')}
          </p>
        </div>

        {/* Trust statements */}
        <Card className="bg-muted/30 border-muted">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium">
                  {isSpanish ? 'Tus archivos permanecen locales' : 'Your files stay on your computer'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isSpanish
                    ? 'Solo los nombres de archivo se analizan. El contenido no sale de tu dispositivo.'
                    : 'Only filenames are analyzed. Content never leaves your device.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium">
                  {isSpanish ? 'Tú apruebas cada cambio' : 'You approve every change'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isSpanish
                    ? 'Nada se mueve sin tu permiso. Revisarás todo antes de que pase.'
                    : 'Nothing moves without your permission. You review everything first.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                <Undo2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium">
                  {isSpanish ? 'Deshacer siempre disponible' : 'Undo is always available'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isSpanish
                    ? 'Si cambias de opinión, un clic restaura todo.'
                    : 'If you change your mind, one click restores everything.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Get Started Button */}
        <Button
          size="lg"
          className="w-full text-lg h-14 gap-2"
          onClick={handleGetStarted}
        >
          {t('welcome.getStarted')}
          <ChevronRight className="h-5 w-5" />
        </Button>

        {/* Language Selector */}
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('welcome.selectLanguage')}
          </p>
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
