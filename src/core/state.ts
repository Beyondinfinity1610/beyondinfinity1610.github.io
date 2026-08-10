import type { Tier } from './tier';

// The plain mutable object pieces read (spec §7.2). Deliberately not a
// store/observable — pieces poll it inside their own frame(dt), which is
// already running every tick.
export interface SiteState {
  tier: Tier;
  reduced: boolean;
  ready: boolean;
}

export const state: SiteState = {
  tier: 'high',
  reduced: false,
  ready: false,
};
