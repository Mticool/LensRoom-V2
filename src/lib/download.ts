export async function downloadImage(url: string, filename?: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename || `lensroom-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(blobUrl);

    return true;
  } catch (error) {
    console.error("Download error:", error);
    throw new Error("Не удалось скачать изображение");
  }
}

export async function downloadVideo(url: string, filename?: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename || `lensroom-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(blobUrl);

    return true;
  } catch (error) {
    console.error("Download error:", error);
    throw new Error("Не удалось скачать видео");
  }
}

export async function downloadMultipleImages(
  results: Array<{ url: string; id: string }>
): Promise<void> {
  try {
    // Динамический импорт JSZip
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    // Добавляем все изображения в ZIP
    for (let i = 0; i < results.length; i++) {
      const response = await fetch(results[i].url);
      const blob = await response.blob();
      zip.file(`image-${i + 1}.png`, blob);
    }

    // Генерируем ZIP
    const content = await zip.generateAsync({ type: "blob" });
    const blobUrl = URL.createObjectURL(content);

    // Скачиваем
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `lensroom-images-${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download multiple error:", error);
    throw new Error("Не удалось скачать изображения");
  }
}

