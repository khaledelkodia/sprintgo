import { Navigation } from 'lucide-react';

/**
 * "افتح الخريطة" — turns a pin into turn-by-turn directions. The APK's WebView
 * hands an https maps link to the phone, which opens the Google Maps app when
 * it is installed and the browser otherwise. Renders nothing without a pin, so
 * a text-only address never shows a dead button.
 */
export function MapLink({
  lat,
  lng,
  label = 'افتح الخريطة',
  compact = false,
}: {
  lat: number | null | undefined;
  lng: number | null | undefined;
  label?: string;
  compact?: boolean;
}) {
  if (lat == null || lng == null) return null;
  const href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          background: '#fff',
          boxShadow: '0 8px 18px rgba(15,23,42,.1)',
          display: 'grid',
          placeItems: 'center',
          color: '#0D9488',
          flex: 'none',
        }}
      >
        <Navigation size={22} strokeWidth={1.75} />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        marginTop: 12,
        width: '100%',
        minHeight: 54,
        borderRadius: 16,
        background: '#F0FDFA',
        border: '1.5px solid #99F6E4',
        color: '#0F766E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        fontSize: 16,
        fontWeight: 800,
        textDecoration: 'none',
      }}
    >
      <Navigation size={21} strokeWidth={1.75} />
      {label}
    </a>
  );
}
