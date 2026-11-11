import { parseNumber } from "./parseNumber";

/*
 * Scientific calculator for the post modal. Angles are in degrees.
 * Numbers follow the same Indonesian style as answers ("12,6", "2.307").
 * Supports + − × ÷ ^ ², parentheses, π, √, sin/cos/tan and their inverses, log, ln,
 * and implicit multiplication ("2π", "10 tan(48)").
 */

export class CalcError extends Error {}

type Tok = { t: "num"; v: number } | { t: "fn"; v: string } | { t: "op"; v: string };

const FUNCS: [string, string][] = [
  ["sin⁻¹", "asin"], ["cos⁻¹", "acos"], ["tan⁻¹", "atan"],
  ["asin", "asin"], ["acos", "acos"], ["atan", "atan"],
  ["sin", "sin"], ["cos", "cos"], ["tan", "tan"],
  ["sqrt", "sqrt"], ["√", "sqrt"], ["log", "log"], ["ln", "ln"],
];

const RAD = Math.PI / 180;
const APPLY: Record<string, (x: number) => number> = {
  sin: (x) => Math.sin(x * RAD), cos: (x) => Math.cos(x * RAD), tan: (x) => Math.tan(x * RAD),
  asin: (x) => Math.asin(x) / RAD, acos: (x) => Math.acos(x) / RAD, atan: (x) => Math.atan(x) / RAD,
  sqrt: Math.sqrt, log: Math.log10, ln: Math.log,
};

function tokenize(src: string): Tok[] {
  const s = src.replace(/×/g, "*").replace(/÷|:/g, "/").replace(/[−–]/g, "-").replace(/²/g, "^2").replace(/³/g, "^3").replace(/\s+/g, "");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    const num = rest.match(/^[0-9][0-9.,]*|^[.,][0-9]+/);
    if (num) {
      const v = parseNumber(num[0].startsWith(",") || num[0].startsWith(".") ? "0" + num[0].replace(".", ",") : num[0]);
      if (!isFinite(v)) throw new CalcError(`Angka "${num[0]}" tidak terbaca`);
      out.push({ t: "num", v }); i += num[0].length; continue;
    }
    if (rest.startsWith("π") || /^pi/i.test(rest)) { out.push({ t: "num", v: Math.PI }); i += rest.startsWith("π") ? 1 : 2; continue; }
    const fn = FUNCS.find(([name]) => rest.toLowerCase().startsWith(name));
    if (fn) { out.push({ t: "fn", v: fn[1] }); i += fn[0].length; continue; }
    if ("+-*/^()".includes(s[i])) { out.push({ t: "op", v: s[i] }); i++; continue; }
    throw new CalcError(`Simbol "${s[i]}" tidak dikenal`);
  }
  return out;
}

export function evaluate(src: string): number {
  const toks = tokenize(src);
  if (!toks.length) throw new CalcError("Ekspresi kosong");
  let i = 0;
  const peek = () => toks[i];
  const isOp = (v: string) => peek()?.t === "op" && peek().v === v;
  const startsPrimary = () => { const k = peek(); return !!k && (k.t === "num" || k.t === "fn" || (k.t === "op" && k.v === "(")); };

  // expr := term (('+'|'-') term)*
  function expr(): number {
    let v = term();
    while (isOp("+") || isOp("-")) { const op = toks[i++].v; const r = term(); v = op === "+" ? v + r : v - r; }
    return v;
  }
  // term := unary (('*'|'/') unary | implicit unary)*
  function term(): number {
    let v = unary();
    for (;;) {
      if (isOp("*")) { i++; v *= unary(); }
      else if (isOp("/")) { i++; v /= unary(); }
      else if (startsPrimary()) v *= unary();
      else return v;
    }
  }
  // unary := '-' unary | '+' unary | power
  function unary(): number {
    if (isOp("-")) { i++; return -unary(); }
    if (isOp("+")) { i++; return unary(); }
    return power();
  }
  // power := primary ('^' unary)?   (right-associative, so -2^2 = -4 and 2^3^2 = 512)
  function power(): number {
    const b = primary();
    if (isOp("^")) { i++; return Math.pow(b, unary()); }
    return b;
  }
  // primary := number | fn primary-or-power | '(' expr ')'
  function primary(): number {
    const k = toks[i++];
    if (!k) throw new CalcError("Ekspresi belum lengkap");
    if (k.t === "num") return k.v;
    if (k.t === "fn") return APPLY[k.v](power());
    if (k.v === "(") {
      const v = expr();
      if (isOp(")")) i++; // a missing closing bracket at the end is tolerated
      else if (i < toks.length) throw new CalcError("Kurung tidak seimbang");
      return v;
    }
    throw new CalcError("Ekspresi belum lengkap");
  }

  const v = expr();
  if (i < toks.length) throw new CalcError("Kurung tidak seimbang");
  if (!isFinite(v)) throw new CalcError("Hasil tidak terdefinisi");
  // Trim floating-point noise such as sin(30) = 0.49999999999999994.
  return Number(v.toPrecision(12));
}
