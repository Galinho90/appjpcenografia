// AES-GCM encryption helpers for storing SMTP password
// Uses SMTP_ENCRYPTION_KEY env var as the master key

const enc = new TextEncoder();
const dec = new TextDecoder();

async function getKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("SMTP_ENCRYPTION_KEY");
  if (!raw) throw new Error("SMTP_ENCRYPTION_KEY is not configured");
  const hashed = await crypto.subtle.digest("SHA-256", enc.encode(raw));
  return await crypto.subtle.importKey(
    "raw",
    hashed,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

function toB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(str: string): Uint8Array {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Copy Uint8Array into a fresh ArrayBuffer (avoids SharedArrayBuffer typing issues)
function toBuffer(u8: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

export async function encryptSecret(plain: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBuffer(iv) },
    key,
    enc.encode(plain),
  );
  return `v1:${toB64(iv)}:${toB64(new Uint8Array(ct))}`;
}

export async function decryptSecret(payload: string): Promise<string> {
  if (!payload?.startsWith("v1:")) throw new Error("Invalid encrypted payload");
  const [, ivB64, ctB64] = payload.split(":");
  const key = await getKey();
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBuffer(fromB64(ivB64)) },
    key,
    toBuffer(fromB64(ctB64)),
  );
  return dec.decode(pt);
}
