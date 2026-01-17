/**
 * Mode Selection Utility
 *
 * Determines organization mode based on personalization answers.
 * Per specification doc 06, Screen 3.
 */

// User types from Q1
export type UserType =
  | 'parent'
  | 'student'
  | 'teacher'
  | 'office'
  | 'freelancer'
  | 'business'
  | 'retired'
  | 'creative';

// Lookup styles from Q2
export type LookupStyle = 'topic' | 'time' | 'project' | 'unknown';

// Automation levels from Q3
export type AutomationLevel = 'safe' | 'balanced' | 'aggressive';

// Organization modes
export type OrganizationMode = 'simple' | 'timeline' | 'smart_groups';

// Personalization answers
export interface Personalization {
  userType: UserType | null;
  lookupStyle: LookupStyle | null;
  automationLevel: AutomationLevel;
}

/**
 * Select the best organization mode based on personalization answers.
 * Q2 (lookupStyle) is the primary driver.
 */
export function selectMode(p: Personalization): OrganizationMode {
  // Q2 is the primary driver
  if (p.lookupStyle === 'time') return 'timeline';
  if (p.lookupStyle === 'project') return 'smart_groups';

  // Q1 can influence if Q2 is 'topic' or 'unknown'
  if (p.userType === 'freelancer' || p.userType === 'business') {
    return 'smart_groups';
  }

  // Default to simple for most users
  return 'simple';
}

/**
 * Get confidence threshold based on automation level.
 * Lower threshold = more files auto-organized (more aggressive).
 */
export function getConfidenceThreshold(level: AutomationLevel): number {
  switch (level) {
    case 'safe':
      return 0.80;
    case 'balanced':
      return 0.70;
    case 'aggressive':
      return 0.55;
    default:
      return 0.70;
  }
}

/**
 * Get a human-readable explanation of the selected mode.
 */
export function getModeExplanation(mode: OrganizationMode, p: Personalization): string {
  const userContext = p.userType
    ? ` Since you're a ${p.userType.replace('_', ' ')}, `
    : ' ';

  switch (mode) {
    case 'simple':
      return `Based on your files,${userContext}Simple mode will work best. Most of your documents are personal records.`;
    case 'timeline':
      return `Since you prefer finding files by time,${userContext}Timeline mode organizes everything by year.`;
    case 'smart_groups':
      return `Based on your files,${userContext}Smart Groups mode will work best for organizing by clients and projects.`;
    default:
      return 'Organization mode selected based on your preferences.';
  }
}
