/** Drag-to-rotate panorama: the image repeats horizontally as a CSS background. `aspect` = width / height. */
export function mountPano(el: HTMLElement, src: string, aspect: number, focus?: number): void {
  el.style.backgroundImage = `url("${src}")`;
  let zoom = 1, fx = focus || .5, oy = 0;
  let drag: { x: number; y: number; fx: number; oy: number } | null = null;
  const apply = () => {
    const h = el.clientHeight * zoom, w = h * aspect;
    el.style.backgroundSize = `${w}px ${h}px`;
    oy = Math.min(0, Math.max(el.clientHeight - h, oy));
    const x = el.clientWidth / 2 - fx * w;
    el.style.backgroundPosition = `${x}px ${oy}px`;
  };
  el.addEventListener("pointerdown", (e) => {
    if ((e.target as HTMLElement).closest("button")) return;
    drag = { x: e.clientX, y: e.clientY, fx, oy };
    el.setPointerCapture(e.pointerId);
    el.classList.add("drag");
  });
  el.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const w = el.clientHeight * zoom * aspect;
    fx = drag.fx - (e.clientX - drag.x) / w; fx = ((fx % 1) + 1) % 1;
    oy = drag.oy + (e.clientY - drag.y);
    apply();
  });
  const end = () => { drag = null; el.classList.remove("drag"); };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.querySelector<HTMLButtonElement>("[data-l]")!.onclick = () => { fx = ((fx - .08) % 1 + 1) % 1; apply(); };
  el.querySelector<HTMLButtonElement>("[data-r]")!.onclick = () => { fx = (fx + .08) % 1; apply(); };
  const zb = el.querySelector<HTMLButtonElement>("[data-z]")!;
  zb.onclick = () => {
    zoom = zoom === 1 ? 2.2 : 1;
    if (zoom > 1) oy = -(el.clientHeight * zoom - el.clientHeight) * .72;
    zb.textContent = zoom === 1 ? "Perbesar" : "Perkecil";
    apply();
  };
  new ResizeObserver(apply).observe(el);
  apply();
}
