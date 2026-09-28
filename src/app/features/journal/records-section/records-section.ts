import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { IsoTimestamp, LocalDate } from '../../../core/domain/models';
import {
  NOT_A_RECORDS_COPY,
  RECORDS_BACKUP_MAX_BYTES,
  parseRecordsBackup,
  recordsMissingFrom,
  summarizeRecords,
  type RecordsBackup,
  type RecordsSummary,
} from '../../../core/persistence/records-backup';
import { localDateToday } from '../../../core/state/campaign-state';
import { LocalRecords, recordsBackupFileName } from '../../../core/state/local-records';
import { formatClockTime, formatShortDate } from '../../../shared/format-date';
import { Icon } from '../../../shared/icon/icon';

/** Per-device note of the last copy made here; the copy itself is the person's file. */
const SAVED_AT_KEY = 'rangers-road.copy-saved-at';

interface RestoreCandidate {
  backup: RecordsBackup;
  copy: RecordsSummary;
  device: RecordsSummary;
  /** Rows on this device that the copy lacks. */
  missing: number;
}

interface ReadyCopy {
  file: File;
  savedAt: IsoTimestamp;
}

/** Journal's last section: save a copy of every record, or restore one after confirming. */
@Component({
  selector: 'app-records-section',
  imports: [Icon],
  templateUrl: './records-section.html',
  styleUrl: './records-section.css',
})
export class RecordsSection {
  private readonly records = inject(LocalRecords);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  /** Journal rereads its lists after a restore. */
  readonly restored = output<void>();

  /** Phones get the share sheet (Files, iCloud, email); other devices download the file. */
  protected readonly shares = canShareCopies();
  protected readonly savedAt = signal<IsoTimestamp | null>(readSavedAt());
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  /** A prepared copy that needs one more tap, when the share sheet asked for a fresh one. */
  protected readonly readyCopy = signal<ReadyCopy | null>(null);
  protected readonly announcement = signal('');

  protected readonly reading = signal(false);
  protected readonly candidate = signal<RestoreCandidate | null>(null);
  protected readonly restoring = signal(false);
  protected readonly restoreError = signal<string | null>(null);
  protected readonly restoredNote = signal<string | null>(null);

  protected readonly savedLine = computed(() => {
    const savedAt = this.savedAt();
    return savedAt ? `Last saved ${describeInstant(savedAt)}` : 'Not saved from this device yet';
  });

  protected readonly describe = describeInstant;

  protected day(date: LocalDate | undefined): string {
    return date ? formatShortDate(date) : 'Not set';
  }

  protected latest(date: LocalDate | undefined): string {
    return date ? formatShortDate(date) : 'None';
  }

  protected impact(candidate: RestoreCandidate): string {
    const { device, missing } = candidate;
    if (missing === 1) {
      return '1 record on this device isn’t in the copy. Replacing removes it for good. To keep it, save a copy of this device first.';
    }
    if (missing > 1) {
      return `${missing} records on this device aren’t in the copy. Replacing removes them for good. To keep them, save a copy of this device first.`;
    }
    if (!device.count && !device.startDate) return 'This device has no records yet.';
    return 'Every record on this device is also in the copy.';
  }

  protected async saveCopy(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.readyCopy.set(null);
    this.announcement.set('');
    try {
      const ready = await this.prepareCopy();
      if (ready) await this.deliver(ready);
    } finally {
      this.saving.set(false);
    }
  }

  /** The second tap, which the share sheet accepts because it comes straight from the person. */
  protected async shareReady(): Promise<void> {
    const ready = this.readyCopy();
    if (!ready) return;
    this.readyCopy.set(null);
    await this.deliver(ready);
  }

  protected chooseCopy(): void {
    this.restoreError.set(null);
    this.restoredNote.set(null);
    this.fileInput().nativeElement.click();
  }

  protected async readCopy(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Clearing lets the same file be chosen again after a cancel.
    input.value = '';
    if (!file) return;
    this.candidate.set(null);
    this.restoreError.set(null);
    this.reading.set(true);
    try {
      let backup: RecordsBackup;
      try {
        if (file.size > RECORDS_BACKUP_MAX_BYTES) throw new Error(NOT_A_RECORDS_COPY);
        backup = parseRecordsBackup(await file.text());
      } catch (error) {
        this.restoreError.set(error instanceof Error ? error.message : NOT_A_RECORDS_COPY);
        return;
      }
      const current = await this.records.read();
      this.candidate.set({
        backup,
        copy: summarizeRecords(backup.stores),
        device: summarizeRecords(current),
        missing: recordsMissingFrom(current, backup.stores),
      });
      this.focus('#records-confirm-title');
    } catch {
      this.restoreError.set(
        'This device’s records couldn’t be read, so nothing changed. Try again.',
      );
    } finally {
      this.reading.set(false);
    }
  }

  protected cancelRestore(): void {
    this.candidate.set(null);
    this.focus('#records-restore');
  }

  protected async restore(): Promise<void> {
    const candidate = this.candidate();
    if (!candidate || this.restoring()) return;
    this.restoring.set(true);
    this.restoreError.set(null);
    try {
      await this.records.restore(candidate.backup);
      this.candidate.set(null);
      this.restoredNote.set(
        `Restored the copy saved ${describeInstant(candidate.backup.savedAt)}.`,
      );
      this.restored.emit();
      this.focus('#records-restored');
    } catch {
      this.restoreError.set('The copy couldn’t be restored, so nothing changed. Try again.');
    } finally {
      this.restoring.set(false);
    }
  }

  private async prepareCopy(): Promise<ReadyCopy | null> {
    try {
      const backup = await this.records.backup();
      const file = new File([JSON.stringify(backup)], recordsBackupFileName(backup.savedAt), {
        type: 'application/json',
      });
      return { file, savedAt: backup.savedAt };
    } catch {
      this.saveError.set('Your records couldn’t be read, so no copy was made. Try again.');
      return null;
    }
  }

  private async deliver(ready: ReadyCopy): Promise<void> {
    if (this.shares) {
      try {
        await navigator.share({ files: [ready.file], title: 'The Ranger’s Road records' });
        this.markSaved(ready.savedAt, 'Copy saved.');
        return;
      } catch (error) {
        // Read the name directly: a DOMException is not an Error in every engine.
        const name = (error as { name?: unknown } | null)?.name;
        // Closing the share sheet saves nothing, so the last-saved line stays as it was.
        if (name === 'AbortError') return;
        if (name === 'NotAllowedError') {
          this.readyCopy.set(ready);
          this.focus('#records-share-ready');
          return;
        }
        // Any other refusal falls back to a download below.
      }
    }
    try {
      downloadCopy(ready.file);
      this.markSaved(ready.savedAt, `Copy downloaded as ${ready.file.name}.`);
    } catch {
      this.saveError.set('The copy couldn’t be saved. Try again.');
    }
  }

  private markSaved(savedAt: IsoTimestamp, announcement: string): void {
    this.savedAt.set(savedAt);
    this.announcement.set(announcement);
    try {
      localStorage.setItem(SAVED_AT_KEY, savedAt);
    } catch {
      // Storage can be refused in a private window; the copy was still made.
    }
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}

/** "Mon, Oct 12 at 7:02 PM", on this device's calendar and clock, with PM kept on the time's line. */
function describeInstant(instant: IsoTimestamp): string {
  const time = formatClockTime(instant).replace(/\s(?=[AP]M)/, ' ');
  return `${formatShortDate(localDateToday(new Date(instant)))} at ${time}`;
}

function readSavedAt(): IsoTimestamp | null {
  try {
    const value = localStorage.getItem(SAVED_AT_KEY);
    return value && Number.isFinite(Date.parse(value)) ? value : null;
  } catch {
    return null;
  }
}

/** Touch devices that can share a JSON file get the share sheet; the rest download it. */
function canShareCopies(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false;
  if (typeof matchMedia !== 'function' || !matchMedia('(pointer: coarse)').matches) return false;
  try {
    const probe = new File(['{}'], 'rangers-road-records.json', { type: 'application/json' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

function downloadCopy(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Safari reads the file after the click returns, so the address stays valid for a minute.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
