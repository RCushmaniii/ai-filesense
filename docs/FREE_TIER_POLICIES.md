# Free Tier Policies

## Overview

AI FileSense uses a freemium model where the developer pays for AI API costs. To protect against abuse while providing value, we implement usage limits for free users.

## Current Limits

### Per-Scan Limits
- **Maximum files per scan:** 500 files
- **Rationale:** Prevents single large scans from consuming excessive API credits
- **Cost context:** ~$0.75 per 500 files at current Haiku rates

### Total Scan Limits
- **Maximum free scans:** 10 scans (lifetime on device)
- **Rationale:** Allows users to organize their files thoroughly while limiting long-term abuse
- **Reset:** Local tracking only - savvy users could reset by clearing app data (acceptable for MVP)

## Cost Analysis

Based on actual usage (2026-01-14):
- 148 files = $0.22
- Per-file cost: ~$0.0015 (0.15 cents)
- 500 files = ~$0.75
- 10 scans x 500 files = ~$7.50 max cost per user

## Upgrade Path (Future)

When limits are reached, users see an upgrade prompt. Future paid tiers might include:

### Suggested Tiers
1. **Free Tier** (current)
   - 500 files per scan
   - 10 total scans

2. **Pro Tier** ($X/month or one-time)
   - Unlimited files per scan
   - Unlimited scans
   - Priority support

3. **Team/Business Tier**
   - Multiple devices
   - Shared organization schemes
   - Admin dashboard

## Technical Implementation

### State Tracking
```typescript
// Frontend state (src/store/appState.tsx)
export const FREE_TIER = {
  MAX_FILES_PER_SCAN: 500,
  MAX_TOTAL_SCANS: 10,
} as const;

export interface FreeTierUsage {
  scansUsed: number;
  scansRemaining: number;
  isLimitReached: boolean;
}
```

### Persistence
- Scans used stored in `settings.json` via Tauri backend
- Field: `scans_used: u32`
- Persists across app restarts
- Local to device (no account system yet)

### Commands
- `get_scan_count`: Returns current scans used
- `increment_scan_count`: Called after successful scan completion

## User-Facing Copy

### Before scan (within limits)
> "148 files found - Ready to organize"
> "Free tier: 7 of 10 scans remaining"

### File limit exceeded
> "2,847 files found"
> "Free tier allows 500 files per scan. Select fewer folders or upgrade."

### Scan limit reached
> "You've used all 10 free scans"
> "Upgrade to continue organizing your files"

## Future Considerations

1. **Server-side tracking** - When accounts are added, track usage server-side to prevent resets
2. **Granular limits** - Consider per-month limits instead of lifetime
3. **Referral bonuses** - Extra scans for referring friends
4. **Trial resets** - Allow one reset per year for returning users

## Related Files

- `src/store/appState.tsx` - FREE_TIER constants and FreeTierUsage interface
- `src/screens/FolderSelectionScreen.tsx` - Limit display UI
- `src-tauri/src/commands.rs` - AppSettings with scans_used, increment_scan_count
- `src/i18n/en.json` - User-facing copy
- `src/i18n/es-MX.json` - Spanish translations
