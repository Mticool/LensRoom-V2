import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 20 * 1024 * 1024; // 20MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm'];

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
    const type = formData.get('type') as 'image' | 'audio' | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Missing file', message: 'Файл не указан' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'image' && type !== 'audio')) {
      return NextResponse.json(
        { error: 'Invalid type', message: 'Тип должен быть image или audio' },
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

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
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

      if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'INVALID_AUDIO_FORMAT', message: 'Поддерживаются только MP3, WAV, WEBM' },
          { status: 400 }
        );
      }
    }

    // Загрузить файл в Supabase Storage
    const supabase = getSupabaseAdmin();
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || (type === 'image' ? 'jpg' : 'mp3');
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `voice-assets/${userId}/${fileName}`;

    // Конвертировать File в Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    console.log('[Voice Upload]', {
      userId,
      type,
      fileName,
      size: file.size,
      contentType: file.type,
      storagePath,
    });

    // Загрузить в bucket generations
    const { error: uploadError } = await supabase.storage
      .from('generations')
      .upload(storagePath, buffer, {
        contentType: file.type,
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
    const { data: publicUrlData } = supabase.storage
      .from('generations')
      .getPublicUrl(storagePath);

    const url = publicUrlData.publicUrl;

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
