# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [1.0.2] - 2026-09-26

### Fixed
- A locator could point at a different element than the one recorded. Every candidate
  is now checked in the page the way WebdriverIO resolves it, and the first one that
  matches only the recorded element wins:
  - `<input type="submit" value="Send">` no longer becomes `aria/Send`, which WebdriverIO
    resolves to any element whose text is "Send" (for example a heading). Such inputs get
    `input[type="submit"][value="Send"]`.
  - `aria/…` and `button=Text` selectors are checked with the XPath WebdriverIO builds for
    them. Before, `aria/` was not checked at all and text used different matching rules.
  - Uniqueness covers every open shadow root, as WebdriverIO v9 searches them all. A
    test-id repeated in two identical components is flagged with ⚠ instead of silently
    resolving to the first one.
  - When only weak locators exist (`[role="button"]`, `input[type="text"]`), one is used
    only if it matches the recorded element alone; otherwise the CSS path is used. Both
    are still flagged with ⚠.
  - Selectors ending in an image extension (`span.svg`) are never generated: WebdriverIO
    treats them as image-file selectors and fails.
- Clicks, typing and hover inside open shadow roots are recorded on the element itself,
  not on the component's host element (`body > my-widget`). When that inner control has
  no stable locator (the `<button>` inside a design-system button), a click is recorded
  on the nearest host that has one (`#buy`), which lands on the same control.
- Checkboxes and radios inside a shadow root are recorded. Their `change` event never
  reached the recorder.
- Quotes in page values no longer break selectors: `"` and `\` are escaped in
  `[attr="…"]`, and `aria/` or text selectors are skipped when the value contains `"`
  (WebdriverIO puts it in an XPath string, which has no escaping) or ends in an image
  extension (WebdriverIO treats those as image selectors).
- Ids that are not plain CSS identifiers (`user.name`, `1st`) produce `[id="…"]` instead of
  an invalid or wrong `#…` selector.
- The code window looked editable, but typed changes vanished on the next action and
  were never copied or saved. It is now read-only.

### Changed
- The code window's Chrome profile moved from `~/.wdio-codegen/inspector-profile` into
  the cache folder (`~/.cache/wdio-codegen`, or `WDIO_CODEGEN_CACHE_DIR`). The old
  `~/.wdio-codegen` folder is no longer used and can be deleted.
- `--browser` is no longer listed in `--help` or the README, since only Chrome is
  supported. `-b chrome` is still accepted.

### Internal
- Browser test suite (`npm run test:e2e`, CI job `e2e`): generated locators are resolved
  with a real WebdriverIO session in headless Chrome.
- One locator priority list (`getLocatorCandidates`), one test-file header builder;
  removed the unused `wrapInTest`.
- Test files named after sprints were renamed after what they test.

## [1.0.1]

### Fixed
- URLs without a scheme are accepted (`https://` is assumed).

## [1.0.0]

- First release.
