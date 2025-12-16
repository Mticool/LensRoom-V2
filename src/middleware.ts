import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Minimal middleware export to satisfy Next.js.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
