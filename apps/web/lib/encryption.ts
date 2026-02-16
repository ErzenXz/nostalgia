// Client-side encryption utilities using Web Crypto API
// All encryption happens in the browser - the server never sees plaintext

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const RECOVERY_KDF_ITERATIONS = 900000;
const RECOVERY_SALT_LENGTH = 16;
const RECOVERY_IV_LENGTH = 12;

interface RecoveryPackageV1 {
  version: 1;
  kdf: {
    name: "PBKDF2";
    hash: "SHA-512";
    iterations: number;
    salt: string;
  };
  cipher: {
    name: "AES-GCM";
    iv: string;
  };
  encryptedKey: string;
  createdAt: number;
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return bytesToBase64(new Uint8Array(exported));
}

export async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = base64ToBytes(keyString);
  const rawKey = keyData.buffer.slice(
    keyData.byteOffset,
    keyData.byteOffset + keyData.byteLength,
  ) as ArrayBuffer;
  return await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function hashKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  const hash = await crypto.subtle.digest("SHA-256", exported);
  return bytesToBase64(new Uint8Array(hash));
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
    iv: bytesToBase64(iv),
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
    iv: bytesToBase64(iv),
  };
}

async function deriveRecoveryWrappingKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as Uint8Array<ArrayBuffer>,
      iterations,
      hash: "SHA-512",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function createRecoveryPackage(
  key: CryptoKey,
  passphrase: string,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(RECOVERY_SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(RECOVERY_IV_LENGTH));
  const wrappingKey = await deriveRecoveryWrappingKey(
    passphrase,
    salt,
    RECOVERY_KDF_ITERATIONS,
  );
  const rawKey = await crypto.subtle.exportKey("raw", key);
  const encryptedKey = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as unknown as Uint8Array<ArrayBuffer> },
    wrappingKey,
    rawKey,
  );

  const pkg: RecoveryPackageV1 = {
    version: 1,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-512",
      iterations: RECOVERY_KDF_ITERATIONS,
      salt: bytesToBase64(salt),
    },
    cipher: {
      name: "AES-GCM",
      iv: bytesToBase64(iv),
    },
    encryptedKey: bytesToBase64(new Uint8Array(encryptedKey)),
    createdAt: Date.now(),
  };

  return JSON.stringify(pkg);
}

export async function importKeyFromRecoveryPackage(
  packageJson: string,
  passphrase: string,
): Promise<CryptoKey> {
  let parsed: RecoveryPackageV1;
  try {
    parsed = JSON.parse(packageJson) as RecoveryPackageV1;
  } catch {
    throw new Error("Recovery package is not valid JSON");
  }

  if (
    parsed.version !== 1 ||
    parsed.kdf?.name !== "PBKDF2" ||
    parsed.kdf?.hash !== "SHA-512" ||
    parsed.cipher?.name !== "AES-GCM" ||
    !parsed.kdf?.salt ||
    !parsed.cipher?.iv ||
    !parsed.encryptedKey
  ) {
    throw new Error("Unsupported or invalid recovery package format");
  }

  const salt = base64ToBytes(parsed.kdf.salt);
  const iv = base64ToBytes(parsed.cipher.iv);
  const encryptedKey = base64ToBytes(parsed.encryptedKey);
  const wrappingKey = await deriveRecoveryWrappingKey(
    passphrase,
    salt,
    parsed.kdf.iterations,
  );

  let decryptedKey: ArrayBuffer;
  try {
    decryptedKey = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: iv as unknown as Uint8Array<ArrayBuffer> },
      wrappingKey,
      toArrayBuffer(encryptedKey),
    );
  } catch {
    throw new Error("Invalid passphrase or corrupted recovery package");
  }

  return await crypto.subtle.importKey(
    "raw",
    decryptedKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
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

export async function deleteStoredEncryptionKey(userId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(userId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
