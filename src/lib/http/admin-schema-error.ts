import { NextResponse } from "next/server";

const ERROR_TEXT = "Admin analytics schema mismatch";

export function adminSchemaMismatch(params: { hint: string; missing: string[] }) {
  return NextResponse.json(
    {
      error: ERROR_TEXT,
      hint: params.hint,
      missing: params.missing,
    },
    { status: 500 }
  );
}

