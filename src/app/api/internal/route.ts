import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { message: "Endpoint de rotas internas do sistema" },
    { status: 200 }
  );
}
