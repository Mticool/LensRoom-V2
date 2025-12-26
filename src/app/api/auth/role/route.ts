import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireRole";

export async function GET() {
  try {
    const { role } = await requireAuth();
    return NextResponse.json({ role });
  } catch (error) {
    return NextResponse.json({ role: "user" }, { status: 200 });
  }
}

