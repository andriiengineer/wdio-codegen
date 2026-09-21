import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFileWriter } from '../../src/file-writer.js';

function tmpPath(ext = '.js') {
  return path.join(os.tmpdir(), `file-writer-test-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
}

// Writes one line through the writer and returns the file contents.
function writeAndRead(out, lines) {
  createFileWriter(out).write(lines);
  const content = fs.readFileSync(out, 'utf8');
  fs.rmSync(out, { force: true });
  return content;
}

const ONE_LINE = [{ text: `    await browser.url('https://app.com');`, isAssert: false, warn: false }];

describe('createFileWriter: output language follows the file extension', () => {
  // README documents `--output ...ts` as the TypeScript path, so the extension
  // is what decides. Previously 'js' was hardcoded and .ts files got plain JS.
  it('writes TypeScript for a .ts path', () => {
    const content = writeAndRead(tmpPath('.ts'), ONE_LINE);
    expect(content).toContain('async (): Promise<void> =>');
  });

  it('writes JavaScript for a .js path', () => {
    const content = writeAndRead(tmpPath('.js'), ONE_LINE);
    expect(content).not.toContain('Promise<void>');
    expect(content).toContain('async () =>');
  });

  it('is case-insensitive about the extension', () => {
    const content = writeAndRead(tmpPath('.TS'), ONE_LINE);
    expect(content).toContain('Promise<void>');
  });

  it('treats .mts and .cts as TypeScript too', () => {
    expect(writeAndRead(tmpPath('.mts'), ONE_LINE)).toContain('Promise<void>');
    expect(writeAndRead(tmpPath('.cts'), ONE_LINE)).toContain('Promise<void>');
  });

  it('does not mistake a .ts inside the name for the extension', () => {
    const content = writeAndRead(tmpPath('.spec.js'), ONE_LINE);
    expect(content).not.toContain('Promise<void>');
  });

  // TS output always imports expect; JS only when assertions are present.
  it('imports expect in TS even without assertions', () => {
    const content = writeAndRead(tmpPath('.ts'), ONE_LINE);
    expect(content).toContain(`{ browser, $, expect }`);
  });
});

describe('createFileWriter: generated file has correct imports', () => {
  it('includes @wdio/globals import', () => {
    const out = tmpPath();
    const writer = createFileWriter(out);
    writer.write([{ text: `    await browser.url('https://app.com');`, isAssert: false, warn: false }]);
    const content = fs.readFileSync(out, 'utf8');
    fs.rmSync(out, { force: true });
    expect(content).toContain(`from '@wdio/globals'`);
  });

  it('includes expect when assertions are present', () => {
    const out = tmpPath();
    const writer = createFileWriter(out);
    writer.write([
      { text: `    await browser.url('https://app.com');`, isAssert: false, warn: false },
      { text: `    await expect($('h1')).toBeDisplayed();`, isAssert: true, warn: false },
    ]);
    const content = fs.readFileSync(out, 'utf8');
    fs.rmSync(out, { force: true });
    expect(content).toContain('expect');
    expect(content).toContain(`from '@wdio/globals'`);
  });

  it('does NOT include expect when no assertions are present', () => {
    const out = tmpPath();
    const writer = createFileWriter(out);
    writer.write([{ text: `    await $('button=Save').click();`, isAssert: false, warn: false }]);
    const content = fs.readFileSync(out, 'utf8');
    fs.rmSync(out, { force: true });
    // expect should NOT be in the globals import when no assertions
    expect(content).not.toContain(`{ browser, $, expect }`);
    expect(content).toContain(`{ browser, $ }`);
  });

  it('includes Key import when keyboard combos are present', () => {
    const out = tmpPath();
    const writer = createFileWriter(out);
    writer.write([{ text: `    await browser.keys([Key.Ctrl, 'a']);`, isAssert: false, warn: false }]);
    const content = fs.readFileSync(out, 'utf8');
    fs.rmSync(out, { force: true });
    expect(content).toContain(`import { Key } from 'webdriverio'`);
  });

  it('does NOT include Key import when no keyboard combos', () => {
    const out = tmpPath();
    const writer = createFileWriter(out);
    writer.write([{ text: `    await browser.keys('Enter');`, isAssert: false, warn: false }]);
    const content = fs.readFileSync(out, 'utf8');
    fs.rmSync(out, { force: true });
    expect(content).not.toContain(`import { Key }`);
  });
});
