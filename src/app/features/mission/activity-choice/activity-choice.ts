import { Component, input, output } from '@angular/core';
import { missionNeedsReadiness } from '../../../core/domain/mission';
import type { MissionDefinition, ReadinessStatus } from '../../../core/domain/models';
import { Icon, type IconName } from '../../../shared/icon/icon';

@Component({
  imports: [Icon],
  selector: 'app-activity-choice',
  styleUrl: './activity-choice.css',
  templateUrl: './activity-choice.html',
})
export class ActivityChoice {
  readonly choices = input.required<readonly MissionDefinition[]>();
  readonly selectedId = input.required<string | null>();
  readonly recordedIds = input<readonly string[]>([]);
  /** Today's readiness, so a path that needs a check says so only until one is saved. */
  readonly readiness = input<ReadinessStatus | null>(null);
  readonly selected = output<string>();

  protected detail(choice: MissionDefinition): string {
    if (!missionNeedsReadiness(choice)) {
      return 'No readiness check needed';
    }
    const status = this.readiness();
    if (!status) return 'Check readiness first';
    if (choice.missionType === 'restoration') return 'Gentle mobility and a 1-minute easy walk';
    if (status === 'red') return 'Not on a Red day; restoration or rest instead';
    return choice.missionType === 'conditioning'
      ? 'Log the walk details after'
      : 'Readiness checked';
  }

  protected icon(choice: MissionDefinition): IconName {
    if (choice.missionType === 'fieldcraft' || choice.missionType === 'strength') return 'anvil';
    return choice.missionType === 'restoration' ? 'renew' : 'footprints';
  }
}
