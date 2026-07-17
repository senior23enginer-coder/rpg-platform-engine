const encoder = new TextEncoder();
const hashPrefix = "pbkdf2-sha256";
const iterations = 120000;

function getCrypto() {
  return globalThis.crypto;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function digestFallback(value: string) {
  const subtle = getCrypto()?.subtle;
  if (subtle) {
    const digest = await subtle.digest("SHA-256", encoder.encode(value));
    return `${hashPrefix}:fallback:${bytesToBase64(new Uint8Array(digest))}`;
  }

  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${hashPrefix}:fallback:${Math.abs(hash).toString(16)}`;
}

export async function createPasswordHash(password: string) {
  if (!password) return "";
  const runtimeCrypto = getCrypto();
  if (!runtimeCrypto?.subtle) return digestFallback(password);

  const salt = runtimeCrypto.getRandomValues(new Uint8Array(16));
  const key = await runtimeCrypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await runtimeCrypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );

  return `${hashPrefix}:${iterations}:${bytesToBase64(salt)}:${bytesToBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, storedHash?: string, legacyPassword?: string) {
  if (!storedHash) return Boolean(legacyPassword) && password === legacyPassword;
  const [prefix, iterationValue, saltValue, expectedValue] = storedHash.split(":");
  if (prefix !== hashPrefix) return false;

  if (iterationValue === "fallback") {
    return (await digestFallback(password)) === storedHash;
  }

  const runtimeCrypto = getCrypto();
  if (!runtimeCrypto?.subtle || !saltValue || !expectedValue) return false;
  const key = await runtimeCrypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await runtimeCrypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: base64ToBytes(saltValue), iterations: Number(iterationValue) || iterations },
    key,
    256
  );
  return bytesToBase64(new Uint8Array(bits)) === expectedValue;
}

export function redactPasswordFields<T extends { password?: string; passwordHash?: string; passwordUpdatedAt?: string }>(profile: T, passwordHash: string): T {
  return {
    ...profile,
    password: "",
    passwordHash,
    passwordUpdatedAt: new Date().toISOString(),
  };
}
