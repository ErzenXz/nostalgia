// Client-side encryption utilities using Web Crypto API
// All encryption happens in the browser - the server never sees plaintext

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = Uint8Array.from(atob(keyString), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function hashKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  const hash = await crypto.subtle.digest("SHA-256", exported);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

export async function encryptData(
  data: ArrayBuffer,
  key: CryptoKey,
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as unknown as Uint8Array<ArrayBuffer> },
    key,
    data,
  );
  return { encrypted, iv };
}

export async function decryptData(
  encrypted: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array,
): Promise<ArrayBuffer> {
  return await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv as unknown as Uint8Array<ArrayBuffer> },
    key,
    encrypted,
  );
}

export async function encryptFile(
  file: File,
  key: CryptoKey,
): Promise<{ encryptedBlob: Blob; iv: string }> {
  const data = await file.arrayBuffer();
  const { encrypted, iv } = await encryptData(data, key);

  // Prepend IV to encrypted data for storage
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return {
    encryptedBlob: new Blob([combined], {
      type: "application/octet-stream",
    }),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptBlob(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  mimeType?: string,
): Promise<Blob> {
  const data = new Uint8Array(encryptedData);
  const iv = data.slice(0, IV_LENGTH);
  const encrypted = data.slice(IV_LENGTH);

  const decrypted = await decryptData(encrypted.buffer as ArrayBuffer, key, iv);
  return new Blob([decrypted], mimeType ? { type: mimeType } : undefined);
}

export async function encryptBlob(
  blob: Blob,
  key: CryptoKey,
): Promise<{ encryptedBlob: Blob; iv: string }> {
  const data = await blob.arrayBuffer();
  const { encrypted, iv } = await encryptData(data, key);

  // Prepend IV to encrypted data for storage
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return {
    encryptedBlob: new Blob([combined], {
      type: "application/octet-stream",
    }),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// Key derivation from password (for key recovery)
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as Uint8Array<ArrayBuffer>,
      iterations: 600000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
}

// Store key in IndexedDB (more secure than localStorage)
const DB_NAME = "nostalgia-keys";
const STORE_NAME = "encryption-keys";

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
  });
}

export async function storeEncryptionKey(
  userId: string,
  key: CryptoKey,
): Promise<void> {
  const db = await openDB();
  const exported = await exportKey(key);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(exported, userId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStoredEncryptionKey(
  userId: string,
): Promise<CryptoKey | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(userId);
    request.onsuccess = async () => {
      if (request.result) {
        const key = await importKey(request.result);
        resolve(key);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}
