import type { GroupState, Post } from "../types";

export function toCsv(S: GroupState, posts: Post[]): string {
  const rows: (string | number)[][] = [["kelompok", "pos", "judul", "jawaban", "satuan", "hasil", "percobaan", "riwayat_jawaban", "petunjuk", "durasi_detik", "poin", "lembar_kerja"]];
  S.posts.forEach((st, i) =>
    rows.push([S.name, i, posts[i].title, st.answer ?? "", posts[i].unit, st.result === "green" ? "hijau" : st.result === "orange" ? "oranye" : "belum", st.attempts.length, st.attempts.join(" | "), st.hints, st.time, st.score, st.work]),
  );
  return rows
    .map((r) => r.map((c) => { const s = String(c); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(","))
    .join("\n");
}
