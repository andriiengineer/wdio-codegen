import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

const params = new URLSearchParams(location.search);
const port = params.get('port') || '9323';
const outputFile = params.get('output') || '';
// Session token issued by the local server; without it the server rejects /save and the
// WebSocket upgrade. The CLI puts it in this window's URL.
const token = params.get('token') || '';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App port={port} outputFile={outputFile} token={token} />
);
