import { Injectable, computed, signal } from '@angular/core';
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

  async initialize(): Promise<void> {
    this.today.set(localDateToday());
    if (!this.pendingLoad) {
      this.pendingLoad = this.load();
    }
    await this.pendingLoad;
    if (this.database && this.readiness()?.date !== this.today()) {
      this.readiness.set((await this.database.getLatestReadinessForDate(this.today())) ?? null);
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

    const check: ReadinessCheck = {
      ...input,
      id: `readiness-${input.date}-${crypto.randomUUID()}`,
      checkedAt: new Date().toISOString(),
      status: classifyReadiness(input),
    };
    await this.database.addReadinessCheck(check);
    this.readiness.set(check);
    return check;
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
      this.readiness.set((await this.database.getLatestReadinessForDate(this.today())) ?? null);
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
