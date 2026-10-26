import { verifyJws, type VerifyOptions } from "./jws";

export const STORE_EVENT_KINDS = ["trial", "subscribe", "renew", "cancel", "uncancel", "refund", "refund_reversed", "revoke", "expire", "billing_issue", "other"] as const;
export type StoreEventKind = (typeof STORE_EVENT_KINDS)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface StoreEvent {
  notificationUuid: string;
  type: string;
  subtype: string | null;
  kind: StoreEventKind;
  appAccountToken: string | null;
  bundleId: string | null;
  environment: string | null;
  productId: string | null;
  transactionId: string | null;
  originalTransactionId: string | null;
  offerType: number | null;
  signedAt: string;
  expiresAt: string | null;
  transactionInfo: Record<string, unknown>;
  renewalInfo: Record<string, unknown>;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 && v.length <= 256 ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function ms(v: unknown): string | null {
  const n = num(v);
  return n === null ? null : new Date(n).toISOString();
}

export function classify(type: string, subtype: string | null, offerType: number | null, offerDiscountType: string | null): StoreEventKind {
  const trial = offerType === 1 && (offerDiscountType === null || offerDiscountType === "FREE_TRIAL");
  switch (type) {
    case "SUBSCRIBED":
      return trial ? "trial" : "subscribe";
    case "OFFER_REDEEMED":
      return trial ? "trial" : "subscribe";
    case "DID_RENEW":
      return "renew";
    case "DID_CHANGE_RENEWAL_STATUS":
      return subtype === "AUTO_RENEW_DISABLED" ? "cancel" : subtype === "AUTO_RENEW_ENABLED" ? "uncancel" : "other";
    case "REFUND":
      return "refund";
    case "REFUND_REVERSED":
      return "refund_reversed";
    case "REVOKE":
      return "revoke";
    case "EXPIRED":
    case "GRACE_PERIOD_EXPIRED":
      return "expire";
    case "DID_FAIL_TO_RENEW":
      return "billing_issue";
    default:
      return "other";
  }
}

export function decodeNotification(signedPayload: string, opts: VerifyOptions = {}): StoreEvent {
  const p = verifyJws(signedPayload, opts);
  const uuid = str(p.notificationUUID);
  if (!uuid || !UUID_RE.test(uuid)) throw new Error("bad_notification_uuid");
  const type = str(p.notificationType);
  if (!type) throw new Error("bad_notification_type");
  const data = (p.data && typeof p.data === "object" ? p.data : {}) as Record<string, unknown>;
  const tx = typeof data.signedTransactionInfo === "string" ? verifyJws(data.signedTransactionInfo, opts) : {};
  const renewal = typeof data.signedRenewalInfo === "string" ? verifyJws(data.signedRenewalInfo, opts) : {};
  const token = str(tx.appAccountToken) ?? str(renewal.appAccountToken);
  const offerType = num(tx.offerType);
  return {
    notificationUuid: uuid.toLowerCase(),
    type,
    subtype: str(p.subtype),
    kind: classify(type, str(p.subtype), offerType, str(tx.offerDiscountType)),
    appAccountToken: token && UUID_RE.test(token) ? token.toLowerCase() : null,
    bundleId: str(data.bundleId) ?? str(tx.bundleId),
    environment: str(data.environment) ?? str(tx.environment) ?? str(renewal.environment),
    productId: str(tx.productId) ?? str(renewal.productId),
    transactionId: str(tx.transactionId),
    originalTransactionId: str(tx.originalTransactionId) ?? str(renewal.originalTransactionId),
    offerType,
    signedAt: ms(p.signedDate) ?? new Date().toISOString(),
    expiresAt: ms(tx.expiresDate),
    transactionInfo: tx,
    renewalInfo: renewal,
  };
}
