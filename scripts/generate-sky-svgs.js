// Generates the night-sky SVGs for the profile README (dark + light variants).
// Usage: node scripts/generate-sky-svgs.js   (edit GROUPS / STEPS below, then rerun)
const fs = require("fs");
const path = require("path");
const out = process.argv[2] || path.join(__dirname, "..", "assets");

const THEMES = {
  dark:  { star: "#F7F700", sky: "#38BDF8", text: "#E2E8F0", muted: "#94A3B8", line: "#38BDF8", surface: "#0B1222", dust: "#F7F700",
           lights: ["#F87171", "#F7F700", "#4ADE80", "#38BDF8", "#F472B6"] },
  light: { star: "#A16207", sky: "#0369A1", text: "#0F172A", muted: "#475569", line: "#0369A1", surface: "#F1F5F9", dust: "#A16207",
           lights: ["#B91C1C", "#A16207", "#15803D", "#0369A1", "#BE185D"] },
};
const FONT = "Segoe UI, Ubuntu, Helvetica, Arial, sans-serif";
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Deterministic pseudo-random so regenerating gives identical files.
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

// Christmas-light cycle: each color is on for ~2/3 of its slot, then dims before the next one.
const CYCLE = 6;
function xmasKeyframes(colors) {
  const slot = 100 / colors.length;
  const pct = n => +n.toFixed(2);
  const on = colors.map((c, i) => `${pct(i * slot)}%{fill:${c};opacity:1}${pct(i * slot + slot * 0.66)}%{opacity:.2}`).join("");
  const halo = colors.map((c, i) => `${pct(i * slot)}%{fill:${c}}`).join("");
  return `@keyframes xm{${on}100%{fill:${colors[0]};opacity:1}}\n@keyframes xh{${halo}100%{fill:${colors[0]}}}`;
}

const css = t => `<style>
.tw{animation:tw 3.2s ease-in-out infinite}
.pulse{animation:pulse 2.4s ease-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes tw{50%{opacity:.25}}
@keyframes pulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.6);opacity:0}}
.xm{animation:xm ${CYCLE}s step-end infinite}
.xh{animation:xh ${CYCLE}s step-end infinite}
${xmasKeyframes(t.lights)}
@media (prefers-reduced-motion:reduce){.tw,.pulse,.xm,.xh{animation:none}}
text{font-family:${FONT}}
</style>`;

function dust(w, h, n, t, seed) {
  const r = rng(seed);
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = (r() * w).toFixed(1), y = (r() * h).toFixed(1), rad = (0.4 + r() * 0.9).toFixed(2);
    const op = (0.25 + r() * 0.5).toFixed(2), d = (r() * 3).toFixed(2);
    s += `<circle class="tw" style="animation-delay:${d}s" cx="${x}" cy="${y}" r="${rad}" fill="${t.dust}" opacity="${op}"/>`;
  }
  return s;
}

// ---------- 1. Tech-stack constellation ----------
const GROUPS = [
  { name: "FRONTEND", nodes: [["React", -75, 115], ["JS / TS", 45, 95], ["Angular", 95, 175], ["Ionic", 5, 225], ["Tailwind", -95, 265], ["Vite", 65, 305]],
    edges: [[0, 1], [1, 2], [2, 3], [0, 3], [3, 4], [3, 5]] },
  { name: "BACKEND", nodes: [["C#", -90, 110], [".NET", 5, 145], ["NestJS", 95, 100], ["Node.js", 75, 225], ["Express", -10, 290], ["Python", -100, 240]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 1]] },
  { name: "DATA", nodes: [["SQL Server", -55, 105], ["PostgreSQL", 75, 150], ["MySQL", -95, 205], ["MongoDB", 40, 245], ["Supabase", -30, 315]],
    edges: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]] },
  { name: "SECURITY & OPS", nodes: [["Blue Team", 0, 100], ["Linux", -95, 155], ["Docker", 90, 165], ["GH Actions", -65, 255], ["Git", 85, 265], ["n8n", 5, 320]],
    edges: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5]] },
];

function constellation(t) {
  const W = 1200, H = 370;
  let body = dust(W, H, 70, t, 7);
  const phase = rng(42);
  GROUPS.forEach((g, gi) => {
    const cx = 150 + gi * 300;
    const pts = g.nodes.map(([, dx, y]) => [cx + dx, y]);
    body += `<text x="${cx}" y="42" text-anchor="middle" font-size="15" font-weight="700" letter-spacing="3" fill="${t.sky}">${esc(g.name)}</text>`;
    body += g.edges.map(([a, b]) =>
      `<line x1="${pts[a][0]}" y1="${pts[a][1]}" x2="${pts[b][0]}" y2="${pts[b][1]}" stroke="${t.line}" stroke-opacity=".35" stroke-width="1.4" stroke-dasharray="2 5" stroke-linecap="round"/>`).join("");
    // Christmas lights: every star runs the same color cycle, only the start offset differs,
    // so none reads as "the main one".
    g.nodes.forEach(([label], i) => {
      const [x, y] = pts[i], r = 5;
      const delay = `animation-delay:-${(phase() * CYCLE).toFixed(2)}s`;
      body += `<circle class="xh" style="${delay}" cx="${x}" cy="${y}" r="${r * 2.6}" fill="${t.star}" opacity=".18"/>`;
      body += `<circle class="xm" style="${delay}" cx="${x}" cy="${y}" r="${r}" fill="${t.star}"/>`;
      body += `<text x="${x}" y="${y + r + 18}" text-anchor="middle" font-size="15" font-weight="600" fill="${t.text}">${esc(label)}</text>`;
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${css(t)}${body}</svg>\n`;
}

// ---------- 2. Security-journey timeline ----------
// state: done | now | ongoing
const STEPS = [
  ["2023 – May 2026", "Programming Technician", "UTN · FRA", "done", "Graduated"],
  ["Aug – Sep 2026", "Cybersecurity Foundations", "BASE4 Security · 40 h", "done", "Certified"],
  ["Sep – Nov 2026", "Cybersecurity Essentials", "Cisco NetAcad · 70 h", "now", "In progress"],
  ["Sep – Nov 2026", "Networking & SysAdmin", "Cisco NetAcad · 60 h", "now", "In progress"],
  ["Ongoing", "Blue & Red Team Labs", "CyberDefenders · HTB · THM", "ongoing", "Ongoing"],
];

function timeline(t) {
  const W = 1200, H = 290, Y = 120, X0 = 120, STEP = 240;
  let body = dust(W, H, 45, t, 11);
  const lastDone = STEPS.map(s => s[3]).lastIndexOf("done");
  const xDone = X0 + lastDone * STEP;
  body += `<line x1="60" y1="${Y}" x2="${xDone}" y2="${Y}" stroke="${t.star}" stroke-width="3" stroke-linecap="round"/>`;
  body += `<line x1="${xDone}" y1="${Y}" x2="1150" y2="${Y}" stroke="${t.sky}" stroke-opacity=".6" stroke-width="3" stroke-dasharray="6 8" stroke-linecap="round"/>`;
  STEPS.forEach(([date, title, org, state, status], i) => {
    const x = X0 + i * STEP;
    const color = state === "done" ? t.star : t.sky;
    body += `<text x="${x}" y="${Y - 34}" text-anchor="middle" font-size="15" font-weight="700" fill="${t.sky}">${esc(date)}</text>`;
    if (state === "done") {
      body += `<circle cx="${x}" cy="${Y}" r="20" fill="${t.star}" opacity=".15"/><circle cx="${x}" cy="${Y}" r="10" fill="${t.star}"/>`;
    } else {
      if (state === "now") body += `<circle class="pulse" cx="${x}" cy="${Y}" r="10" fill="${t.sky}"/>`;
      body += `<circle cx="${x}" cy="${Y}" r="10" fill="${t.surface}" stroke="${t.sky}" stroke-width="3"/>`;
    }
    body += `<text x="${x}" y="${Y + 52}" text-anchor="middle" font-size="16" font-weight="700" fill="${t.text}">${esc(title)}</text>`;
    body += `<text x="${x}" y="${Y + 76}" text-anchor="middle" font-size="14" fill="${t.muted}">${esc(org)}</text>`;
    const label = (state === "done" ? "✓ " : state === "now" ? "◔ " : "↻ ") + status;
    const cw = label.length * 8.4 + 26;
    body += `<rect x="${x - cw / 2}" y="${Y + 94}" width="${cw}" height="28" rx="14" fill="${color}" fill-opacity=".14" stroke="${color}" stroke-opacity=".55"/>`;
    body += `<text x="${x}" y="${Y + 113}" text-anchor="middle" font-size="13" font-weight="700" fill="${color}">${esc(label)}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${css(t)}${body}</svg>\n`;
}

for (const [name, fn] of [["stack-constellation", constellation], ["timeline", timeline]]) {
  fs.writeFileSync(path.join(out, `${name}.svg`), fn(THEMES.dark));
  fs.writeFileSync(path.join(out, `${name}-light.svg`), fn(THEMES.light));
}
console.log("ok");
