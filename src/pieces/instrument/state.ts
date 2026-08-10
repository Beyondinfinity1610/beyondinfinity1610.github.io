// Shared mutable state for the instrument (spec §2) — one small object
// every sub-module reads/writes, mirroring core/state.ts's own pattern.

import type { RocTable } from '../../signal/roc';

export const WINDOW_OPTIONS = [15, 60, 300] as const;
export type WindowSeconds = (typeof WINDOW_OPTIONS)[number];

export interface InstrumentState {
  table: RocTable;
  thresholdZ: number;
  windowSeconds: WindowSeconds;
  /** Playhead position, seconds since midnight — the centre of the visible window. */
  dayPositionS: number;
  autopilot: boolean;
  revealed: boolean;
  /** Alarms encountered so far this session, for the day-bar's tick marks. */
  seenAlarmTimes: number[];
  hasInteracted: boolean;
}

export function createInitialState(table: RocTable): InstrumentState {
  const zMin = table.points[0].threshold;
  const zMax = table.points[table.points.length - 1].threshold;
  return {
    table,
    thresholdZ: zMin + (zMax - zMin) * 0.5,
    windowSeconds: 60,
    dayPositionS: table.seizures[0]?.start ?? 3600 * 2,
    autopilot: false,
    revealed: false,
    seenAlarmTimes: [],
    hasInteracted: false,
  };
}
