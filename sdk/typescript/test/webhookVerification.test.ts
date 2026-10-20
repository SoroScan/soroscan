import { describe, expect, it } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifyWebhookSignature } from "../src/webhookVerification.js";
import { verifyWebhookSignature as verifyWebhookSignatureFromIndex } from "../src/index.js";

/**
 * Helper to generate a genuine Ed25519 keypair and export:
 * 1. raw 32-byte public key as Base64 string
 * 2. signing helper that formats output as `ed25519=<base64_sig>`
 */
function createEd25519KeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const spkiDer = publicKey.export({ format: "der", type: "spki" });
  // The Ed25519 SPKI DER prefix is 12 bytes (302a300506032b6570032100).
  // The remaining 32 bytes constitute the raw Ed25519 public key.
  const rawPublicKey = spkiDer.subarray(12);
  const publicKeyBase64 = rawPublicKey.toString("base64");

  const createSignatureHeader = (payload: Buffer | string): string => {
    const data = typeof payload === "string" ? Buffer.from(payload) : payload;
    const signatureBuffer = sign(null, data, privateKey);
    return `ed25519=${signatureBuffer.toString("base64")}`;
  };

  return { publicKeyBase64, createSignatureHeader, privateKey };
}

describe("verifyWebhookSignature", () => {
  describe("valid signatures", () => {
    it("verifies a valid signature with a string payload", () => {
      const { publicKeyBase64, createSignatureHeader } = createEd25519KeyPair();
      const payload = JSON.stringify({
        event: "contract.call",
        contract_id: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        ledger: 10420,
      });
      const header = createSignatureHeader(payload);

      const isValid = verifyWebhookSignature(payload, header, publicKeyBase64);
      expect(isValid).toBe(true);
    });

    it("verifies a valid signature with a Buffer payload", () => {
      const { publicKeyBase64, createSignatureHeader } = createEd25519KeyPair();
      const payload = Buffer.from("arbitrary binary or raw webhook payload \x00\xff");
      const header = createSignatureHeader(payload);

      const isValid = verifyWebhookSignature(payload, header, publicKeyBase64);
      expect(isValid).toBe(true);
    });

    it("verifies matching string and Buffer representations of identical payload", () => {
      const { publicKeyBase64, createSignatureHeader } = createEd25519KeyPair();
      const payloadStr = '{"status":"ok","timestamp":1700000000}';
      const payloadBuf = Buffer.from(payloadStr, "utf-8");
      const header = createSignatureHeader(payloadStr);

      expect(verifyWebhookSignature(payloadStr, header, publicKeyBase64)).toBe(true);
      expect(verifyWebhookSignature(payloadBuf, header, publicKeyBase64)).toBe(true);
    });

    it("verifies empty string and empty buffer payloads", () => {
      const { publicKeyBase64, createSignatureHeader } = createEd25519KeyPair();

      const emptyStr = "";
      const emptyStrHeader = createSignatureHeader(emptyStr);
      expect(verifyWebhookSignature(emptyStr, emptyStrHeader, publicKeyBase64)).toBe(true);

      const emptyBuf = Buffer.alloc(0);
      const emptyBufHeader = createSignatureHeader(emptyBuf);
      expect(verifyWebhookSignature(emptyBuf, emptyBufHeader, publicKeyBase64)).toBe(true);
    });

    it("verifies payloads containing multi-byte UTF-8, unicode and special symbols", () => {
      const { publicKeyBase64, createSignatureHeader } = createEd25519KeyPair();
      const payload = JSON.stringify({
        message: "区块链 Soroban 智能合约事件 🚀 ✨",
        symbols: "<>&\"'`\n\r\t/\\",
      });
      const header = createSignatureHeader(payload);

      expect(verifyWebhookSignature(payload, header, publicKeyBase64)).toBe(true);
    });

    it("verifies large payloads (e.g. 64KB batched event logs)", () => {
      const { publicKeyBase64, createSignatureHeader } = createEd25519KeyPair();
      const largePayload = JSON.stringify({
        batch_events: Array.from({ length: 250 }, (_, i) => ({
          id: `event-${i}`,
          topic: "TRANSFER",
          data: "0000000000000000000000000000000000000000000000000000000000000001",
        })),
      });
      const header = createSignatureHeader(largePayload);

      expect(verifyWebhookSignature(largePayload, header, publicKeyBase64)).toBe(true);
    });

    it("verifies across multiple independently generated key pairs", () => {
      for (let i = 0; i < 5; i++) {
        const { publicKeyBase64, createSignatureHeader } = createEd25519KeyPair();
        const payload = `payload_iteration_${i}`;
        const header = createSignatureHeader(payload);

        expect(verifyWebhookSignature(payload, header, publicKeyBase64)).toBe(true);
      }
    });
  });

  describe("tampered or invalid payload and signatures", () => {
    it("rejects when the payload body is tampered", () => {
      const { publicKeyBase64, createSignatureHeader } = createEd25519KeyPair();
      const originalPayload = '{"action":"payout","amount":100}';
      const header = createSignatureHeader(originalPayload);

      const tamperedPayload = '{"action":"payout","amount":999}';
      expect(verifyWebhookSignature(tamperedPayload, header, publicKeyBase64)).toBe(false);
    });

    it("rejects when the payload has an appended byte or subtle modification", () => {
      const { publicKeyBase64, createSignatureHeader } = createEd25519KeyPair();
      const payload = "webhook-data";
      const header = createSignatureHeader(payload);

      expect(verifyWebhookSignature(payload + " ", header, publicKeyBase64)).toBe(false);
      expect(verifyWebhookSignature("Webhook-data", header, publicKeyBase64)).toBe(false);
    });

    it("rejects when the signature bytes are corrupted", () => {
      const { publicKeyBase64, createSignatureHeader } = createEd25519KeyPair();
      const payload = "webhook-data";
      const header = createSignatureHeader(payload);

      // Mutate the base64 characters of the signature
      const rawSigB64 = header.slice("ed25519=".length);
      const corruptedB64 =
        rawSigB64[0] === "A" ? "B" + rawSigB64.slice(1) : "A" + rawSigB64.slice(1);
      const corruptedHeader = `ed25519=${corruptedB64}`;

      expect(verifyWebhookSignature(payload, corruptedHeader, publicKeyBase64)).toBe(false);
    });

    it("rejects when verified against a different public key", () => {
      const keyPairA = createEd25519KeyPair();
      const keyPairB = createEd25519KeyPair();

      const payload = "sensitive webhook content";
      const header = keyPairA.createSignatureHeader(payload);

      expect(verifyWebhookSignature(payload, header, keyPairB.publicKeyBase64)).toBe(false);
    });

    it("rejects signature signed by a different private key", () => {
      const legitKeyPair = createEd25519KeyPair();
      const attackerKeyPair = createEd25519KeyPair();

      const payload = '{"status":"success"}';
      const attackerHeader = attackerKeyPair.createSignatureHeader(payload);

      expect(verifyWebhookSignature(payload, attackerHeader, legitKeyPair.publicKeyBase64)).toBe(false);
    });
  });

  describe("header format and prefix defense", () => {
    it("rejects signature header missing ed25519= prefix", () => {
      const { publicKeyBase64, createSignatureHeader } = createEd25519KeyPair();
      const payload = "sample-payload";
      const header = createSignatureHeader(payload);
      const rawBase64 = header.slice("ed25519=".length);

      expect(verifyWebhookSignature(payload, rawBase64, publicKeyBase64)).toBe(false);
    });

    it("rejects signature header with wrong prefix (e.g. sha256=, ED25519=, bearer )", () => {
      const { publicKeyBase64, createSignatureHeader } = createEd25519KeyPair();
      const payload = "sample-payload";
      const header = createSignatureHeader(payload);
      const rawBase64 = header.slice("ed25519=".length);

      expect(verifyWebhookSignature(payload, `sha256=${rawBase64}`, publicKeyBase64)).toBe(false);
      expect(verifyWebhookSignature(payload, `ED25519=${rawBase64}`, publicKeyBase64)).toBe(false);
      expect(verifyWebhookSignature(payload, `Bearer ${rawBase64}`, publicKeyBase64)).toBe(false);
      expect(verifyWebhookSignature(payload, `ed25519:${rawBase64}`, publicKeyBase64)).toBe(false);
    });

    it("rejects empty, whitespace-only, or prefix-only signature header", () => {
      const { publicKeyBase64 } = createEd25519KeyPair();
      const payload = "sample-payload";

      expect(verifyWebhookSignature(payload, "", publicKeyBase64)).toBe(false);
      expect(verifyWebhookSignature(payload, "ed25519=", publicKeyBase64)).toBe(false);
      expect(verifyWebhookSignature(payload, "   ", publicKeyBase64)).toBe(false);
      expect(verifyWebhookSignature(payload, " ed25519=abc", publicKeyBase64)).toBe(false);
    });

    it("rejects malformed base64 in signature header without throwing", () => {
      const { publicKeyBase64 } = createEd25519KeyPair();
      const payload = "sample-payload";

      expect(verifyWebhookSignature(payload, "ed25519=???not-valid-base64???", publicKeyBase64)).toBe(false);
      expect(verifyWebhookSignature(payload, "ed25519=abc", publicKeyBase64)).toBe(false);
    });
  });

  describe("public key robustness", () => {
    it("rejects empty public key without throwing", () => {
      const { createSignatureHeader } = createEd25519KeyPair();
      const payload = "sample-payload";
      const header = createSignatureHeader(payload);

      expect(verifyWebhookSignature(payload, header, "")).toBe(false);
    });

    it("rejects malformed public key base64 without throwing", () => {
      const { createSignatureHeader } = createEd25519KeyPair();
      const payload = "sample-payload";
      const header = createSignatureHeader(payload);

      expect(verifyWebhookSignature(payload, header, "not_valid_b64!@#$")).toBe(false);
    });

    it("rejects public key with incorrect byte length (not 32 bytes) without throwing", () => {
      const { createSignatureHeader } = createEd25519KeyPair();
      const payload = "sample-payload";
      const header = createSignatureHeader(payload);

      // 16 bytes base64
      const shortKey = Buffer.alloc(16).toString("base64");
      expect(verifyWebhookSignature(payload, header, shortKey)).toBe(false);

      // 64 bytes base64
      const longKey = Buffer.alloc(64).toString("base64");
      expect(verifyWebhookSignature(payload, header, longKey)).toBe(false);
    });
  });

  describe("re-export from main index", () => {
    it("matches the behavior of direct import", () => {
      const { publicKeyBase64, createSignatureHeader } = createEd25519KeyPair();
      const payload = "re-export-test";
      const header = createSignatureHeader(payload);

      const resDirect = verifyWebhookSignature(payload, header, publicKeyBase64);
      const resIndex = verifyWebhookSignatureFromIndex(payload, header, publicKeyBase64);

      expect(resDirect).toBe(true);
      expect(resIndex).toBe(true);
      expect(verifyWebhookSignatureFromIndex).toBe(verifyWebhookSignature);
    });
  });
});
