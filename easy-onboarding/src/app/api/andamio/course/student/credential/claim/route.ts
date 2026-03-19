import { NextResponse } from "next/server";

const andamioClaimApiUrl = "https://preprod.api.andamio.io/api/v2/tx/course/student/credential/claim";

type ClaimRouteRequest = {
  alias?: unknown;
  course_id?: unknown;
  initiator_data?: {
    change_address?: unknown;
    used_addresses?: unknown;
  };
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

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const apiKey = process.env.ANDAMIO_API_KEY?.trim();
  const envCourseId =
    process.env.ANDAMIO_COURSE_ID?.trim() || process.env.NEXT_PUBLIC_ANDAMIO_COURSE_ID?.trim();

  console.info(`[andamio-claim][${requestId}] incoming`, {
    method: request.method,
    hasApiKey: Boolean(apiKey),
    hasEnvCourseId: Boolean(envCourseId),
  });

  if (!apiKey) {
    console.error(`[andamio-claim][${requestId}] missing API key`);
    return NextResponse.json(
      { error: "Server is missing Andamio API key configuration." },
      { status: 500 },
    );
  }

  let body: ClaimRouteRequest;
  try {
    body = (await request.json()) as ClaimRouteRequest;
  } catch {
    console.warn(`[andamio-claim][${requestId}] invalid JSON body`);
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const alias = typeof body.alias === "string" ? body.alias.trim() : "";
  const bodyCourseId = typeof body.course_id === "string" ? body.course_id.trim() : "";
  const courseId = bodyCourseId || envCourseId || "";

  const changeAddress =
    body.initiator_data && typeof body.initiator_data.change_address === "string"
      ? body.initiator_data.change_address.trim()
      : "";
  const usedAddresses =
    body.initiator_data && Array.isArray(body.initiator_data.used_addresses)
      ? body.initiator_data.used_addresses
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .map((item) => item.trim())
      : [];

  console.info(`[andamio-claim][${requestId}] normalized request`, {
    alias,
    courseIdSource: bodyCourseId ? "body" : "env",
    changeAddress: shortValue(changeAddress),
    usedAddressesCount: usedAddresses.length,
  });

  if (!alias) {
    console.warn(`[andamio-claim][${requestId}] validation failed: alias missing`);
    return NextResponse.json({ error: "Alias is required." }, { status: 400 });
  }

  if (!courseId) {
    console.warn(`[andamio-claim][${requestId}] validation failed: course_id missing`);
    return NextResponse.json({ error: "course_id is required." }, { status: 400 });
  }

  if (!changeAddress || usedAddresses.length === 0) {
    console.warn(`[andamio-claim][${requestId}] validation failed: initiator_data missing/invalid`);
    return NextResponse.json({ error: "Valid initiator_data is required." }, { status: 400 });
  }

  const payload = {
    alias,
    course_id: courseId,
    initiator_data: {
      change_address: changeAddress,
      used_addresses: usedAddresses,
    },
  };

  console.info(`[andamio-claim][${requestId}] full payload\n${JSON.stringify(payload, null, 4)}`);

  try {
    const response = await fetch(andamioClaimApiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    console.info(`[andamio-claim][${requestId}] upstream response`, {
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
      console.error(`[andamio-claim][${requestId}] upstream error body`, {
        preview: previewValue(parsedBody),
      });
      return NextResponse.json(
        {
          error: `Claim API failed (${response.status}).`,
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
      console.error(`[andamio-claim][${requestId}] upstream missing unsigned_tx`, {
        preview: previewValue(parsedBody),
      });
      return NextResponse.json(
        { error: "Claim API returned no unsigned_tx.", details: parsedBody },
        { status: 502 },
      );
    }

    console.info(`[andamio-claim][${requestId}] success`, {
      unsignedTxLength: parsedBody.unsigned_tx.length,
      alias,
      courseId: shortValue(courseId),
    });

    return NextResponse.json(parsedBody, { status: 200 });
  } catch (error) {
    console.error(`[andamio-claim][${requestId}] request failed`, {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reach claim API." },
      { status: 502 },
    );
  }
}
