import { NextResponse } from "next/server";

const upstreamApiBase = "https://preprod.api.andamio.io/api/v2/users";

type RouteContext = {
  params: Promise<{ alias: string }>;
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
  const { alias } = await context.params;
  const apiKey = process.env.ANDAMIO_API_KEY?.trim();

  const headers: HeadersInit = {
    accept: "application/json",
  };
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  console.info(`[andamio-state][${requestId}] incoming`, {
    alias,
    hasApiKey: Boolean(apiKey),
  });

  if (!apiKey) {
    console.error(`[andamio-state][${requestId}] missing API key`);
    return NextResponse.json(
      { error: "Server is missing ANDAMIO_API_KEY configuration." },
      { status: 500 },
    );
  }

  if (!alias) {
    console.warn(`[andamio-state][${requestId}] validation failed: alias missing`);
    return NextResponse.json({ error: "Alias is required." }, { status: 400 });
  }

  try {
    const response = await fetch(`${upstreamApiBase}/${encodeURIComponent(alias)}/state`, {
      cache: "no-store",
      headers,
    });

    console.info(`[andamio-state][${requestId}] upstream response`, {
      status: response.status,
      ok: response.ok,
      alias,
    });

    if (!response.ok) {
      const errorText = (await response.text()).slice(0, 240);
      console.error(`[andamio-state][${requestId}] upstream error body`, {
        alias,
        preview: previewValue(errorText),
      });
      return NextResponse.json(
        {
          error: `Could not load user state (${response.status}).`,
          details: errorText || null,
        },
        { status: response.status },
      );
    }

    const payload: unknown = await response.json();
    const payloadSummary =
      payload && typeof payload === "object"
        ? {
          completedCourses:
            "completed_courses" in payload && Array.isArray(payload.completed_courses)
              ? payload.completed_courses.length
              : undefined,
          enrolledCourses:
            "enrolled_courses" in payload && Array.isArray(payload.enrolled_courses)
              ? payload.enrolled_courses.length
              : undefined,
          joinedProjects:
            "joined_projects" in payload && Array.isArray(payload.joined_projects)
              ? payload.joined_projects.length
              : undefined,
        }
        : null;
    console.info(`[andamio-state][${requestId}] success`, { alias, payloadSummary });
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error(`[andamio-state][${requestId}] request failed`, {
      alias,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch user state.",
      },
      { status: 502 },
    );
  }
}
