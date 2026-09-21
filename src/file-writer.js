// src/file-writer.js
import fs from 'node:fs';
import path from 'node:path';
import { buildCode, langFromPath } from './code-builder.js';

export function createFileWriter(outputPath) {
  const resolved = path.resolve(outputPath);

  // Every recorded action rewrites this path, so the language cannot depend on
  // anything but the path itself — see langFromPath.
  const lang = langFromPath(resolved);

  function write(lines) {
    // Normalise: accept bare strings or LineEntry objects
    const entries = lines.map(l =>
      typeof l === 'string'
        ? { text: l, isAssert: false, warn: false }
        : { text: l.text ?? '', isAssert: l.isAssert ?? false, warn: l.warn ?? false }
    );
    const code = buildCode(entries, lang) + '\n';
    try {
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      const tmp = resolved + '.tmp';
      fs.writeFileSync(tmp, code, 'utf8');
      fs.renameSync(tmp, resolved);
    } catch (err) {
      console.warn(`[wdio-codegen] Warning: cannot write to ${resolved}: ${err.message}`);
    }
  }

  return { write, path: resolved };
}
