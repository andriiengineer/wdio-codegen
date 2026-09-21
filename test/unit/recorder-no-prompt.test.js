import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RECORDER = fs.readFileSync(
  path.join(__dirname, '../../src/recorder.content.js'),
  'utf8'
);

describe('recorder.content.js: no native prompt() for assertions', () => {
  it('does not call prompt() for attribute name input', () => {
    // Assertions use an inline overlay form, never window.prompt()
    expect(RECORDER).not.toContain("prompt('Attribute name");
  });

  it('does not call prompt() for attribute value input', () => {
    expect(RECORDER).not.toContain("prompt('Expected value");
  });

  it('does not use window.prompt at all (except the overridden window.prompt at top level)', () => {
    // The only allowed prompt usage is the window.prompt OVERRIDE at module level
    // (which intercepts prompts for dialog recording). Inline UI must NOT call prompt().
    const lines = RECORDER.split('\n');
    const inlinePromptLines = lines.filter((l) => {
      // Skip comment-only lines: they describe removed code, not live calls
      if (/^\s*\/\//.test(l)) return false;
      // Allow the window.prompt override definition itself (const _origPrompt / window.prompt =)
      const isOverrideDef = /const _origPrompt\s*=/.test(l) || /window\.prompt\s*=/.test(l);
      const isOrigCall = /_origPrompt\.call/.test(l);
      // Also allow the guard: if (window.__wdioRecorderInternal) return _origPrompt.call
      const isGuardCall = /window\.__wdioRecorderInternal/.test(l);
      if (isOverrideDef || isOrigCall || isGuardCall) return false;
      // Any remaining bare prompt() call in live code
      return /\bprompt\(/.test(l);
    });
    expect(inlinePromptLines).toEqual([]);
  });

  it('shows inline overlay form for attribute assertion (not a dialog)', () => {
    // Attribute assertions use an injected DOM form, never prompt()
    expect(RECORDER).toContain('__wdio_attr_form__');
  });
});
