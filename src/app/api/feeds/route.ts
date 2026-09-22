import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      service: "UPPA - Feeds & Integrations API",
      status: "operational",
      cronEndpoint: "/api/feeds/sync",
      documentation: "MASTER_PLAN.md - Seções 23 a 30",
    },
    { status: 200 }
  );
}
