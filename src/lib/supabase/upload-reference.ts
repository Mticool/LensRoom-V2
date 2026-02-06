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
    throw new Error("supabase_not_ready");
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    throw new Error("user_not_authenticated");
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
      const { data: pub } = supabase.storage.from("generations").getPublicUrl(path);
      return pub.publicUrl;
    })
  );

  return uploaded.filter((u): u is string => typeof u === "string" && u.length > 0);
}
