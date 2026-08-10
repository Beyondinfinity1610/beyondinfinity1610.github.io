// ONLY JS-injected micro-copy lives here — spec §7.1: "anything longer than
// a phrase goes in HTML." Everything below is a role label, a transport
// state, or a short caption, never long-form prose.

// Movement 04's plate roles — spec §3.2. Deliberately NOT "gating stage" —
// too close to a component name. This vocabulary needs the author's
// explicit sign-off (spec §10 item 1 / Phase 12); a grep cannot judge it.
export const PLATE_ROLES = [
  'input',
  'per-modality front end',
  'alignment',
  'combination',
  'temporal context',
  'decision',
  'post-processing',
  'public dataset',
] as const;
export type PlateRole = (typeof PLATE_ROLES)[number];

// The one legible plate — public SeizeIT2 dataset properties, explicitly
// green-listed (spec §3.2, disclosure/allow.txt).
export const LEGIBLE_PLATE_TEXT = 'SeizeIT2 · behind-the-ear · 125 patients · 2,912 h';
export const LEGIBLE_PLATE_ROLE: PlateRole = 'public dataset';

export const TOPOLOGY_DEFAULT_CAPTION = '— hover a plate —';

// The topology caption HUD's static labels — spec §10 item: "withheld
// pending peer review" is the disclosure stamp for this whole movement, so
// it belongs here next to the other disclosure-adjacent copy, not inlined
// in piece.ts's template string.
export const TOPOLOGY_CAPTION_DOCUMENT_LABEL = 'document';
export const TOPOLOGY_CAPTION_DOCUMENT_VALUE = 'system topology · rev 7';
export const TOPOLOGY_CAPTION_CLASSIFICATION_LABEL = 'classification';
export const TOPOLOGY_CAPTION_CLASSIFICATION_VALUE = 'withheld pending peer review';
export const TOPOLOGY_CAPTION_PLATE_LABEL = 'plate';

// Movement 05's reverse-transport HUD — spec §3.3. Short labels/states
// only; the section's prose lives in index.html per §7.1. As the scrub
// runs backward the derived layers peel off in reverse order until only
// the raw trace remains — AUDIT_LAYER_LABELS is that order, top (most
// derived) to bottom, with AUDIT_RAW_LABEL as the substrate beneath all
// of them, never itself removed.
export const AUDIT_STATE_REWIND = 'REWIND';
export const AUDIT_STATE_DERIVE = 'RE-DERIVE';
export const AUDIT_STATE_SETTLED = 'SETTLED';
export const AUDIT_LAYER_LABELS = ['decisions', 'alarms', 'scores'] as const;
export type AuditLayer = (typeof AUDIT_LAYER_LABELS)[number];
export const AUDIT_RAW_LABEL = 'raw';
export const AUDIT_INTENT_LINE = 'stopped — went back to the raw recordings';
export const AUDIT_SETTLED_LABEL = 'quieter — not louder';
export const AUDIT_TRANSPORT_PREFIX = 't';
export const AUDIT_DAYBAR_LABEL = 'day position';

// The audio toggle — spec Phase 10 (docs/SPEC.md §8): "Toggle has a real
// aria-pressed and an accessible name." The name stays constant across
// on/off (ARIA authoring-practice convention for toggle buttons — state
// belongs to aria-pressed, not to a name that changes text mid-session);
// only the on/off caption text changes, cosmetically, via JS.
export const AUDIO_TOGGLE_LABEL = 'sound';
export const AUDIO_TOGGLE_ON_LABEL = 'on';
export const AUDIO_TOGGLE_OFF_LABEL = 'off';
