import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'keep' },
  {
    path: 'keep',
    loadComponent: () => import('./features/keep/keep-page/keep-page').then((m) => m.KeepPage),
    title: 'Keep | The Ranger’s Road',
    data: { headerOverScene: true },
  },
  {
    path: 'keep/mission',
    loadComponent: () =>
      import('./features/mission/mission-page/mission-page').then((m) => m.MissionPage),
    title: 'Today’s Mission | The Ranger’s Road',
  },
  {
    path: 'road',
    loadComponent: () => import('./features/road/road-page/road-page').then((m) => m.RoadPage),
    title: 'Road | The Ranger’s Road',
    data: { headerOverScene: true },
  },
  {
    path: 'road/gate-trial/active',
    loadComponent: () =>
      import('./features/road/gate-trial-active-page/gate-trial-active-page').then(
        (m) => m.GateTrialActivePage,
      ),
    title: 'Record the Gate Trial | The Ranger’s Road',
    data: { headerOverScene: true },
  },
  {
    path: 'road/gate-trial/recovery/:resultId',
    loadComponent: () =>
      import('./features/road/gate-trial-recovery-page/gate-trial-recovery-page').then(
        (m) => m.GateTrialRecoveryPage,
      ),
    title: 'Recovery Check | The Ranger’s Road',
    data: { headerOverScene: true },
  },
  {
    path: 'road/gate-trial',
    loadComponent: () =>
      import('./features/road/gate-trial-page/gate-trial-page').then((m) => m.GateTrialPage),
    title: 'The Gate Trial | The Ranger’s Road',
    data: { headerOverScene: true },
  },
  {
    path: 'road/log',
    loadComponent: () =>
      import('./features/road/road-log-page/road-log-page').then((m) => m.RoadLogPage),
    title: 'Log a Walk | The Ranger’s Road',
  },
  {
    path: 'forge',
    loadComponent: () => import('./features/forge/forge-page/forge-page').then((m) => m.ForgePage),
    title: 'Forge | The Ranger’s Road',
  },
  {
    path: 'forge/session/:workoutId',
    loadComponent: () =>
      import('./features/forge/forge-session-page/forge-session-page').then(
        (m) => m.ForgeSessionPage,
      ),
    title: 'Training Session | The Ranger’s Road',
  },
  {
    path: 'journal',
    loadComponent: () =>
      import('./features/journal/journal-page/journal-page').then((m) => m.JournalPage),
    title: 'Journal | The Ranger’s Road',
  },
  {
    path: 'journal/check-in',
    loadComponent: () =>
      import('./features/journal/check-in-page/check-in-page').then((m) => m.CheckInPage),
    title: 'Check-in | The Ranger’s Road',
  },
  {
    path: 'journal/body',
    loadComponent: () =>
      import('./features/journal/body-log-page/body-log-page').then((m) => m.BodyLogPage),
    title: 'Weight and Waist | The Ranger’s Road',
  },
  {
    path: 'journal/:watch',
    loadComponent: () =>
      import('./features/journal/watch-page/watch-page').then((m) => m.WatchPage),
    title: 'Daily Watch | The Ranger’s Road',
  },
  {
    path: 'field-manual',
    loadComponent: () =>
      import('./features/field-manual/field-manual-page/field-manual-page').then(
        (m) => m.FieldManualPage,
      ),
    title: 'Field Manual | The Ranger’s Road',
  },
  {
    path: 'readiness',
    loadComponent: () =>
      import('./features/readiness/readiness-page/readiness-page').then((m) => m.ReadinessPage),
    title: 'Readiness | The Ranger’s Road',
  },
  { path: '**', redirectTo: 'keep' },
];
