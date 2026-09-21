export function normalizeUrl(raw) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return raw;
  let hostname;
  try {
    hostname = new URL('http://' + raw).hostname;
  } catch {
    return 'https://' + raw; // unparseable: let the caller report it
  }

  const local = hostname === 'localhost' || hostname === '[::1]' || hostname.endsWith('.local')
    || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0$)/.test(hostname);
  return (local ? 'http://' : 'https://') + raw;
}
