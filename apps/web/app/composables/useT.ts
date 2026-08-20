import ar from '../i18n/ar.json';

/**
 * Minimal Arabic-only i18n for launch (decision D5).
 * Keys are `feature.screen.element`. Swapping in a full i18n module later
 * only changes this composable — call sites stay identical.
 */
export function useT() {
  return (key: string): string => {
    let node: unknown = ar;
    for (const part of key.split('.')) {
      if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
        node = (node as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }
    return typeof node === 'string' ? node : key;
  };
}
