import { stickVector } from "./stick";

/*
 * On-screen controls for phones and tablets, shared by the 2D map and the 3D Blox page:
 * a virtual joystick (bottom left) and action buttons (bottom right).
 * Shown while the last input was touch; a mouse click hides them again (hybrid laptops).
 */

export interface TouchOptions {
  /** Joystick vector, screen axes (+x right, +y down), length ≤ 1; [0, 0] on release. */
  move(x: number, y: number): void;
  /** "Buka" button: open the post next to the avatar. */
  interact(): void;
  /** Optional "Lompat" button (3D). */
  jump?(): void;
  /** Help text shown instead of the keyboard help while touch controls are on. */
  help: string;
}

const RADIUS = 52;

export function initTouch(stage: HTMLElement, o: TouchOptions): void {
  const pad = document.createElement("div");
  pad.className = "touchpad";
  pad.innerHTML = `
    <div class="stick" role="application" aria-label="Joystick: geser untuk berjalan"><div class="stick-knob"></div></div>
    <div class="touch-btns">
      ${o.jump ? `<button type="button" class="touch-btn jump" id="touchJump">Lompat</button>` : ""}
      <button type="button" class="touch-btn act" id="touchAct">Buka</button>
    </div>`;
  stage.appendChild(pad);
  const stick = pad.querySelector<HTMLElement>(".stick")!, knob = pad.querySelector<HTMLElement>(".stick-knob")!;

  // Joystick: follows one finger, knob clamped to the ring.
  let id: number | null = null, cx = 0, cy = 0;
  const update = (e: PointerEvent) => {
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) { dx *= RADIUS / d; dy *= RADIUS / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const [x, y] = stickVector(e.clientX - cx, e.clientY - cy, RADIUS);
    o.move(x, y);
  };
  const release = () => { id = null; knob.style.transform = ""; stick.classList.remove("on"); o.move(0, 0); };
  stick.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const r = stick.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2; id = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    stick.classList.add("on");
    update(e);
  });
  stick.addEventListener("pointermove", (e) => { if (e.pointerId === id) update(e); });
  stick.addEventListener("pointerup", (e) => { if (e.pointerId === id) release(); });
  stick.addEventListener("pointercancel", (e) => { if (e.pointerId === id) release(); });
  window.addEventListener("blur", () => { if (id != null) release(); });

  pad.querySelector<HTMLButtonElement>("#touchAct")!.onclick = () => o.interact();
  const jump = pad.querySelector<HTMLButtonElement>("#touchJump");
  if (jump && o.jump) jump.addEventListener("pointerdown", (e) => { e.preventDefault(); o.jump!(); });

  // Touch mode: on for coarse pointers or after a touch, off again after a mouse click.
  const help = document.getElementById("help");
  const keyboardHelp = help?.innerHTML ?? "";
  // The help box can be dismissed with a tap (on phones it would otherwise cover the map).
  help?.addEventListener("click", () => (help.hidden = true));
  const set = (on: boolean) => {
    if (document.documentElement.classList.contains("touch-on") === on) return;
    document.documentElement.classList.toggle("touch-on", on);
    if (help) help.innerHTML = on ? o.help : keyboardHelp;
    if (!on && id != null) release();
  };
  set(matchMedia("(any-pointer: coarse)").matches && !matchMedia("(pointer: fine)").matches);
  window.addEventListener("pointerdown", (e) => { if (e.pointerType === "touch") set(true); else if (e.pointerType === "mouse") set(false); }, { capture: true });
}
