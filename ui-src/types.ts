export type Mode =
  | 'recording'
  | 'standby'
  | 'assertText'
  | 'assertVisibility'
  | 'assertValue'
  | 'pick';

export interface LineEntry {
  text: string;
  warn: boolean;
  isAssert: boolean;
  label?: string;   // human-readable description for Semantic Log tab
}

export type WsMessage =
  | { type: 'init'; lines: LineEntry[]; browserName: string }
  | { type: 'line'; entry: LineEntry }
  | { type: 'clear' }
  | { type: 'pick'; locator: string }
  | { type: 'mode'; mode: Mode }   // browser toolbar → code window state sync
  | { type: 'shutdown' };
