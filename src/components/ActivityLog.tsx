/**
 * Activity Log Component
 *
 * Displays session history with operations and provides undo capability.
 * Per doc 07 Activity Log System specification.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  History,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  Loader2,
} from 'lucide-react';
import {
  SessionSummary,
  SessionLog,
  OperationRecord,
  getRecentSessions,
  getSessionLog,
  undoSession,
  exportSessionLog,
  formatSessionDate,
  getStatusColor,
  formatFileSize,
} from '@/services/activityLog';

// ============================================
// Sub-components
// ============================================

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const color = getStatusColor(status as any);
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

interface OperationRowProps {
  operation: OperationRecord;
}

function OperationRow({ operation }: OperationRowProps) {
  const statusIcons: Record<string, React.ReactNode> = {
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
    pending: <Clock className="h-4 w-4 text-blue-500" />,
    rolled_back: <RotateCcw className="h-4 w-4 text-yellow-500" />,
    skipped: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  };

  return (
    <div className="flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-lg">
      {statusIcons[operation.status] || <FileText className="h-4 w-4" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {operation.filename || 'Unknown file'}
          </span>
          {operation.extension && (
            <span className="text-xs text-muted-foreground">.{operation.extension}</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {operation.op_type}: {operation.source_path?.split('\\').pop()} → {operation.destination_path?.split('\\').pop()}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-muted-foreground">
          {formatFileSize(operation.size_bytes)}
        </div>
        {operation.confidence !== null && (
          <div className="text-xs text-muted-foreground">
            {Math.round(operation.confidence * 100)}% conf
          </div>
        )}
      </div>
    </div>
  );
}

interface SessionCardProps {
  session: SessionSummary;
  isExpanded: boolean;
  onToggle: () => void;
  onUndo: () => void;
  onExport: () => void;
  isLoading: boolean;
  sessionLog?: SessionLog | null;
}

function SessionCard({
  session,
  isExpanded,
  onToggle,
  onUndo,
  onExport,
  isLoading,
  sessionLog,
}: SessionCardProps) {
  const { t } = useTranslation();
  const canUndo = session.status === 'completed' && session.successful_operations > 0;

  return (
    <Card className="overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {session.selected_mode
                ? t(`organizationStyles.${session.selected_mode}.name`)
                : t('activityLog.session')}
            </span>
            <StatusBadge status={session.status} />
          </div>
          <div className="text-sm text-muted-foreground">
            {formatSessionDate(session.started_at)}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm font-medium">
            {session.successful_operations}/{session.total_operations}
          </div>
          <div className="text-xs text-muted-foreground">
            {t('activityLog.filesOrganized')}
          </div>
        </div>
      </div>

      {isExpanded && (
        <CardContent className="pt-0 border-t">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessionLog ? (
            <div className="space-y-4 pt-4">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {sessionLog.session.successful_operations}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('activityLog.successful')}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {sessionLog.session.failed_operations}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('activityLog.failed')}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {sessionLog.operations.filter(o => o.status === 'rolled_back').length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('activityLog.undone')}
                  </div>
                </div>
              </div>

              {/* Operations list */}
              {sessionLog.operations.length > 0 && (
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  {sessionLog.operations.map((op) => (
                    <OperationRow key={`${op.session_id}-${op.op_id}`} operation={op} />
                  ))}
                </div>
              )}

              {/* Errors */}
              {sessionLog.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-red-600">
                    {t('activityLog.errors')} ({sessionLog.errors.length})
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {sessionLog.errors.slice(0, 3).map((err) => (
                      <div key={err.id} className="truncate">
                        • {err.error_message || err.error_code}
                      </div>
                    ))}
                    {sessionLog.errors.length > 3 && (
                      <div>...and {sessionLog.errors.length - 3} more</div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {canUndo && (
                  <Button variant="outline" size="sm" onClick={onUndo} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    {t('activityLog.undoAll')}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={onExport} className="gap-2">
                  <Download className="h-4 w-4" />
                  {t('activityLog.export')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              {t('activityLog.noDetails')}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ============================================
// Main Component
// ============================================

export function ActivityLog() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionLogs, setSessionLogs] = useState<Record<string, SessionLog | null>>({});
  const [loadingSession, setLoadingSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load recent sessions
  useEffect(() => {
    async function loadSessions() {
      try {
        const recentSessions = await getRecentSessions(20);
        setSessions(recentSessions);
      } catch (error) {
        console.error('Failed to load sessions:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSessions();
  }, []);

  // Load session details when expanded
  const handleToggleSession = async (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }

    setExpandedSession(sessionId);

    // Load session log if not already loaded
    if (!sessionLogs[sessionId]) {
      setLoadingSession(sessionId);
      try {
        const log = await getSessionLog(sessionId);
        setSessionLogs((prev) => ({ ...prev, [sessionId]: log }));
      } catch (error) {
        console.error('Failed to load session log:', error);
      } finally {
        setLoadingSession(null);
      }
    }
  };

  // Undo entire session
  const handleUndoSession = async (sessionId: string) => {
    try {
      const result = await undoSession(sessionId);
      if (result.success) {
        // Refresh sessions and session log
        const recentSessions = await getRecentSessions(20);
        setSessions(recentSessions);
        const log = await getSessionLog(sessionId);
        setSessionLogs((prev) => ({ ...prev, [sessionId]: log }));
      }
    } catch (error) {
      console.error('Failed to undo session:', error);
    }
  };

  // Export session log
  const handleExportSession = async (sessionId: string) => {
    try {
      const text = await exportSessionLog(sessionId);
      if (text) {
        // Create and download file
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-${sessionId.slice(0, 8)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export session:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{t('activityLog.title')}</h2>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('activityLog.noSessions')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.session_id}
              session={session}
              isExpanded={expandedSession === session.session_id}
              onToggle={() => handleToggleSession(session.session_id)}
              onUndo={() => handleUndoSession(session.session_id)}
              onExport={() => handleExportSession(session.session_id)}
              isLoading={loadingSession === session.session_id}
              sessionLog={sessionLogs[session.session_id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ActivityLog;
