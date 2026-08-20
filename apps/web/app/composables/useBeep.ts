/**
 * Short attention beep for new orders / assignments (docs/architecture/06 §4).
 * Uses the Web Audio API so there's no asset to ship; no-op on the server.
 */
export function useBeep() {
  let ctx: AudioContext | null = null;

  function beep(times = 2) {
    if (!import.meta.client) return;
    try {
      ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const now = ctx.currentTime;
      for (let i = 0; i < times; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        const t = now + i * 0.28;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        osc.start(t);
        osc.stop(t + 0.24);
      }
    } catch {
      // audio may be blocked until the user interacts — safe to ignore
    }
  }

  return { beep };
}
