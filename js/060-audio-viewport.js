// [js-split] ===== js/060-audio-viewport.js: WebAudio sound effects (tone(), SFX table, sfx()), canvas resize, debug URL hash parsing (parseHash) =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ------------------------------------------------------------ SOUND (WebAudio, no files) ---
let AC = null, muted = false;
const sfxLast = {};
let swipeVoice = 0; // Sound variation must not consume the gameplay random sequence.
function audioInit() {
  if (AC) { if (AC.state === "suspended" && AC.resume) AC.resume(); return; }
  if (!FX.sound) return;
  try { const C = window.AudioContext || window.webkitAudioContext; if (C) AC = new C(); } catch (e) { AC = null; }
}
function tone(f0, f1, dur, type, vol, delay = 0) {
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
}
// Filtered noise supplies air, concrete and impact texture; pitched layers carry weight.
let soundNoise = null;
function noise(dur, vol, cutoff, highpass, endCutoff = cutoff, delay = 0) {
  if (!AC.createBuffer) return; // headless / older audio contexts
  if (!soundNoise) {
    soundNoise = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const data = soundNoise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = AC.createBufferSource(), filter = AC.createBiquadFilter(), gain = AC.createGain(), t = AC.currentTime + delay;
  src.buffer = soundNoise; filter.type = highpass ? "highpass" : "lowpass"; filter.frequency.setValueAtTime(cutoff, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(20, endCutoff), t + dur);
  gain.gain.setValueAtTime(.001, t); gain.gain.linearRampToValueAtTime(vol, t + .012); gain.gain.exponentialRampToValueAtTime(.001, t + dur);
  src.connect(filter); filter.connect(gain); gain.connect(AC.destination); src.start(t); src.stop(t + dur + .02);
}
const SFX = {
  swipe: () => {
    const pitch = 1 + Math.sin(++swipeVoice * 2.4) * .06;
    noise(.16, .10, 3200 * pitch, false, 450);
    noise(.09, .035, 1700 * pitch, true, 4200);
    tone(155 * pitch, 48, .18, "triangle", .055);
  },
  clawHit: () => {
    noise(.075, .13, 2600, false, 700);
    noise(.22, .065, 1300, false, 230, .025);
    tone(92, 29, .21, "sine", .12);
    tone(185, 63, .085, "triangle", .035);
  },
  hit: () => { noise(.12, .09, 1100); tone(95, 32, .14, "sine", .09); },
  kill: () => noise(.12, .035, 1700),
  roar: () => { noise(.95, .15, 700); tone(76, 32, 1.05, "sawtooth", .065); tone(113, 47, .85, "triangle", .08); tone(39, 24, 1.1, "sine", .12); },
  breath: () => { noise(.3, .075, 2400); tone(85, 62, .28, "sawtooth", .028); },
  windup: () => { noise(.3, .06, 900); tone(65, 240, .32, "triangle", .07); },
  stomp: () => { noise(.55, .18, 650); tone(65, 22, .65, "sine", .22); },
  tremor: () => { noise(.45, .07, 350); tone(48, 22, .6, "sine", .12); },
  pulse: () => { noise(.16, .05, 550); tone(65, 30, .2, "sine", .08); },
  step: () => { noise(.13, .045, 400); tone(52, 28, .17, "sine", .085); },
  collapse: () => { noise(.7, .075, 700); tone(58, 25, .5, "sine", .045); },
  beam: () => { noise(.35, .08, 1600); tone(57, 42, .35, "sawtooth", .05); },
  fail: () => tone(110, 75, .12, "triangle", .035),
  level: () => { tone(392, 784, .3, "sine", .065); tone(587, 1174, .45, "triangle", .035); },
};
const SOUND_GAP = { clawHit: .085, swipe: .07, step: .18, hit: .09, kill: .14, collapse: .35, breath: .2, beam: .25 };
function sfx(k) {
  if (!AC || muted || paused || !FX.sound) return;
  const n = AC.currentTime;
  if (sfxLast[k] && n - sfxLast[k] < (SOUND_GAP[k] || 0.06)) return;
  sfxLast[k] = n;
  try { SFX[k](); } catch (e) { /* ignore audio errors */ }
}

let GS = 1; // chunk canvas resolution scale
function resize() {
  const dpr = platformPixelRatio();            // = devicePixelRatio on desktop, capped on touch devices (015-config-platform.js)
  GS = Math.min(2, dpr);
  PLATFORM.uiScale = platformUiScale();
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

function parseHash() {
  const p = {};
  try {
    const h = (window.location && window.location.hash || "").replace(/^#/, "");
    h.split("&").forEach(kv => { const [k, v] = kv.split("="); if (k) p[k] = v === undefined ? "1" : v; });
  } catch (e) { /* no location (tests) */ }
  return p;
}

