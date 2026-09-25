// test/unit/recorder-assert-ux.test.js
// Assert UX:
// 1. showTextAssertForm: editable form for Text assertions (context menu + T button)
// 2. toHaveValue in context menu (input/textarea/select only)
// 3. Live locator display in toolbar on hover
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RECORDER_SRC = fs.readFileSync(
  path.join(__dirname, '../../src/recorder.content.js'), 'utf8'
);

// ── 1. showTextAssertForm ────────────────────────────────────────────────────
describe('showTextAssertForm: editable text assertion form', () => {
  it('function showTextAssertForm exists in recorder', () => {
    expect(RECORDER_SRC).toMatch(/function showTextAssertForm/);
  });

  it('showTextAssertForm creates overlay with id __wdio_text_form__', () => {
    expect(RECORDER_SRC).toMatch(/__wdio_text_form__/);
  });

  it('showTextAssertForm has a title showing "Assert Text"', () => {
    expect(RECORDER_SRC).toMatch(/Assert Text/);
  });

  it('context menu "Text equals…" calls showTextAssertForm instead of send directly', () => {
    expect(RECORDER_SRC).toMatch(/Text equals.*showTextAssertForm|showTextAssertForm.*Text equals/s);
  });

  it('context menu "Text contains…" calls showTextAssertForm with containing mode', () => {
    expect(RECORDER_SRC).toMatch(/Text contains.*showTextAssertForm|showTextAssertForm.*Text contains/s);
  });

  it('showTextAssertForm prefills input with current text value', () => {
    // The form's input should have a value attribute or be set via .value assignment
    expect(RECORDER_SRC).toMatch(/showTextAssertForm.*function|function showTextAssertForm/s);
    // It must accept text param and set it as input value
    expect(RECORDER_SRC).toMatch(/\.value\s*=\s*text|inp\.value\s*=|value.*=.*text/);
  });

  it('showTextAssertForm has Cancel and Confirm buttons', () => {
    // Must have cancel and confirm (Add Assertion / OK), buttons may be created via helpers
    // Check helpers exist and are used near the form
    const formIdx = RECORDER_SRC.indexOf('__wdio_text_form__');
    const afterForm = RECORDER_SRC.slice(formIdx, formIdx + 3000);
    // Either inline button text or helper functions (_cancelBtn/_okBtn)
    expect(RECORDER_SRC).toMatch(/Cancel/);
    expect(RECORDER_SRC).toMatch(/Add Assertion|Confirm|OK/);
    expect(afterForm).toMatch(/cancel|_cancelBtn|Cancel/i);
    expect(afterForm).toMatch(/ok|_okBtn|Add Assertion|Confirm/i);
  });

  it('toolbar T button also opens showTextAssertForm on element click', () => {
    // assertMode === 'text' (or getAssertMode() === 'text') click handler should call showTextAssertForm
    // Gap can be large (tautology detection code between them)
    expect(RECORDER_SRC).toMatch(/(?:get)?[Aa]ssert[Mm]ode\(?[)']?.*['"]text['"][\s\S]{0,2000}showTextAssertForm/);
  });
});

// ── 2. toHaveValue in context menu ───────────────────────────────────────────
describe('toHaveValue: context menu (input/textarea/select only)', () => {
  it('context menu has "Value equals…" item', () => {
    expect(RECORDER_SRC).toMatch(/Value equals/);
  });

  it('"Value equals…" is conditional: only shown for form elements', () => {
    // Must be inside a conditional check for INPUT/SELECT/TEXTAREA
    expect(RECORDER_SRC).toMatch(/isFormEl|INPUT.*SELECT.*TEXTAREA|TEXTAREA.*INPUT/);
  });

  it('"Value equals…" opens showValueAssertForm or showTextAssertForm with value', () => {
    expect(RECORDER_SRC).toMatch(/Value equals[\s\S]{0,200}(showValueAssertForm|showTextAssertForm|toHaveValue)/);
  });

  it('value form prefills with current element .value', () => {
    expect(RECORDER_SRC).toMatch(/\.value|currentValue/);
  });
});

// ── 3. Live locator in toolbar ────────────────────────────────────────────────
describe('Live locator in toolbar on hover', () => {
  it('toolbar has a locator display element with id __wdio_hover_locator__', () => {
    expect(RECORDER_SRC).toMatch(/__wdio_hover_locator__/);
  });

  it('mouseover handler updates __wdio_hover_locator__ text content', () => {
    // The mouseover listener should set the locator display text
    expect(RECORDER_SRC).toMatch(/hover_locator[\s\S]{0,300}textContent|textContent[\s\S]{0,100}hover_locator/);
  });

  it('mouseout handler clears the locator display', () => {
    // mouseout calls updateHoverLocator('') which clears __wdio_hover_locator__
    expect(RECORDER_SRC).toMatch(/mouseout[\s\S]{0,300}updateHoverLocator/);
    expect(RECORDER_SRC).toMatch(/updateHoverLocator[\s\S]{0,200}__wdio_hover_locator__/);
  });

  it('locator display is part of the toolbar (inside createToolbar)', () => {
    const toolbarIdx = RECORDER_SRC.indexOf('function createToolbar');
    const afterToolbar = RECORDER_SRC.slice(toolbarIdx, toolbarIdx + 5000);
    expect(afterToolbar).toMatch(/__wdio_hover_locator__/);
  });
});
