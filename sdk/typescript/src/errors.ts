/**
 * Error types for the SoroScan TypeScript SDK.
 */

export interface SoroScanAPIErrorOptions {
  statusCode: number;
  message: string;
  body?: unknown;
}

/**
 * Error thrown when the SoroScan API returns a non-2xx HTTP response.
 *
 * Exposes the HTTP `statusCode` alongside the server-provided `message`
 * so callers can branch on 4xx/5xx responses programmatically.
 */
export class SoroScanAPIError extends Error {
  /** HTTP status code returned by the server (e.g. 404, 500). */
  public readonly statusCode: number;

  /** Raw response body, when available. */
  public readonly body?: unknown;

  constructor(options: SoroScanAPIErrorOptions);
  constructor(statusCode: number, message: string, body?: unknown);
  constructor(
    statusOrOptions: number | SoroScanAPIErrorOptions,
    message?: string,
    body?: unknown,
  ) {
    const statusCode =
      typeof statusOrOptions === "number"
        ? statusOrOptions
        : statusOrOptions.statusCode;
    const resolvedMessage =
      typeof statusOrOptions === "number"
        ? (message ?? "")
        : statusOrOptions.message;
    const resolvedBody =
      typeof statusOrOptions === "number" ? body : statusOrOptions.body;

    super(resolvedMessage);
    this.name = "SoroScanAPIError";
    this.statusCode = statusCode;
    this.body = resolvedBody;

    // Restore prototype chain for instanceof checks when targeting ES5.
    Object.setPrototypeOf(this, SoroScanAPIError.prototype);
  }
}

export default SoroScanAPIError;
