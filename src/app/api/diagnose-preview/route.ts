import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateImagePreview, generateVideoPoster } from "@/lib/previews";

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    const supabase = getSupabaseAdmin();

    // Check 1: Database columns exist
    try {
      const { data, error } = await supabase
        .from("generations")
        .select("id,preview_path,poster_path,preview_status")
        .limit(1);

      diagnostics.checks.database = {
        status: error ? "error" : "ok",
        message: error
          ? `Database error: ${error.message} (code: ${(error as any).code})`
          : "Columns exist",
        hasData: !!data && data.length > 0,
      };
    } catch (e: any) {
      diagnostics.checks.database = {
        status: "error",
        message: `Exception: ${e.message}`,
      };
    }

    // Check 2: Test sharp import
    try {
      const sharp = (await import("sharp")).default;
      diagnostics.checks.sharp = {
        status: "ok",
        version: sharp.versions,
      };
    } catch (e: any) {
      diagnostics.checks.sharp = {
        status: "error",
        message: e.message,
      };
    }

    // Check 3: Test ffmpeg import
    try {
      await import("fluent-ffmpeg");
      diagnostics.checks.ffmpeg = {
        status: "ok",
        message: "Module loaded",
      };
    } catch (e: any) {
      diagnostics.checks.ffmpeg = {
        status: "error",
        message: e.message,
      };
    }

    // Check 4: Storage bucket access
    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      const generationsBucket = buckets?.find((b: any) => b.name === "generations");

      diagnostics.checks.storage = {
        status: bucketError ? "error" : generationsBucket ? "ok" : "warning",
        message: bucketError
          ? `Storage error: ${bucketError.message}`
          : generationsBucket
            ? `Bucket "generations" exists (public: ${generationsBucket.public})`
            : 'Bucket "generations" not found',
        buckets: buckets?.map((b: any) => b.name),
      };
    } catch (e: any) {
      diagnostics.checks.storage = {
        status: "error",
        message: e.message,
      };
    }

    // Check 5: Test preview generation (simple)
    try {
      const testImageUrl = "https://placehold.co/512x512.webp";
      const testId = `diag-${Date.now()}`;

      const result = await generateImagePreview({
        sourceUrl: testImageUrl,
        userId: "diagnostic",
        generationId: testId,
        supabase,
      });

      diagnostics.checks.previewGeneration = {
        status: "ok",
        path: result.path,
        publicUrl: result.publicUrl,
        message: "Successfully generated test preview",
      };

      // Clean up test file
      await supabase.storage.from("generations").remove([result.path]);
    } catch (e: any) {
      diagnostics.checks.previewGeneration = {
        status: "error",
        message: e.message,
        stack: e.stack,
      };
    }

    // Overall status
    const allOk = Object.values(diagnostics.checks).every((c: any) => c.status === "ok");
    diagnostics.overall = allOk ? "healthy" : "issues_detected";

    return NextResponse.json(diagnostics, {
      status: allOk ? 200 : 500,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        overall: "error",
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}


