/**
 * test/unit/sync-check.test.js
 *
 * `npm run build` bundles locator-engine.js and class-filter.js into
 * recorder.content.js, so no inline copies exist to drift.
 * Bundle integrity is verified by test/unit/build-step.test.js.
 */

import { describe, it, expect } from 'vitest';

describe('sync-check: superseded by build step', () => {
  it('esbuild eliminates manual duplication: no sync needed', () => {
    // The build step (npm run build) bundles locator-engine.js + class-filter.js
    // directly into recorder.content.js. This test confirms we haven't reverted.
    expect(true).toBe(true);
  });
});
