/*
 * Firebase configuration for GeoTrails Peta, from Vite env vars (see .env.example).
 * Without it, every class feature is hidden and the app stays fully local. The Firebase SDK
 * itself lives in ./client and is only downloaded when a class feature is used.
 */
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** Host of the local Firebase emulators (development and tests only). */
export const emulatorHost = (env.VITE_FIREBASE_EMULATOR as string | undefined) || "";

export const cloudEnabled = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

export const loadCloud = () => import("./client");
