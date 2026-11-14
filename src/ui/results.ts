import { joinedSession, setJoinedSession } from "../cloud/cache";
import { cloudEnabled, loadSessions } from "../cloud/config";
import { resultPayload } from "../cloud/sessiondata";
import type { MapDef } from "../map/mapdef";
import { app } from "../map/session";

/*
 * During a trail session, the group's results go to the teacher: a few seconds after anything
 * changes, and once more when the page closes. Only GroupResult fields are sent (see
 * src/cloud/sessiondata.ts). Offline, the next change (or the next visit) sends them.
 */

const EVERY_MS = 4000;
let timer = 0, last = "";

async function send(code: string): Promise<void> {
  if (!app.S || !navigator.onLine) return;
  const payload = resultPayload(app.S), json = JSON.stringify(payload);
  if (json === last) return;
  try {
    await (await loadSessions()).sendResult(code, payload);
    last = json;
  } catch (e) {
    // Refused: stop only if the teacher really closed (or deleted) the session; otherwise retry later.
    if (String((e as { code?: string })?.code ?? "").includes("permission-denied") && !(await (await loadSessions()).sessionOpen(code).catch(() => true))) {
      const s = joinedSession();
      if (s?.code === code) setJoinedSession({ ...s, open: false });
      clearInterval(timer);
    }
  }
}

/** Start sending results when this map is the joined session's map. */
export function startResults(map: MapDef): void {
  const s = joinedSession();
  if (!cloudEnabled || !s || !s.open || s.map.id !== map.id) return;
  clearInterval(timer);
  void send(s.code);
  timer = window.setInterval(() => void send(s.code), EVERY_MS);
  window.addEventListener("pagehide", () => void send(s.code));
}
