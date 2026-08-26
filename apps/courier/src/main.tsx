import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorScreen';
import './index.css';

/**
 * Paint the reason straight into the page.
 *
 * An error thrown before React mounts — a bad import, a plugin missing from the
 * native shell — leaves the WebView blank with nothing to go on, which is the
 * worst possible failure on a phone. This puts the message on screen so the
 * problem can be read off the device instead of guessed at.
 */
function paintFatal(detail: string) {
  const root = document.getElementById('root');
  if (!root || root.childElementCount > 0) return; // React already rendered something
  root.innerHTML = `
    <div style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;
                text-align:center;padding:32px;background:#F8FAFC;font-family:system-ui,sans-serif;direction:rtl">
      <div style="font-size:42px">⚠️</div>
      <div style="font-size:22px;font-weight:800;color:#0F172A;margin-top:16px">التطبيق مقدرش يفتح</div>
      <div style="font-size:15px;color:#64748B;margin-top:10px;line-height:1.7;max-width:320px">
        ابعتلنا الرسالة اللي تحت وهنظبطها.
      </div>
      <pre style="margin-top:24px;max-width:100%;max-height:220px;overflow:auto;background:#F1F5F9;color:#475569;
                  border-radius:14px;padding:14px;font-size:11px;line-height:1.6;text-align:left;direction:ltr;
                  white-space:pre-wrap;word-break:break-word"></pre>
    </div>`;
  const pre = root.querySelector('pre');
  if (pre) pre.textContent = detail; // textContent, never innerHTML — the message is untrusted
}

window.addEventListener('error', (e) => paintFatal(`${e.message}\n${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => paintFatal(`Unhandled rejection:\n${String(e.reason)}`));

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
} catch (err) {
  paintFatal(err instanceof Error ? `${err.message}\n\n${err.stack ?? ''}` : String(err));
}
