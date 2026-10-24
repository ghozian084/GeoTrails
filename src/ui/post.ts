import type { Game } from "../game/game";
import { grade } from "../logic/grade";
import { parseNumber } from "../logic/parseNumber";
import { greenScore, HINT_COST, isFreePost, orangeScore } from "../logic/score";
import { isGateDone, persist, posts, S } from "../state";
import type { Zone } from "../types";
import { $, esc, fmt, toast } from "./dom";
import { maybeFinish } from "./finish";
import { updateHud } from "./hud";
import { mountPano } from "./panorama";
import { SCENES } from "./scenes";

let game: Game;
export const setGame = (g: Game): void => { game = g; };

let cur: number | null = null, openedAt = 0;
/** Feedback for the last non-green check, shown until revised or locked. */
let lastFb: { id: number; zone: Zone; title: string; msg: string } | null = null;

export function openPost(id: number): void {
  if (id > 0 && !isGateDone()) { toast("Selesaikan Pos 0 (tiang bendera) dulu"); return; }
  game.stop(); cur = id; openedAt = Date.now(); renderPost(); $("postOv").hidden = false;
  setTimeout(() => { const i = $<HTMLInputElement>("ans"); if (i && !i.disabled) i.focus(); }, 50);
}

export function closePost(): void {
  if (cur == null) return;
  const st = S().posts[cur];
  st.time += Math.round((Date.now() - openedAt) / 1000);
  cur = null; $("postOv").hidden = true; persist(); updateHud(); game.resetPrompt(); game.focus(); maybeFinish();
}

export function closeAll(): void {
  if (!$("postOv").hidden) closePost();
  $("logOv").hidden = true; $("finOv").hidden = true;
}

function renderPost(): void {
  const id = cur!;
  const p = posts[id], st = S().posts[id], done = !!st.result, free = isFreePost(id);
  const media = p.media === "pano"
    ? `<div class="pano" id="pano"><span class="badge">PANORAMA 360°</span><div class="ctl"><button type="button" data-l aria-label="Putar kiri">◀</button><button type="button" data-z>Perbesar</button><button type="button" data-r aria-label="Putar kanan">▶</button></div></div>`
    : `<div class="frame">${SCENES[p.id]()}</div>`;
  const hintsHtml = p.hints.slice(0, st.hints).map((h, i) => `<div class="hint"><b>P${i + 1}</b>${esc(h)}</div>`).join("");
  const canHint = st.hints < p.hints.length && !done;
  let fbHtml = "";
  if (done) {
    fbHtml = `<div class="fb ${st.result}"><b>${st.result === "green" ? "Tepat. Pos selesai." : "Jawaban dikunci (mendekati)."}</b><div>Jawabanmu: <b style="font-family:var(--f-mono)">${fmt(st.answer)} ${esc(p.unit)}</b> · Poin: <b>${st.score}</b></div><div style="font-size:14px;color:var(--muted)">Model rujukan: ${esc(p.key)}</div><div class="row"><button class="btn primary" id="closeBtn">Kembali ke peta</button></div></div>`;
  } else if (lastFb && lastFb.id === id) {
    fbHtml = `<div class="fb ${lastFb.zone}"><b>${lastFb.title}</b><div>${esc(lastFb.msg)}</div>${lastFb.zone === "orange" ? `<div class="row"><button class="btn" id="reviseBtn">Revisi jawaban</button><button class="btn tape" id="lockBtn">Kunci jawaban (${orangeScore(st.hints, free)} poin)</button></div>` : ""}</div>`;
  }
  const value = done ? esc(fmt(st.answer)) : (st.attempts.length && lastFb && lastFb.id === id ? esc(fmt(st.attempts[st.attempts.length - 1])) : "");
  $("post").innerHTML = `
    <div class="media">${media}<div class="cap"><span>Ilustrasi pengganti foto · ${esc(p.place)}</span><span>Data di foto belum tentu semuanya dipakai</span></div></div>
    <div class="body">
      <header><span class="chip">POS ${p.id}</span><h2 id="ptitle">${esc(p.title)}</h2><button class="x" id="xBtn" aria-label="Tutup">×</button></header>
      <div class="concept">${esc(p.concept)}</div>
      <p class="task">${esc(p.task)}</p>
      <p class="note">${esc(p.note)}</p>
      <form class="answer" id="ansForm">
        <div class="inp"><input id="ans" inputmode="decimal" autocomplete="off" placeholder="jawabanmu" aria-label="Jawaban dalam ${esc(p.unit)}" ${done ? "disabled" : ""} value="${value}"><span class="unit">${esc(p.unit)}</span></div>
        <button class="btn primary" type="submit" ${done ? "disabled" : ""}>Periksa</button>
      </form>
      ${fbHtml}
      <div class="hints">
        <h3><span>Petunjuk</span><span class="attempts">${st.attempts.length} percobaan · ${st.hints} petunjuk</span></h3>
        ${hintsHtml}
        ${canHint ? `<button class="btn ghost" id="hintBtn" type="button">Buka petunjuk ${st.hints + 1} ${free ? "(gratis)" : `(−${HINT_COST} poin)`}</button>` : ""}
      </div>
    </div>`;
  $("post").setAttribute("aria-labelledby", "ptitle");
  if (p.media === "pano") mountPano($("pano"), SCENES[p.id](), p.focus);
  $("xBtn").onclick = closePost;
  if ($("closeBtn")) $("closeBtn").onclick = closePost;
  if ($("hintBtn")) $("hintBtn").onclick = () => { st.hints++; persist(); renderPost(); };
  if ($("reviseBtn")) $("reviseBtn").onclick = () => { lastFb = null; renderPost(); $("ans").focus(); };
  if ($("lockBtn")) $("lockBtn").onclick = () => { st.result = "orange"; st.score = orangeScore(st.hints, free); lastFb = null; persist(); updateHud(); renderPost(); };
  $("ansForm").addEventListener("submit", (e) => { e.preventDefault(); check(); });
}

function check(): void {
  const id = cur!;
  const p = posts[id], st = S().posts[id], free = isFreePost(id);
  const v = parseNumber($<HTMLInputElement>("ans").value);
  if (!isFinite(v)) { lastFb = { id, zone: "red", title: "Belum terbaca", msg: "Tulis jawaban berupa angka saja, misalnya 12,5." }; renderPost(); return; }
  st.attempts.push(v); st.answer = v;
  const { zone, error } = grade(p, v);
  if (zone === "green") { st.result = "green"; st.score = greenScore(st.hints, free); lastFb = null; persist(); updateHud(); renderPost(); return; }
  const def = zone === "orange"
    ? "Hasilmu dekat dengan rentang yang diharapkan. Periksa pembulatan atau taksiranmu, lalu revisi atau kunci jawaban ini."
    : "Hasilmu masih jauh dari rentang yang diharapkan. Periksa lagi model, data yang dipakai, dan satuannya.";
  lastFb = { id, zone, title: zone === "orange" ? "Mendekati" : "Belum tepat", msg: error ? error.m : def };
  persist(); renderPost();
}
