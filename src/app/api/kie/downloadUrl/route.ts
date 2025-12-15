import { NextRequest, NextResponse } from 'next/server';

const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_MARKET_BASE_URL = process.env.KIE_MARKET_BASE_URL || 'https://api.kie.ai';

if (!KIE_API_KEY) {
  console.error('[KIE downloadUrl] Missing KIE_API_KEY');
}

interface DownloadUrlRequest {
  url: string;
}

interface DownloadUrlResponse {
  code: number;
  message: string;
  msg?: string;
  data?: {
    downloadUrl?: string;
    expiresIn?: number;
  };
}

/**
 * POST /api/kie/downloadUrl
 * 
 * Gets a downloadable URL from KIE API
 * Used to get permanent links to generated content
 */
export async function POST(request: NextRequest) {
  try {
    const body: DownloadUrlRequest = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'url is required' },
        { status: 400 }
      );
    }

    if (!KIE_API_KEY) {
      return NextResponse.json(
        { error: 'KIE_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log(`[KIE downloadUrl] Getting download URL for: ${url}`);

    const response = await fetch(
      `${KIE_MARKET_BASE_URL}/api/v1/common/download-url`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KIE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      }
    );

    const responseText = await response.text();
    let responseData: DownloadUrlResponse;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('[KIE downloadUrl] Failed to parse response:', responseText);
      return NextResponse.json(
        { error: 'Invalid response from KIE API' },
        { status: 500 }
      );
    }

    if (!response.ok || responseData.code !== 0) {
      console.error('[KIE downloadUrl] API error:', {
        status: response.status,
        code: responseData.code,
        message: responseData.message || responseData.msg,
      });

      return NextResponse.json(
        { error: responseData.message || responseData.msg || 'KIE API error' },
        { status: response.status }
      );
    }

    if (!responseData.data?.downloadUrl) {
      return NextResponse.json(
        { error: 'No downloadUrl in response' },
        { status: 500 }
      );
    }

    console.log(`[KIE downloadUrl] Success, expires in: ${responseData.data.expiresIn}s`);

    return NextResponse.json({
      downloadUrl: responseData.data.downloadUrl,
      expiresIn: responseData.data.expiresIn,
    });

  } catch (error) {
    console.error('[KIE downloadUrl] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
