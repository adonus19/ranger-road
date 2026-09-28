import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  NOT_A_RECORDS_COPY,
  createRecordsBackup,
  parseRecordsBackup,
  type RecordsBackup,
} from '../../../core/persistence/records-backup';
import { STORE_NAMES, type StoreRecords } from '../../../core/persistence/road-database';
import { LocalRecords } from '../../../core/state/local-records';
import { RecordsSection } from './records-section';

function stores(overrides: Partial<StoreRecords> = {}): StoreRecords {
  const empty = Object.fromEntries(STORE_NAMES.map((name) => [name, []])) as unknown as StoreRecords;
  return {
    ...empty,
    campaigns: [{ id: 'primary', startDate: '2026-10-05' }],
    readinessChecks: [{ id: 'readiness-1', date: '2026-10-05', checkedAt: '2026-10-05T11:00:00.000Z' }],
    ...overrides,
  };
}

const savedAt = new Date(2026, 9, 12, 19, 2).toISOString();

async function settle(fixture: ComponentFixture<unknown>): Promise<HTMLElement> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function render(records: Partial<LocalRecords>): ComponentFixture<RecordsSection> {
  TestBed.configureTestingModule({
    imports: [RecordsSection],
    providers: [{ provide: LocalRecords, useValue: records }],
  });
  return TestBed.createComponent(RecordsSection);
}

function chooseFile(root: HTMLElement, contents: string): void {
  const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
  const file = new File([contents], 'rangers-road-records-2026-10-12.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
}

function button(root: HTMLElement, text: string): HTMLButtonElement {
  const match = Array.from(root.querySelectorAll('button')).find((item) => item.textContent?.includes(text));
  if (!match) throw new Error(`No button labeled ${text}`);
  return match;
}

describe('RecordsSection', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete (navigator as Partial<Navigator>).canShare;
    delete (navigator as Partial<Navigator>).share;
    delete (URL as Partial<typeof URL>).createObjectURL;
    delete (URL as Partial<typeof URL>).revokeObjectURL;
    localStorage.clear();
  });

  it('downloads a dated copy where there is no share sheet, and remembers when', async () => {
    const backup = createRecordsBackup(stores(), savedAt);
    const files: File[] = [];
    const links: { download: string; href: string }[] = [];
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: (file: File) => {
        files.push(file);
        return 'blob:records-copy';
      },
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      links.push({ download: this.download, href: this.href });
    });
    const fixture = render({ backup: async () => backup });
    let root = await settle(fixture);
    expect(root.textContent).toContain('Download a file to keep somewhere safe.');
    expect(root.textContent).toContain('Not saved from this device yet');

    root.querySelector<HTMLButtonElement>('#records-save')!.click();
    root = await settle(fixture);

    expect(links).toEqual([{ download: 'rangers-road-records-2026-10-12.json', href: 'blob:records-copy' }]);
    expect(files[0].type).toBe('application/json');
    expect(parseRecordsBackup(await files[0].text())).toEqual(backup);
    expect(root.textContent).toContain('Last saved Mon, Oct 12 at 7:02\u00a0PM');
    expect(root.querySelector('[role="status"]')?.textContent).toContain(
      'Copy downloaded as rangers-road-records-2026-10-12.json.',
    );
    expect(localStorage.getItem('rangers-road.copy-saved-at')).toBe(savedAt);
  });

  it('opens the share sheet on a phone, and a closed sheet leaves the last-saved line alone', async () => {
    const backup = createRecordsBackup(stores(), savedAt);
    const share = vi
      .fn<(data: ShareData) => Promise<void>>()
      .mockRejectedValueOnce(new DOMException('Share canceled', 'AbortError'))
      .mockRejectedValueOnce(new DOMException('Needs a tap', 'NotAllowedError'))
      .mockResolvedValueOnce(undefined);
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    const fixture = render({ backup: async () => backup });
    let root = await settle(fixture);
    expect(root.textContent).toContain('Keep it in Files, iCloud or email.');

    root.querySelector<HTMLButtonElement>('#records-save')!.click();
    root = await settle(fixture);
    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0].files?.[0].name).toBe('rangers-road-records-2026-10-12.json');
    expect(root.textContent).toContain('Not saved from this device yet');
    expect(root.querySelector('[role="alert"]')).toBeNull();

    root.querySelector<HTMLButtonElement>('#records-save')!.click();
    root = await settle(fixture);
    expect(root.textContent).toContain('Your copy is ready.');

    button(root, 'Share the copy').click();
    root = await settle(fixture);
    expect(share).toHaveBeenCalledTimes(3);
    expect(share.mock.calls[2][0].files?.[0]).toBe(share.mock.calls[1][0].files?.[0]);
    expect(root.textContent).not.toContain('Your copy is ready.');
    expect(root.textContent).toContain('Last saved Mon, Oct 12 at 7:02\u00a0PM');
  });

  it('shows what a copy holds and replaces records only after the person confirms', async () => {
    const copy = createRecordsBackup(stores(), savedAt);
    const device = stores({
      readinessChecks: [
        { id: 'readiness-1', date: '2026-10-05' },
        { id: 'readiness-only-here', date: '2026-10-14' },
      ],
    });
    const restore = vi.fn(async (_backup: RecordsBackup) => undefined);
    const fixture = render({ read: async () => device, restore });
    let restoredCount = 0;
    fixture.componentInstance.restored.subscribe(() => (restoredCount += 1));
    let root = await settle(fixture);

    chooseFile(root, JSON.stringify(copy));
    root = await settle(fixture);

    const panel = root.querySelector('.records-confirm')!;
    expect(panel.textContent).toContain('Replace this device’s records?');
    expect(panel.textContent).toContain('This copy was saved Mon, Oct 12 at 7:02\u00a0PM.');
    const rows = Array.from(panel.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.children).map((cell) => cell.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['Day 1', 'Mon, Oct 5', 'Mon, Oct 5'],
      ['Latest entry', 'Mon, Oct 5', 'Wed, Oct 14'],
      ['Records', '1', '2'],
    ]);
    expect(panel.textContent).toContain('1 record on this device isn’t in the copy.');
    expect(restore).not.toHaveBeenCalled();

    button(root, 'Replace records').click();
    root = await settle(fixture);

    expect(restore).toHaveBeenCalledWith(copy);
    expect(restoredCount).toBe(1);
    expect(root.querySelector('.records-confirm')).toBeNull();
    expect(root.querySelector('#records-restored')?.textContent).toContain(
      'Restored the copy saved Mon, Oct 12 at 7:02\u00a0PM.',
    );
  });

  it('cancels without changing anything', async () => {
    const restore = vi.fn(async () => undefined);
    const fixture = render({ read: async () => stores(), restore });
    let root = await settle(fixture);

    chooseFile(root, JSON.stringify(createRecordsBackup(stores(), savedAt)));
    root = await settle(fixture);
    expect(root.textContent).toContain('Every record on this device is also in the copy.');
    button(root, 'Cancel').click();
    root = await settle(fixture);

    expect(root.querySelector('.records-confirm')).toBeNull();
    expect(restore).not.toHaveBeenCalled();
  });

  it('refuses a file that is not a copy of these records', async () => {
    const restore = vi.fn(async () => undefined);
    const read = vi.fn(async () => stores());
    const fixture = render({ read, restore });
    let root = await settle(fixture);

    chooseFile(root, 'grocery list');
    root = await settle(fixture);

    expect(root.querySelector('[role="alert"]')?.textContent).toContain(NOT_A_RECORDS_COPY);
    expect(root.querySelector('.records-confirm')).toBeNull();
    expect(read).not.toHaveBeenCalled();
    expect(restore).not.toHaveBeenCalled();
  });
});
