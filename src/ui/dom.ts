export const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

export const esc = (s: unknown): string =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export const fmt = (v: number | null, d = 2): string => Number(v).toLocaleString("id-ID", { maximumFractionDigits: d });

export const modalOpen = (): boolean => !$("postOv").hidden || !$("logOv").hidden || !$("finOv").hidden || !$("teachOv").hidden;

let toastT: ReturnType<typeof setTimeout> | undefined;
export function toast(m: string): void {
  const t = $("toast");
  t.textContent = m;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.hidden = true), 2600);
}
