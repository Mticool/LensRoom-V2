import { NextResponse } from "next/server";

const ERROR_TEXT = "Integration is not configured";
const DEFAULT_HINT = "Set required env vars in .env.local or platform env";

export function integrationNotConfigured(provider: string, missing?: string[]) {
  return NextResponse.json(
    {
      error: ERROR_TEXT,
      provider,
      hint: DEFAULT_HINT,
      missing: missing && missing.length ? missing : undefined,
    },
    { status: 500 }
  );
}


