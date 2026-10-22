// La familia Kiro crece: animación por etapas.
// Cada etapa añade personajes nuevos; los anteriores se hacen pequeños ("abuelos").

// Cuerpo de fantasma con ojos; "extra" dibuja el accesorio de cada personaje.
function ghost(color, extra = "", eyes = "#2b1d4f") {
  return `<svg viewBox="0 0 100 120" aria-hidden="true">
    <path d="M12 100V50a38 38 0 0 1 76 0v50l-12-9-12 9-14-9-14 9-12-9z" fill="${color}"/>
    <ellipse class="eye" cx="38" cy="52" rx="6" ry="9" fill="${eyes}"/>
    <ellipse class="eye" cx="62" cy="52" rx="6" ry="9" fill="${eyes}"/>
    ${extra}</svg>`;
}

const text = (x, y, s, size, fill) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" fill="${fill}" text-anchor="middle" font-family="monospace">${s}</text>`;

// Los personajes de la familia
const PALS = {
  cw: { name: "CodeWhisperer", say: "psst… prueba esto",
    svg: ghost("#a8d8ff", `<path d="M20 22q-10 0-8-9t14-6q4-9 16-3t10 12q10 2 4 10z" fill="#fff" transform="translate(18 -6) scale(.7)"/>${text(50, 12, "…", 22, "#4a6a8a")}`) },
  q: { name: "Amazon Q Developer", say: "¿Charlamos?",
    svg: ghost("#5aa2ff", `<line x1="50" y1="14" x2="50" y2="2" stroke="#fff" stroke-width="3"/><circle cx="50" cy="2" r="5" fill="#ffd54a"/>${text(50, 88, "Q", 26, "#fff")}`) },
  ide: { name: "Kiro IDE", say: "¡Hagamos specs!",
    svg: ghost("#8e5cff", `<rect x="30" y="72" width="40" height="22" rx="4" fill="#1b1233"/>${text(50, 88, "&lt;/&gt;", 13, "#9cf")}`) },
  cli: { name: "Kiro CLI", say: "Vivo en la terminal",
    svg: ghost("#3a3350", `<rect x="26" y="70" width="48" height="24" rx="4" fill="#0e0a1a"/>${text(50, 88, "&gt;_", 15, "#5f5")}`, "#fff") },
  agent: { name: "Agente autónomo", say: "Yo me encargo",
    svg: ghost("#b48cff", `<line x1="50" y1="14" x2="50" y2="2" stroke="#fff" stroke-width="3"/><path d="M50-8l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#ffd54a" transform="translate(0 6)"/><path d="M40 78h20l-4 12H44z" fill="#fff"/>`) },
  web: { name: "Kiro Web", say: "Sin instalar nada",
    svg: ghost("#7a7cff", `<circle cx="50" cy="82" r="13" fill="#fff"/><ellipse cx="50" cy="82" rx="6" ry="13" fill="none" stroke="#7a7cff" stroke-width="2"/><line x1="37" y1="82" x2="63" y2="82" stroke="#7a7cff" stroke-width="2"/>`) },
  mobile: { name: "Kiro Mobile", say: "Desde el sofá",
    svg: ghost("#c06cff", `<rect x="40" y="70" width="20" height="30" rx="4" fill="#1b1233" stroke="#fff" stroke-width="2"/><circle cx="50" cy="94" r="2" fill="#fff"/>`) },
  crew: { name: "Kiro Crew", say: "Somos un equipo",
    svg: ghost("#ff8fb8", `<path d="M26 28h48l-8-14H34z" fill="#ffd54a"/><rect x="22" y="28" width="56" height="6" rx="3" fill="#f5b800"/>`) },
};

// Las etapas. "add" = personajes que llegan en esta etapa.
const STAGES = [
  { label: "2022", year: "2022 · 2023", add: ["cw"], bg: "#1c2b4a",
    text: "Todo empezó con un susurro: CodeWhisperer sugería código mientras escribías." },
  { label: "2024", year: "2024", add: ["q"], bg: "#14337a",
    text: "CodeWhisperer crece y se convierte en Amazon Q Developer: ahora también conversa contigo." },
  { label: "Jul 2025", year: "Verano 2025", add: ["ide"], bg: "#2c1a63",
    text: "¡Nace Kiro IDE! Convierte tus ideas en specs: requisitos, diseño y tareas." },
  { label: "Nov 2025", year: "Noviembre 2025", add: ["cli"], bg: "#241f33",
    text: "Llega su hermano Kiro CLI. El Q Developer CLI se transforma en Kiro CLI y Kiro llega a tu terminal." },
  { label: "Ahora", year: "Y ahora…", add: ["agent", "web", "mobile", "crew"], bg: "#3a1a55", party: true,
    text: "¡La familia completa! IDE, CLI, agente autónomo, Web, Mobile y Crew: el mismo contexto en todas partes." },
];

const $ = (id) => document.getElementById(id);
const cast = $("cast"), timeline = $("timeline"), playBtn = $("play");
let current = -1, timer = null, playing = true;
const STEP_MS = 6000;

// Dibuja la etapa i (sirve para avanzar, retroceder o saltar)
function show(i) {
  const prev = current;
  current = i;
  document.body.style.background = STAGES[i].bg;
  $("year").textContent = STAGES[i].year;
  $("caption").textContent = STAGES[i].text;

  cast.innerHTML = "";
  STAGES.slice(0, i + 1).forEach((st, n) => {
    st.add.forEach((key) => {
      const p = PALS[key];
      const el = document.createElement("div");
      const isNew = n === i;
      el.className = "pal" + (isNew ? " new" : " old") + (i === STAGES.length - 1 && isNew ? " big" : "");
      // Solo animamos de verdad si avanzamos desde la etapa anterior
      if (isNew && prev !== i - 1 && prev !== -1) el.classList.remove("new");
      el.innerHTML = (isNew ? `<div class="bubble">${p.say}</div>` : "") + p.svg + `<b>${p.name}</b>`;
      cast.appendChild(el);
    });
  });
  [...timeline.children].forEach((b, n) => b.classList.toggle("on", n === i));
  if (STAGES[i].party && !matchMedia("(prefers-reduced-motion: reduce)").matches) confetti();
}

function confetti() {
  const stage = $("stage"), colors = ["#ffd54a", "#8e5cff", "#5aa2ff", "#ff8fb8", "#5f5"];
  for (let n = 0; n < 40; n++) {
    const c = document.createElement("i");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "%";
    c.style.background = colors[n % colors.length];
    c.style.animationDuration = 2 + Math.random() * 2.5 + "s";
    stage.appendChild(c);
    setTimeout(() => c.remove(), 5000);
  }
}

function schedule() {
  clearTimeout(timer);
  if (!playing) return;
  // Al llegar al final, se queda quieta disfrutando de la fiesta
  if (current < STAGES.length - 1) timer = setTimeout(() => { show(current + 1); schedule(); }, STEP_MS);
  else { playing = false; playBtn.textContent = "↻ Repetir"; }
}

function go(i) {
  show(Math.max(0, Math.min(STAGES.length - 1, i)));
  schedule();
}

// Controles
STAGES.forEach((st, n) => {
  const b = document.createElement("button");
  b.textContent = st.label;
  b.onclick = () => go(n);
  timeline.appendChild(b);
});
$("prev").onclick = () => go(current - 1);
$("next").onclick = () => go(current + 1);
playBtn.onclick = () => {
  if (playBtn.textContent.includes("Repetir")) { playing = true; playBtn.textContent = "⏸ Pausa"; go(0); return; }
  playing = !playing;
  playBtn.textContent = playing ? "⏸ Pausa" : "▶ Seguir";
  schedule();
};

show(0);
schedule();
