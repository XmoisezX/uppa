import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Endpoint de webhooks externos em preparação" },
    { status: 200 }
  );
}
