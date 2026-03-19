import { NextResponse } from "next/server";

const andamioMintApiUrl = "https://preprod.api.andamio.io/api/v2/tx/global/user/access-token/mint";

type MintRouteRequest = {
  alias?: unknown;
  initiator_data?: unknown;
};

type MintRouteErrorPayload = {
  error?: unknown;
  message?: unknown;
  detail?: unknown;
  details?: unknown;
  error_code?: unknown;
};

function createRequestId() {
  if ("randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shortValue(value: string, head = 10, tail = 6) {
  if (value.length <= head + tail) {
    return value;
  }

  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function previewValue(value: unknown, limit = 320) {
  const raw =
    typeof value === "string"
      ? value
      : (() => {
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        })();

  return raw.length > limit ? `${raw.slice(0, limit)}...` : raw;
}

function extractErrorMessage(payload: unknown) {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload.trim();
  }

  if (!payload || typeof payload !== "object") {
    return "";
  }

  const candidate = payload as MintRouteErrorPayload;
  const keys: Array<keyof MintRouteErrorPayload> = ["error", "message", "detail", "details"];
  for (const key of keys) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function parseObject(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function extractAliasConflictMessage(payload: unknown) {
  const top = parseObject(payload);
  if (!top) {
    return "";
  }

  const topErrorCode = typeof top.error_code === "string" ? top.error_code : "";
  const topMessage = typeof top.message === "string" ? top.message.trim() : "";
  if (topErrorCode === "ALIAS_NOT_AVAILABLE" && topMessage) {
    return topMessage;
  }

  const nested = parseObject(top.details);
  if (!nested) {
    return "";
  }

  const nestedErrorCode = typeof nested.error_code === "string" ? nested.error_code : "";
  const nestedMessage = typeof nested.message === "string" ? nested.message.trim() : "";
  if (nestedErrorCode === "ALIAS_NOT_AVAILABLE" && nestedMessage) {
    return nestedMessage;
  }

  return "";
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const apiKey = process.env.ANDAMIO_API_KEY?.trim();

  console.info(`[andamio-mint][${requestId}] incoming`, {
    method: request.method,
    hasApiKey: Boolean(apiKey),
  });

  if (!apiKey) {
    console.error(`[andamio-mint][${requestId}] missing API key`);
    return NextResponse.json(
      { error: "Server is missing Andamio API key configuration." },
      { status: 500 },
    );
  }

  let body: MintRouteRequest;
  try {
    body = (await request.json()) as MintRouteRequest;
  } catch {
    console.warn(`[andamio-mint][${requestId}] invalid JSON body`);
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const alias = typeof body.alias === "string" ? body.alias.trim() : "";
  const initiatorData =
    typeof body.initiator_data === "string" ? body.initiator_data.trim() : "";

  console.info(`[andamio-mint][${requestId}] normalized request`, {
    alias,
    initiatorData: shortValue(initiatorData),
  });

  if (!alias) {
    console.warn(`[andamio-mint][${requestId}] validation failed: alias missing`);
    return NextResponse.json({ error: "Alias is required." }, { status: 400 });
  }

  if (!initiatorData) {
    console.warn(`[andamio-mint][${requestId}] validation failed: initiator_data missing`);
    return NextResponse.json({ error: "initiator_data is required." }, { status: 400 });
  }

  const payload = {
    alias,
    initiator_data: initiatorData,
  };

  console.info(`[andamio-mint][${requestId}] full payload\n${JSON.stringify(payload, null, 4)}`);

  try {
    const response = await fetch(andamioMintApiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    console.info(`[andamio-mint][${requestId}] upstream response`, {
      status: response.status,
      ok: response.ok,
    });

    const rawBody = await response.text();
    let parsedBody: unknown = null;
    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = rawBody;
      }
    }

    if (!response.ok) {
      const upstreamMessage = extractErrorMessage(parsedBody);
      console.error(`[andamio-mint][${requestId}] upstream error body`, {
        preview: previewValue(parsedBody),
      });

      if (response.status === 409) {
        const aliasConflictMessage = extractAliasConflictMessage(parsedBody);
        const conflictMessage =
          aliasConflictMessage || "Alias already in use. Choose a different one.";
        console.warn(`[andamio-mint][${requestId}] alias conflict`, {
          alias,
          upstreamMessage,
          aliasConflictMessage,
        });
        return NextResponse.json(
          {
            code: "ALIAS_EXISTS",
            error: conflictMessage,
            details: parsedBody,
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error: upstreamMessage || `Mint API failed (${response.status}).`,
          details: parsedBody,
        },
        { status: response.status },
      );
    }

    if (
      !parsedBody ||
      typeof parsedBody !== "object" ||
      !("unsigned_tx" in parsedBody) ||
      typeof parsedBody.unsigned_tx !== "string"
    ) {
      console.error(`[andamio-mint][${requestId}] upstream missing unsigned_tx`, {
        preview: previewValue(parsedBody),
      });
      return NextResponse.json(
        { error: "Mint API returned no unsigned_tx.", details: parsedBody },
        { status: 502 },
      );
    }

    console.info(`[andamio-mint][${requestId}] success`, {
      unsignedTxLength: parsedBody.unsigned_tx.length,
    });

    return NextResponse.json(parsedBody, { status: 200 });
  } catch (error) {
    console.error(`[andamio-mint][${requestId}] request failed`, {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reach mint API." },
      { status: 502 },
    );
  }
}
