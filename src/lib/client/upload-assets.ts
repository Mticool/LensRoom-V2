export type UploadAssetType = "image" | "video";

const MAX_SIZE_BYTES: Record<UploadAssetType, number> = {
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
};

function validateAsset(file: File, type: UploadAssetType) {
  if (type === "image" && !file.type.startsWith("image/")) {
    throw new Error("Файл должен быть изображением");
  }
  if (type === "video" && !file.type.startsWith("video/")) {
    throw new Error("Файл должен быть видео");
  }

  const maxBytes = MAX_SIZE_BYTES[type];
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / 1024 / 1024);
    throw new Error(`Файл слишком большой. Максимум ${maxMb}MB`);
  }
}

export async function uploadAsset(file: File, type: UploadAssetType): Promise<string> {
  validateAsset(file, type);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);

  const response = await fetch("/api/upload/voice-assets", {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.url) {
    throw new Error(data?.message || data?.error || "Не удалось загрузить файл");
  }

  return String(data.url);
}

