import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import type { Campaign, LocalDate, ReadinessCheck, ReadinessInput } from '../domain/models';
import { classifyReadiness } from '../domain/readiness';
import { RoadDatabase } from '../persistence/road-database';
import { chapterOneDefinition } from '../program/chapter-one.seed';
import {
  CHAPTER_ONE_SCHEDULE_VERSION,
  getCampaignDay,
  getGateTrialTargetDate,
  reconcileChapterOneCampaign,
} from '../program/campaign';

const PRIMARY_CAMPAIGN_ID = 'primary';

export function localDateToday(now = new Date()): LocalDate {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable({ providedIn: 'root' })
export class CampaignState {
  private readonly destroyRef = inject(DestroyRef);
  readonly campaign = signal<Campaign | null>(null);
  readonly readiness = signal<ReadinessCheck | null>(null);
  readonly today = signal<LocalDate>(localDateToday());
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  /** True once storage has opened and no campaign exists yet: the person still has to choose Day 1. */
  readonly needsStartDate = computed(() => !this.loading() && !this.error() && !this.campaign());

  /** Before Day 1 the start date can still move; after that, dated history depends on it. */
  readonly beforeDayOne = computed(() => {
    const campaign = this.campaign();
    return !!campaign && getCampaignDay(campaign.startDate, this.today()) < 1;
  });

  private database: RoadDatabase | null = null;
  private pendingLoad: Promise<void> | null = null;
  private dayTimer: ReturnType<typeof setTimeout> | null = null;
  private readinessRequest = 0;

  constructor() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const refresh = () => void this.initialize().catch(() => undefined);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      if (this.dayTimer) clearTimeout(this.dayTimer);
      this.database?.close();
    });
    this.scheduleDayRefresh();
  }

  async initialize(): Promise<void> {
    const date = localDateToday();
    if (date !== this.today()) {
      this.today.set(date);
      // Hide the previous day's check as soon as the date changes.
      this.readiness.set(null);
    }
    this.scheduleDayRefresh();
    if (!this.pendingLoad) {
      this.pendingLoad = this.load();
    }
    await this.pendingLoad;
    if (this.database) {
      const requestedDate = this.today();
      const request = ++this.readinessRequest;
      const latest = await this.database.getLatestReadinessForDate(requestedDate);
      if (request === this.readinessRequest && requestedDate === this.today()) {
        this.readiness.set(latest ?? null);
      }
    }
  }

  async retry(): Promise<void> {
    this.pendingLoad = null;
    await this.initialize();
  }

  /** Set Day 1. Allowed for a new campaign, or to move a start date that has not arrived yet. */
  async startCampaign(startDate: LocalDate): Promise<Campaign> {
    await this.initialize();
    if (!this.database) {
      throw new Error('Local storage is unavailable. Your start date was not saved.');
    }
    const existing = this.campaign();
    if (existing && !this.beforeDayOne()) {
      throw new Error('Day 1 has already passed, so the start date can no longer change.');
    }

    // Validates the date before anything is written.
    getCampaignDay(startDate, this.today());
    const campaign: Campaign = {
      id: PRIMARY_CAMPAIGN_ID,
      startDate,
      currentChapterId: existing?.currentChapterId ?? chapterOneDefinition.id,
      status: 'active',
      trialTargetDate: getGateTrialTargetDate(startDate),
      scheduleVersion: CHAPTER_ONE_SCHEDULE_VERSION,
    };
    await this.database.putCampaign(campaign);
    this.campaign.set(campaign);
    return campaign;
  }

  async recordReadiness(input: ReadinessInput): Promise<ReadinessCheck> {
    await this.initialize();
    if (!this.database) {
      throw new Error('Local storage is unavailable. Your check was not saved.');
    }
    if (input.date !== this.today()) {
      throw new Error('A new day started. Review and save a readiness check for today.');
    }

    const check: ReadinessCheck = {
      ...input,
      id: `readiness-${input.date}-${crypto.randomUUID()}`,
      checkedAt: new Date().toISOString(),
      status: classifyReadiness(input),
    };
    await this.database.addReadinessCheck(check);
    if (input.date === this.today()) {
      this.readinessRequest += 1;
      this.readiness.set(check);
    }
    return check;
  }

  private scheduleDayRefresh(): void {
    if (typeof window === 'undefined') return;
    if (this.dayTimer) clearTimeout(this.dayTimer);
    const now = new Date();
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    this.dayTimer = setTimeout(
      () => {
        this.dayTimer = null;
        void this.initialize().catch(() => undefined);
      },
      Math.max(1, nextDay.getTime() - now.getTime()),
    );
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.database = await RoadDatabase.open();
      const savedCampaign = await this.database.getCampaign(PRIMARY_CAMPAIGN_ID);
      const campaign = savedCampaign ? reconcileChapterOneCampaign(savedCampaign) : null;
      if (campaign && campaign !== savedCampaign) {
        await this.database.putCampaign(campaign);
      }
      this.campaign.set(campaign);
    } catch {
      this.database = null;
      this.error.set(
        'Local storage is unavailable. Check browser storage settings, then try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
