/*
 * Illustration templates for posts without a photo: a drawn scene of a common school object
 * plus yellow measurement labels, in the style of the built-in Basic illustrations. The teacher
 * picks a template and fills each label's name, value and unit; the scene itself is fixed.
 * Pure string building (no DOM), so it renders the same in the post window, the editor preview
 * and the printed worksheet.
 */

export interface FigureLabel { name: string; value: string; unit: string; show: boolean }
export interface PostFigure { tpl: string; labels: FigureLabel[] }

export const FIG_LIMITS = { name: 40, value: 16, unit: 10 };

interface Slot { name: string; value: string; unit: string; lx: number; ly: number; ax: number | null; ay: number | null }
interface Template { id: string; title: string; desc: string; slots: Slot[]; draw: () => string }

const W = 1200, H = 600, G = 470, INK = "#2A2200", K = 1.35;

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** One label: tape-yellow box, optional dashed pointer to (ax, ay). Keeps the box inside the picture. */
function tag(x: number, y: number, txt: string, ax: number | null, ay: number | null): string {
  const w = Math.round((txt.length * 8.7 + 24) * K), h = Math.round(30 * K);
  x = Math.max(6, Math.min(x, W - w - 6));
  let ln = "";
  if (ax != null && ay != null) {
    const cx = Math.max(x, Math.min(ax, x + w)), cy = ay < y ? y : ay > y + h ? y + h : y + h / 2;
    ln = `<line x1="${cx}" y1="${cy}" x2="${ax}" y2="${ay}" stroke="${INK}" stroke-width="${2 * K}" stroke-dasharray="5 4"/><circle cx="${ax}" cy="${ay}" r="${5 * K}" fill="#F7C948" stroke="${INK}" stroke-width="2"/>`;
  }
  return `${ln}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#F7C948" stroke="${INK}" stroke-width="1.5"/><text x="${x + 12 * K}" y="${y + 20 * K}" font-family="JetBrains Mono,Menlo,monospace" font-size="${14.5 * K}" font-weight="700" fill="${INK}">${esc(txt)}</text>`;
}

/* ---------- shared scenery ---------- */

const sky = (id: string) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9D2E4"/><stop offset="1" stop-color="#E7F2F1"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/><g fill="#fff" opacity=".8"><ellipse cx="220" cy="80" rx="90" ry="20"/><ellipse cx="900" cy="60" rx="110" ry="24"/></g>`;
const paving = `<rect x="0" y="${G}" width="${W}" height="${H - G}" fill="#D7D2C5"/>${Array.from({ length: 31 }, (_, i) => `<line x1="${i * 40}" y1="${G}" x2="${i * 40 - 30}" y2="${H}" stroke="#C3BDAE" stroke-width="2"/>`).join("")}`;
const grass = `<rect x="0" y="${G}" width="${W}" height="${H - G}" fill="#8DB873"/>`;
const bushes = `<g fill="#8DB283">${Array.from({ length: 21 }, (_, i) => `<ellipse cx="${i * 60}" cy="${G - 6}" rx="${46 + (i * 37) % 24}" ry="${22 + (i * 17) % 14}"/>`).join("")}</g>`;
const person = (x: number, h = 64) => `<rect x="${x - 7}" y="${G - h * .45}" width="6" height="${h * .45}" fill="#2B3445"/><rect x="${x + 1}" y="${G - h * .45}" width="6" height="${h * .45}" fill="#2B3445"/><rect x="${x - 10}" y="${G - h * .85}" width="20" height="${h * .42}" rx="4" fill="#2F7D6B"/><circle cx="${x}" cy="${G - h * .92}" r="${h * .1}" fill="#B07A52"/>`;
const tree = (x: number, s = 1) => `<rect x="${x - 8 * s}" y="${G - 110 * s}" width="${16 * s}" height="${110 * s}" fill="#6E5235"/><circle cx="${x}" cy="${G - 150 * s}" r="${62 * s}" fill="#5B8C50"/><circle cx="${x - 40 * s}" cy="${G - 120 * s}" r="${40 * s}" fill="#4F7F45"/><circle cx="${x + 42 * s}" cy="${G - 118 * s}" r="${38 * s}" fill="#4F7F45"/>`;
const tape = (x1: number, x2: number, y: number) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#F2B705" stroke-width="7"/>`;

/* ---------- templates ---------- */

const s = (name: string, value: string, unit: string, lx: number, ly: number, ax: number | null = null, ay: number | null = null): Slot => ({ name, value, unit, lx, ly, ax, ay });

export const TEMPLATES: Template[] = [
  {
    id: "tiang", title: "Tiang bendera", desc: "Tinggi dengan sudut elevasi",
    slots: [s("Sudut elevasi", "48", "°", 330, 250, 382, 412), s("Tinggi mata", "1,5", "m", 120, 330, 372, 418), s("Jarak ke tiang", "10", "m", 430, 520, 620, G + 8), s("Tinggi pagar", "2", "m", 940, 330, 1010, G - 52)],
    draw: () => `${sky("skyT")}${bushes}${paving}
      <g stroke="#4F5B60" stroke-width="5">${Array.from({ length: 9 }, (_, i) => `<line x1="${930 + i * 32}" y1="${G - 52}" x2="${930 + i * 32}" y2="${G}"/>`).join("")}</g><rect x="930" y="${G - 52}" width="260" height="6" fill="#4F5B60"/>
      <rect x="770" y="${G - 14}" width="60" height="14" fill="#A49C8B"/><rect x="797" y="${G - 330}" width="6" height="330" fill="#C9CED2"/><circle cx="800" cy="${G - 334}" r="6" fill="#D9B44A"/>
      <rect x="803" y="${G - 324}" width="84" height="28" fill="#D7262E"/><rect x="803" y="${G - 296}" width="84" height="28" fill="#FAFAFA"/>
      ${person(370)}<line x1="380" y1="${G - 58}" x2="800" y2="${G - 330}" stroke="#BF3A2B" stroke-width="2.5" stroke-dasharray="8 6"/>
      <line x1="380" y1="${G - 58}" x2="800" y2="${G - 58}" stroke="${INK}" stroke-width="1.5" stroke-dasharray="4 5" opacity=".6"/>${tape(370, 800, G + 8)}`,
  },
  {
    id: "tandon", title: "Tandon air", desc: "Volume tabung, taksiran dengan pembanding",
    slots: [s("Keliling tandon", "377", "cm", 60, 280, 330, 380), s("Tinggi orang", "170", "cm", 700, 250, 640, G - 60), s("Panjang pipa", "3", "m", 520, 120, 560, 196)],
    draw: () => `${sky("skyD")}<rect x="0" y="150" width="${W}" height="${G - 150}" fill="#E8DDC6"/>${Array.from({ length: 10 }, (_, i) => `<line x1="0" y1="${170 + i * 30}" x2="${W}" y2="${170 + i * 30}" stroke="#D6CAB0" stroke-width="2"/>`).join("")}
      <rect x="900" y="250" width="120" height="100" fill="#7FA2B2" stroke="#B8A888" stroke-width="6"/>${grass}
      <ellipse cx="330" cy="250" rx="110" ry="24" fill="#3A84A6"/><rect x="220" y="250" width="220" height="${G - 250}" fill="#2F6F8F"/><ellipse cx="330" cy="${G}" rx="110" ry="24" fill="#245A75"/>
      <rect x="250" y="250" width="22" height="${G - 250}" fill="#3A84A6" opacity=".6"/><ellipse cx="330" cy="380" rx="110" ry="24" fill="none" stroke="#F2B705" stroke-width="5"/>
      <rect x="440" y="190" width="260" height="12" fill="#9AA3A8"/>${person(640, 130)}`,
  },
  {
    id: "ramp", title: "Ramp", desc: "Sudut kemiringan dari tinggi dan panjang",
    slots: [s("Tinggi tiap anak tangga", "15", "cm", 600, 200, 900, G - 45), s("Ubin lantai", "30 cm × 30 cm", "", 120, 520, 330, G + 30), s("Lebar ramp", "120", "cm", 160, 230, 420, G - 40)],
    draw: () => `${sky("skyR")}<rect x="820" y="140" width="${W - 820}" height="${G - 140}" fill="#E8DDC6"/><rect x="800" y="130" width="${W - 800}" height="14" fill="#9C4A38"/><rect x="960" y="300" width="80" height="${G - 300}" fill="#6B5A44"/>
      <rect x="0" y="${G}" width="${W}" height="${H - G}" fill="#D9D6CE"/>${Array.from({ length: 21 }, (_, i) => `<line x1="${i * 60}" y1="${G}" x2="${i * 60}" y2="${H}" stroke="#BDB8AC" stroke-width="2"/>`).join("")}<line x1="0" y1="${G + 60}" x2="${W}" y2="${G + 60}" stroke="#BDB8AC" stroke-width="2"/>
      <polygon points="180,${G} 880,${G - 90} 880,${G}" fill="#B9B4A8"/><line x1="180" y1="${G - 40}" x2="880" y2="${G - 130}" stroke="#555" stroke-width="5"/>${Array.from({ length: 6 }, (_, i) => `<line x1="${200 + i * 130}" y1="${G - 40 - i * 17}" x2="${200 + i * 130}" y2="${G - i * 17}" stroke="#555" stroke-width="4"/>`).join("")}
      <rect x="880" y="${G - 90}" width="80" height="45" fill="#C8C2B4"/><rect x="880" y="${G - 45}" width="80" height="45" fill="#B9B4A8"/>`,
  },
  {
    id: "tangga", title: "Tangga", desc: "Tinggi total dari anak tangga",
    slots: [s("Tinggi satu anak tangga", "17", "cm", 640, 300, 760, G - 17), s("Lebar pijakan", "28", "cm", 600, 200, 600, G - 136), s("Jumlah anak tangga", "12", "buah", 80, 160)],
    draw: () => `${sky("skyS")}<rect x="0" y="120" width="${W}" height="${G - 120}" fill="#E8DDC6"/>${paving}
      ${Array.from({ length: 12 }, (_, i) => `<rect x="${300 + i * 40}" y="${G - (i + 1) * 17}" width="${(12 - i) * 40 + 40}" height="17" fill="${i % 2 ? "#B9B4A8" : "#C8C2B4"}" stroke="#9F998B"/>`).join("")}
      <line x1="300" y1="${G - 60}" x2="780" y2="${G - 264}" stroke="#555" stroke-width="5"/>`,
  },
  {
    id: "pohon", title: "Pohon dan bayangan", desc: "Tinggi dengan perbandingan bayangan",
    slots: [s("Bayangan pohon", "9", "m", 220, 520, 420, G + 20), s("Tinggi tongkat", "1", "m", 780, 250, 905, G - 60), s("Bayangan tongkat", "0,75", "m", 760, 520, 930, G + 20)],
    draw: () => `${sky("skyP")}<circle cx="1110" cy="90" r="40" fill="#FFD54A"/>${bushes}${grass}${tree(300, 1.6)}
      <polygon points="292,${G} 640,${G + 40} 640,${G + 10} 308,${G}" fill="#3F5F35" opacity=".55"/>${tape(300, 640, G + 20)}
      <rect x="903" y="${G - 80}" width="6" height="80" fill="#6E5235"/><polygon points="903,${G} 990,${G + 20} 990,${G + 12} 909,${G}" fill="#3F5F35" opacity=".55"/>${tape(906, 990, G + 30)}`,
  },
  {
    id: "gedung", title: "Gedung bertingkat", desc: "Tinggi gedung dari lantai dan jendela",
    slots: [s("Tinggi satu lantai", "3,5", "m", 860, 200, 820, 250), s("Lebar jendela", "1,2", "m", 760, 400, 560, 300), s("Jumlah lantai", "3", "", 60, 120)],
    draw: () => `${sky("skyG")}${bushes}${paving}<rect x="300" y="110" width="520" height="${G - 110}" fill="#E8DDC6"/><polygon points="280,112 840,112 800,70 320,70" fill="#8E4E3B"/>
      ${[0, 1, 2].map((fl) => [0, 1, 2, 3].map((i) => `<rect x="${340 + i * 120}" y="${140 + fl * 110}" width="70" height="66" fill="#7FA2B2" stroke="#B8A888" stroke-width="5"/>`).join("") + `<line x1="300" y1="${250 + fl * 110}" x2="820" y2="${250 + fl * 110}" stroke="#C8B9A0" stroke-width="3"/>`).join("")}
      <rect x="530" y="${G - 70}" width="60" height="70" fill="#6B5A44"/>${person(900)}`,
  },
  {
    id: "lapangan", title: "Lapangan", desc: "Luas dan keliling dari ukuran lapangan",
    slots: [s("Panjang lapangan", "28", "m", 470, 30, 600, 92), s("Lebar lapangan", "15", "m", 960, 230, 1050, 300), s("Jari-jari lingkaran tengah", "1,8", "m", 80, 520, 640, 300)],
    draw: () => `<rect width="${W}" height="${H}" fill="#8DB873"/><rect x="150" y="90" width="900" height="420" fill="#C9734A" stroke="#fff" stroke-width="6"/>
      <line x1="600" y1="90" x2="600" y2="510" stroke="#fff" stroke-width="5"/><circle cx="600" cy="300" r="60" fill="none" stroke="#fff" stroke-width="5"/><line x1="600" y1="300" x2="660" y2="300" stroke="#fff" stroke-width="3"/>
      <rect x="150" y="190" width="120" height="220" fill="none" stroke="#fff" stroke-width="5"/><rect x="930" y="190" width="120" height="220" fill="none" stroke="#fff" stroke-width="5"/>
      ${tape(150, 1050, 80)}<line x1="1062" y1="90" x2="1062" y2="510" stroke="#F2B705" stroke-width="7"/>`,
  },
  {
    id: "kolam", title: "Kolam bundar", desc: "Luas lingkaran dan volume",
    slots: [s("Diameter kolam", "4", "m", 420, 40, 600, 300), s("Kedalaman", "0,8", "m", 860, 420, 900, 360), s("Lebar jalan setapak", "1", "m", 60, 500, 280, 330)],
    draw: () => `<rect width="${W}" height="${H}" fill="#8DB873"/>${tree(120, .9)}${tree(1100, .9)}<ellipse cx="600" cy="320" rx="360" ry="200" fill="#D7D2C5"/>
      <ellipse cx="600" cy="320" rx="290" ry="150" fill="#4A93B5" stroke="#8E8A7E" stroke-width="10"/><ellipse cx="560" cy="290" rx="120" ry="30" fill="#7CB6CF" opacity=".6"/>
      ${tape(310, 890, 300)}<line x1="900" y1="280" x2="900" y2="360" stroke="#F2B705" stroke-width="7"/>`,
  },
];

export const templateById = (id: string): Template | undefined => TEMPLATES.find((t) => t.id === id);

/** A new figure from a template, with its example labels. */
export function newFigure(tpl: string): PostFigure | undefined {
  const t = templateById(tpl);
  return t && { tpl, labels: t.slots.map((x) => ({ name: x.name, value: x.value, unit: x.unit, show: true })) };
}

/** "Name: value unit"; degree and percent signs stick to the number (48°, 15%). */
export const labelText = (l: FigureLabel): string => {
  const u = l.unit.trim(), v = l.value.trim();
  const amount = v && u ? (/^[°%]/.test(u) ? `${v}${u}` : `${v} ${u}`) : v || u;
  return [l.name.trim(), amount].filter(Boolean).join(": ");
};

/** The illustration as an SVG string ("" for an unknown template). */
export function renderFigure(f: PostFigure, title = "Ilustrasi"): string {
  const t = templateById(f.tpl);
  if (!t) return "";
  const labels = t.slots.map((slot, i) => {
    const l = f.labels[i];
    return l && l.show && labelText(l) ? tag(slot.lx, slot.ly, labelText(l), slot.ax, slot.ay) : "";
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(title)}">${t.draw()}${labels}</svg>`;
}

/** Problems with a figure, in Indonesian (empty when fine). */
export function figureProblems(f: unknown): string[] {
  if (f == null) return [];
  const g = f as Partial<PostFigure>;
  const t = typeof g.tpl === "string" ? templateById(g.tpl) : undefined;
  if (!t) return ["Template ilustrasi tidak dikenal."];
  if (!Array.isArray(g.labels) || g.labels.length > t.slots.length) return ["Label ilustrasi tidak sesuai template."];
  for (const l of g.labels) {
    if (!l || typeof l.name !== "string" || typeof l.value !== "string" || typeof l.unit !== "string" || typeof l.show !== "boolean") return ["Label ilustrasi rusak."];
    if (l.name.length > FIG_LIMITS.name || l.value.length > FIG_LIMITS.value || l.unit.length > FIG_LIMITS.unit) return ["Teks label ilustrasi terlalu panjang."];
  }
  return [];
}
