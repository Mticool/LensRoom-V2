import { NextRequest, NextResponse } from 'next/server';
import { env } from "@/lib/env";
import { integrationNotConfigured } from "@/lib/http/integration-error";

/**
 * GET /api/kie/recordInfo?taskId=xxx
 * 
 * Proxies KIE Market API recordInfo endpoint
 * Used for polling task status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    const apiKey = env.optional("KIE_API_KEY");
    if (!apiKey) {
      return integrationNotConfigured("kie", ["KIE_API_KEY"]);
    }
    const baseUrl = env.optional("KIE_MARKET_BASE_URL") || "https://api.kie.ai";

    console.log(`[KIE recordInfo] Checking task: ${taskId}`);

    const response = await fetch(
      `${baseUrl}/api/v1/jobs/recordInfo?taskId=${taskId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    const responseText = await response.text();
    let responseData: any;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('[KIE recordInfo] Failed to parse response:', responseText);
      return NextResponse.json(
        { error: 'Invalid response from KIE API' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('[KIE recordInfo] API error:', {
        status: response.status,
        data: responseData,
      });

      return NextResponse.json(
        { error: responseData.message || responseData.msg || 'KIE API error' },
        { status: response.status }
      );
    }

    // Log state transitions
    if (responseData.data?.state) {
      console.log(`[KIE recordInfo] Task ${taskId} state: ${responseData.data.state}`);
      
      if (responseData.data.state === 'fail') {
        console.error(`[KIE recordInfo] Task ${taskId} failed:`, {
          failCode: responseData.data.failCode,
          failMsg: responseData.data.failMsg,
        });
      }
    }

    // Return full response
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[KIE recordInfo] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}


