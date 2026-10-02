import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  isBackupReminderDue,
  readBackupSnoozedOn,
  readCopySavedAt,
  snoozeBackupReminder,
} from '../../../core/state/backup-reminder';
import { CampaignState } from '../../../core/state/campaign-state';
import { Icon } from '../../../shared/icon/icon';

/** A quiet Sunday row on Keep asking for a saved copy; "Not today" hides it until tomorrow. */
@Component({
  imports: [Icon, RouterLink],
  selector: 'app-backup-reminder',
  styleUrl: './backup-reminder.css',
  templateUrl: './backup-reminder.html',
})
export class BackupReminder {
  private readonly state = inject(CampaignState);
  private readonly savedAt = readCopySavedAt();
  private readonly snoozedOn = signal(readBackupSnoozedOn());

  protected readonly due = computed(() =>
    isBackupReminderDue(this.state.today(), this.savedAt, this.snoozedOn()),
  );

  protected notToday(): void {
    snoozeBackupReminder(this.state.today());
    this.snoozedOn.set(this.state.today());
  }
}
