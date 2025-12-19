import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, respondAuthError } from '@/lib/auth/requireRole';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    await requireRole('manager');
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Determine bucket and path
    const bucket = 'content'; // We'll use a dedicated 'content' bucket
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'bin';
    const fileName = `${folder || 'uploads'}/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
    
    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });
    
    if (error) {
      // If bucket doesn't exist, try to create it
      if (error.message.includes('not found')) {
        const { error: bucketError } = await supabase
          .storage
          .createBucket(bucket, {
            public: true,
            fileSizeLimit: MAX_FILE_SIZE,
          });
        
        if (!bucketError) {
          // Retry upload
          const { data: retryData, error: retryError } = await supabase
            .storage
            .from(bucket)
            .upload(fileName, buffer, {
              contentType: file.type,
              upsert: false,
            });
          
          if (retryError) {
            throw retryError;
          }
          
          const { data: { publicUrl } } = supabase
            .storage
            .from(bucket)
            .getPublicUrl(retryData.path);
          
          return NextResponse.json({
            success: true,
            url: publicUrl,
            path: retryData.path,
            fileName: file.name,
            size: file.size,
            type: file.type,
          });
        }
      }
      throw error;
    }
    
    const { data: { publicUrl } } = supabase
      .storage
      .from(bucket)
      .getPublicUrl(data.path);
    
    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: data.path,
      fileName: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return respondAuthError(error);
  }
}

