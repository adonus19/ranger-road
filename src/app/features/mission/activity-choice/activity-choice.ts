import { Component, input, output } from '@angular/core';
import { missionNeedsReadiness } from '../../../core/domain/mission';
import type { MissionDefinition } from '../../../core/domain/models';
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
  readonly selected = output<string>();

  protected detail(choice: MissionDefinition): string {
    if (!missionNeedsReadiness(choice)) {
      return 'No training readiness check needed';
    }
    return choice.missionType === 'restoration'
      ? 'Readiness check required before movement'
      : 'Readiness check required before training';
  }

  protected icon(choice: MissionDefinition): IconName {
    if (choice.missionType === 'fieldcraft') return 'anvil';
    return choice.missionType === 'restoration' ? 'renew' : 'footprints';
  }
}
