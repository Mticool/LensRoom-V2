import { toast } from 'sonner';

export async function downloadImage(url: string, filename: string = 'image.png'): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    
    toast.success('Изображение скачано!');
  } catch (error) {
    console.error('Download error:', error);
    toast.error('Ошибка скачивания');
  }
}

export async function downloadVideo(url: string, filename: string = 'video.mp4'): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    
    toast.success('Видео скачано!');
  } catch (error) {
    console.error('Download error:', error);
    toast.error('Ошибка скачивания');
  }
}

export async function downloadMultipleImages(
  results: Array<{ url: string; id: string }>
): Promise<void> {
  toast.info('Скачивание началось...');
  
  for (let i = 0; i < results.length; i++) {
    await downloadImage(results[i].url, `image-${i + 1}.png`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  toast.success(`Скачано ${results.length} изображений`);
}



