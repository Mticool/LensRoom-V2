import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm', 'audio/x-mpeg-3', 'audio/mpeg3'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

// Функция для проверки расширения файла
function hasValidAudioExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.webm');
}

function hasValidImageExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp');
}

function hasValidVideoExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm');
}

// Функция для получения MIME-типа, совместимого с Supabase Storage
function getSupabaseContentType(filename: string, originalType: string): string {
  const lower = filename.toLowerCase();

  // Для видео файлов
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.webm') && originalType.startsWith('video/')) return 'video/webm';

  // Для аудио файлов
  if (lower.endsWith('.mp3')) return 'audio/mp3';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.webm')) return 'audio/webm';

  // Для изображений
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';

  // Если не определили по расширению, возвращаем оригинальный тип
  return originalType;
}

export async function POST(request: NextRequest) {
  try {
    // Получить сессию пользователя
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const userId = (await getAuthUserId(session)) || session.profileId;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as 'image' | 'audio' | 'video' | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Missing file', message: 'Файл не указан' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'image' && type !== 'audio' && type !== 'video')) {
      return NextResponse.json(
        { error: 'Invalid type', message: 'Тип должен быть image, audio или video' },
        { status: 400 }
      );
    }

    // Валидация по типу
    if (type === 'image') {
      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: 'IMAGE_TOO_LARGE', message: `Изображение слишком большое. Максимум ${MAX_IMAGE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      // Проверяем и MIME-тип и расширение файла
      const hasValidMime = ALLOWED_IMAGE_TYPES.includes(file.type);
      const hasValidExt = hasValidImageExtension(file.name);

      if (!hasValidMime && !hasValidExt) {
        return NextResponse.json(
          { error: 'INVALID_IMAGE_FORMAT', message: 'Поддерживаются только JPG, PNG, WEBP' },
          { status: 400 }
        );
      }
    }

    if (type === 'audio') {
      if (file.size > MAX_AUDIO_SIZE) {
        return NextResponse.json(
          { error: 'AUDIO_TOO_LARGE', message: `Аудио слишком большое. Максимум ${MAX_AUDIO_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      // Проверяем и MIME-тип и расширение файла
      const hasValidMime = ALLOWED_AUDIO_TYPES.includes(file.type);
      const hasValidExt = hasValidAudioExtension(file.name);

      if (!hasValidMime && !hasValidExt) {
        return NextResponse.json(
          { error: 'INVALID_AUDIO_FORMAT', message: 'Поддерживаются только MP3, WAV, WEBM' },
          { status: 400 }
        );
      }
    }

    if (type === 'video') {
      if (file.size > MAX_VIDEO_SIZE) {
        return NextResponse.json(
          { error: 'VIDEO_TOO_LARGE', message: `Видео слишком большое. Максимум ${MAX_VIDEO_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      const hasValidMime = ALLOWED_VIDEO_TYPES.includes(file.type);
      const hasValidExt = hasValidVideoExtension(file.name);

      if (!hasValidMime && !hasValidExt) {
        return NextResponse.json(
          { error: 'INVALID_VIDEO_FORMAT', message: 'Поддерживаются только MP4, MOV, WEBM' },
          { status: 400 }
        );
      }
    }

    // Загрузить файл в Supabase Storage
    const supabase = getSupabaseAdmin();
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || (type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : 'mp3');
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `voice-assets/${userId}/${fileName}`;

    // Конвертировать File в Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Получить MIME-тип, совместимый с Supabase
    const contentType = getSupabaseContentType(file.name, file.type);

    console.log('[Voice Upload]', {
      userId,
      type,
      fileName,
      size: file.size,
      originalType: file.type,
      contentType,
      storagePath,
    });

    // Загрузить в bucket generations
    const { error: uploadError } = await supabase.storage
      .from('generations')
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Voice Upload] Storage error:', uploadError);
      return NextResponse.json(
        { error: 'UPLOAD_FAILED', message: 'Не удалось загрузить файл' },
        { status: 500 }
      );
    }

    // Получить публичный URL
    // voice-assets can be private; return a signed URL so generators/providers can fetch it.
    let url: string | null = null;
    try {
      const { data: signedData, error: signedErr } = await supabase.storage
        .from("generations")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
      if (!signedErr && signedData?.signedUrl) url = signedData.signedUrl;
    } catch {
      // ignore
    }

    if (!url) {
      const { data: publicUrlData } = supabase.storage
        .from("generations")
        .getPublicUrl(storagePath);
      url = publicUrlData.publicUrl;
    }

    console.log('[Voice Upload] Success:', { url });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[Voice Upload] Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
