/**
 * Returns the number of header lines that `buildCode` produces before the recorded lines.
 * Used by CodePanel to correctly compute CodeMirror line numbers for assert/warn decorations.
 *
 * Without Key import:  globals-import + blank + describe + it  = 4 lines
 * With Key import:     key-import + globals-import + blank + describe + it = 5 lines
 *
 * @param {{ text: string }[]} lines
 * @returns {4 | 5}
 */
export function countHeaderLines(lines) {
  const needsKeyImport = lines.some(l => /\bKey\./.test(l.text));
  return needsKeyImport ? 5 : 4;
}

/**
 * Picks the output language from a file path. The extension is the single source of
 * truth: README documents `--output ...ts` as the TypeScript path, and both the file
 * writer and the code window derive the language from here so they cannot disagree
 * about what goes into the same file. `.mts`/`.cts` are TypeScript too.
 *
 * @param {string} filePath - may be empty when no --output was given
 * @returns {'js' | 'ts'}
 */
export function langFromPath(filePath) {
  return /\.[mc]?ts$/i.test(filePath || '') ? 'ts' : 'js';
}

/**
 * Builds the full generated test file string from an array of recorded LineEntry objects.
 *
 * @param {{ text: string, isAssert: boolean, warn: boolean }[]} lines - recorded actions
 * @param {'js' | 'ts'} lang - output language
 * @returns {string} - complete runnable test file
 */
export function buildCode(lines, lang) {
  // Include `import { Key }` only when Key.* constants appear in the output.
  const needsKeyImport = lines.some(l => /\bKey\./.test(l.text));

  // Include `expect` in the globals import only when assertion lines are present.
  // TS mode always includes expect (typed test files commonly need it).
  // JS mode adds it conditionally to avoid unused-import warnings.
  const needsExpect = lang === 'ts' || lines.some(l => /\bexpect\(/.test(l.text));

  const importLines = [];
  if (needsKeyImport) {
    importLines.push(`import { Key } from 'webdriverio';`);
  }

  const globals = ['browser', '$'];
  if (needsExpect) globals.push('expect');
  importLines.push(`import { ${globals.join(', ')} } from '@wdio/globals';`);

  const itLine = lang === 'ts'
    ? `  it('should complete the flow', async (): Promise<void> => {`
    : `  it('should complete the flow', async () => {`;

  return [
    importLines.join('\n'),
    '',
    `describe('Recorded flow', () => {`,
    itLine,
    ...lines.map(l => l.text),
    '  });',
    '});',
  ].join('\n');
}
