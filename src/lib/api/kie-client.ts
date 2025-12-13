// ===== KIE.AI API CLIENT =====
// Documentation: https://api.kie.ai

// ===== REQUEST TYPES =====

export interface CreateTaskRequest {
  model: string;
  callBackUrl?: string;
  input: {
    prompt: string;
    image_input?: string[];
    aspect_ratio?: string;
    resolution?: string;
    output_format?: string;
    // Video specific
    duration?: number;
    fps?: number;
  };
}

// ===== RESPONSE TYPES =====

export interface CreateTaskResponse {
  code: number;
  message: string;
  data: {
    taskId: string;
  };
}

export interface QueryTaskResponse {
  code: number;
  message?: string;
  msg?: string;
  data: {
    taskId: string;
    state: "pending" | "processing" | "success" | "fail";
    model: string;
    param: string;
    createTime: number;
    updateTime: number;
    completeTime?: number;
    costTime?: number;
    consumeCredits?: number;
    remainedCredits?: number;
    resultJson?: string;
    failCode?: string;
    failMsg?: string;
  };
}

export interface ParsedResult {
  resultUrls: string[];
}

// ===== GENERATION TYPES (for app use) =====

export type GenerationStatus = "queued" | "processing" | "completed" | "failed";

export interface GenerateImageRequest {
  model: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  resolution?: string;
  outputFormat?: string;
  imageInputs?: string[];
}

export interface GenerateImageResponse {
  id: string;
  status: GenerationStatus;
  progress?: number;
  estimatedTime?: number;
  outputs?: {
    url: string;
    width: number;
    height: number;
    seed?: number;
  }[];
  error?: string;
}

export interface GenerateVideoRequest {
  model: string;
  prompt?: string;
  imageUrl?: string;
  duration?: number;
  aspectRatio?: string;
  fps?: number;
}

export interface GenerateVideoResponse {
  id: string;
  status: GenerationStatus;
  progress?: number;
  estimatedTime?: number;
  outputs?: {
    url: string;
    thumbnailUrl?: string;
    width: number;
    height: number;
    duration: number;
  }[];
  error?: string;
}

// ===== API ERROR =====

export class KieAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "KieAPIError";
  }
}

// ===== CLIENT CLASS =====

class KieAIClient {
  private baseUrl: string;
  private apiKey: string;
  private _isMockMode: boolean;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_KIE_API_URL || "https://api.kie.ai";
    this.apiKey = process.env.KIE_API_KEY || "";
    this._isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === "true" || !this.apiKey;

    if (this._isMockMode) {
      console.warn("[KIE API] Running in MOCK MODE - no real API calls will be made");
    } else {
      console.log("[KIE API] Initialized with real API mode");
    }
  }

  isInMockMode(): boolean {
    return this._isMockMode;
  }

  // ===== RAW API METHODS =====

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    console.log("[KIE API] Request:", {
      url,
      method: options.method || "GET",
      body: options.body ? JSON.parse(options.body as string) : undefined,
    });

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    const data = await response.json();
    console.log("[KIE API] Response:", data);

    // KIE API returns code in body
    if (data.code && data.code !== 200) {
      throw new KieAPIError(
        data.message || data.msg || `API Error: ${data.code}`,
        data.code
      );
    }

    if (!response.ok) {
      throw new KieAPIError(
        data.message || `HTTP ${response.status}`,
        response.status
      );
    }

    return data;
  }

  // ===== CREATE TASK =====

  async createTask(request: CreateTaskRequest): Promise<CreateTaskResponse> {
    if (this._isMockMode) {
      return this.mockCreateTask(request);
    }

    return this.request<CreateTaskResponse>("/api/v1/jobs/createTask", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  // ===== QUERY TASK =====

  async queryTask(taskId: string): Promise<QueryTaskResponse> {
    if (this._isMockMode) {
      return this.mockQueryTask(taskId);
    }

    return this.request<QueryTaskResponse>(`/api/v1/jobs/queryTask?taskId=${taskId}`, {
      method: "GET",
    });
  }

  // ===== HIGH-LEVEL METHODS =====

  async generateImage(params: GenerateImageRequest): Promise<GenerateImageResponse> {
    try {
      const request: CreateTaskRequest = {
        model: params.model,
        input: {
          prompt: params.prompt,
          aspect_ratio: params.aspectRatio || "1:1",
          resolution: params.resolution || "1K",
          output_format: params.outputFormat || "png",
          image_input: params.imageInputs,
        },
      };

      const response = await this.createTask(request);

      return {
        id: response.data.taskId,
        status: "queued",
        estimatedTime: 30,
      };
    } catch (error) {
      console.error("[KIE API] generateImage error:", error);
      throw error;
    }
  }

  async getGenerationStatus(taskId: string): Promise<GenerateImageResponse> {
    try {
      const response = await this.queryTask(taskId);
      const data = response.data;

      // Parse result if completed
      let outputs: GenerateImageResponse["outputs"];
      if (data.state === "success" && data.resultJson) {
        try {
          const result: ParsedResult = JSON.parse(data.resultJson);
          outputs = result.resultUrls.map((url) => ({
            url,
            width: 1024,
            height: 1024,
          }));
        } catch (e) {
          console.error("[KIE API] Failed to parse resultJson:", e);
        }
      }

      // Map KIE state to our status
      const statusMap: Record<string, GenerationStatus> = {
        pending: "queued",
        processing: "processing",
        success: "completed",
        fail: "failed",
      };

      return {
        id: taskId,
        status: statusMap[data.state] || "processing",
        progress: data.state === "success" ? 100 : data.state === "processing" ? 50 : 0,
        outputs,
        error: data.failMsg,
      };
    } catch (error) {
      console.error("[KIE API] getGenerationStatus error:", error);
      throw error;
    }
  }

  async generateVideo(params: GenerateVideoRequest): Promise<GenerateVideoResponse> {
    try {
      const request: CreateTaskRequest = {
        model: params.model,
        input: {
          prompt: params.prompt || "",
          image_input: params.imageUrl ? [params.imageUrl] : undefined,
          aspect_ratio: params.aspectRatio || "16:9",
          duration: params.duration,
          fps: params.fps,
        },
      };

      const response = await this.createTask(request);

      return {
        id: response.data.taskId,
        status: "queued",
        estimatedTime: 120,
      };
    } catch (error) {
      console.error("[KIE API] generateVideo error:", error);
      throw error;
    }
  }

  async getVideoGenerationStatus(taskId: string): Promise<GenerateVideoResponse> {
    try {
      const response = await this.queryTask(taskId);
      const data = response.data;

      let outputs: GenerateVideoResponse["outputs"];
      if (data.state === "success" && data.resultJson) {
        try {
          const result: ParsedResult = JSON.parse(data.resultJson);
          outputs = result.resultUrls.map((url) => ({
            url,
            width: 1280,
            height: 720,
            duration: 5,
          }));
        } catch (e) {
          console.error("[KIE API] Failed to parse video resultJson:", e);
        }
      }

      const statusMap: Record<string, GenerationStatus> = {
        pending: "queued",
        processing: "processing",
        success: "completed",
        fail: "failed",
      };

      return {
        id: taskId,
        status: statusMap[data.state] || "processing",
        progress: data.state === "success" ? 100 : data.state === "processing" ? 50 : 0,
        outputs,
        error: data.failMsg,
      };
    } catch (error) {
      console.error("[KIE API] getVideoGenerationStatus error:", error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  async checkHealth(): Promise<boolean> {
    try {
      // Simple ping to check if API is reachable
      const response = await fetch(`${this.baseUrl}/api/v1/jobs/queryTask?taskId=test`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.status !== 500;
    } catch {
      return false;
    }
  }

  async getAccountBalance(): Promise<{ credits: number }> {
    // KIE API returns credits in task responses
    // For now return a placeholder
    return { credits: 1000 };
  }

  // ===== MOCK METHODS =====

  private mockTaskProgress = new Map<string, { startTime: number; duration: number }>();

  private mockCreateTask(request: CreateTaskRequest): Promise<CreateTaskResponse> {
    const taskId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store mock progress info
    const isVideo = request.model.includes("sora") || request.model.includes("kling") || 
                    request.model.includes("luma") || request.model.includes("runway") ||
                    request.model.includes("veo");
    
    this.mockTaskProgress.set(taskId, {
      startTime: Date.now(),
      duration: isVideo ? 10000 : 5000,
    });

    console.log("[KIE API MOCK] Created task:", taskId, "for model:", request.model);

    return Promise.resolve({
      code: 200,
      message: "success",
      data: { taskId },
    });
  }

  private mockQueryTask(taskId: string): Promise<QueryTaskResponse> {
    const progress = this.mockTaskProgress.get(taskId);
    
    if (!progress) {
      return Promise.resolve({
        code: 200,
        data: {
          taskId,
          state: "fail",
          model: "unknown",
          param: "{}",
          createTime: Date.now(),
          updateTime: Date.now(),
          failMsg: "Task not found",
        },
      });
    }

    const elapsed = Date.now() - progress.startTime;
    const isComplete = elapsed >= progress.duration;

    if (isComplete) {
      // Clean up
      this.mockTaskProgress.delete(taskId);

      return Promise.resolve({
        code: 200,
        data: {
          taskId,
          state: "success",
          model: "mock-model",
          param: "{}",
          createTime: progress.startTime,
          updateTime: Date.now(),
          completeTime: Date.now(),
          costTime: Math.round(progress.duration / 1000),
          consumeCredits: 10,
          remainedCredits: 990,
          resultJson: JSON.stringify({
            resultUrls: [
              "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1024&h=1024&fit=crop",
              "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1024&h=1024&fit=crop",
            ],
          }),
        },
      });
    }

    // Still processing
    const progressPercent = Math.min(95, Math.round((elapsed / progress.duration) * 100));

    return Promise.resolve({
      code: 200,
      data: {
        taskId,
        state: "processing",
        model: "mock-model",
        param: "{}",
        createTime: progress.startTime,
        updateTime: Date.now(),
      },
    });
  }
}

export const kieClient = new KieAIClient();