export const ALLOWED_SESSION_MODES = [10, 15] as const;

export type SessionMode = (typeof ALLOWED_SESSION_MODES)[number];

export function normalizeSessionMode(mode: number | undefined): SessionMode {
  if (mode === 10 || mode === 15) {
    return mode;
  }

  return 15;
}

export function validateSessionMode(mode: number): boolean {
  return ALLOWED_SESSION_MODES.includes(mode as SessionMode);
}

export function estimateTimeSavedMs(consumedCount: number, avgRawSeconds = 45, avgDigestSeconds = 17): number {
  const savedPerItem = Math.max(avgRawSeconds - avgDigestSeconds, 0);
  return consumedCount * savedPerItem * 1000;
}
