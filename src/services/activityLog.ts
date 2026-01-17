/**
 * Activity Log Service
 *
 * Frontend interface for the activity log system (per doc 07).
 * Provides session tracking, operation logging, and undo capabilities.
 */

import { invoke } from '@tauri-apps/api/core';

// ============================================
// Types
// ============================================

export type SessionStatus =
  | 'in_progress'
  | 'completed'
  | 'partial'
  | 'rolled_back'
  | 'failed';

export type OperationType =
  | 'move'
  | 'copy'
  | 'create_folder'
  | 'rename'
  | 'delete';

export type OperationStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'rolled_back'
  | 'skipped';

export interface SessionSummary {
  session_id: string;
  started_at: string;
  completed_at: string | null;
  status: SessionStatus;
  selected_mode: string | null;
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
}

export interface OperationRecord {
  id: number;
  session_id: string;
  op_id: number;
  op_type: OperationType;
  status: OperationStatus;
  source_path: string | null;
  destination_path: string | null;
  filename: string | null;
  extension: string | null;
  size_bytes: number | null;
  confidence: number | null;
  suggested_folder: string | null;
  document_type: string | null;
  timestamp: string;
  rolled_back_at: string | null;
  error_message: string | null;
}

export interface ErrorRecord {
  id: number;
  session_id: string;
  op_id: number | null;
  error_code: string;
  error_message: string | null;
  file_path: string | null;
  severity: string | null;
  timestamp: string;
  resolved: boolean;
  resolution: string | null;
}

export interface SessionLog {
  session: SessionSummary;
  operations: OperationRecord[];
  errors: ErrorRecord[];
}

export interface UndoResult {
  success: boolean;
  op_id: number;
  message: string;
}

export interface SessionUndoResult {
  success: boolean;
  session_id: string;
  operations_undone: number;
  operations_failed: number;
  messages: string[];
}

export interface LogOperationParams {
  sessionId: string;
  opType: OperationType;
  sourcePath?: string;
  destinationPath?: string;
  filename?: string;
  extension?: string;
  sizeBytes?: number;
  confidence?: number;
  suggestedFolder?: string;
  documentType?: string;
}

// ============================================
// Session Management
// ============================================

/**
 * Start a new organization session
 */
export async function startSession(
  mode?: string,
  userType?: string
): Promise<string> {
  return invoke<string>('start_organization_session', {
    mode,
    userType,
  });
}

/**
 * Complete an organization session
 */
export async function completeSession(
  sessionId: string,
  status: SessionStatus
): Promise<void> {
  return invoke<void>('complete_organization_session', {
    sessionId,
    status,
  });
}

/**
 * Get recent sessions
 */
export async function getRecentSessions(
  limit?: number
): Promise<SessionSummary[]> {
  return invoke<SessionSummary[]>('get_recent_sessions', { limit });
}

/**
 * Get full session log with operations and errors
 */
export async function getSessionLog(
  sessionId: string
): Promise<SessionLog | null> {
  return invoke<SessionLog | null>('get_session_log', { sessionId });
}

/**
 * Check for incomplete sessions (crash recovery)
 */
export async function checkIncompleteSessions(): Promise<SessionSummary[]> {
  return invoke<SessionSummary[]>('check_incomplete_sessions');
}

// ============================================
// Operation Logging
// ============================================

/**
 * Log a file operation
 */
export async function logOperation(params: LogOperationParams): Promise<number> {
  return invoke<number>('log_file_operation', {
    sessionId: params.sessionId,
    opType: params.opType,
    sourcePath: params.sourcePath,
    destinationPath: params.destinationPath,
    filename: params.filename,
    extension: params.extension,
    sizeBytes: params.sizeBytes,
    confidence: params.confidence,
    suggestedFolder: params.suggestedFolder,
    documentType: params.documentType,
  });
}

/**
 * Update operation status after execution
 */
export async function updateOperationStatus(
  sessionId: string,
  opId: number,
  status: OperationStatus,
  errorMessage?: string
): Promise<void> {
  return invoke<void>('update_operation_status', {
    sessionId,
    opId,
    status,
    errorMessage,
  });
}

// ============================================
// Undo Operations
// ============================================

/**
 * Undo a single operation
 */
export async function undoOperation(
  sessionId: string,
  opId: number
): Promise<UndoResult> {
  return invoke<UndoResult>('undo_session_operation', {
    sessionId,
    opId,
  });
}

/**
 * Undo entire session
 */
export async function undoSession(sessionId: string): Promise<SessionUndoResult> {
  return invoke<SessionUndoResult>('undo_entire_session', { sessionId });
}

// ============================================
// Export & Cleanup
// ============================================

/**
 * Export session log as human-readable text
 */
export async function exportSessionLog(
  sessionId: string
): Promise<string | null> {
  return invoke<string | null>('export_session_log', { sessionId });
}

/**
 * Clean up old session logs (default 90 days retention)
 */
export async function cleanupOldSessions(
  retentionDays?: number
): Promise<number> {
  return invoke<number>('cleanup_old_sessions', { retentionDays });
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format a date string for display
 */
export function formatSessionDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get status badge color for display
 */
export function getStatusColor(status: SessionStatus | OperationStatus): string {
  switch (status) {
    case 'completed':
      return 'green';
    case 'in_progress':
    case 'pending':
      return 'blue';
    case 'failed':
      return 'red';
    case 'rolled_back':
      return 'yellow';
    case 'partial':
    case 'skipped':
      return 'orange';
    default:
      return 'gray';
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
