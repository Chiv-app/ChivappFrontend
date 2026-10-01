import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Healthcheck barato para Docker/Cloud Run: no depende de servicios externos. */
export function GET() {
    return NextResponse.json(
        { status: "ok" },
        { headers: { "Cache-Control": "no-store" } },
    );
}
