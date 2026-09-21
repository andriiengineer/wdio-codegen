import { useCallback, useReducer } from 'react';
import type { LineEntry, Mode, WsMessage } from '../types';

interface State {
  mode: Mode;
  lines: LineEntry[];
  lang: 'js' | 'ts';
  locator: string;
  actionCount: number;
  connected: boolean;
  browserName: string;
}

type Action =
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'SET_LANG'; lang: 'js' | 'ts' }
  | { type: 'SET_LOCATOR'; locator: string }
  | { type: 'HANDLE_WS'; msg: WsMessage };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'SET_LANG':
      return { ...state, lang: action.lang };
    case 'SET_LOCATOR':
      return { ...state, locator: action.locator };
    case 'HANDLE_WS': {
      const msg = action.msg;
      if (msg.type === 'init')
        return { ...state, lines: msg.lines, actionCount: msg.lines.length, connected: true, browserName: msg.browserName ?? 'chrome' };
      if (msg.type === 'line') {
        const newMode = msg.entry.isAssert ? 'recording' : state.mode;
        return {
          ...state,
          mode: newMode,
          lines: [...state.lines, msg.entry],
          actionCount: state.actionCount + 1,
        };
      }
      if (msg.type === 'clear')
        return { ...state, lines: [], actionCount: 0 };
      if (msg.type === 'pick')
        return { ...state, locator: msg.locator, mode: 'recording' };
      if (msg.type === 'mode')
        // Browser toolbar toggled pause: keep UI in sync without a round-trip.
        return { ...state, mode: msg.mode };
      if (msg.type === 'shutdown')
        return { ...state, connected: false };
      return state;
    }
  }
}

const initial: State = {
  mode: 'recording',
  lines: [],
  lang: 'js',
  locator: '',
  actionCount: 0,
  connected: false,
  browserName: 'chrome',
};

/**
 * @param initialLang - language the code panel starts in. Derived from the --output
 *   extension so the window shows the same language that lands in the file; the user
 *   can still switch it with the toggle.
 */
export function useRecorder(initialLang: 'js' | 'ts' = 'js') {
  const [state, dispatch] = useReducer(reducer, { ...initial, lang: initialLang });

  const setMode = useCallback((mode: Mode) => {
    dispatch({ type: 'SET_MODE', mode });
  }, []);

  const setLang = useCallback((lang: 'js' | 'ts') => {
    dispatch({ type: 'SET_LANG', lang });
  }, []);

  const setLocator = useCallback((locator: string) => {
    dispatch({ type: 'SET_LOCATOR', locator });
  }, []);

  const handleWsMessage = useCallback((msg: WsMessage) => {
    dispatch({ type: 'HANDLE_WS', msg });
  }, []);

  return { state, setMode, setLang, setLocator, handleWsMessage };
}
