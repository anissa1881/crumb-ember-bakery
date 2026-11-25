// Tiny WebAudio synth: every sound is a few oscillators, no audio files, no network.
// The context is created lazily on the first user gesture; shot mode stays silent.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, seconds, type, gain, when = 0) {
    const ctx = ensure();
    if (!ctx || muted) return;
    try {
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = freq;
      envelope.gain.setValueAtTime(0.0001, ctx.currentTime + when);
      envelope.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + when + 0.01);
      envelope.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + seconds);
      oscillator.connect(envelope);
      envelope.connect(ctx.destination);
      oscillator.start(ctx.currentTime + when);
      oscillator.stop(ctx.currentTime + when + seconds + 0.05);
    } catch {
      // Sound is garnish: a failure here must never break the game.
    }
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    click() {
      tone(660, 0.07, 'triangle', 0.08);
    },
    pickup() {
      tone(520, 0.08, 'triangle', 0.08);
      tone(780, 0.1, 'triangle', 0.06, 0.05);
    },
    drop() {
      tone(330, 0.08, 'triangle', 0.08);
    },
    mixStart() {
      tone(392, 0.12, 'sine', 0.07);
      tone(523, 0.12, 'sine', 0.07, 0.1);
    },
    doughReady() {
      tone(587, 0.15, 'triangle', 0.09);
      tone(880, 0.2, 'triangle', 0.07, 0.08);
    },
    ovenDing() {
      tone(1046, 0.35, 'sine', 0.1);
      tone(1318, 0.4, 'sine', 0.07, 0.12);
    },
    serve() {
      tone(523, 0.12, 'triangle', 0.09);
      tone(659, 0.12, 'triangle', 0.09, 0.09);
      tone(784, 0.25, 'triangle', 0.1, 0.18);
    },
    error() {
      tone(180, 0.18, 'sawtooth', 0.06);
      tone(140, 0.2, 'sawtooth', 0.05, 0.1);
    },
    expire() {
      tone(220, 0.25, 'sine', 0.08);
      tone(165, 0.35, 'sine', 0.07, 0.15);
    },
    shiftWin() {
      [523, 659, 784, 1046].forEach((freq, index) => tone(freq, 0.25, 'triangle', 0.09, index * 0.12));
    },
    gameOver() {
      [392, 330, 262, 196].forEach((freq, index) => tone(freq, 0.3, 'triangle', 0.08, index * 0.15));
    },
  };
}
