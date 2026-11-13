// Deploys firebase/database.rules.json to the Realtime Database instance(s) in firebase.json.
// The Firebase CLI refuses to deploy database rules when the project has no *default* instance
// (this project only has "geotrails-live"), so this calls the database's REST API directly.
// Credentials: the service account key file in GOOGLE_APPLICATION_CREDENTIALS (as in deploy.yml).
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const REGION_HOST = { "geotrails-live": "geotrails-live.asia-southeast1.firebasedatabase.app" };

const key = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
const b64 = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: key.client_email, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 600,
    scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
  };
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64(claims)}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(key.private_key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }),
  });
  if (!r.ok) throw new Error(`Token request failed: ${r.status} ${await r.text()}`);
  return (await r.json()).access_token;
}

const config = JSON.parse(readFileSync("firebase.json", "utf8")).database ?? [];
const token = await accessToken();
for (const { instance, rules } of config) {
  const host = REGION_HOST[instance];
  if (!host) throw new Error(`Unknown Realtime Database instance "${instance}": add its host to REGION_HOST.`);
  const r = await fetch(`https://${host}/.settings/rules.json`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: readFileSync(rules, "utf8"),
  });
  if (!r.ok) throw new Error(`Deploying rules to ${instance} failed: ${r.status} ${await r.text()}`);
  console.log(`database: rules from ${rules} deployed to ${instance}`);
}
