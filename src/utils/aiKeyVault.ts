/**
 * WebCrypto AES-GCM encrypted API key store in localStorage.
 * Derives a key using PBKDF2 from a browser fingerprint.
 */

const STORAGE_PREFIX = 'ai_kv_';

function getFingerprint(): string {
  if (typeof window === 'undefined') return 'tasc-iiot-server-fallback';
  const nav = window.navigator;
  const scr = window.screen;
  const userAgent = (nav && nav.userAgent) ? nav.userAgent : '';
  const language = (nav && nav.language) ? nav.language : '';
  const width = (scr && scr.width) ? scr.width : 1920;
  const height = (scr && scr.height) ? scr.height : 1080;
  return `${userAgent}_${width}x${height}_${language}`;
}

async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(getFingerprint()),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function saveApiKey(providerId: string, key: string): Promise<void> {
  if (typeof window === 'undefined' || !key) return;
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await deriveKey(salt);

    const enc = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      enc.encode(key)
    );

    const payload = JSON.stringify({
      s: bufferToBase64(salt),
      iv: bufferToBase64(iv),
      d: bufferToBase64(encrypted)
    });

    localStorage.setItem(`${STORAGE_PREFIX}${providerId}`, payload);
  } catch (err) {
    console.error(`[aiKeyVault] Failed to save key for ${providerId}:`, err);
  }
}

export async function loadApiKey(providerId: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${providerId}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed.s || !parsed.iv || !parsed.d) return null;

    const salt = base64ToBuffer(parsed.s);
    const iv = base64ToBuffer(parsed.iv);
    const data = base64ToBuffer(parsed.d);

    const cryptoKey = await deriveKey(salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (err) {
    console.warn(`[aiKeyVault] Failed to decrypt key for ${providerId} (fingerprint changed or corrupt):`, err);
    return null;
  }
}

export async function deleteApiKey(providerId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${STORAGE_PREFIX}${providerId}`);
}

export async function resetAllKeys(): Promise<void> {
  if (typeof window === 'undefined') return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}
