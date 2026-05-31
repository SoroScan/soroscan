import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const backendBaseUrl = process.env.BACKEND_BASE_URL || "http://localhost:8000";
const backendGraphqlUrl =
  process.env.BACKEND_GRAPHQL_URL || `${backendBaseUrl.replace(/\/$/, "")}/graphql/`;

function buildCsrfToken(): string {
  return randomBytes(16).toString("hex");
}

export async function POST(request: Request): Promise<Response> {
  let body: string;

  try {
    body = await request.text();
  } catch {
    return NextResponse.json(
      { errors: [{ message: "Unable to read GraphQL request payload." }] },
      { status: 400 },
    );
  }

  const csrfToken = buildCsrfToken();
  const authorization = request.headers.get("authorization");

  try {
    const upstreamResponse = await fetch(backendGraphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: `csrftoken=${csrfToken}`,
        "X-CSRFToken": csrfToken,
        ...(authorization ? { Authorization: authorization } : {}),
      },
      cache: "no-store",
      body,
    });

    const payload = await upstreamResponse.text();
    const contentType =
      upstreamResponse.headers.get("content-type") || "application/json";

    return new Response(payload, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch {
    return NextResponse.json(
      {
        errors: [
          {
            message:
              "GraphQL backend is unavailable. Ensure Django is running and BACKEND_BASE_URL is configured correctly.",
          },
        ],
      },
      { status: 502 },
    );
  }
}
