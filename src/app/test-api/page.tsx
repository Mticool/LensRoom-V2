"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Zap,
  Image as ImageIcon,
  Video,
  Wallet,
  Activity,
} from "lucide-react";

interface TestResult {
  success: boolean;
  timestamp: string;
  testType: string;
  jobId?: string;
  status?: string;
  progress?: number;
  outputs?: Array<{
    url: string;
    width?: number;
    height?: number;
  }>;
  credits?: number;
  error?: string;
  mockMode?: boolean;
  hasApiKey?: boolean;
  baseUrl?: string;
  [key: string]: unknown;
}

export default function TestAPIPage() {
  const [results, setResults] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [lastJobType, setLastJobType] = useState<"image" | "video" | null>(null);

  const runTest = async (type: string, jobId?: string) => {
    setIsLoading(true);
    setResults(null);

    try {
      const url = jobId
        ? `/api/test?type=${type}&jobId=${jobId}`
        : `/api/test?type=${type}`;

      const response = await fetch(url);
      const data = await response.json();
      setResults(data);

      // Save job ID for status checks
      if (data.jobId) {
        setLastJobId(data.jobId);
        if (type === "image") setLastJobType("image");
        if (type === "video") setLastJobType("video");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setResults({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
        testType: type,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-6 h-6 text-green-500" />
    ) : (
      <XCircle className="w-6 h-6 text-red-500" />
    );
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-[var(--color-bg)]">
      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold text-white mb-2">
          API Testing Dashboard
        </h1>
        <p className="text-[rgba(255,255,255,0.55)] mb-8">
          Тестирование подключения к kie.ai API
        </p>

        {/* Connection Tests */}
        <Card variant="glass" className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--color-gold)]" />
            Connection Tests
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button
              onClick={() => runTest("ping")}
              disabled={isLoading}
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
            >
              <Zap className="w-5 h-5" />
              <span>Ping API</span>
            </Button>
            <Button
              onClick={() => runTest("health")}
              disabled={isLoading}
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
            >
              <Activity className="w-5 h-5" />
              <span>Health Check</span>
            </Button>
            <Button
              onClick={() => runTest("balance")}
              disabled={isLoading}
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
            >
              <Wallet className="w-5 h-5" />
              <span>Check Balance</span>
            </Button>
          </div>
        </Card>

        {/* Generation Tests */}
        <Card variant="glass" className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[var(--color-purple)]" />
            Generation Tests
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Button
              onClick={() => runTest("image")}
              disabled={isLoading}
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
            >
              <ImageIcon className="w-5 h-5" />
              <span>Generate Image</span>
            </Button>
            <Button
              onClick={() => runTest("video")}
              disabled={isLoading}
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
            >
              <Video className="w-5 h-5" />
              <span>Generate Video</span>
            </Button>
          </div>

          {/* Status check button */}
          {lastJobId && (
            <div className="pt-4 border-t border-[rgba(255,255,255,0.10)]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-[rgba(255,255,255,0.70)]">
                  Last Job ID:{" "}
                  <code className="bg-[rgba(255,255,255,0.06)] px-2 py-1 rounded">
                    {lastJobId}
                  </code>
                </div>
                <Badge
                  variant={lastJobType === "video" ? "purple" : "gold"}
                  className="text-xs"
                >
                  {lastJobType}
                </Badge>
              </div>
              <Button
                onClick={() =>
                  runTest(
                    lastJobType === "video" ? "video-status" : "status",
                    lastJobId
                  )
                }
                disabled={isLoading}
                variant="secondary"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Status
              </Button>
            </div>
          )}
        </Card>

        {/* Loading */}
        {isLoading && (
          <Card variant="glass" className="p-8 text-center mb-6">
            <Loader2 className="w-8 h-8 text-[var(--color-gold)] animate-spin mx-auto mb-3" />
            <p className="text-[rgba(255,255,255,0.55)]">Running test...</p>
          </Card>
        )}

        {/* Results */}
        {results && !isLoading && (
          <Card variant="glass" className="p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              {getStatusIcon(results.success)}
              <h2 className="text-xl font-semibold text-white">
                {results.success ? "Test Passed ✓" : "Test Failed ✗"}
              </h2>
              <Badge
                variant={results.success ? "success" : "error"}
                className="ml-auto"
              >
                {results.testType}
              </Badge>
            </div>

            {/* Mock mode warning */}
            {results.mockMode && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                <p className="text-yellow-400 text-sm">
                  ⚠️ Running in MOCK MODE - no real API calls are being made
                </p>
              </div>
            )}

            {/* Progress bar if processing */}
            {results.status === "processing" && results.progress !== undefined && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[rgba(255,255,255,0.70)]">Progress</span>
                  <span className="text-[var(--color-gold)] font-bold">
                    {results.progress}%
                  </span>
                </div>
                <div className="h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-purple)] transition-all"
                    style={{ width: `${results.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Output preview */}
            {results.outputs && results.outputs.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white mb-2">Outputs:</h3>
                <div className="grid grid-cols-2 gap-3">
                  {results.outputs.map((output, i) => (
                    <a
                      key={i}
                      href={output.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg overflow-hidden border border-[rgba(255,255,255,0.10)] hover:border-[var(--color-gold)] transition-colors"
                    >
                      {output.url.includes(".mp4") ? (
                        <video
                          src={output.url}
                          className="w-full aspect-video object-cover"
                          controls
                        />
                      ) : (
                        <img
                          src={output.url}
                          alt={`Output ${i + 1}`}
                          className="w-full aspect-square object-cover"
                        />
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON */}
            <details className="group">
              <summary className="cursor-pointer text-sm text-[rgba(255,255,255,0.55)] hover:text-white transition-colors">
                View Raw JSON
              </summary>
              <pre className="mt-3 bg-[rgba(255,255,255,0.04)] rounded-lg p-4 overflow-x-auto text-sm text-[rgba(255,255,255,0.70)]">
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          </Card>
        )}

        {/* Instructions */}
        <Card variant="glass" className="p-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            📋 Instructions
          </h3>
          <ol className="space-y-2 text-[rgba(255,255,255,0.70)] text-sm list-decimal list-inside">
            <li>
              Make sure <code className="bg-[rgba(255,255,255,0.06)] px-1 rounded">KIE_API_KEY</code> is set in{" "}
              <code className="bg-[rgba(255,255,255,0.06)] px-1 rounded">.env.local</code>
            </li>
            <li>Click &quot;Ping API&quot; to verify connection settings</li>
            <li>Click &quot;Health Check&quot; to test API availability</li>
            <li>Click &quot;Check Balance&quot; to verify your credits</li>
            <li>Click &quot;Generate Image&quot; or &quot;Generate Video&quot; to start a job</li>
            <li>Click &quot;Check Status&quot; repeatedly until status is &quot;completed&quot;</li>
            <li>View the generated output in the results</li>
          </ol>

          <div className="mt-4 p-4 bg-[rgba(255,255,255,0.04)] rounded-lg">
            <h4 className="text-sm font-semibold text-white mb-2">Environment Variables:</h4>
            <code className="text-xs text-[rgba(255,255,255,0.55)] block">
              NEXT_PUBLIC_KIE_API_URL=https://api.kie.ai<br />
              KIE_API_KEY=your_api_key_here<br />
              NEXT_PUBLIC_MOCK_MODE=false
            </code>
          </div>
        </Card>
      </div>
    </div>
  );
}

