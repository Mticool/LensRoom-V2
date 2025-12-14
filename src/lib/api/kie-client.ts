// ===== KIE.AI API CLIENT =====
// Documentation: https://kie.ai/docs

// ===== REQUEST TYPES =====

export interface CreateTaskRequest {
  model: string;
  callBackUrl?: string;
  input: {
    prompt: string;
    image_input?: string[]; // URLs, not base64
    image_url?: string; // Single image URL for i2v
    aspect_ratio?: string;
    resolution?: "1K" | "2K" | "4K";
    output_format?: "png" | "jpg";
    quality?: string;
    // Video specific
    duration?: number | string; // KIE expects string for some models
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

// State values from KIE API
export type KieTaskState = "waiting" | "queuing" | "generating" | "success" | "fail";

export interface RecordInfoResponse {
  code: number;
  message: string;
  data: {
    taskId: string;
    model: string;
    state: KieTaskState;
    param: string; // JSON string of original request
    resultJson?: string; // JSON string with resultUrls
    failCode?: string;
    failMsg?: string;
    completeTime?: number;
    createTime: number;
    updateTime: number;
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
  resolution?: "1K" | "2K" | "4K";
  outputFormat?: "png" | "jpg";
  imageInputs?: string[]; // URLs
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
  // POST /api/v1/jobs/createTask

  async createTask(request: CreateTaskRequest): Promise<CreateTaskResponse> {
    if (this._isMockMode) {
      return this.mockCreateTask(request);
    }

    return this.request<CreateTaskResponse>("/api/v1/jobs/createTask", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  // ===== QUERY TASK (recordInfo) =====
  // GET /api/v1/jobs/recordInfo?taskId=xxx

  async queryTask(taskId: string): Promise<RecordInfoResponse> {
    if (this._isMockMode) {
      return this.mockQueryTask(taskId);
    }

    return this.request<RecordInfoResponse>(`/api/v1/jobs/recordInfo?taskId=${taskId}`, {
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
      // KIE states: waiting, queuing, generating, success, fail
      const statusMap: Record<KieTaskState, GenerationStatus> = {
        waiting: "queued",
        queuing: "queued",
        generating: "processing",
        success: "completed",
        fail: "failed",
      };

      // Calculate progress based on state
      const progressMap: Record<KieTaskState, number> = {
        waiting: 5,
        queuing: 15,
        generating: 50,
        success: 100,
        fail: 0,
      };

      return {
        id: taskId,
        status: statusMap[data.state] || "processing",
        progress: progressMap[data.state] || 25,
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
      // KIE API requires image_url for video models like Kling
      if (!params.imageUrl) {
        throw new KieAPIError("Image URL is required for video generation", 400);
      }

      const request: CreateTaskRequest = {
        model: params.model,
        input: {
          prompt: params.prompt || "",
          image_input: [params.imageUrl], // Required for i2v models
          aspect_ratio: params.aspectRatio || "16:9",
          // KIE API expects duration as string
          duration: params.duration ? String(params.duration) : "5",
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

      const statusMap: Record<KieTaskState, GenerationStatus> = {
        waiting: "queued",
        queuing: "queued",
        generating: "processing",
        success: "completed",
        fail: "failed",
      };

      const progressMap: Record<KieTaskState, number> = {
        waiting: 5,
        queuing: 15,
        generating: 50,
        success: 100,
        fail: 0,
      };

      return {
        id: taskId,
        status: statusMap[data.state] || "processing",
        progress: progressMap[data.state] || 25,
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
      const response = await fetch(`${this.baseUrl}/api/v1/jobs/recordInfo?taskId=test`, {
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

  // ===== MOCK METHODS =====

  private mockTaskProgress = new Map<string, { startTime: number; duration: number }>();

  private mockCreateTask(request: CreateTaskRequest): Promise<CreateTaskResponse> {
    const taskId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const isVideo = request.model.includes("sora") || request.model.includes("kling") || 
                    request.model.includes("luma") || request.model.includes("runway") ||
                    request.model.includes("veo") || request.model.includes("seedance");
    
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

  private mockQueryTask(taskId: string): Promise<RecordInfoResponse> {
    const progress = this.mockTaskProgress.get(taskId);
    
    if (!progress) {
      return Promise.resolve({
        code: 200,
        message: "success",
        data: {
          taskId,
          model: "unknown",
          state: "fail" as KieTaskState,
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
      this.mockTaskProgress.delete(taskId);

      return Promise.resolve({
        code: 200,
        message: "success",
        data: {
          taskId,
          model: "mock-model",
          state: "success" as KieTaskState,
          param: "{}",
          createTime: progress.startTime,
          updateTime: Date.now(),
          completeTime: Date.now(),
          resultJson: JSON.stringify({
            resultUrls: [
              "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1024&h=1024&fit=crop",
              "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1024&h=1024&fit=crop",
            ],
          }),
        },
      });
    }

    // Determine state based on progress
    const progressPercent = elapsed / progress.duration;
    let state: KieTaskState = "waiting";
    if (progressPercent > 0.1) state = "queuing";
    if (progressPercent > 0.3) state = "generating";

    return Promise.resolve({
      code: 200,
      message: "success",
      data: {
        taskId,
        model: "mock-model",
        state,
        param: "{}",
        createTime: progress.startTime,
        updateTime: Date.now(),
      },
    });
  }
}

export const kieClient = new KieAIClient();
