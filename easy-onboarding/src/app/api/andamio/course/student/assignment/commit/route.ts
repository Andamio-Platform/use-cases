import { NextResponse } from "next/server";

const andamioCommitApiUrl =
  "https://preprod.api.andamio.io/api/v2/tx/course/student/assignment/commit";

type CommitRouteRequest = {
  alias?: unknown;
  assignment_info?: unknown;
  course_id?: unknown;
  initiator_data?: {
    change_address?: unknown;
    used_addresses?: unknown;
  };
  slt_hash?: unknown;
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
  const envSltHash =
    process.env.ANDAMIO_SLT_HASH?.trim() || process.env.NEXT_PUBLIC_ANDAMIO_SLT_HASH?.trim();

  console.info(`[andamio-commit][${requestId}] incoming`, {
    method: request.method,
    hasApiKey: Boolean(apiKey),
    hasEnvCourseId: Boolean(envCourseId),
    hasEnvSltHash: Boolean(envSltHash),
  });

  if (!apiKey) {
    console.error(`[andamio-commit][${requestId}] missing API key`);
    return NextResponse.json(
      { error: "Server is missing Andamio API key configuration." },
      { status: 500 },
    );
  }

  let body: CommitRouteRequest;
  try {
    body = (await request.json()) as CommitRouteRequest;
  } catch {
    console.warn(`[andamio-commit][${requestId}] invalid JSON body`);
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const alias = typeof body.alias === "string" ? body.alias.trim() : "";
  const assignmentInfo =
    typeof body.assignment_info === "string" && body.assignment_info.trim().length > 0
      ? body.assignment_info
      : "I agree";
  const bodyCourseId = typeof body.course_id === "string" ? body.course_id.trim() : "";
  const bodySltHash = typeof body.slt_hash === "string" ? body.slt_hash.trim() : "";
  const courseId = bodyCourseId || envCourseId || "";
  const sltHash = bodySltHash || envSltHash || "";

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

  console.info(`[andamio-commit][${requestId}] normalized request`, {
    alias,
    assignmentInfoLength: assignmentInfo.length,
    courseIdSource: bodyCourseId ? "body" : "env",
    sltHashSource: bodySltHash ? "body" : "env",
    changeAddress: shortValue(changeAddress),
    usedAddressesCount: usedAddresses.length,
  });

  if (!alias) {
    console.warn(`[andamio-commit][${requestId}] validation failed: alias missing`);
    return NextResponse.json({ error: "Alias is required." }, { status: 400 });
  }

  if (!changeAddress || usedAddresses.length === 0) {
    console.warn(`[andamio-commit][${requestId}] validation failed: initiator_data missing/invalid`);
    return NextResponse.json({ error: "Valid initiator_data is required." }, { status: 400 });
  }

  if (!courseId || !sltHash) {
    console.error(`[andamio-commit][${requestId}] validation failed: course_id or slt_hash missing`);
    return NextResponse.json(
      { error: "Missing course_id or slt_hash for commit transaction." },
      { status: 500 },
    );
  }

  const payload = {
    alias,
    assignment_info: assignmentInfo,
    course_id: courseId,
    initiator_data: {
      change_address: changeAddress,
      used_addresses: usedAddresses,
    },
    slt_hash: sltHash,
  };

  console.info(
    `[andamio-commit][${requestId}] full payload\n${JSON.stringify(payload, null, 4)}`,
  );

  try {
    console.info(`[andamio-commit][${requestId}] upstream request`, {
      alias,
      courseId: shortValue(courseId),
      sltHash: shortValue(sltHash),
      usedAddressesCount: usedAddresses.length,
    });

    const response = await fetch(andamioCommitApiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    console.info(`[andamio-commit][${requestId}] upstream response`, {
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
      console.error(`[andamio-commit][${requestId}] upstream error body`, {
        preview: previewValue(parsedBody),
      });
      return NextResponse.json(
        {
          error: `Commit API failed (${response.status}).`,
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
      console.error(`[andamio-commit][${requestId}] upstream missing unsigned_tx`, {
        preview: previewValue(parsedBody),
      });
      return NextResponse.json(
        { error: "Commit API returned no unsigned_tx.", details: parsedBody },
        { status: 502 },
      );
    }

    console.info(`[andamio-commit][${requestId}] success`, {
      unsignedTxLength: parsedBody.unsigned_tx.length,
    });

    return NextResponse.json(parsedBody, { status: 200 });
  } catch (error) {
    console.error(`[andamio-commit][${requestId}] request failed`, {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reach commit API." },
      { status: 502 },
    );
  }
}
