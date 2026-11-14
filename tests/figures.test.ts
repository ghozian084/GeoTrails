import { describe, expect, it } from "vitest";
import { figureProblems, labelText, MARK_MAX, markBox, markProblems, marksSvg, newFigure, newMark, renderFigure, TEMPLATES, type PhotoMark } from "../src/map/figures";
import { blankPost } from "../src/map/mapdef";
import { postProblems } from "../src/map/validate";

/* Illustration templates: guru memilih objek dan mengisi label ukuran. */

describe("ilustrasi template", () => {
  it("setiap template menggambar latar dan semua label contohnya", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(8);
    for (const t of TEMPLATES) {
      const f = newFigure(t.id)!;
      const svg = renderFigure(f, t.title);
      expect(svg.startsWith("<svg")).toBe(true);
      for (const l of f.labels) expect(svg).toContain(labelText(l).replace("&", "&amp;"));
      expect(figureProblems(f)).toEqual([]);
    }
  });

  it("teks label: nama, angka, satuan; label tersembunyi tidak digambar; teks guru di-escape", () => {
    expect(labelText({ name: "Tinggi mata", value: "1,5", unit: "m", show: true })).toBe("Tinggi mata: 1,5 m");
    expect(labelText({ name: "Ubin lantai", value: "30 cm × 30 cm", unit: "", show: true })).toBe("Ubin lantai: 30 cm × 30 cm");
    expect(labelText({ name: "Jumlah lantai", value: "", unit: "", show: true })).toBe("Jumlah lantai");
    expect(labelText({ name: "Sudut elevasi", value: "48", unit: "°", show: true })).toBe("Sudut elevasi: 48°");
    const f = newFigure("tiang")!;
    f.labels[0] = { name: "<b>x</b>", value: "1", unit: "m", show: true };
    f.labels[1].show = false;
    const svg = renderFigure(f);
    expect(svg).toContain("&lt;b&gt;x&lt;/b&gt;: 1 m");
    expect(svg).not.toContain("<b>");
    expect(svg).not.toContain("Tinggi mata");
  });

  it("template tak dikenal atau label rusak ditolak, juga lewat validasi pos", () => {
    expect(renderFigure({ tpl: "roket", labels: [] })).toBe("");
    expect(figureProblems({ tpl: "roket", labels: [] })).toEqual(["Template ilustrasi tidak dikenal."]);
    const f = newFigure("tandon")!;
    expect(figureProblems({ ...f, labels: [...f.labels, ...f.labels] })).toEqual(["Label ilustrasi tidak sesuai template."]);
    expect(figureProblems({ ...f, labels: [{ ...f.labels[0], value: "x".repeat(17) }] })).toEqual(["Teks label ilustrasi terlalu panjang."]);
    const p = Object.assign(blankPost(1, 1), { title: "A", task: "B", unit: "m", key: "C", green: [1, 2], orange: [0, 3], hints: ["h"] });
    expect(postProblems(p, "Pos 1")).toEqual([]);
    expect(postProblems({ ...p, figure: { tpl: "roket", labels: [] } }, "Pos 1")).toEqual(["Pos 1: Template ilustrasi tidak dikenal."]);
  });
});

describe("label bebas di atas foto", () => {
  const mk = (extra: Partial<PhotoMark> = {}): PhotoMark => ({ ...newMark(0), name: "Tinggi pagar", value: "2", unit: "m", ...extra });

  it("posisi label mengikuti ukuran foto dan tidak keluar dari foto", () => {
    const b = markBox(mk({ x: .5, y: .5, ax: .5, ay: .9 }), 800, 600);
    expect(b.text).toBe("Tinggi pagar: 2 m");
    expect(b.x).toBe(400); expect(b.y).toBe(300);
    expect(b.pointer).toBe(true);
    expect(b.fs).toBeCloseTo(600 * .04);
    const edge = markBox(mk({ x: 1, y: 1 }), 800, 600);
    expect(edge.x + edge.w).toBeLessThanOrEqual(800);
    expect(edge.y + edge.h).toBeLessThanOrEqual(600);
    // Same proportions on a panorama: the size follows the photo's height.
    expect(markBox(mk(), 3000, 600).fs).toBe(b.fs);
  });

  it("titik yang menempel pada kotak tidak diberi garis penunjuk; teks di-escape", () => {
    const b = markBox(mk({ x: .1, y: .1, ax: .12, ay: .12 }), 800, 600);
    expect(b.pointer).toBe(false);
    const svg = marksSvg([mk({ name: "<i>a</i>" })], 800, 600);
    expect(svg).toContain("&lt;i&gt;a&lt;/i&gt;: 2 m");
    expect(svg).toContain('data-box="0"');
    expect(svg).toContain('data-anchor="0"');
  });

  it("label foto dibatasi jumlah, isi, dan posisinya", () => {
    expect(markProblems(undefined)).toEqual([]);
    expect(markProblems([mk()])).toEqual([]);
    expect(markProblems(Array.from({ length: MARK_MAX + 1 }, () => mk()))).toEqual([`Label foto maksimal ${MARK_MAX}.`]);
    expect(markProblems([mk({ x: 1.5 })])).toEqual(["Label foto rusak."]);
    expect(markProblems([mk({ name: "x".repeat(41) })])).toEqual(["Teks label foto terlalu panjang."]);
    const p = Object.assign(blankPost(1, 1), { title: "A", task: "B", unit: "m", key: "C", green: [1, 2], orange: [0, 3], hints: ["h"], marks: [mk({ ay: -1 })] });
    expect(postProblems(p, "Pos 1")).toEqual(["Pos 1: Label foto rusak."]);
  });
});
