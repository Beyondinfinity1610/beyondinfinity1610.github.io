// Live readouts and the range input's aria-valuetext — spec §2.6:
// aria-valuetext="4.5 standard deviations — 31 false alarms per day,
// 2 of 7 events caught". Counters are computed over the FULL 24h from the
// ROC table, never from what has been shown — spec §2.6's explicit rule
// against a number that's a lie by omission.

import { rocAt } from '../../signal/roc';
import type { InstrumentState } from './state';

export function formatValueText(state: InstrumentState): string {
  const point = rocAt(state.table, state.thresholdZ);
  const totalEvents = state.table.seizures.length;
  return `${state.thresholdZ.toFixed(1)} standard deviations — ${point.faPerDay} false alarms per day, ${point.caught} of ${totalEvents} events caught`;
}

export interface ReadoutValues {
  thresholdLabel: string;
  faPerDay: number;
  caught: number;
  totalEvents: number;
  sensitivity: number;
}

export function computeReadouts(state: InstrumentState): ReadoutValues {
  const point = rocAt(state.table, state.thresholdZ);
  return {
    thresholdLabel: `${state.thresholdZ.toFixed(1)}σ`,
    faPerDay: point.faPerDay,
    caught: point.caught,
    totalEvents: state.table.seizures.length,
    sensitivity: point.sensitivity,
  };
}
