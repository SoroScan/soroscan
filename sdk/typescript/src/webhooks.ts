import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify the X-SoroScan-Signature header of an incoming webhook.
 *
 * @param payload - The raw webhook body as a string.
 * @param signatureHeader - The value of the X-SoroScan-Signature header
 *                         (e.g. `"sha256=abc123..."`).
 * @param secretKey - The shared HMAC signing key.
 * @returns `true` if the signature is valid, `false` otherwise.
 *
 * @example
 * ```ts
 * import { verifyWebhookSignature } from "@soroscan/sdk/webhooks";
 *
 * const isValid = verifyWebhookSignature(
 *   JSON.stringify(req.body),
 *   req.headers["x-soroscan-signature"],
 *   process.env.SOROSCAN_WEBHOOK_SECRET!,
 * );
 * ```
 */
export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | undefined | null,
  secretKey: string,
): boolean {
  if (!signatureHeader) {
    return false;
  }

  const eqIndex = signatureHeader.indexOf("=");
  if (eqIndex === -1) {
    return false;
  }

  const algorithm = signatureHeader.slice(0, eqIndex);
  const signature = signatureHeader.slice(eqIndex + 1);

  let hashAlgo: string;
  if (algorithm === "sha256") {
    hashAlgo = "sha256";
  } else if (algorithm === "sha1") {
    hashAlgo = "sha1";
  } else {
    return false;
  }

  const expected = createHmac(hashAlgo, secretKey)
    .update(payload)
    .digest("hex");

  try {
    const expectedBuf = Buffer.from(expected, "utf-8");
    const sigBuf = Buffer.from(signature, "utf-8");
    return (
      expectedBuf.length === sigBuf.length &&
      timingSafeEqual(expectedBuf, sigBuf)
    );
  } catch {
    return false;
  }
}

/**
 * Convenience wrapper that extracts the signature header from a headers
 * object (case-insensitive).
 *
 * @param payload - The raw webhook body as a string.
 * @param headers - An object of request headers.
 * @param secretKey - The shared HMAC signing key.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
export function verifyWebhook(
  payload: string,
  headers: Record<string, string | string[] | undefined>,
  secretKey: string,
): boolean {
  const headerValue = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === "x-soroscan-signature",
  )?.[1];
  const signatureValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return verifyWebhookSignature(payload, signatureValue, secretKey);
}
