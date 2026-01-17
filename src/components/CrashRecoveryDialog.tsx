/**
 * Crash Recovery Dialog
 *
 * Modal dialog shown when an incomplete organization session is detected.
 * Per specification doc 07 - Activity Log & Undo System.
 */

import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { invoke } from '@tauri-apps/api/core';
import {
  AlertTriangle,
  Play,
  Undo2,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface SessionLog {
  session_id: string;
  started_at: string;
  status: string;
  selected_mode: string | null;
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
}

interface CrashRecoveryDialogProps {
  session: SessionLog;
  onResolved: () => void;
}

type RecoveryAction = 'idle' | 'processing' | 'success' | 'error';

export function CrashRecoveryDialog({ session, onResolved }: CrashRecoveryDialogProps) {
  const { t } = useTranslation();
  const [action, setAction] = useState<RecoveryAction>('idle');
  const [message, setMessage] = useState('');

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const handleResume = async () => {
    setAction('processing');
    try {
      await invoke('resume_incomplete_session', { sessionId: session.session_id });
      setAction('success');
      // Wait briefly then close dialog
      setTimeout(onResolved, 500);
    } catch (error) {
      console.error('Resume failed:', error);
      setAction('error');
      setMessage(String(error));
    }
  };

  const handleRollback = async () => {
    setAction('processing');
    try {
      const result = await invoke<{ operations_undone: number; failures: string[] }>(
        'rollback_incomplete_session',
        { sessionId: session.session_id }
      );
      setAction('success');
      setMessage(t('crashRecovery.rollbackSuccess', { count: result.operations_undone }));
      setTimeout(onResolved, 1500);
    } catch (error) {
      console.error('Rollback failed:', error);
      setAction('error');
      setMessage(t('crashRecovery.rollbackFailed'));
    }
  };

  const handleDiscard = async () => {
    setAction('processing');
    try {
      await invoke('discard_incomplete_session', { sessionId: session.session_id });
      setAction('success');
      setMessage(t('crashRecovery.discardSuccess'));
      setTimeout(onResolved, 1000);
    } catch (error) {
      console.error('Discard failed:', error);
      setAction('error');
      setMessage(String(error));
    }
  };

  const isProcessing = action === 'processing';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4 shadow-xl">
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              {action === 'success' ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : action === 'error' ? (
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t('crashRecovery.title')}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t('crashRecovery.description')}
              </p>
            </div>
          </div>

          {/* Session Info */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p className="text-muted-foreground">
              {t('crashRecovery.sessionInfo', { date: formatDate(session.started_at) })}
            </p>
            <p className="font-medium">
              {t('crashRecovery.operationsCompleted', {
                completed: session.successful_operations,
                total: session.total_operations,
              })}
            </p>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`text-sm p-3 rounded-lg ${
              action === 'success'
                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* Action Buttons */}
          {action === 'idle' && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{t('crashRecovery.whatToDo')}</p>

              {/* Resume Button */}
              <Button
                variant="default"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={handleResume}
                disabled={isProcessing}
              >
                <Play className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">{t('crashRecovery.resume')}</p>
                  <p className="text-xs opacity-80">{t('crashRecovery.resumeDescription')}</p>
                </div>
              </Button>

              {/* Rollback Button */}
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={handleRollback}
                disabled={isProcessing}
              >
                <Undo2 className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">{t('crashRecovery.rollback')}</p>
                  <p className="text-xs text-muted-foreground">{t('crashRecovery.rollbackDescription')}</p>
                </div>
              </Button>

              {/* Discard Button */}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-3 text-muted-foreground"
                onClick={handleDiscard}
                disabled={isProcessing}
              >
                <Trash2 className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">{t('crashRecovery.discard')}</p>
                  <p className="text-xs">{t('crashRecovery.discardDescription')}</p>
                </div>
              </Button>
            </div>
          )}

          {/* Processing State */}
          {action === 'processing' && (
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t('crashRecovery.processing')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
