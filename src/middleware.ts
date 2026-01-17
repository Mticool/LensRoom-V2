import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Mobile redirect removed - all users now see StudioRuntime
  return NextResponse.next();
}
