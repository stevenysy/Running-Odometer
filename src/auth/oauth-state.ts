import { z } from 'zod';

const STATE_TTL_MS = 10 * 60 * 1000;

const statePayloadSchema = z.object({
  nonce: z.string().min(16),
  createdAt: z.number().int().positive()
});

export async function createOAuthState(secret: string, now = new Date()): Promise<string> {
  const payload = {
    nonce: crypto.randomUUID(),
    createdAt: now.getTime()
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signState(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export async function verifyOAuthState(
  state: string,
  secret: string,
  now = new Date()
): Promise<boolean> {
  const [encodedPayload, signature, unexpectedPart] = state.split('.');

  if (!encodedPayload || !signature || unexpectedPart !== undefined) {
    return false;
  }

  const expectedSignature = await signState(encodedPayload, secret);

  if (!timingSafeEqual(signature, expectedSignature)) {
    return false;
  }

  const payload = parseStatePayload(encodedPayload);

  if (!payload) {
    return false;
  }

  return now.getTime() - payload.createdAt <= STATE_TTL_MS;
}

function parseStatePayload(encodedPayload: string): z.infer<typeof statePayloadSchema> | null {
  try {
    const decoded = JSON.parse(base64UrlDecode(encodedPayload)) as unknown;
    const parsed = statePayloadSchema.safeParse(decoded);

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function signState(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));

  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}

function base64UrlEncode(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlDecode(value: string): string {
  const padded = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}
