/** One lamp-start sequence; never a repeating strobe. */
export function camcorderLampLevel(seconds: number, enabled: boolean, reducedMotion: boolean): number {
  if (!enabled) return 0;
  if (reducedMotion) return 1;
  if (seconds < .45) return 0;
  if (seconds < .52) return .28;
  if (seconds < .66) return 0;
  if (seconds < .78) return .65;
  if (seconds < .86) return .2;
  return Math.min(1, .2 + (seconds - .86) * 5);
}
