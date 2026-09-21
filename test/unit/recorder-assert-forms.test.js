// test/unit/recorder-assert-forms.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AF_PATH = path.join(__dirname, '../../src/recorder-modules/assert-forms.js');
const RECORDER_SRC_PATH = path.join(__dirname, '../../src/recorder.source.js');

describe('src/recorder-modules/assert-forms.js: file structure', () => {
  it('assert-forms.js file exists', () => {
    expect(fs.existsSync(AF_PATH)).toBe(true);
  });

  it('exports showTextAssertForm', () => {
    const src = fs.readFileSync(AF_PATH, 'utf8');
    expect(src).toMatch(/export function showTextAssertForm/);
  });

  it('exports showAttrAssertForm', () => {
    const src = fs.readFileSync(AF_PATH, 'utf8');
    expect(src).toMatch(/export function showAttrAssertForm/);
  });

  it('showTextAssertForm uses id __wdio_text_form__', () => {
    const src = fs.readFileSync(AF_PATH, 'utf8');
    expect(src).toMatch(/__wdio_text_form__/);
  });

  it('showAttrAssertForm uses id __wdio_attr_form__', () => {
    const src = fs.readFileSync(AF_PATH, 'utf8');
    expect(src).toMatch(/__wdio_attr_form__/);
  });
});

describe('src/recorder.source.js: imports from recorder-modules/assert-forms', () => {
  it('imports from recorder-modules/assert-forms.js', () => {
    const src = fs.readFileSync(RECORDER_SRC_PATH, 'utf8');
    expect(src).toMatch(/from ['"]\.\/recorder-modules\/assert-forms\.js['"]/);
  });

  it('no longer defines showTextAssertForm locally', () => {
    const src = fs.readFileSync(RECORDER_SRC_PATH, 'utf8');
    expect(src).not.toMatch(/^  function showTextAssertForm/m);
  });

  it('no longer defines showAttrAssertForm locally', () => {
    const src = fs.readFileSync(RECORDER_SRC_PATH, 'utf8');
    expect(src).not.toMatch(/^  function showAttrAssertForm/m);
  });
});
