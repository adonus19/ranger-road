import { Component, computed, input } from '@angular/core';

interface RoutePoint {
  /** Percent of the chart width. */
  x: number;
  /** Percent of the line band height. */
  y: number;
}

const X_START = 3;
const X_END = 97;
const SAMPLES = 120;

/** A fixed, gently winding trail. Only the markers along it carry data. */
function pointAt(t: number): RoutePoint {
  return {
    x: X_START + (X_END - X_START) * t,
    y:
      50 + 24 * Math.sin(2 * Math.PI * 1.1 * t + 0.35) + 10 * Math.sin(2 * Math.PI * 2.8 * t + 2.2),
  };
}

function pathBetween(from: number, to: number): string {
  if (to <= from) {
    return '';
  }
  const steps = Math.max(2, Math.round(SAMPLES * (to - from)));
  const points = Array.from({ length: steps + 1 }, (_, i) =>
    pointAt(from + ((to - from) * i) / steps),
  );
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

/** The chapter drawn as a route: week ticks, today's position, and the trial at the end. */
@Component({
  selector: 'app-route-chart',
  templateUrl: './route-chart.html',
  styleUrl: './route-chart.css',
})
export class RouteChart {
  /** Campaign day, or 0 before Day 1. */
  readonly day = input.required<number>();
  readonly targetDay = input(28);
  readonly leadInDays = input(0);
  readonly weeks = input(4);
  /** The campaign week number the route's first week carries: 5 for Chapter II. */
  readonly firstWeek = input(1);
  readonly targetLabel = input('Gate Trial');
  /** Shown at the start of the route before Day 1, such as the chosen start date. */
  readonly startLabel = input('');

  protected readonly started = computed(() => this.day() >= 1);
  protected readonly reachedTarget = computed(() => this.day() >= this.targetDay());
  protected readonly progress = computed(() =>
    Math.min(1, Math.max(0, (this.day() - 1) / (this.targetDay() - 1))),
  );

  protected readonly traveledPath = computed(() =>
    this.started() ? pathBetween(0, this.progress()) : '',
  );
  protected readonly aheadPath = computed(() =>
    pathBetween(this.started() ? this.progress() : 0, 1),
  );
  protected readonly today = computed(() => pointAt(this.progress()));
  protected readonly target = pointAt(1);
  /** The trail climbs just before the trial, so its label clears the highest point of that last stretch. */
  protected readonly targetLabelY = Math.min(
    ...Array.from({ length: 21 }, (_, i) => pointAt(0.7 + (0.3 * i) / 20).y),
  );

  /** Near the end of the chapter the trial label steps up a line so it never meets today's label. */
  protected readonly targetLabelRaised = computed(
    () => this.started() && !this.reachedTarget() && this.progress() > 0.66,
  );

  /** Once today reaches the trial, one label names both. */
  protected readonly targetText = computed(() =>
    this.reachedTarget() ? `${this.targetLabel()} · Today, Day ${this.day()}` : this.targetLabel(),
  );

  /** Ticks mark where each week begins; each label sits centered on its own stretch of trail. */
  protected readonly ticks = computed(() =>
    Array.from({ length: this.weeks() }, (_, week) => {
      const span = this.targetDay() - 1;
      const t = (this.leadInDays() + week * 7) / span;
      const labelT = Math.min(1, (this.leadInDays() + week * 7 + 3.5) / span);
      return {
        label: `Week ${this.firstWeek() + week}`,
        t,
        labelX: pointAt(labelT).x,
        ...pointAt(t),
      };
    }),
  );

  protected readonly summary = computed(() => {
    const leadIn = this.leadInDays()
      ? `A ${this.leadInDays()}-day lead-in ends before Week ${this.firstWeek()} begins on day ${this.leadInDays() + 1}. `
      : '';
    const trial = `${this.targetLabel()} target on day ${this.targetDay()}`;
    if (!this.started()) {
      return `Chapter route, not started. ${this.startLabel()}. ${leadIn}${trial}.`;
    }
    return `Chapter route. Today is day ${this.day()}. ${leadIn}${trial}.`;
  });
}
