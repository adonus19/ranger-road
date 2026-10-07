import { Injectable, inject } from '@angular/core';
import {
  allowedMissionOutcomes,
  createMissionRecord,
  type MissionOutcome,
} from '../domain/mission';
import type { MissionDefinition, MissionInstance } from '../domain/models';
import { resolveCampaignPosition } from '../program/campaign-position';
import { getActivityChoices } from '../program/chapter-orders';
import { CampaignState } from './campaign-state';
import { MissionHistory } from './mission-history';
import { TrialHistory, loadCampaignTrials } from './trial-history';

export type RecordedMission =
  | { recorded: true; outcome: MissionOutcome; record: MissionInstance }
  | { recorded: false; reason: 'readiness' | 'none' | 'already' };

export interface MissionMatch {
  /** The planned mission's id, when the caller already knows it. */
  definitionId?: string;
  /** A Forge session finds today's mission through the workout it teaches. */
  workoutId?: string;
  /** A walk finds today's conditioning mission. */
  missionType?: MissionDefinition['missionType'];
  /** A restoration session stands in for a different planned order. */
  restoration?: boolean;
}

/**
 * Records today's mission from the work itself, so a logged walk or a Forge session is one
 * step. Only today can be recorded; an earlier recorded attempt is never changed or doubled.
 */
@Injectable({ providedIn: 'root' })
export class MissionRecorder {
  private readonly state = inject(CampaignState);
  private readonly history = inject(MissionHistory);
  private readonly trialHistory = inject(TrialHistory);

  /** The mission today's work belongs to, or null on a day with no such mission. */
  async findToday(match: MissionMatch): Promise<MissionDefinition | null> {
    await this.state.initialize();
    const campaign = this.state.campaign();
    if (!campaign) return null;
    const trials = await loadCampaignTrials(this.trialHistory);
    const chapter = resolveCampaignPosition(
      campaign.startDate,
      this.state.today(),
      trials,
    )?.chapter;
    if (!chapter) return null;
    const choices = getActivityChoices(chapter);
    return (
      choices.find((choice) => choice.id === match.definitionId) ??
      choices.find(
        (choice) =>
          (match.workoutId && choice.contentReferences.includes(match.workoutId)) ||
          (match.missionType && choice.missionType === match.missionType),
      ) ??
      (match.restoration ? (choices[0] ?? null) : null)
    );
  }

  /** `reduced` asks for a reduced outcome; Yellow readiness always records one. */
  async recordToday(match: MissionMatch, options: { reduced?: boolean; notes?: string } = {}) {
    const definition = await this.findToday(match);
    if (!definition) return { recorded: false, reason: 'none' } as const;

    const date = this.state.today();
    const existing = await this.history.forDate(date);
    if (existing.some((item) => item.definitionId === definition.id && item.status !== 'rest')) {
      return { recorded: false, reason: 'already' } as const;
    }

    const readiness = this.state.readiness();
    const check = readiness?.date === date ? readiness : null;
    if (!check) return { recorded: false, reason: 'readiness' } as const;

    const allowed = allowedMissionOutcomes(definition, check, date);
    const standsIn = match.restoration && definition.missionType !== 'restoration';
    const wanted: MissionOutcome = standsIn
      ? 'restoration'
      : options.reduced || check.status === 'yellow'
        ? 'reduced'
        : 'full';
    const outcome = allowed.includes(wanted)
      ? wanted
      : allowed.includes('reduced')
        ? 'reduced'
        : null;
    if (!outcome) return { recorded: false, reason: 'none' } as const;

    const record = createMissionRecord({
      id: `mission-${date}-${crypto.randomUUID()}`,
      definition,
      date,
      outcome,
      recordedAt: new Date().toISOString(),
      readiness: check,
      notes: options.notes,
    });
    await this.history.add(record);
    return { recorded: true, outcome, record } as const;
  }
}
