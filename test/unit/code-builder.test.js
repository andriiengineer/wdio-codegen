import { describe, it, expect } from 'vitest';
import { langFromPath } from '../../src/code-builder.js';

describe('langFromPath', () => {
  it('returns ts for TypeScript extensions', () => {
    for (const p of ['a.ts', 'a.TS', 'dir/b.mts', 'dir/b.cts', '/abs/path/spec.ts']) {
      expect(langFromPath(p)).toBe('ts');
    }
  });

  it('returns js for everything else', () => {
    for (const p of ['a.js', 'a.spec.js', 'a.mjs', 'a.tsx', 'noext', 'ts', 'a.ts.js']) {
      expect(langFromPath(p)).toBe('js');
    }
  });

  it('returns js for empty or missing input', () => {
    expect(langFromPath('')).toBe('js');
    expect(langFromPath(undefined)).toBe('js');
  });
});
import { buildCode, countHeaderLines } from '../../src/code-builder.js';

// Helpers: LineEntry shape mirrors ui-src/types.ts
const line = (text, isAssert = false, warn = false) => ({ text, isAssert, warn });

describe('buildCode: JS mode', () => {
  it('includes expect in import when assertions are present', () => {
    const lines = [line("    await expect($('button')).toBeDisplayed();", true)];
    const code = buildCode(lines, 'js');
    expect(code).toContain("import { browser, $, expect } from '@wdio/globals'");
  });

  it('does NOT include expect when no assertions are present', () => {
    const lines = [line("    await $('button').click();")];
    const code = buildCode(lines, 'js');
    expect(code).not.toMatch(/import \{[^}]*expect[^}]*\} from '@wdio\/globals'/);
  });

  it('includes expect when toHaveText assertion present', () => {
    const lines = [line("    await expect($('h1')).toHaveText('Hello');", true)];
    const code = buildCode(lines, 'js');
    expect(code).toContain('expect');
    const importLine = code.split('\n').find(l => l.startsWith('import'));
    expect(importLine).toContain('expect');
  });

  it('includes Key import when keyboard combo present', () => {
    const lines = [line("    await browser.keys([Key.Ctrl, 'a']);")];
    const code = buildCode(lines, 'js');
    expect(code).toContain("import { Key } from 'webdriverio'");
  });

  it('Key import appears before globals import', () => {
    const lines = [line("    await browser.keys([Key.Ctrl, 'a']);")];
    const code = buildCode(lines, 'js');
    const keyIdx = code.indexOf("import { Key }");
    const globalsIdx = code.indexOf("from '@wdio/globals'");
    expect(keyIdx).toBeLessThan(globalsIdx);
  });

  it('wraps lines in describe/it block', () => {
    const lines = [line("    await browser.url('https://app.com');")];
    const code = buildCode(lines, 'js');
    expect(code).toContain("describe('Recorded flow'");
    expect(code).toContain("it('should complete the flow', async () => {");
    expect(code).toContain("await browser.url('https://app.com');");
  });
});

describe('countHeaderLines', () => {
  it('returns 4 when no Key import needed (1 import line + blank + describe + it)', () => {
    const lines = [line("    await $('button').click();")];
    expect(countHeaderLines(lines)).toBe(4);
  });

  it('returns 5 when Key import is needed (Key import + globals import + blank + describe + it)', () => {
    const lines = [line("    await browser.keys([Key.Ctrl, 'a']);")];
    expect(countHeaderLines(lines)).toBe(5);
  });

  it('returns 4 for empty lines array', () => {
    expect(countHeaderLines([])).toBe(4);
  });
});

describe('buildCode: TS mode', () => {
  it('always includes expect regardless of assertions', () => {
    const lines = [line("    await $('button').click();")];
    const code = buildCode(lines, 'ts');
    expect(code).toContain("import { browser, $, expect } from '@wdio/globals'");
  });

  it('uses typed it() signature', () => {
    const lines = [line("    await $('button').click();")];
    const code = buildCode(lines, 'ts');
    expect(code).toContain("async (): Promise<void> => {");
  });

  it('includes expect AND Key import when both needed', () => {
    const lines = [
      line("    await browser.keys([Key.Ctrl, 'a']);"),
      line("    await expect($('h1')).toHaveText('Hello');", true),
    ];
    const code = buildCode(lines, 'ts');
    expect(code).toContain("import { Key } from 'webdriverio'");
    expect(code).toContain("import { browser, $, expect } from '@wdio/globals'");
  });
});
