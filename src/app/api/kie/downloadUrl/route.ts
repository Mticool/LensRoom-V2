import { NextRequest, NextResponse } from 'next/server';
import { env } from "@/lib/env";
import { integrationNotConfigured } from "@/lib/http/integration-error";

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

    const apiKey = env.optional("KIE_API_KEY");
    if (!apiKey) {
      return integrationNotConfigured("kie", ["KIE_API_KEY"]);
    }
    const baseUrl = env.optional("KIE_MARKET_BASE_URL") || "https://api.kie.ai";

    console.log(`[KIE downloadUrl] Getting download URL for: ${url}`);

    const response = await fetch(
      `${baseUrl}/api/v1/common/download-url`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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


