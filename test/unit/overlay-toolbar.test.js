// test/unit/overlay-toolbar.test.js
// Page overlay toolbar:
// 1. Toolbar position: top-center (not bottom)
// 2. Drag-and-drop to reposition

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RECORDER_SRC = fs.readFileSync(
  path.join(__dirname, '../../src/recorder.content.js'), 'utf8'
);

// ── 1. Position: top-center ───────────────────────────────────────────────────
describe('toolbar: position: top-center', () => {
  it('toolbar is positioned at top, not bottom', () => {
    // Should use top:12px, not bottom:12px
    expect(RECORDER_SRC).toMatch(/top:\s*12px/);
  });

  it('toolbar does NOT use bottom positioning', () => {
    // old bottom:12px must be gone from toolbar style
    // (bottom may appear elsewhere for other UI elements, so check toolbar block)
    const toolbarBlockMatch = RECORDER_SRC.match(
      /toolbar\.style\.cssText\s*=\s*\[([\s\S]*?)\]\.join/
    );
    expect(toolbarBlockMatch).not.toBeNull();
    const toolbarStyles = toolbarBlockMatch[1];
    expect(toolbarStyles).not.toMatch(/["']bottom:\d/);
  });

  it('toolbar keeps left:50% + transform:translateX(-50%) for centering', () => {
    expect(RECORDER_SRC).toMatch(/left:\s*50%/);
    expect(RECORDER_SRC).toMatch(/translateX\(-50%\)/);
  });
});

// ── 2. Drag-and-drop ──────────────────────────────────────────────────────────
describe('toolbar: drag-and-drop', () => {
  it('toolbar has mousedown handler for drag initiation', () => {
    expect(RECORDER_SRC).toMatch(/mousedown/);
  });

  it('toolbar has mousemove handler on document for dragging', () => {
    // document.addEventListener('mousemove', ...) for drag tracking
    expect(RECORDER_SRC).toMatch(/mousemove/);
  });

  it('toolbar has mouseup handler to end drag', () => {
    expect(RECORDER_SRC).toMatch(/mouseup/);
  });

  it('drag sets toolbar position to fixed with left/top from mouse coords', () => {
    // During drag we set toolbar.style.left and toolbar.style.top
    expect(RECORDER_SRC).toMatch(/toolbar\.style\.left\s*=/);
    expect(RECORDER_SRC).toMatch(/toolbar\.style\.top\s*=/);
  });

  it('drag removes transform after first drag (switches from translateX to explicit left)', () => {
    // Once dragged, transform:translateX(-50%) must be cleared so left/top work correctly
    expect(RECORDER_SRC).toMatch(/style\.transform\s*=\s*["']["']/);
  });

  it('cursor changes to grab/grabbing during drag', () => {
    expect(RECORDER_SRC).toMatch(/grabbing|grab/);
  });
});
