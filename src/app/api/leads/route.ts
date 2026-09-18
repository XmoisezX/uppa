import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Endpoint de captura de leads em preparação (Prompt 8)" },
    { status: 200 }
  );
}
