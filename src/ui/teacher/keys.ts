import { posts } from "../../state";
import { esc, fmt } from "../dom";

/** Read-only answer key for every post. */
export function renderKeys(el: HTMLElement): void {
  el.innerHTML = `<p class="sub">Rentang penilaian dan pola kesalahan yang dipakai GeoTrails di laptop ini.</p>
    ${posts.map((p) => `<article class="key-card">
      <h3><span class="chip">POS ${p.id}</span>${esc(p.title)}</h3>
      <p class="task">${esc(p.task)}</p>
      <dl>
        <dt>Model rujukan</dt><dd>${esc(p.key)}</dd>
        <dt>Hijau</dt><dd class="num">${fmt(p.green[0], 4)} – ${fmt(p.green[1], 4)} ${esc(p.unit)}</dd>
        <dt>Oranye</dt><dd class="num">${fmt(p.orange[0], 4)} – ${fmt(p.orange[1], 4)} ${esc(p.unit)}</dd>
      </dl>
      ${p.errors.length ? `<table><thead><tr><th style="text-align:right">Jawaban keliru</th><th>Pesan untuk siswa</th></tr></thead><tbody>
        ${p.errors.map((e) => `<tr><td class="num">${fmt(e.v, 4)} ± ${fmt(e.t, 4)}</td><td>${esc(e.m)}</td></tr>`).join("")}
      </tbody></table>` : ""}
    </article>`).join("")}`;
}
