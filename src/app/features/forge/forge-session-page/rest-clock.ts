/** Rest choices, in seconds, up to five minutes. 0 means no target. */
export const REST_LENGTHS = [0, 30, 60, 90, 120, 150, 180, 240, 300] as const;

export function formatRest(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export function restLengthLabel(seconds: number): string {
  return seconds === 0 ? 'No target' : formatRest(seconds);
}

/**
 * The between-sets clock. It counts up from when the set was marked; pausing freezes it and
 * resetting returns it to 0:00. Nothing here is saved: rest time is never recorded.
 */
export class RestClock {
  private startedAt = 0;
  private pausedAt: number | null = null;
  private key: string | undefined;

  /** Follows the saved set time; a new set starts a fresh, running clock. */
  sync(started: string | undefined): void {
    if (started === this.key) return;
    this.key = started;
    this.startedAt = started ? Date.parse(started) : 0;
    this.pausedAt = null;
  }

  get paused(): boolean {
    return this.pausedAt !== null;
  }

  elapsed(now = Date.now()): number {
    if (!this.key) return 0;
    return Math.max(0, Math.floor(((this.pausedAt ?? now) - this.startedAt) / 1000));
  }

  pause(now = Date.now()): void {
    this.pausedAt ??= now;
  }

  resume(now = Date.now()): void {
    if (this.pausedAt === null) return;
    this.startedAt += now - this.pausedAt;
    this.pausedAt = null;
  }

  reset(now = Date.now()): void {
    this.startedAt = now;
    if (this.pausedAt !== null) this.pausedAt = now;
  }
}
