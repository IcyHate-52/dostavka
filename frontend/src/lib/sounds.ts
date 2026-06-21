let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return ctx;
}

function tone(freq: number, start: number, duration: number, gain: number, type: OscillatorType = "sine") {
  const c = getCtx();
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.value = 0;
  osc.connect(amp);
  amp.connect(c.destination);
  const t0 = c.currentTime + start;
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Short "register" click — played when a card is dropped into a new column. */
export function playClickSound() {
  try {
    tone(900, 0, 0.06, 0.25, "square");
  } catch {
    // Audio may be blocked before the first user gesture; ignore.
  }
}

/** Pleasant little bell — played when an order reaches "Доставлен". */
export function playBellSound() {
  try {
    tone(1318.5, 0, 0.35, 0.2, "sine"); // E6
    tone(1567.98, 0.05, 0.4, 0.15, "sine"); // G6
    tone(2093, 0.1, 0.5, 0.1, "sine"); // C7
  } catch {
    // ignore
  }
}
