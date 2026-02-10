"use client";

import { createClient } from "@/lib/supabase/client";

function inferExt(file: File): string {
  const name = String(file.name || "").trim();
  const byName = name.includes(".") ? name.split(".").pop() : "";
  const byType = (() => {
    const t = String(file.type || "").toLowerCase();
    if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
    if (t.includes("png")) return "png";
    if (t.includes("webp")) return "webp";
    return "";
  })();
  return (byName || byType || "png").toLowerCase();
}

export async function uploadReferenceFiles(
  files: File[],
  opts?: { prefix?: string }
): Promise<string[]> {
  if (!files.length) return [];

  const supabase = createClient();
  if (!supabase) {
    // Common in mis-built/cached client bundles where NEXT_PUBLIC_ vars were not inlined.
    // Callers will fall back to base64 references.
    return [];
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    // Callers will fall back to base64 references.
    return [];
  }

  const userId = userData.user.id;
  const prefix = opts?.prefix || "i2i";

  const uploaded = await Promise.all(
    files.map(async (file) => {
      const ext = inferExt(file);
      const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const path = `${userId}/inputs/${fileName}`;
      const { error: upErr } = await supabase.storage
        .from("generations")
        .upload(path, file, {
          contentType: file.type || `image/${ext}`,
          upsert: true,
        });
      if (upErr) throw upErr;

      // References are stored under `${userId}/inputs/` which may be private.
      // Use a signed URL so external providers can fetch it without Supabase auth headers.
      try {
        const { data: signed, error: signErr } = await supabase.storage
          .from("generations")
          .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days
        if (!signErr && signed?.signedUrl) return signed.signedUrl;
        // If we cannot create a signed URL, do not fall back to public URL: for private paths it breaks providers.
        // Throw to let callers fall back to base64 upload.
        throw signErr || new Error("signed_url_failed");
      } catch {
        throw new Error("signed_url_failed");
      }
    })
  );

  return uploaded.filter((u): u is string => typeof u === "string" && u.length > 0);
}
