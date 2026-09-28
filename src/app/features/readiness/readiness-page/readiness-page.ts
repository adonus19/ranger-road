import { Component, OnInit, inject, signal } from '@angular/core';
import { FormField, form, pattern, required, submit, validate } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import type { ReadinessCheck, ReadinessInput } from '../../../core/domain/models';
import { CampaignState } from '../../../core/state/campaign-state';
import { Icon } from '../../../shared/icon/icon';

@Component({
  imports: [FormField, Icon, RouterLink],
  selector: 'app-readiness-page',
  styleUrl: './readiness-page.css',
  templateUrl: './readiness-page.html',
})
export class ReadinessPage implements OnInit {
  protected readonly state = inject(CampaignState);
  protected readonly energyLevels = ['1', '2', '3', '4', '5'] as const;
  protected readonly painLevels = Array.from({ length: 11 }, (_, level) => String(level));
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saved = signal<ReadinessCheck | null>(null);

  protected readonly formModel = signal({
    sleepHours: '',
    poorSleep: false,
    energy: '',
    backPain: '',
    shoulderPain: '',
    neckPain: '',
    significantSymptomIncrease: false,
    newNeurologicalOrRadiatingSymptoms: false,
    illness: false,
    otherConcerningSymptoms: false,
  });

  protected readonly readinessForm = form(this.formModel, (field) => {
    required(field.sleepHours, { message: 'Enter your sleep hours.' });
    validate(field.sleepHours, ({ value }) => {
      const raw = value();
      const hours = Number(raw);
      return raw !== '' && (!Number.isFinite(hours) || hours < 0 || hours > 24)
        ? { kind: 'range', message: 'Enter a number from 0 to 24.' }
        : undefined;
    });
    required(field.energy, { message: 'Choose your energy level.' });
    pattern(field.energy, /^[1-5]$/);
    for (const pain of [field.backPain, field.shoulderPain, field.neckPain]) {
      required(pain, { message: 'Choose a pain level.' });
      pattern(pain, /^(?:[0-9]|10)$/);
    }
  });

  protected readonly painAreas = [
    { id: 'back', label: 'Back', noun: 'back', field: this.readinessForm.backPain },
    { id: 'shoulder', label: 'Shoulder', noun: 'shoulder', field: this.readinessForm.shoulderPain },
    { id: 'neck', label: 'Neck', noun: 'neck', field: this.readinessForm.neckPain },
  ] as const;

  ngOnInit(): void {
    void this.state.initialize();
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.saveError.set(null);
    this.saved.set(null);
    this.saving.set(true);
    try {
      await submit(this.readinessForm, async () => {
        const values = this.formModel();
        const input: ReadinessInput = {
          date: this.state.today(),
          sleepHours: Number(values.sleepHours),
          poorSleep: values.poorSleep,
          energy: Number(values.energy),
          backPain: Number(values.backPain),
          shoulderPain: Number(values.shoulderPain),
          neckPain: Number(values.neckPain),
          redFlags: {
            significantSymptomIncrease: values.significantSymptomIncrease,
            newNeurologicalOrRadiatingSymptoms: values.newNeurologicalOrRadiatingSymptoms,
            illness: values.illness,
            otherConcerningSymptoms: values.otherConcerningSymptoms,
          },
        };
        this.saved.set(await this.state.recordReadiness(input));
      });
      if (!this.saved()) {
        this.saveError.set('Complete sleep, energy, and all three pain fields to save this check.');
      }
    } catch (error) {
      this.saveError.set(
        error instanceof Error ? error.message : 'Your check could not be saved. Try again.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
