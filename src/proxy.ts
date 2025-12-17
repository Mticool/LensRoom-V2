import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Minimal proxy export to satisfy Next.js (middleware -> proxy convention).
export function proxy(_request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[proxy] pass-through");
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

