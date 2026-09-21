import React, { useEffect, useMemo, useRef } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { Decoration, ViewPlugin } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import type { LineEntry } from '../types';
import { buildCode as buildCodeCore, countHeaderLines } from '../../src/code-builder.js';

const lightTheme = EditorView.theme({
  '&': { background: '#ffffff', color: '#1a1a1a', height: '100%' },
  '.cm-content': { fontFamily: 'Consolas, "Courier New", monospace', fontSize: '13px', padding: '8px 0' },
  '.cm-gutters': { background: '#f5f5f5', borderRight: '1px solid #e0e0e0', color: '#aaa' },
  '.cm-assert-line': { borderLeft: '3px solid #9b59b6', background: '#f3e5f5', paddingLeft: '5px' },
  '.cm-warn-line': { borderLeft: '3px solid #ff9800', background: '#fff3e0' },
  '.cm-scroller': { overflow: 'auto' },
}, { dark: false });

function buildCode(lines: LineEntry[], lang: 'js' | 'ts'): string {
  // Shared with file-writer so the UI and the saved file generate identical code.
  return buildCodeCore(lines, lang);
}

function makeAssertPlugin(assertLineNums: Set<number>, warnLineNums: Set<number>) {
  return ViewPlugin.fromClass(class {
    decorations: any;
    constructor(view: EditorView) { this.decorations = this.build(view); }
    update(u: { docChanged: boolean; viewportChanged: boolean; view: EditorView }) {
      if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view);
    }
    build(view: EditorView) {
      const b = new RangeSetBuilder<Decoration>();
      for (const { from, to } of view.visibleRanges) {
        for (let pos = from; pos <= to; ) {
          const line = view.state.doc.lineAt(pos);
          if (assertLineNums.has(line.number))
            b.add(line.from, line.from, Decoration.line({ class: 'cm-assert-line' }));
          else if (warnLineNums.has(line.number))
            b.add(line.from, line.from, Decoration.line({ class: 'cm-warn-line' }));
          pos = line.to + 1;
        }
      }
      return b.finish();
    }
  }, { decorations: v => v.decorations });
}

interface Props {
  lines: LineEntry[];
  lang: 'js' | 'ts';
  onLocatorEdit?: (locator: string) => void;
}

export function CodePanel({ lines, lang, onLocatorEdit }: Props) {
  const code = useMemo(() => buildCode(lines, lang), [lines, lang]);

  // Header lines before recorded lines: dynamic: 4 normally, 5 when Key import is added.
  // countHeaderLines() mirrors the logic in buildCode() to stay in sync.
  const HEADER_LINES = countHeaderLines(lines);
  const { assertSet, warnSet } = useMemo(() => {
    const assertSet = new Set<number>();
    const warnSet = new Set<number>();
    lines.forEach((l, i) => {
      const lineNum = HEADER_LINES + i + 1;
      if (l.isAssert) assertSet.add(lineNum);
      else if (l.warn) warnSet.add(lineNum);
    });
    return { assertSet, warnSet };
  }, [lines]);

  const extensions = useMemo(
    () => [javascript({ typescript: lang === 'ts' }), lightTheme, makeAssertPlugin(assertSet, warnSet)],
    [lang, assertSet, warnSet]
  );

  const viewRef = useRef<EditorView | null>(null);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: EditorView.scrollIntoView(view.state.doc.length, { y: 'end' }) });
  }, [lines.length]);

  function handleChange(value: string) {
    if (!onLocatorEdit) return;
    // Extract the locator from the line being edited (pattern: $('locator'))
    const match = value.match(/\$\('([^'\\]+)'\)/);
    if (match) onLocatorEdit(match[1]);
  }

  return (
    <CodeMirror
      value={code}
      extensions={extensions}
      editable={true}
      basicSetup={{ lineNumbers: true, highlightActiveLine: false }}
      style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      onCreateEditor={(view) => { viewRef.current = view; }}
      onChange={handleChange}
    />
  );
}

export { buildCode };
