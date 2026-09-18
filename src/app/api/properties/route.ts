import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { message: "Endpoint de propriedades em preparação conforme MASTER_PLAN" },
    { status: 200 }
  );
}
