import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    console.log('[TTS Audio] Fetching audio for job:', jobId);
    
    const supabase = getSupabaseAdmin();
    const { data: job, error } = await supabase
      .from('tts_jobs')
      .select('audio_data')
      .eq('id', jobId)
      .single();

    console.log('[TTS Audio] DB query result:', { hasData: !!job, error, hasAudioData: !!job?.audio_data });

    if (error) {
      console.error('[TTS Audio] DB error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!job?.audio_data) {
      console.error('[TTS Audio] No audio_data in DB for job:', jobId);
      return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
    }

    console.log('[TTS Audio] audio_data length:', job.audio_data.length);
    
    // MiniMax returns audio as HEX string, not base64!
    // Check if it starts with hex-encoded ID3 tag (49443304 = "ID3\x04")
    let buffer: Buffer;
    if (job.audio_data.startsWith('494433') || job.audio_data.startsWith('fffb')) {
      // It's hex encoded
      buffer = Buffer.from(job.audio_data, 'hex');
      console.log('[TTS Audio] Decoded as HEX, buffer size:', buffer.length, 'bytes');
    } else {
      // Fallback to base64
      buffer = Buffer.from(job.audio_data, 'base64');
      console.log('[TTS Audio] Decoded as base64, buffer size:', buffer.length, 'bytes');
    }
    
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[TTS Audio] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch audio' }, { status: 500 });
  }
}
