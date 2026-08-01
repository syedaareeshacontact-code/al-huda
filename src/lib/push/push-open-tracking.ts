import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const TRACKING_TOKEN_VERSION = 1;
const TRACKING_TOKEN_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

interface BaseTrackingClaims {
  version: typeof TRACKING_TOKEN_VERSION;
  deliveryId: string;
  campaignId: string;
  notificationKind: string;
  issuedAt: number;
}

export type PushTrackingClaims = BaseTrackingClaims &
  (
    | { ownerType: 'guest'; ownerId: string }
    | { ownerType: 'user'; ownerId: string; endpointHash: string }
  );

type CreatePushTrackingTokenInput = Omit<
  PushTrackingClaims,
  'version' | 'issuedAt' | 'endpointHash'
> & {
  endpoint?: string;
};

function getTrackingSecret() {
  return (
    process.env.PUSH_TRACKING_SECRET ||
    process.env.CRON_SECRET ||
    process.env.WEB_PUSH_PRIVATE_KEY ||
    ''
  );
}

export function hashPushEndpoint(endpoint: string) {
  return createHash('sha256').update(endpoint).digest('hex');
}

function signEncodedClaims(encodedClaims: string, secret: string) {
  return createHmac('sha256', secret).update(encodedClaims).digest('base64url');
}

export function createPushTrackingToken(
  input: CreatePushTrackingTokenInput
): string | null {
  const secret = getTrackingSecret();
  if (!secret) {
    return null;
  }

  const claims: PushTrackingClaims =
    input.ownerType === 'guest'
      ? {
          version: TRACKING_TOKEN_VERSION,
          ownerType: 'guest',
          ownerId: input.ownerId,
          deliveryId: input.deliveryId,
          campaignId: input.campaignId,
          notificationKind: input.notificationKind,
          issuedAt: Date.now(),
        }
      : {
          version: TRACKING_TOKEN_VERSION,
          ownerType: 'user',
          ownerId: input.ownerId,
          endpointHash: hashPushEndpoint(input.endpoint ?? ''),
          deliveryId: input.deliveryId,
          campaignId: input.campaignId,
          notificationKind: input.notificationKind,
          issuedAt: Date.now(),
        };
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = signEncodedClaims(encodedClaims, secret);
  return `${encodedClaims}.${signature}`;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function isValidClaimText(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

export function verifyPushTrackingToken(
  token: string,
  now = Date.now()
): PushTrackingClaims | null {
  const secret = getTrackingSecret();
  const [encodedClaims, providedSignature, extraPart] = token.split('.');
  if (!secret || !encodedClaims || !providedSignature || extraPart) {
    return null;
  }

  const expectedSignature = signEncodedClaims(encodedClaims, secret);
  if (!safeEqual(providedSignature, expectedSignature)) {
    return null;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(encodedClaims, 'base64url').toString('utf8')
    ) as Partial<PushTrackingClaims>;
    const issuedAt = Number(claims.issuedAt);
    const age = now - issuedAt;
    const commonClaimsAreValid =
      claims.version === TRACKING_TOKEN_VERSION &&
      (claims.ownerType === 'guest' || claims.ownerType === 'user') &&
      isValidClaimText(claims.ownerId, 160) &&
      isValidClaimText(claims.deliveryId, 80) &&
      isValidClaimText(claims.campaignId, 180) &&
      isValidClaimText(claims.notificationKind, 80) &&
      Number.isFinite(issuedAt) &&
      age >= -5 * 60 * 1000 &&
      age <= TRACKING_TOKEN_MAX_AGE_MS;

    if (!commonClaimsAreValid) {
      return null;
    }

    if (
      claims.ownerType === 'user' &&
      !isValidClaimText(claims.endpointHash, 64)
    ) {
      return null;
    }

    return claims as PushTrackingClaims;
  } catch {
    return null;
  }
}
