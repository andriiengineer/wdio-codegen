// test/integration/codegen.test.js
import { describe, it, expect } from 'vitest';
import { getBestLocator } from '../../src/locator-engine.js';
import { generateLine } from '../../src/codegen.js';

describe('locator engine integration', () => {
  it('generates text selector for Submit button', () => {
    const info = { tag: 'button', text: 'Submit', ariaLabel: '', id: '', idUnique: false, attrs: {}, xpath: '//button[1]' };
    expect(getBestLocator(info)).toEqual({ locator: 'button=Submit', warn: false });
  });

  it('#id wins over aria/ for labelled input with unique id (P2 > P5)', () => {
    // A unique #id is more CSS-native than the aria/ selector.
    const info = { tag: 'input', text: '', ariaLabel: 'Email address', id: 'email', idUnique: true, attrs: {}, xpath: '//input[1]' };
    expect(getBestLocator(info)).toEqual({ locator: '#email', warn: false });
  });

  it('aria/ returned when input has ariaLabel but no id (P5 fallback)', () => {
    const info = { tag: 'input', text: '', ariaLabel: 'Email address', id: '', idUnique: false, attrs: {}, xpath: '//input[1]' };
    expect(getBestLocator(info)).toEqual({ locator: 'aria/Email address', warn: false });
  });

  it('data-testid wins over text per priority (P1 > P4)', () => {
    const info = { tag: 'button', text: 'Login', ariaLabel: '', id: '', idUnique: false, attrs: { 'data-testid': 'login-btn' }, xpath: '//button[2]' };
    expect(getBestLocator(info)).toEqual({ locator: '[data-testid="login-btn"]', warn: false });
  });
});

describe('codegen line generation', () => {
  it('produces correct line for each event type', () => {
    const cases = [
      [{ type: 'navigate', url: 'https://app.com' }, `    await browser.url('https://app.com');`],
      [{ type: 'click', locator: 'button=Submit' }, `    await $('button=Submit').click();`],
      [{ type: 'setValue', locator: 'aria/Email address', value: 'test@example.com' }, `    await $('aria/Email address').setValue('test@example.com');`],
      [{ type: 'assert:toHaveUrl', url: '/dashboard' }, `    await expect(browser).toHaveUrl('/dashboard', { containing: true });`],
    ];
    for (const [event, expected] of cases) {
      expect(generateLine(event)).toBe(expected);
    }
  });
});
