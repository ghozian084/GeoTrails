import { CalcError, evaluate } from "../logic/calc";
import { $, esc, fmt } from "./dom";

/* Degree-mode scientific calculator panel inside the post modal. */

type Action = "back" | "clear" | "equals";
const KEYS: [string, string | Action, string?][] = [
  ["sin", "sin("], ["cos", "cos("], ["tan", "tan("], ["(", "("], [")", ")"],
  ["sin⁻¹", "sin⁻¹("], ["cos⁻¹", "cos⁻¹("], ["tan⁻¹", "tan⁻¹("], ["π", "π"], ["√", "√("],
  ["7", "7", "n"], ["8", "8", "n"], ["9", "9", "n"], ["÷", "÷"], ["x²", "²"],
  ["4", "4", "n"], ["5", "5", "n"], ["6", "6", "n"], ["×", "×"], ["^", "^"],
  ["1", "1", "n"], ["2", "2", "n"], ["3", "3", "n"], ["−", "−"], ["⌫", "back"],
  ["0", "0", "n"], [",", ",", "n"], ["C", "clear"], ["+", "+"], ["=", "equals", "eq"],
];

/** Expression and open state survive re-renders of the post modal. */
let expr = "";
let open = false;

export function calcHtml(canUse: boolean): string {
  const keys = KEYS.map(([label, , cls], i) => `<button type="button" data-k="${i}" class="${cls ?? ""}"${label === "⌫" ? ' aria-label="Hapus satu"' : ""}>${label}</button>`).join("");
  return `<div class="calc" id="calc"${open ? "" : " hidden"}>
    <div class="calc-top"><span class="calc-mode" title="Sudut dalam derajat">DEG</span><input id="calcExpr" autocomplete="off" spellcheck="false" aria-label="Ekspresi kalkulator" placeholder="contoh: 10 × tan(48) + 1,5" value="${esc(expr)}"></div>
    <div class="calc-out" id="calcOut" aria-live="polite"></div>
    <div class="keys">${keys}</div>
    ${canUse ? `<button type="button" class="btn ghost" id="calcUse" disabled>Pakai hasil sebagai jawaban</button>` : ""}
  </div>`;
}

export function mountCalc(onUse: (value: string) => void): void {
  const panel = $("calc"), input = $<HTMLInputElement>("calcExpr"), out = $("calcOut"), btn = $("calcBtn");
  const use = document.getElementById("calcUse") as HTMLButtonElement | null;
  btn.setAttribute("aria-expanded", String(open));
  let value: number | null = null;

  const refresh = () => {
    expr = input.value;
    value = null;
    out.classList.remove("err");
    if (!expr.trim()) out.textContent = "";
    else {
      try { value = evaluate(expr); out.textContent = "= " + fmt(value, 6); }
      catch (e) { out.textContent = e instanceof CalcError ? e.message : "Belum bisa dihitung"; out.classList.add("err"); }
    }
    if (use) use.disabled = value == null;
  };
  const insert = (text: string) => {
    const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a;
    input.value = input.value.slice(0, a) + text + input.value.slice(b);
    input.setSelectionRange(a + text.length, a + text.length);
    refresh();
  };
  const run = (k: string | Action) => {
    if (k === "clear") { input.value = ""; refresh(); }
    else if (k === "back") {
      const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a;
      const from = a === b ? Math.max(0, a - 1) : a;
      input.value = input.value.slice(0, from) + input.value.slice(b);
      input.setSelectionRange(from, from);
      refresh();
    } else if (k === "equals") { if (value != null) { input.value = fmt(value, 6); refresh(); } }
    else insert(k);
  };

  btn.onclick = () => {
    open = !open; panel.hidden = !open; btn.setAttribute("aria-expanded", String(open));
    if (open) input.focus();
  };
  panel.querySelector(".keys")!.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-k]");
    if (b) run(KEYS[+b.dataset.k!][1]);
  });
  input.addEventListener("input", refresh);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run("equals"); } });
  if (use) use.onclick = () => { if (value != null) onUse(fmt(value, 4)); };
  refresh();
}
