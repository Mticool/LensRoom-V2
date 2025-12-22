import { NextResponse } from "next/server";
import { requireRole, respondAuthError } from "@/lib/auth/requireRole";
import { listContentTables } from "@/lib/admin/schema-mapping";

export async function GET() {
  try {
    await requireRole("manager");
    const meta = await listContentTables();
    return NextResponse.json(meta);
  } catch (e) {
    return respondAuthError(e);
  }
}


