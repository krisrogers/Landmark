import * as Crypto from 'expo-crypto';

/** Generates a UUID v4. Used for all entity ids so records merge cleanly when cloud sync arrives. */
export function newId(): string {
  return Crypto.randomUUID();
}
