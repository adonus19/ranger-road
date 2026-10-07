import { Component, OnDestroy, computed, effect, input, signal, untracked } from '@angular/core';
import type { IntervalPlan } from '../../core/domain/models';
import {
  buildIntervalSegments,
  describeIntervalPlan,
  intervalProgress,
  isValidIntervalPlan,
  type IntervalPhase,
} from '../../core/program/interval-plan';

const SOUND_KEY = 'rangers-road.interval-timer-sound';

const PHASE_LABELS: Record<IntervalPhase, string> = {
  warmup: 'Warm up',
  brisk: 'Brisk',
  easy: 'Easy',
  cooldown: 'Cool down',
};

/** Soft tones: higher for brisk, lower for easy, so the switch can be told without looking. */
const PHASE_TONES: Record<IntervalPhase, number> = {
  warmup: 520,
  brisk: 784,
  easy: 523,
  cooldown: 440,
};

type TimerState = 'idle' | 'running' | 'paused' | 'done';

function readSound(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

function digits(value: string): number {
  return /^\d{1,4}$/.test(value.trim()) ? Number(value.trim()) : Number.NaN;
}

/**
 * An optional interval timer. The written steps stay the plan; this only counts them down. It
 * never starts on its own, and nothing else in the app waits for it. Time comes from the clock,
 * so a phone that sleeps mid-walk catches up when it wakes.
 */
@Component({
  selector: 'app-interval-timer',
  styleUrl: './interval-timer.css',
  templateUrl: './interval-timer.html',
})
export class IntervalTimer implements OnDestroy {
  /** The day's written plan. Leave empty and set `editable` to let the person choose their own. */
  readonly plan = input<IntervalPlan | null>(null);
  readonly editable = input(false);

  protected readonly rounds = signal('5');
  protected readonly brisk = signal('60');
  protected readonly easy = signal('120');
  protected readonly sound = signal(readSound());
  protected readonly state = signal<TimerState>('idle');
  protected readonly elapsedSeconds = signal(0);
  protected readonly announcement = signal('');

  /** The plan to run: the day's, or the person's own numbers. */
  protected readonly activePlan = computed<IntervalPlan | null>(() => {
    const fixed = this.plan();
    if (fixed) return fixed;
    if (!this.editable()) return null;
    return {
      rounds: digits(this.rounds()),
      briskSeconds: digits(this.brisk()),
      easySeconds: digits(this.easy()),
    };
  });
  protected readonly valid = computed(() => {
    const plan = this.activePlan();
    return !!plan && isValidIntervalPlan(plan);
  });
  protected readonly summary = computed(() => {
    const plan = this.activePlan();
    return plan && this.valid() ? describeIntervalPlan(plan) : '';
  });
  private readonly segments = computed(() => {
    const plan = this.activePlan();
    return plan && this.valid() ? buildIntervalSegments(plan) : [];
  });
  protected readonly progress = computed(() =>
    intervalProgress(this.segments(), this.elapsedSeconds()),
  );
  protected readonly phaseLabel = computed(() => {
    const segment = this.progress().segment;
    return segment ? PHASE_LABELS[segment.phase] : '';
  });
  protected readonly phase = computed(() => this.progress().segment?.phase ?? null);
  protected readonly roundLabel = computed(() => {
    const segment = this.progress().segment;
    const plan = this.activePlan();
    return segment?.round && plan ? `Round ${segment.round} of ${plan.rounds}` : '';
  });
  protected readonly clock = computed(() => {
    const seconds = this.progress().remainingSeconds;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });
  protected readonly nextLabel = computed(() => {
    const next = this.segments()[this.progress().index + 1];
    return next ? `Next: ${PHASE_LABELS[next.phase]}` : 'Last block';
  });
  /** The plan has no cooldown length, so the walk's own steps say how to finish. */
  protected readonly finishNote = computed(() =>
    this.activePlan()?.cooldownMinutes
      ? 'Intervals done. The walk is complete.'
      : 'Intervals done. Finish the walk at an easy pace.',
  );

  private base = 0;
  private startedAt = 0;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private audio: AudioContext | null = null;
  private wakeLock: { release(): Promise<void> } | null = null;
  private readonly onVisible = () => {
    if (document.visibilityState === 'visible' && this.state() === 'running') {
      this.update(false);
      void this.holdScreen();
    }
  };

  constructor() {
    // A changed plan, or the plan leaving, ends any timer that was counting the old one.
    effect(() => {
      this.activePlan();
      untracked(() => this.reset());
    });
  }

  ngOnDestroy(): void {
    this.stopTicker();
    void this.releaseScreen();
    void this.audio?.close().catch(() => undefined);
  }

  protected start(): void {
    if (!this.valid()) return;
    this.base = 0;
    this.elapsedSeconds.set(0);
    this.resume();
    this.announce(this.segments()[0]?.phase);
  }

  protected resume(): void {
    this.prepareAudio();
    this.startedAt = Date.now();
    this.state.set('running');
    this.stopTicker();
    this.ticker = setInterval(() => this.update(true), 250);
    document.addEventListener('visibilitychange', this.onVisible);
    void this.holdScreen();
  }

  protected pause(): void {
    this.base += (Date.now() - this.startedAt) / 1000;
    this.stopTicker();
    this.state.set('paused');
    void this.releaseScreen();
  }

  protected reset(): void {
    this.stopTicker();
    this.base = 0;
    this.elapsedSeconds.set(0);
    this.state.set('idle');
    this.announcement.set('');
    void this.releaseScreen();
  }

  protected toggleSound(event: Event): void {
    const on = (event.target as HTMLInputElement).checked;
    this.sound.set(on);
    try {
      localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
    } catch {
      // The choice still holds for this visit.
    }
    if (on) this.prepareAudio();
  }

  protected setField(field: 'rounds' | 'brisk' | 'easy', event: Event): void {
    this[field].set((event.target as HTMLInputElement).value);
  }

  private update(chime: boolean): void {
    if (this.state() !== 'running') return;
    const before = this.progress().index;
    const seconds = this.base + (Date.now() - this.startedAt) / 1000;
    this.elapsedSeconds.set(seconds);
    const now = this.progress();
    if (now.done) {
      this.stopTicker();
      this.state.set('done');
      this.announcement.set(this.finishNote());
      if (chime) this.chime('done');
      void this.releaseScreen();
    } else if (now.index !== before) {
      this.announce(now.segment?.phase);
      if (chime) this.chime(now.segment?.phase ?? 'easy');
    }
  }

  private announce(phase: IntervalPhase | undefined): void {
    if (phase) this.announcement.set(PHASE_LABELS[phase]);
  }

  private stopTicker(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    document.removeEventListener('visibilitychange', this.onVisible);
  }

  /** Audio can only start from a tap, so the context is made when the timer starts. */
  private prepareAudio(): void {
    if (!this.sound() || this.audio) return;
    try {
      const Context =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.audio = Context ? new Context() : null;
      void this.audio?.resume();
    } catch {
      this.audio = null;
    }
  }

  private chime(phase: IntervalPhase | 'done'): void {
    if (!this.sound() || !this.audio) return;
    try {
      const context = this.audio;
      const tones = phase === 'done' ? [523, 659, 784] : [PHASE_TONES[phase]];
      tones.forEach((frequency, index) => {
        const start = context.currentTime + index * 0.22;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.45);
      });
    } catch {
      // A chime is a courtesy; the screen still shows every switch.
    }
  }

  private async holdScreen(): Promise<void> {
    try {
      const wake = (
        navigator as unknown as { wakeLock?: { request(type: 'screen'): Promise<never> } }
      ).wakeLock;
      if (wake && !this.wakeLock) this.wakeLock = await wake.request('screen');
    } catch {
      this.wakeLock = null;
    }
  }

  private async releaseScreen(): Promise<void> {
    const lock = this.wakeLock;
    this.wakeLock = null;
    try {
      await lock?.release();
    } catch {
      // The lock may already have been released by the browser.
    }
  }
}
