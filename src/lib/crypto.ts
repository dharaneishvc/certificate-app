import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  randomInt,
  sign,
  verify,
} from "node:crypto";
import { env } from "./env";

// Crockford base32: no I, L, O, U — avoids ambiguity when typed from paper.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function randomId(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

export function recipientEmailHash(email: string, credentialId: string): string {
  return sha256Hex(`${email.trim().toLowerCase()}:${credentialId}`);
}

export function generateSigningKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
    privateKey: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
  };
}

export function signData(privateKeyB64: string, data: string): string {
  const key = createPrivateKey({ key: Buffer.from(privateKeyB64, "base64"), format: "der", type: "pkcs8" });
  return sign(null, Buffer.from(data, "utf8"), key).toString("base64");
}

export function verifyData(publicKeyB64: string, data: string, signatureB64: string): boolean {
  try {
    const key = createPublicKey({ key: Buffer.from(publicKeyB64, "base64"), format: "der", type: "spki" });
    return verify(null, Buffer.from(data, "utf8"), key, Buffer.from(signatureB64, "base64"));
  } catch {
    return false;
  }
}

function masterKey(): Buffer {
  const key = Buffer.from(env.MASTER_KEY, "base64");
  if (key.length !== 32) throw new Error("MASTER_KEY must be 32 bytes encoded as base64");
  return key;
}

/** AES-256-GCM. Output format: base64(iv).base64(tag).base64(ciphertext) */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(encoded: string): string {
  const [iv, tag, ciphertext] = encoded.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
