import { describe, it, expect } from 'vitest';
import { normalizeUrl } from '../../src/normalize-url.js';

describe('normalizeUrl', () => {
  it('adds https:// to a bare host', () => {
    expect(normalizeUrl('aqapro.com')).toBe('https://aqapro.com');
    expect(normalizeUrl('aqapro.com:8080/path?q=1')).toBe('https://aqapro.com:8080/path?q=1');
    expect(normalizeUrl('172.32.0.1')).toBe('https://172.32.0.1'); // outside the private range
  });

  it('adds http:// for local hosts', () => {
    expect(normalizeUrl('localhost:3000')).toBe('http://localhost:3000');
    expect(normalizeUrl('127.0.0.1:8080')).toBe('http://127.0.0.1:8080');
    expect(normalizeUrl('dev.local/app')).toBe('http://dev.local/app');
    expect(normalizeUrl('192.168.1.50:8080')).toBe('http://192.168.1.50:8080');
    expect(normalizeUrl('172.16.0.2')).toBe('http://172.16.0.2');
  });

  it('leaves an explicit scheme untouched so the CLI can reject non-http(s)', () => {
    expect(normalizeUrl('http://aqapro.com')).toBe('http://aqapro.com');
    expect(normalizeUrl('HTTPS://aqapro.com')).toBe('HTTPS://aqapro.com');
    expect(normalizeUrl('file:///etc/passwd')).toBe('file:///etc/passwd');
  });

  it('never turns a scheme-less javascript: payload into a usable URL', () => {
    expect(() => new URL(normalizeUrl('javascript:alert(1)'))).toThrow();
  });
});
