// La evolución de Kiro: CW -> Amazon Q Developer -> Kiro -> toda la familia.
// Un pequeño héroe camina, se come una baya mágica y se transforma, como en un anime.
// Todo se dibuja en un <canvas> y la música se sintetiza con Web Audio (sin archivos).

const W = 960, H = 540, FEET = 470, HERO_X = 300;
const INK = "#2b1d4f";
const PI = Math.PI;
const SPEED = +new URLSearchParams(location.search).get("speed") || 1; // solo para pruebas
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const cv = document.getElementById("c");
const dpr = Math.min(2, window.devicePixelRatio || 1);
cv.width = W * dpr; cv.height = H * dpr;
const ctx = cv.getContext("2d");
ctx.scale(dpr, dpr);

// ---------- utilidades ----------
const lerp = (a, b, f) => a + (b - a) * f;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = (f) => 1 - (1 - f) ** 3;
const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
function lerpC(a, b, f) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "rgb(" + x.map((v, i) => Math.round(lerp(v, y[i], f))).join(",") + ")";
}
function ell(c, x, y, rx, ry, fill, stroke = INK, lw = 4) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 2 * PI);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
function rrect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function label(c, s, x, y, size, fill, align = "center") {
  c.font = `800 ${size}px "Arial Rounded MT Bold", system-ui, sans-serif`;
  c.textAlign = align; c.textBaseline = "middle"; c.fillStyle = fill; c.fillText(s, x, y);
}

// ---------- imágenes de la familia (SVG pequeños) ----------
function ghostSvg(color, extra = "", eyes = INK) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120" viewBox="0 0 100 120">
    <path d="M12 100V50a38 38 0 0 1 76 0v50l-12-9-12 9-14-9-14 9-12-9z" fill="${color}"/>
    <ellipse cx="38" cy="52" rx="7" ry="10" fill="#fff"/><ellipse cx="62" cy="52" rx="7" ry="10" fill="#fff"/>
    <ellipse cx="40" cy="54" rx="4" ry="6" fill="${eyes}"/><ellipse cx="64" cy="54" rx="4" ry="6" fill="${eyes}"/>
    <path d="M42 70q8 7 16 0" stroke="${eyes}" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${extra}</svg>`;
}
const svgText = (x, y, s, size, fill) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" fill="${fill}" text-anchor="middle" font-family="monospace">${s}</text>`;
const FAMILY = [
  { key: "cli", name: "Kiro CLI", year: "Noviembre 2025", line: "Kiro llega a la terminal con su hermano Kiro CLI.",
    svg: ghostSvg("#3a3350", `<rect x="26" y="78" width="48" height="20" rx="4" fill="#0e0a1a"/>${svgText(50, 93, "&gt;_", 14, "#5f5")}`) },
  { key: "agent", name: "Agente", year: "Después…", line: "Llega el agente autónomo: trabaja solo mientras tú descansas.",
    svg: ghostSvg("#b48cff", `<line x1="50" y1="14" x2="50" y2="2" stroke="#fff" stroke-width="3"/><path d="M50-6l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#ffd54a" transform="translate(0 6)"/><path d="M40 82h20l-4 12H44z" fill="#fff"/>`) },
  { key: "web", name: "Kiro Web", year: "Y ahora…", line: "Kiro Web: sin instalar nada.",
    svg: ghostSvg("#7a7cff", `<circle cx="50" cy="86" r="12" fill="#fff"/><ellipse cx="50" cy="86" rx="5" ry="12" fill="none" stroke="#7a7cff" stroke-width="2"/><line x1="38" y1="86" x2="62" y2="86" stroke="#7a7cff" stroke-width="2"/>`) },
  { key: "mobile", name: "Kiro Mobile", year: "Y ahora…", line: "Kiro Mobile: desde el sofá.",
    svg: ghostSvg("#c06cff", `<rect x="40" y="76" width="20" height="26" rx="4" fill="#1b1233" stroke="#fff" stroke-width="2"/>`) },
  { key: "crew", name: "Kiro Crew", year: "Y ahora…", line: "Y Kiro Crew: ¡un equipo entero!",
    svg: ghostSvg("#ff8fb8", `<path d="M26 30h48l-8-14H34z" fill="#ffd54a"/><rect x="22" y="30" width="56" height="6" rx="3" fill="#f5b800"/>`) },
];
FAMILY.forEach((m) => { m.img = new Image(); m.img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(m.svg); });

// ======================================================================
// MÚSICA: chiptune con Web Audio
// ======================================================================
let ac = null, master = null, noiseBuf = null, schedId = null;
let musicOn = true, intensity = 0, nextTime = 0, stepN = 0;
const BPM = 128, SP = 60 / BPM / 4;                       // duración de una semicorchea
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const BASS = [48, 45, 41, 43];                            // Do, La menor, Fa, Sol
const CHORD = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]];
const LEAD = [
  [76, 0, 79, 0, 84, 0, 79, 0, 76, 0, 79, 0, 72, 0, 0, 0],
  [76, 0, 81, 0, 84, 0, 81, 0, 76, 0, 72, 0, 76, 0, 0, 0],
  [77, 0, 81, 0, 84, 0, 81, 0, 77, 0, 81, 0, 79, 0, 0, 0],
  [79, 0, 83, 0, 86, 0, 83, 0, 79, 0, 83, 0, 84, 0, 88, 0],
];

function startAudio() {
  if (ac) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  const comp = ac.createDynamicsCompressor();
  master = ac.createGain(); master.gain.value = musicOn ? 0.5 : 0;
  master.connect(comp); comp.connect(ac.destination);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  nextTime = ac.currentTime + 0.1; stepN = 0;
  schedId = setInterval(scheduler, 30);
}
function tone(type, freq, t, dur, vol, to) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function noise(t, dur, vol, hp) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
}
function scheduler() {
  while (nextTime < ac.currentTime + 0.15) { playStep(stepN, nextTime); nextTime += SP; stepN = (stepN + 1) % 64; }
}
function playStep(s, t) {
  const bar = s >> 4, k = s & 15;
  // melodía (siempre)
  const n = LEAD[bar][k];
  if (n) {
    tone("square", mtof(n), t, SP * 1.8, intensity >= 3 ? 0.07 : 0.05);
    if (intensity >= 3) tone("square", mtof(n + 12), t, SP * 1.2, 0.025);
  }
  // bajo (siempre)
  if (k % 2 === 0) tone("triangle", mtof(BASS[bar] + (k % 4 === 2 ? 12 : 0)), t, SP * 1.6, 0.18);
  // percusión
  if (intensity >= 1) {
    if (k % 4 === 0) tone("sine", 150, t, 0.12, 0.35, 45);
    if (k % 2 === 0) noise(t, 0.03, 0.06, 7000);
  }
  if (intensity >= 2) {
    if (k === 4 || k === 12) noise(t, 0.12, 0.16, 1500);
    tone("square", mtof(CHORD[bar][k % 4] + 12), t, SP * 0.9, 0.02);
  }
}
// efectos de sonido
const sfx = {
  jump() { if (ac) tone("square", 300, ac.currentTime, 0.18, 0.12, 700); },
  chomp() { if (!ac) return; const t = ac.currentTime;
    tone("square", 500, t, 0.08, 0.15, 200); tone("square", 450, t + 0.12, 0.08, 0.15, 180); },
  charge() { if (!ac) return; const t = ac.currentTime;
    tone("sawtooth", 150, t, 1.9, 0.12, 1800);
    tone("square", 300, t, 1.9, 0.05, 3000);
    noise(t, 1.9, 0.05, 3000); },
  boom() { if (!ac) return; const t = ac.currentTime;
    noise(t, 0.5, 0.3, 400);
    [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => tone("square", mtof(m), t + i * 0.06, 0.5, 0.09)); },
  pop() { if (ac) tone("sine", 400, ac.currentTime, 0.15, 0.25, 900); },
  fanfare() { if (!ac) return; const t = ac.currentTime;
    [72, 76, 79, 84, 79, 84, 88].forEach((m, i) => tone("square", mtof(m), t + i * 0.11, 0.3, 0.1)); },
};

// ======================================================================
// ESTADO DE LA ANIMACIÓN
// ======================================================================
let S, paused = false, started = false;
const FORMS = ["cw", "q", "kiro"];
const NAMES = [
  { a: "2022 · 2023", b: "CodeWhisperer" },
  { a: "2024", b: "Amazon Q Developer" },
  { a: "Verano 2025", b: "Kiro IDE" },
];
const $ = (id) => document.getElementById(id);

function reset() {
  S = { t: 0, pt: 0, phase: "walk", stage: 0, form: "cw", formT: 0,
        scroll: 0, speed: 0, walk: 0, hx: -90, mood: 0, moodT: 0,
        item: null, jump: -1, mouth: 0, lift: 0, tt: 0, swapped: false,
        banner: null, bubble: null, family: [], famIdx: 0, famT: 0, lastArrival: 0,
        particles: [], shake: 0, flash: 0, endT: 0 };
  intensity = 0;
  $("end").hidden = true;
  say("Había una vez un pequeño héroe llamado CW, de CodeWhisperer…");
  S.banner = { ...NAMES[0], t: 0 };
}
function say(text) { $("caption").textContent = text; }
function bubble(text, dur = 2.8) { S.bubble = { text, t: 0, dur }; }
function burst(x, y, n, colors, speed = 260) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 2 * PI, v = (0.3 + Math.random()) * speed;
    S.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0, max: 0.8 + Math.random() * 0.8,
      color: colors[i % colors.length], size: 3 + Math.random() * 5, g: 380 });
  }
}

// ---------- lógica ----------
function update(dt) {
  S.t += dt; S.pt += dt; S.formT += dt;
  S.flash = Math.max(0, S.flash - dt * 1.6);
  S.shake = Math.max(0, S.shake - dt * 2);
  S.mood += (S.moodT - S.mood) * Math.min(1, dt * 0.9);
  if (S.banner) { S.banner.t += dt; if (S.banner.t > 4.2) S.banner = null; }
  if (S.bubble) { S.bubble.t += dt; if (S.bubble.t > S.bubble.dur) S.bubble = null; }

  // velocidad del mundo
  const target = S.phase === "transform" ? 0 : S.phase === "end" ? 110 : 170;
  S.speed += (target - S.speed) * Math.min(1, dt * 4);
  S.scroll += S.speed * dt;
  S.walk += S.speed * dt * 0.055;
  S.hx = S.t < 2.2 ? lerp(-90, HERO_X, easeOut(S.t / 2.2)) : HERO_X;

  if (S.t > 3.2 && S.t - dt <= 3.2) bubble("¡Hola! Soy CW. Te susurro código.");

  if (S.phase === "walk") updateWalk(dt);
  else if (S.phase === "transform") updateTransform(dt);
  else if (S.phase === "family") updateFamily(dt);
  else if (S.phase === "end") updateEnd(dt);

  // salto del héroe
  if (S.jump >= 0) { S.jump += dt; if (S.jump > 0.75) S.jump = -1; }
  S.mouth = Math.max(0, S.mouth - dt);

  // partículas
  S.particles.forEach((p) => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; });
  S.particles = S.particles.filter((p) => p.life < p.max);
}

function updateWalk(dt) {
  if (S.stage < 2) {
    if (!S.item && S.pt > (S.stage === 0 ? 6.5 : 5.5)) S.item = { x: W + 40, kind: S.stage };
    if (S.item) {
      S.item.x -= S.speed * dt;
      const d = S.item.x - S.hx;
      if (d < 120 && S.jump < 0 && !S.item.jumped) { S.item.jumped = true; S.jump = 0; sfx.jump(); S.mouth = 0.6; }
      if (d < 45) startTransform();
    }
  } else if (S.pt > 6) {
    S.phase = "family"; S.famIdx = 0; S.famT = 0; S.pt = 0; intensity = 3;
  }
}

function startTransform() {
  S.item = null; S.phase = "transform"; S.tt = 0; S.swapped = false; S.mouth = 0.5;
  sfx.chomp(); setTimeout(sfx.charge, 350);
  say(S.stage === 0 ? "¡Ñam! Una baya mágica… algo está pasando." : "¡Ñam! Otra energía misteriosa…");
}

function updateTransform(dt) {
  S.tt += dt;
  const cx = S.hx, cy = FEET - 60;
  S.lift = S.tt < 0.5 ? 0 : S.tt < 2 ? 60 * easeOut((S.tt - 0.5) / 1.5) : Math.max(0, 60 * (1 - (S.tt - 2) / 0.35));
  if (S.tt > 0.5 && S.tt < 2) {
    for (let i = 0; i < 2; i++) {            // espiral de energía hacia el héroe
      const a = Math.random() * 2 * PI, r = 130;
      S.particles.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.8, vx: -Math.cos(a) * 180, vy: -Math.sin(a) * 150 - 40,
        life: 0, max: 0.7, size: 3 + Math.random() * 3, g: 0,
        color: S.stage === 0 ? "#7fd0ff" : "#c9a6ff" });
    }
  }
  if (S.tt >= 2 && !S.swapped) {
    S.swapped = true; S.stage += 1; S.form = FORMS[S.stage]; S.formT = 0;
    S.moodT = S.stage; S.flash = REDUCED ? 0.4 : 1; S.shake = REDUCED ? 0 : 0.6;
    S.banner = { ...NAMES[S.stage], t: 0 };
    sfx.boom(); intensity = S.stage;
    burst(cx, cy, 60, ["#fff", "#ffd54a", S.stage === 1 ? "#4f9bff" : "#c06cff"], 380);
    if (S.stage === 1) { say("¡Se convirtió en Amazon Q Developer! Ahora, además de sugerir, charla contigo."); bubble("¡Ahora también charlo contigo!", 3.2); }
    else { say("¡Otra evolución! Es Kiro: specs, agentes y mucho más."); bubble("¡Soy Kiro! Vamos a hacer specs.", 3.2); }
  }
  if (S.tt >= 3.4) { S.phase = "walk"; S.pt = 0; S.lift = 0; }
}

function updateFamily(dt) {
  S.famT += dt;
  if (S.famIdx < FAMILY.length && S.famT > 0) {
    const m = FAMILY[S.famIdx];
    S.family.push({ m, x: W + 70, tx: HERO_X + 110 * (S.famIdx + 1), state: "run", pop: 0, t: 0 });
    S.famIdx++; S.famT = -2.4;
  }
  S.family.forEach((f) => {
    f.t += dt;
    if (f.state === "run") {
      f.x -= 400 * dt;
      if (f.x <= f.tx) {
        f.x = f.tx; f.state = "idle"; f.pop = 0.5; sfx.pop();
        S.banner = { a: f.m.year, b: f.m.name, t: 0 }; say(f.m.line);
        burst(f.x, FEET - 50, 14, ["#fff", "#ffd54a", "#ff8fb8"], 200);
        S.lastArrival = S.pt;
      }
    } else f.pop = Math.max(0, f.pop - dt);
  });
  if (S.famIdx === FAMILY.length && S.family.every((f) => f.state === "idle") && S.pt - S.lastArrival > 2.5) {
    S.phase = "end"; S.endT = 0; sfx.fanfare(); S.banner = null;
    say("Y así crece la familia Kiro: ¡del susurro de CW a un equipo entero!");
    bubble("¡Somos la familia Kiro!", 4);
    $("end").hidden = false;
  }
}

function updateEnd(dt) {
  S.endT += dt;
  if (Math.random() < dt * 2.5) {          // fuegos artificiales suaves
    const x = 120 + Math.random() * 720, y = 70 + Math.random() * 150;
    burst(x, y, 26, ["#ffd54a", "#ff8fb8", "#7fd0ff", "#c06cff"], 200);
  }
}

// ======================================================================
// DIBUJO
// ======================================================================
// ---------- fondo ----------
const SKY = [["#7fd0ff", "#eaf8ff"], ["#2f7bff", "#a6d8ff"], ["#3a1b6e", "#ff9bbd"]];
const PAL = {
  farHill: ["#9bd8a8", "#6fb3e0", "#6a3d9a"], nearHill: ["#7cc98f", "#4f9a7f", "#44286f"],
  tree: ["#3fae6b", "#2f8f6a", "#35205a"], grass: ["#6fcf7f", "#4fb36f", "#3b2a66"],
  road: ["#ebd6a5", "#d9c08a", "#8a6a8f"],
};
function pal(name, m) { const i = Math.min(1, Math.floor(m)); return lerpC(PAL[name][i], PAL[name][i + 1], m - i); }

function drawBackground() {
  const c = ctx, m = S.mood, i = Math.min(1, Math.floor(m)), f = m - i;
  const g = c.createLinearGradient(0, 0, 0, 420);
  g.addColorStop(0, lerpC(SKY[i][0], SKY[i + 1][0], f)); g.addColorStop(1, lerpC(SKY[i][1], SKY[i + 1][1], f));
  c.fillStyle = g; c.fillRect(0, 0, W, H);

  // estrellas al atardecer
  const sa = clamp(m - 1.1, 0, 1);
  if (sa > 0) for (let n = 0; n < 50; n++) {
    c.globalAlpha = sa * (0.4 + 0.6 * Math.abs(Math.sin(S.t * 2 + n)));
    c.fillStyle = "#fff"; c.fillRect(hash(n) * W, hash(n + 50) * 220, 2, 2);
  }
  c.globalAlpha = 1;
  // sol
  const sy = 110 + (m > 1 ? (m - 1) * 215 : 0);
  const sc = lerpC("#fff3a0", "#ff8f6b", clamp(m - 0.8, 0, 1));
  const sg = c.createRadialGradient(770, sy, 10, 770, sy, 120);
  sg.addColorStop(0, sc); sg.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = sg; c.fillRect(600, sy - 150, 340, 300);
  ell(c, 770, sy, 46, 46, sc, null);
  // nubes
  for (let n = 0; n < 6; n++) {
    const x = (((hash(n) * 1400 - S.scroll * 0.12 - S.t * 6) % 1400) + 1400) % 1400 - 200, y = 50 + hash(n + 9) * 120;
    c.fillStyle = lerpC("#ffffff", "#ffd9ec", clamp(m - 1, 0, 1)); c.globalAlpha = 0.85;
    [[0, 0, 34], [32, 8, 26], [-32, 10, 24], [10, -14, 24]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(x + dx, y + dy, r, 0, 2 * PI); c.fill(); });
    c.globalAlpha = 1;
  }
  hills(0.25, 320, 45, 190, pal("farHill", m));
  hills(0.45, 370, 38, 140, pal("nearHill", m));
  // árboles
  const base = Math.floor(S.scroll * 0.7 / 230);
  for (let n = base - 1; n < base + 6; n++) {
    const sx = n * 230 - S.scroll * 0.7 + hash(n) * 90, th = 55 + hash(n + 3) * 40;
    c.fillStyle = "#6b4a2f"; c.fillRect(sx - 5, 418 - th, 10, th);
    c.fillStyle = pal("tree", m);
    c.beginPath(); c.arc(sx, 418 - th - 12, 30 + hash(n + 7) * 12, 0, 2 * PI); c.fill();
  }
  // césped y camino
  c.fillStyle = pal("grass", m); c.fillRect(0, 410, W, H - 410);
  c.fillStyle = pal("road", m); c.fillRect(0, 430, W, 80);
  c.fillStyle = "rgba(0,0,0,.12)"; c.fillRect(0, 430, W, 4); c.fillRect(0, 506, W, 4);
  c.fillStyle = "rgba(255,255,255,.35)";
  for (let n = Math.floor(S.scroll / 90) - 1; n < Math.floor(S.scroll / 90) + 12; n++) c.fillRect(n * 90 - S.scroll, 470, 44, 6);
  // valla
  for (let n = Math.floor(S.scroll / 140) - 1; n < Math.floor(S.scroll / 140) + 8; n++) {
    const x = n * 140 - S.scroll;
    c.fillStyle = "#f2e3c0"; c.fillRect(x, 392, 8, 38); c.fillRect(x - 70, 402, 140, 5);
  }
  // flores y matas delante
  for (let n = Math.floor(S.scroll * 1.3 / 80) - 1; n < Math.floor(S.scroll * 1.3 / 80) + 14; n++) {
    const x = n * 80 - S.scroll * 1.3 + hash(n) * 50, y = 515 + hash(n + 1) * 18;
    c.fillStyle = ["#ffd54a", "#ff8fb8", "#fff"][Math.abs(n) % 3]; c.beginPath(); c.arc(x, y, 4, 0, 2 * PI); c.fill();
    c.strokeStyle = "rgba(0,60,0,.4)"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + 4); c.lineTo(x, y + 12); c.stroke();
  }
}
function hills(par, base, amp, wl, color) {
  const c = ctx; c.fillStyle = color; c.beginPath(); c.moveTo(0, 420);
  for (let x = 0; x <= W; x += 8) {
    const w = x + S.scroll * par;
    c.lineTo(x, base - amp * (0.6 * Math.sin(w / wl) + 0.4 * Math.sin(w / (wl * 0.43) + 2)));
  }
  c.lineTo(W, 420); c.closePath(); c.fill();
}

// ---------- objetos mágicos ----------
function drawItem(it) {
  const c = ctx, y = FEET - 30 + Math.sin(S.t * 5) * 5, x = it.x;
  const col = it.kind === 0 ? "#5a8bff" : "#b06cff";
  const g = c.createRadialGradient(x, y, 4, x, y, 50);
  g.addColorStop(0, col + "cc"); g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g; c.fillRect(x - 55, y - 55, 110, 110);
  if (it.kind === 0) {                       // baya azul con una Q
    ell(c, x, y, 17, 17, "#4f7bff");
    ell(c, x - 6, y - 7, 4, 3, "#bfd0ff", null);
    c.fillStyle = "#3bbf6b"; c.beginPath(); c.ellipse(x + 7, y - 19, 9, 5, -0.6, 0, 2 * PI); c.fill();
    label(c, "Q", x + 1, y + 2, 16, "#fff");
  } else {                                   // orbe morado con una K
    ell(c, x, y, 19, 19, "#9a5cff");
    ell(c, x - 6, y - 7, 5, 4, "#e6d4ff", null);
    label(c, "K", x + 1, y + 2, 18, "#fff");
    for (let n = 0; n < 4; n++) {            // destellos que orbitan
      const a = S.t * 3 + n * PI / 2;
      ell(c, x + Math.cos(a) * 30, y + Math.sin(a) * 22, 3, 3, "#ffd54a", null);
    }
  }
}

// ---------- héroe ----------
function eyes(c, cy, dx, rx, ry, blink, look = 3) {
  for (const s of [-1, 1]) {
    ell(c, s * dx, cy, rx, ry * blink, "#fff", INK, 3);
    if (blink > 0.5) { ell(c, s * dx + look, cy + 2, rx * 0.5, ry * 0.6, INK, null); ell(c, s * dx + look + 2, cy - 2, 2.5, 2.5, "#fff", null); }
  }
}
function mouth(c, y, open) {
  if (open) { ell(c, 0, y + 2, 8, 10, "#5a1f3a", INK, 3); ell(c, 0, y + 7, 5, 3, "#ff7f9f", null); }
  else { c.beginPath(); c.arc(0, y - 4, 9, 0.15 * PI, 0.85 * PI); c.strokeStyle = INK; c.lineWidth = 3.5; c.lineCap = "round"; c.stroke(); }
}
function cape(c, x0, y0, len, color, w) {
  const s = (k) => Math.sin(w * 1.6 + k) * 7;
  c.beginPath(); c.moveTo(x0, y0);
  c.quadraticCurveTo(x0 - len * 0.5, y0 + 6 + s(0), x0 - len, y0 + 28 + s(1));
  c.lineTo(x0 - len + 6, y0 + 66 + s(2));
  c.quadraticCurveTo(x0 - len * 0.4, y0 + 56 + s(3), x0 + 6, y0 + 46);
  c.closePath(); c.fillStyle = color; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
}

// Dibuja el héroe con los pies en (0,0). o = {walk, mouth, blink}
function heroBody(c, form, o) {
  const sw = Math.sin(o.walk);
  c.lineJoin = "round";
  if (form === "cw") {
    for (const s of [-1, 1]) {                       // piernas
      const ph = Math.sin(o.walk + (s > 0 ? PI : 0));
      ell(c, s * 15 + ph * 9, -8 - Math.max(0, ph) * 9, 12, 8, "#6fa8dc");
    }
    c.save(); c.translate(0, -Math.abs(sw) * 4);
    for (const s of [-1, 1]) ell(c, s * 40, -46 + Math.sin(o.walk + (s > 0 ? 0 : PI)) * 6, 8, 12, "#a8d8ff");
    ell(c, 0, -52, 38, 42, "#a8d8ff");               // cuerpo
    c.beginPath(); c.moveTo(0, -94); c.quadraticCurveTo(-8, -112, 6, -112); c.quadraticCurveTo(14, -108, 8, -102); // mechón
    c.strokeStyle = INK; c.lineWidth = 4; c.lineCap = "round"; c.stroke();
    eyes(c, -64, 14, 10, 12, o.blink);
    ell(c, -26, -50, 7, 4, "rgba(255,120,150,.6)", null); ell(c, 26, -50, 7, 4, "rgba(255,120,150,.6)", null);
    mouth(c, -50, o.mouth > 0);
    rrect(c, -22, -40, 44, 24, 8); c.fillStyle = "#fff"; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
    label(c, "CW", 0, -27, 18, INK);
    c.restore();
  } else if (form === "q") {
    cape(c, -16, -78, 52, "#1f4fb8", o.walk);
    for (const s of [-1, 1]) {
      const ph = Math.sin(o.walk + (s > 0 ? PI : 0));
      ell(c, s * 17 + ph * 9, -9 - Math.max(0, ph) * 9, 13, 9, "#2d63d8");
    }
    c.save(); c.translate(0, -Math.abs(sw) * 4);
    for (const s of [-1, 1]) ell(c, s * 44, -62 - (s > 0 ? 14 : 0) + Math.sin(o.walk + (s > 0 ? 0 : PI)) * 5, 9, 13, "#4f9bff");
    ell(c, 0, -54, 42, 46, "#4f9bff");
    c.beginPath(); c.moveTo(0, -98); c.lineTo(0, -118); c.strokeStyle = INK; c.lineWidth = 4; c.stroke(); // antena
    c.shadowColor = "#ffd54a"; c.shadowBlur = 14; ell(c, 0, -122, 7, 7, "#ffd54a"); c.shadowBlur = 0;
    eyes(c, -68, 15, 11, 13, o.blink);
    mouth(c, -52, o.mouth > 0);
    c.shadowColor = "#bfe0ff"; c.shadowBlur = 18;   // emblema con la Q
    ell(c, 0, -30, 20, 20, "#fff", INK, 3.5); c.shadowBlur = 0;
    label(c, "Q", 0, -29, 28, "#2d63d8");
    c.restore();
  } else {                                            // kiro (fantasma)
    c.save(); c.translate(0, -12 - Math.abs(sw) * 5 - Math.sin(o.walk * 0.5) * 2);
    c.scale(1.3, 1.3); c.translate(-50, -100);
    cape(c, 24, 50, 44, "#ff5fa8", o.walk);
    const body = new Path2D("M12 100V50a38 38 0 0 1 76 0v50l-12-9-12 9-14-9-14 9-12-9z");
    c.fillStyle = "#8e5cff"; c.fill(body); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(body);
    for (const s of [-1, 1]) {
      ell(c, 50 + s * 12, 52, 8, 11 * o.blink, "#fff", INK, 2.5);
      if (o.blink > 0.5) { ell(c, 50 + s * 12 + 2, 54, 4, 6, INK, null); ell(c, 50 + s * 12 + 3, 51, 1.8, 1.8, "#fff", null); }
    }
    c.save(); c.translate(50, 70);
    if (o.mouth > 0) ell(c, 0, 2, 5, 6, "#5a1f3a", INK, 2); else { c.beginPath(); c.arc(0, -2, 7, 0.15 * PI, 0.85 * PI); c.strokeStyle = INK; c.lineWidth = 2.5; c.stroke(); }
    c.restore();
    c.shadowColor = "#e6d4ff"; c.shadowBlur = 10;
    ell(c, 50, 86, 9, 9, INK, "#fff", 1.5); c.shadowBlur = 0;
    label(c, "K", 50, 87, 12, "#fff");
    c.restore();
  }
}
const HEIGHT = { cw: 110, q: 135, kiro: 150 };
const SCALE = { cw: 1, q: 1.12, kiro: 1 };
const off = document.createElement("canvas"); off.width = 340; off.height = 300;
const octx = off.getContext("2d");

function drawHero() {
  const c = ctx, form = S.form, lift = S.lift + (S.jump >= 0 ? Math.sin(PI * S.jump / 0.75) * 85 : 0);
  const blink = (S.t % 4) > 3.85 ? 0.15 : 1;
  const o = { walk: S.walk, mouth: S.mouth, blink };
  const sc = SCALE[form];
  // sombra
  c.fillStyle = "rgba(0,0,0,.25)";
  c.beginPath(); c.ellipse(S.hx, FEET + 4, 44 * (1 - lift / 250), 10 * (1 - lift / 250), 0, 0, 2 * PI); c.fill();

  const charging = S.phase === "transform" && S.tt > 0.5 && !S.swapped;
  const squash = S.phase === "transform" && S.swapped && S.tt < 2.5 ? 1 + 0.12 * Math.sin((S.tt - 2) * 18) * Math.exp(-(S.tt - 2) * 3) : 1;
  if (charging) {
    // silueta blanca brillante que va ganando intensidad (sin parpadeos bruscos)
    octx.clearRect(0, 0, 340, 300); octx.save(); octx.translate(170, 260); octx.scale(sc, sc);
    heroBody(octx, form, o); octx.restore();
    octx.globalCompositeOperation = "source-in"; octx.fillStyle = "#fff"; octx.fillRect(0, 0, 340, 300);
    octx.globalCompositeOperation = "source-over";
    c.save(); c.translate(S.hx, FEET - lift);
    c.save(); c.scale(sc, sc); heroBody(c, form, { ...o, walk: S.walk + S.tt * 2 }); c.restore();
    c.globalAlpha = clamp((S.tt - 0.5) / 1.2) * (0.75 + 0.25 * Math.sin(S.tt * 8));
    c.shadowColor = "#fff"; c.shadowBlur = 25;
    c.drawImage(off, -170, -260); c.restore();
  } else {
    c.save(); c.translate(S.hx, FEET - lift); c.scale(sc * (2 - squash), sc * squash); heroBody(c, form, o); c.restore();
  }
}

// ---------- transformación estilo anime ----------
function drawTransformFx() {
  if (S.phase !== "transform") return;
  const c = ctx, tt = S.tt, cx = S.hx, cy = FEET - 70 - S.lift * 0.6;
  const k = clamp((tt - 0.4) / 0.8) * (tt < 2 ? 1 : clamp(1 - (tt - 2) / 0.6));
  if (k <= 0) return;
  c.save();
  // oscurecer un poco el escenario (viñeta)
  const v = c.createRadialGradient(cx, cy, 80, cx, cy, 620);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(10,5,30,${0.6 * k})`);
  c.fillStyle = v; c.fillRect(0, 0, W, H);
  // rayos giratorios
  c.translate(cx, cy); c.rotate(tt * 1.2);
  const col = S.stage === 0 ? "255,255,255" : "230,210,255";
  for (let n = 0; n < 16; n++) {
    const a = n * 2 * PI / 16;
    c.fillStyle = `rgba(${col},${(n % 2 ? 0.28 : 0.14) * k})`;
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 700, a, a + PI / 32 * (n % 2 ? 1.6 : 0.9)); c.closePath(); c.fill();
  }
  c.rotate(-tt * 1.2);
  // aura
  const g = c.createRadialGradient(0, 0, 10, 0, 0, 150 + 20 * Math.sin(tt * 6));
  g.addColorStop(0, `rgba(255,255,255,${0.9 * k})`); g.addColorStop(0.5, `rgba(${S.stage === 0 ? "120,190,255" : "180,120,255"},${0.5 * k})`); g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, 170, 0, 2 * PI); c.fill();
  // anillos
  c.strokeStyle = `rgba(255,255,255,${0.7 * k})`; c.lineWidth = 3;
  for (let n = 0; n < 3; n++) { const r = ((tt * 1.5 + n / 3) % 1); c.globalAlpha = (1 - r) * k; c.beginPath(); c.arc(0, 0, 40 + r * 140, 0, 2 * PI); c.stroke(); }
  c.restore();
  // líneas de velocidad (manga)
  c.save(); c.strokeStyle = `rgba(255,255,255,${0.5 * k})`; c.lineWidth = 2;
  for (let n = 0; n < 26; n++) {
    const a = hash(n) * 2 * PI, r0 = 200 + hash(n + 1) * 80 + ((tt * 600) % 120);
    c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.7); c.lineTo(cx + Math.cos(a) * (r0 + 70), cy + Math.sin(a) * (r0 + 70) * 0.7); c.stroke();
  }
  c.restore();
  // texto de carga
  if (tt > 0.8 && tt < 2) {
    c.save(); c.globalAlpha = k;
    c.translate(W / 2, 90 + Math.sin(tt * 20) * 2);
    c.lineWidth = 8; c.strokeStyle = INK; c.font = '900 52px "Arial Black", system-ui, sans-serif'; c.textAlign = "center"; c.textBaseline = "middle";
    const t = "¡EVOLUCIONANDO!"; c.strokeText(t, 0, 0); c.fillStyle = "#ffd54a"; c.fillText(t, 0, 0); c.restore();
  }
}

// ---------- familia ----------
function drawFamily() {
  const c = ctx;
  S.family.forEach((f, n) => {
    const hop = f.state === "run" ? Math.abs(Math.sin(f.t * 14)) * 22 : Math.abs(Math.sin(S.walk + n)) * 7;
    const sq = f.pop > 0 ? 1 + 0.25 * Math.sin(f.pop * 12) : 1;
    c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(f.x, FEET + 4, 30, 7, 0, 0, 2 * PI); c.fill();
    c.save(); c.translate(f.x, FEET - hop); c.scale(2 - sq, sq);
    c.drawImage(f.m.img, -40, -96, 80, 96); c.restore();
    if (f.state === "idle") {
      c.save(); rrect(c, f.x - 46, FEET - 130, 92, 22, 11); c.fillStyle = "rgba(43,29,79,.88)"; c.fill(); c.restore();
      label(c, f.m.name, f.x, FEET - 119, 13, "#fff");
    }
  });
}

// ---------- interfaz sobre la escena ----------
function drawBubble() {
  if (!S.bubble) return;
  const b = S.bubble, c = ctx, a = Math.min(1, b.t * 5, (b.dur - b.t) * 5);
  const x = Math.min(W - 150, Math.max(150, S.hx + 30)), y = FEET - HEIGHT[S.form] - 50 - S.lift;
  c.save(); c.globalAlpha = a; c.font = '700 17px system-ui, sans-serif';
  const w = c.measureText(b.text).width + 30;
  c.translate(x, y); c.scale(0.8 + 0.2 * a, 0.8 + 0.2 * a);
  rrect(c, -w / 2, -22, w, 40, 14); c.fillStyle = "#fff"; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
  c.beginPath(); c.moveTo(-10, 18); c.lineTo(-18, 32); c.lineTo(4, 18); c.fillStyle = "#fff"; c.fill();
  label(c, b.text, 0, -2, 17, INK);
  c.restore();
}
function drawBanner() {
  if (!S.banner) return;
  const b = S.banner, c = ctx;
  const inK = clamp(b.t / 0.5), outK = clamp((4.2 - b.t) / 0.5);
  const x = lerp(-420, 20, easeOut(Math.min(inK, outK)));
  c.save(); c.translate(x, 18);
  rrect(c, 0, 0, 380, 78, 18);
  const g = c.createLinearGradient(0, 0, 380, 0); g.addColorStop(0, "rgba(43,29,79,.92)"); g.addColorStop(1, "rgba(90,50,160,.92)");
  c.fillStyle = g; c.fill(); c.strokeStyle = "#ffd54a"; c.lineWidth = 3; c.stroke();
  label(c, b.a, 20, 24, 15, "#ffd54a", "left");
  label(c, b.b, 20, 54, b.b.length > 16 ? 26 : 32, "#fff", "left");
  c.restore();
}
function drawStrip() {   // CW -> Q -> K, progreso de la evolución
  const c = ctx, items = [["CW", "#a8d8ff"], ["Q", "#4f9bff"], ["K", "#8e5cff"]];
  items.forEach(([t, col], n) => {
    const x = W - 150 + n * 60, y = 45, on = S.stage >= n;
    if (n) { c.strokeStyle = on ? "#ffd54a" : "rgba(255,255,255,.35)"; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 38, y); c.lineTo(x - 24, y); c.stroke(); }
    c.save(); c.globalAlpha = on ? 1 : 0.4;
    if (S.stage === n) { c.shadowColor = col; c.shadowBlur = 12 + 6 * Math.sin(S.t * 4); }
    ell(c, x, y, 20, 20, on ? col : "#555", "#fff", 3); c.shadowBlur = 0;
    label(c, t, x, y + 1, t.length > 1 ? 14 : 18, on && n < 2 ? INK : "#fff"); c.restore();
  });
}
function drawTitle() {
  if (S.t > 4) return;
  const a = S.t < 3 ? Math.min(1, S.t) : 1 - (S.t - 3);
  const c = ctx; c.save(); c.globalAlpha = Math.max(0, a);
  c.lineWidth = 8; c.strokeStyle = INK; c.lineJoin = "round";
  c.font = '900 58px "Arial Black", system-ui, sans-serif'; c.textAlign = "center"; c.textBaseline = "middle";
  c.strokeText("La evolución de Kiro", W / 2, 190); c.fillStyle = "#fff"; c.fillText("La evolución de Kiro", W / 2, 190);
  c.font = '800 24px system-ui, sans-serif'; c.lineWidth = 5;
  c.strokeText("De CodeWhisperer a toda la familia", W / 2, 240); c.fillStyle = "#ffd54a"; c.fillText("De CodeWhisperer a toda la familia", W / 2, 240);
  c.restore();
}
function drawEndTitle() {
  if (S.phase !== "end") return;
  const a = clamp(S.endT / 0.8), c = ctx; c.save(); c.globalAlpha = a; c.translate(W / 2, 80 + (1 - a) * -30);
  c.lineWidth = 8; c.strokeStyle = INK; c.lineJoin = "round"; c.font = '900 56px "Arial Black", system-ui, sans-serif'; c.textAlign = "center"; c.textBaseline = "middle";
  c.strokeText("La familia Kiro", 0, 0); c.fillStyle = "#ffd54a"; c.fillText("La familia Kiro", 0, 0); c.restore();
}
function drawParticles() {
  const c = ctx;
  S.particles.forEach((p) => {
    c.globalAlpha = clamp(1 - p.life / p.max); c.fillStyle = p.color;
    c.save(); c.translate(p.x, p.y); c.rotate(p.life * 5);
    c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); c.restore();
  });
  c.globalAlpha = 1;
}

function draw() {
  const c = ctx;
  c.save();
  if (S.shake > 0 && !REDUCED) c.translate((Math.random() - 0.5) * 14 * S.shake, (Math.random() - 0.5) * 14 * S.shake);
  drawBackground();
  if (S.item) drawItem(S.item);
  drawFamily();
  drawHero();
  drawTransformFx();
  drawParticles();
  drawBubble();
  c.restore();
  drawStrip(); drawBanner(); drawTitle(); drawEndTitle();
  if (S.flash > 0) { c.fillStyle = `rgba(255,255,255,${S.flash})`; c.fillRect(0, 0, W, H); }
}

// ======================================================================
// BUCLE Y CONTROLES
// ======================================================================
let last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (ts - last) / 1000 || 0) * SPEED; last = ts;
  if (started && !paused) update(dt);
  draw();
}

$("go").onclick = () => { started = true; $("start").hidden = true; startAudio(); };
$("replay").onclick = () => { reset(); started = true; paused = false; $("pause").textContent = "⏸ Pausa"; };
$("pause").onclick = () => {
  paused = !paused; $("pause").textContent = paused ? "▶ Seguir" : "⏸ Pausa";
  if (ac) paused ? ac.suspend() : ac.resume();
};
$("mute").onclick = () => {
  musicOn = !musicOn; $("mute").textContent = musicOn ? "🔊 Música" : "🔇 Sin música";
  if (master) master.gain.setTargetAtTime(musicOn ? 0.5 : 0, ac.currentTime, 0.05);
};

reset();
requestAnimationFrame(frame);
