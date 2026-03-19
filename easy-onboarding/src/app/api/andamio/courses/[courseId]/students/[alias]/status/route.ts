import { NextResponse } from "next/server";

const upstreamApiBase = "https://preprod.api.andamio.io/api/v2/courses";

type RouteContext = {
  params: Promise<{ courseId: string; alias: string }>;
};

function createRequestId() {
  if ("randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function previewValue(value: unknown, limit = 240) {
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

export async function GET(_request: Request, context: RouteContext) {
  const requestId = createRequestId();
  const { courseId, alias } = await context.params;
  const apiKey = process.env.ANDAMIO_API_KEY?.trim();

  console.info(`[andamio-course-status][${requestId}] incoming`, {
    courseId,
    alias,
    hasApiKey: Boolean(apiKey),
  });

  if (!apiKey) {
    console.error(`[andamio-course-status][${requestId}] missing API key`);
    return NextResponse.json(
      { error: "Server is missing ANDAMIO_API_KEY configuration." },
      { status: 500 },
    );
  }

  if (!courseId || !alias) {
    console.warn(`[andamio-course-status][${requestId}] validation failed`);
    return NextResponse.json(
      { error: "courseId and alias are required." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `${upstreamApiBase}/${encodeURIComponent(courseId)}/students/${encodeURIComponent(alias)}/status`,
      {
        cache: "no-store",
        headers: {
          accept: "application/json",
          "X-API-Key": apiKey,
        },
      },
    );

    console.info(`[andamio-course-status][${requestId}] upstream response`, {
      status: response.status,
      ok: response.ok,
      courseId,
      alias,
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
      console.error(`[andamio-course-status][${requestId}] upstream error body`, {
        courseId,
        alias,
        preview: previewValue(parsedBody),
      });
      return NextResponse.json(
        {
          error: `Could not load course status (${response.status}).`,
          details: parsedBody,
        },
        { status: response.status },
      );
    }

    console.info(`[andamio-course-status][${requestId}] success`, {
      courseId,
      alias,
      preview: previewValue(parsedBody),
    });
    return NextResponse.json(parsedBody, { status: 200 });
  } catch (error) {
    console.error(`[andamio-course-status][${requestId}] request failed`, {
      courseId,
      alias,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch course status.",
      },
      { status: 502 },
    );
  }
}
