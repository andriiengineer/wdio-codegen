import React, { useMemo, useState } from 'react';
import type { LineEntry } from '../types';
import { getLocatorCandidates } from '../../src/locator-engine.js';
import './Sidebar.css';

interface Props {
  locator: string;
  lines: LineEntry[];
  elementInfo?: Parameters<typeof getLocatorCandidates>[0] | null;
  onLocatorChange: (sel: string) => void;
  locatorInputRef?: React.Ref<HTMLInputElement>;
}

export function Sidebar({ locator, lines, elementInfo, onLocatorChange, locatorInputRef }: Props) {
  const [tab, setTab] = useState<'locator' | 'log'>('locator');

  // Candidate computation is non-trivial: only redo it when the source element changes.
  const candidates = useMemo(
    () => (elementInfo ? getLocatorCandidates(elementInfo) : []),
    [elementInfo],
  );

  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab${tab === 'locator' ? ' active' : ''}`}
          onClick={() => setTab('locator')}
        >
          Locator
        </button>
        <button
          className={`sidebar-tab${tab === 'log' ? ' active' : ''}`}
          onClick={() => setTab('log')}
        >
          Log ({lines.length})
        </button>
      </div>

      <div className="sidebar-body">
        {tab === 'locator' ? (
          <LocatorTab
            locator={locator}
            candidates={candidates}
            onLocatorChange={onLocatorChange}
            inputRef={locatorInputRef}
          />
        ) : (
          <LogTab lines={lines} />
        )}
      </div>
    </div>
  );
}

interface Candidate { locator: string; warn: boolean; label: string; }

function LocatorTab({
  locator, candidates, onLocatorChange, inputRef,
}: {
  locator: string;
  candidates: Candidate[];
  onLocatorChange: (s: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <>
      <div className="sidebar-label">Locator</div>
      <input
        ref={inputRef}
        className="locator-input"
        value={locator}
        onChange={(e) => onLocatorChange(e.target.value)}
        placeholder="CSS selector to highlight…  (⌘K to focus)"
        spellCheck={false}
        autoComplete="off"
      />
      <div className="sidebar-label" style={{ marginTop: 8 }}>
        Type a selector to highlight matching elements on the target page
      </div>

      {candidates.length > 1 && (
        <>
          <div className="sidebar-label" style={{ marginTop: 12 }}>
            Alternative locators
          </div>
          <div className="candidateList">
            {candidates.map((c, i) => (
              <div
                key={i}
                className={`candidate-item${c.warn ? ' warn' : ''}`}
                title={c.label}
                onClick={() => onLocatorChange(c.locator)}
                style={{ cursor: 'pointer' }}
              >
                <span className="candidate-label">{c.label}</span>
                <span className="candidate-locator">{c.locator}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

type LogKind = 'all' | 'action' | 'assert' | 'warn';

function LogTab({ lines }: { lines: LineEntry[] }) {
  const [filter, setFilter] = useState('');
  const [kind, setKind] = useState<LogKind>('all');

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return lines.filter((l) => {
      if (kind === 'assert' && !l.isAssert) return false;
      if (kind === 'warn' && !l.warn) return false;
      if (kind === 'action' && (l.isAssert || l.warn)) return false;
      if (!needle) return true;
      return (
        (l.label?.toLowerCase().includes(needle) ?? false) ||
        l.text.toLowerCase().includes(needle)
      );
    });
  }, [lines, filter, kind]);

  return (
    <>
      <input
        className="locator-input"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter log…"
        spellCheck={false}
        autoComplete="off"
      />
      <div className="log-filter-chips">
        {(['all', 'action', 'assert', 'warn'] as LogKind[]).map((k) => (
          <button
            key={k}
            className={`log-chip${kind === k ? ' active' : ''}`}
            onClick={() => setKind(k)}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="log-list">
        {filtered.length === 0 ? (
          <div className="sidebar-label" style={{ padding: 12 }}>
            {lines.length === 0 ? 'No actions recorded yet' : 'No matches'}
          </div>
        ) : (
          filtered.map((l, i) => (
            <div key={i} className={`log-entry${l.isAssert ? ' assert' : l.warn ? ' warn' : ''}`}>
              <div className={`log-dot ${l.isAssert ? 'assert' : l.warn ? 'warn' : 'action'}`} />
              <span style={{ fontFamily: 'Consolas, monospace', fontSize: 11 }}>
                {l.label || l.text.trim().slice(0, 80)}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
