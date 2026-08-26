import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

/**
 * What the customer sees when something breaks. A blank screen tells them
 * nothing and tells us nothing either — this at least offers a way out and
 * shows the reason, which is the difference between "the app is broken" and a
 * bug report we can act on.
 */
export function ErrorScreen({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 32,
        background: '#F8FAFC',
        fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
        direction: 'rtl',
      }}
    >
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 999,
          background: '#FEF2F2',
          display: 'grid',
          placeItems: 'center',
          fontSize: 42,
        }}
      >
        ⚠️
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginTop: 22 }}>حصلت مشكلة</div>
      <div style={{ fontSize: 15, color: '#64748B', marginTop: 10, lineHeight: 1.7, maxWidth: 320 }}>
        التطبيق مقدرش يكمّل. جرّب تفتحه تاني — ولو المشكلة فضلت، ابعتلنا الرسالة اللي تحت.
      </div>

      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          marginTop: 26,
          minHeight: 56,
          padding: '0 32px',
          borderRadius: 18,
          border: 'none',
          background: '#2563EB',
          color: '#fff',
          fontSize: 17,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        افتح التطبيق تاني
      </button>

      <pre
        style={{
          marginTop: 28,
          maxWidth: '100%',
          maxHeight: 180,
          overflow: 'auto',
          background: '#F1F5F9',
          color: '#475569',
          borderRadius: 14,
          padding: 14,
          fontSize: 11,
          lineHeight: 1.6,
          textAlign: 'left',
          direction: 'ltr',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message}
      </pre>
    </div>
  );
}

/** Catches anything thrown while rendering, so a bug shows a message not a blank app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state: { message: string | null } = { message: null };

  static getDerivedStateFromError(err: unknown) {
    return { message: err instanceof Error ? `${err.message}\n\n${err.stack ?? ''}` : String(err) };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[SprintGo] render crashed', err, info.componentStack);
  }

  render() {
    return this.state.message ? <ErrorScreen message={this.state.message} /> : this.props.children;
  }
}
