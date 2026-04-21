import * as CryptoJS from 'crypto-js';
import { config } from '../config';

// Regular expressions for sensitive Indian identifiers
const AADHAAR_REGEX = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
const VOTER_ID_REGEX = /\b[A-Z]{3}\d{7}\b/gi;
const PHONE_REGEX = /\b(?:\+91|91)?\s?[6-9]\d{9}\b/g;

// Heuristic list of injection keywords
const INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /system prompt/i,
  /bypass/i,
  /do not follow rules/i,
  /you are now/i,
];

/**
 * Detects potential prompt injection attempts.
 */
export function detectPromptInjection(input: string): boolean {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}

/**
 * Redacts sensitive PII from inputs.
 */
export function redactPII(text: string): string {
  let redacted = text.replace(AADHAAR_REGEX, '[AADHAAR REDACTED]');
  redacted = redacted.replace(VOTER_ID_REGEX, '[VOTER_ID REDACTED]');
  redacted = redacted.replace(PHONE_REGEX, '[PHONE REDACTED]');
  return redacted;
}

/**
 * Recursively sanitizes objects.
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return redactPII(input.trim());
  }
  if (typeof input === 'object' && input !== null) {
    const sanitizedObj: any = Array.isArray(input) ? [] : {};
    for (const key in input) {
      sanitizedObj[key] = sanitizeInput(input[key]);
    }
    return sanitizedObj;
  }
  return input;
}

/**
 * AES-256 Encryption for Data at Rest
 */
export function encryptData(data: string): string {
  return CryptoJS.AES.encrypt(data, config.encryptionKey).toString();
}

/**
 * AES-256 Decryption
 */
export function decryptData(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, config.encryptionKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}
