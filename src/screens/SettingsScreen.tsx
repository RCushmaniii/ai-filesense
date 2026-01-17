import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { invoke } from '@tauri-apps/api/core';
import {
  X,
  Key,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface SettingsScreenProps {
  onClose: () => void;
}

interface AppSettings {
  anthropic_api_key?: string;
  anthropic_model?: string;
}

export function SettingsScreen({ onClose }: SettingsScreenProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalKey, setOriginalKey] = useState('');

  // Load existing settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await invoke<AppSettings>('get_settings');
        if (settings.anthropic_api_key) {
          setApiKey(settings.anthropic_api_key);
          setOriginalKey(settings.anthropic_api_key);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Track changes
  useEffect(() => {
    setHasChanges(apiKey !== originalKey);
  }, [apiKey, originalKey]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await invoke('save_settings', {
        settings: {
          anthropic_api_key: apiKey || null,
          anthropic_model: null,
        },
      });
      setSaveStatus('success');
      setOriginalKey(apiKey);
      setHasChanges(false);

      // Reset success status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey) return;

    setIsTesting(true);
    setTestStatus('idle');
    setTestError(null);

    try {
      const success = await invoke<boolean>('test_api_connection', {
        apiKey,
        model: null,
      });

      if (success) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
        setTestError('Connection failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestStatus('error');
      setTestError(String(error));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl">{t('settings.title')}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language Setting */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('settings.language')}</label>
            <LanguageSwitcher />
          </div>

          {/* API Key Setting */}
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              <Key className="h-4 w-4" />
              {t('settings.apiKey')}
            </label>
            <div className="space-y-2">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t('settings.apiKeyPlaceholder')}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                {t('settings.apiKeyHelp')}
                <a
                  href="https://console.anthropic.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>

            {/* Test Connection Button */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={!apiKey || isTesting}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  t('settings.testConnection')
                )}
              </Button>

              {testStatus === 'success' && (
                <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  {t('settings.connectionSuccess')}
                </span>
              )}

              {testStatus === 'error' && (
                <span className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {testError || t('settings.connectionFailed')}
                </span>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              {saveStatus === 'success' && (
                <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  {t('settings.saved')}
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {t('common.error')}
                </span>
              )}
            </div>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('settings.save')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
