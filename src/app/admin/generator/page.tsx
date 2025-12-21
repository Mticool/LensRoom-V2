"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  Film,
  Plus,
  Trash2,
  Copy,
  Download,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { PHOTO_MODELS, VIDEO_MODELS } from "@/config/models";

interface GenerationTask {
  id: string;
  prompt: string;
  model: string;
  type: "photo" | "video";
  aspectRatio: string;
  status: "pending" | "generating" | "completed" | "failed";
  progress: number;
  resultUrl?: string;
  error?: string;
}

// Preset prompts for inspiration content
const PROMPT_PRESETS = [
  {
    category: "Портреты",
    prompts: [
      "Professional headshot portrait, studio lighting, neutral background, corporate style",
      "Artistic portrait with dramatic chiaroscuro lighting, cinematic mood",
      "Fashion portrait, high-end magazine style, soft lighting",
    ],
  },
  {
    category: "Пейзажи",
    prompts: [
      "Stunning mountain landscape at golden hour, dramatic clouds, epic vista",
      "Serene ocean sunset, waves crashing on rocks, vibrant colors",
      "Mystical forest with fog and sunbeams, magical atmosphere",
    ],
  },
  {
    category: "Продукты",
    prompts: [
      "Luxury product photography, white background, professional lighting",
      "Creative product shot with dynamic composition, advertising style",
      "Minimalist product display, clean aesthetic, soft shadows",
    ],
  },
  {
    category: "Стили",
    prompts: [
      "Cyberpunk city at night, neon lights, futuristic architecture",
      "Anime style illustration, vibrant colors, detailed character",
      "Vintage retro aesthetic, film grain, nostalgic mood",
    ],
  },
];

export default function AdminGeneratorPage() {
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

  // Form state
  const [type, setType] = useState<"photo" | "video">("photo");
  const [model, setModel] = useState(PHOTO_MODELS[0]?.id || "");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [prompts, setPrompts] = useState<string[]>([""]);

  const models = type === "photo" ? PHOTO_MODELS : VIDEO_MODELS;

  // Add prompt
  const addPrompt = () => {
    setPrompts([...prompts, ""]);
  };

  // Remove prompt
  const removePrompt = (index: number) => {
    if (prompts.length > 1) {
      setPrompts(prompts.filter((_, i) => i !== index));
    }
  };

  // Update prompt
  const updatePrompt = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  // Add preset prompts
  const addPresetPrompts = (presetPrompts: string[]) => {
    const filtered = presetPrompts.filter((p) => p.trim());
    setPrompts([...prompts.filter((p) => p.trim()), ...filtered]);
    toast.success(`Добавлено ${filtered.length} промптов`);
  };

  // Create tasks from prompts
  const createTasks = () => {
    const validPrompts = prompts.filter((p) => p.trim());
    if (validPrompts.length === 0) {
      toast.error("Добавьте хотя бы один промпт");
      return;
    }

    const newTasks: GenerationTask[] = validPrompts.map((prompt, i) => ({
      id: `task-${Date.now()}-${i}`,
      prompt: prompt.trim(),
      model,
      type,
      aspectRatio,
      status: "pending",
      progress: 0,
    }));

    setTasks(newTasks);
    setCurrentTaskIndex(0);
    toast.success(`Создано ${newTasks.length} задач`);
  };

  // Run generation
  const runGeneration = useCallback(async () => {
    if (tasks.length === 0) {
      toast.error("Сначала создайте задачи");
      return;
    }

    setIsRunning(true);

    for (let i = currentTaskIndex; i < tasks.length; i++) {
      if (!isRunning && i > currentTaskIndex) break;

      const task = tasks[i];
      if (task.status === "completed") continue;

      setCurrentTaskIndex(i);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: "generating", progress: 0 } : t
        )
      );

      try {
        // Start generation
        const endpoint = task.type === "video" ? "/api/generate/video" : "/api/generate/photo";
        const payload =
          task.type === "video"
            ? { prompt: task.prompt, model: task.model, duration: 5, mode: "t2v", aspectRatio: task.aspectRatio, variants: 1 }
            : { prompt: task.prompt, model: task.model, aspectRatio: task.aspectRatio, variants: 1, mode: "t2i" };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Generation failed");

        const jobId = data.jobId;
        const provider = data.provider;

        // Poll for result
        let attempts = 0;
        const maxAttempts = 180;

        while (attempts < maxAttempts) {
          const qs = new URLSearchParams();
          qs.set("kind", task.type === "video" ? "video" : "image");
          if (provider) qs.set("provider", provider);

          const statusRes = await fetch(`/api/jobs/${jobId}?${qs.toString()}`, {
            credentials: "include",
          });
          const statusData = await statusRes.json();

          if (statusData.status === "completed" && statusData.results?.[0]?.url) {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? { ...t, status: "completed", progress: 100, resultUrl: statusData.results[0].url }
                  : t
              )
            );
            break;
          }

          if (statusData.status === "failed") {
            throw new Error(statusData.error || "Generation failed");
          }

          // Update progress
          if (typeof statusData.progress === "number") {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === task.id ? { ...t, progress: statusData.progress } : t
              )
            );
          }

          await new Promise((r) => setTimeout(r, 2000));
          attempts++;
        }

        if (attempts >= maxAttempts) {
          throw new Error("Timeout");
        }
      } catch (error: any) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: "failed", error: error.message || "Error" }
              : t
          )
        );
      }

      // Small delay between tasks
      await new Promise((r) => setTimeout(r, 1000));
    }

    setIsRunning(false);
    toast.success("Генерация завершена!");
  }, [tasks, currentTaskIndex, isRunning]);

  // Stop generation
  const stopGeneration = () => {
    setIsRunning(false);
    toast.info("Генерация остановлена");
  };

  // Clear tasks
  const clearTasks = () => {
    if (isRunning) {
      toast.error("Сначала остановите генерацию");
      return;
    }
    setTasks([]);
    setCurrentTaskIndex(0);
  };

  // Save result to styles
  const saveToStyles = async (task: GenerationTask) => {
    if (!task.resultUrl) return;

    try {
      const res = await fetch("/api/admin/styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: task.prompt.slice(0, 50),
          description: task.prompt,
          template_prompt: task.prompt,
          preview_image: task.resultUrl,
          thumbnail_url: task.resultUrl,
          model_key: task.model,
          placement: "inspiration",
          published: false,
          featured: false,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success("Сохранено в стили!");
    } catch (error) {
      toast.error("Ошибка сохранения");
    }
  };

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const failedCount = tasks.filter((t) => t.status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--text)]">AI Генератор контента</h1>
        <p className="text-[var(--muted)] mt-1">
          Пакетная генерация контента для главной страницы и вдохновения
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="space-y-6">
          {/* Type & Model */}
          <Card>
            <CardHeader>
              <CardTitle>Настройки генерации</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Type */}
              <div>
                <label className="text-sm font-medium text-[var(--text)] mb-2 block">Тип</label>
                <div className="flex gap-2">
                  <Button
                    variant={type === "photo" ? "default" : "outline"}
                    onClick={() => {
                      setType("photo");
                      setModel(PHOTO_MODELS[0]?.id || "");
                    }}
                    className="flex-1"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Фото
                  </Button>
                  <Button
                    variant={type === "video" ? "default" : "outline"}
                    onClick={() => {
                      setType("video");
                      setModel(VIDEO_MODELS[0]?.id || "");
                    }}
                    className="flex-1"
                  >
                    <Film className="w-4 h-4 mr-2" />
                    Видео
                  </Button>
                </div>
              </div>

              {/* Model */}
              <div>
                <label className="text-sm font-medium text-[var(--text)] mb-2 block">Модель</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                >
                  {models.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="text-sm font-medium text-[var(--text)] mb-2 block">
                  Соотношение сторон
                </label>
                <div className="flex gap-2">
                  {["1:1", "9:16", "16:9"].map((ar) => (
                    <Button
                      key={ar}
                      variant={aspectRatio === ar ? "default" : "outline"}
                      onClick={() => setAspectRatio(ar)}
                      size="sm"
                    >
                      {ar}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prompts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Промпты ({prompts.filter((p) => p.trim()).length})</CardTitle>
              <Button variant="outline" size="sm" onClick={addPrompt}>
                <Plus className="w-4 h-4 mr-1" />
                Добавить
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {prompts.map((prompt, i) => (
                <div key={i} className="flex gap-2">
                  <textarea
                    value={prompt}
                    onChange={(e) => updatePrompt(i, e.target.value)}
                    placeholder={`Промпт ${i + 1}...`}
                    rows={2}
                    className="flex-1 px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm resize-none"
                  />
                  {prompts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePrompt(i)}
                      className="shrink-0 text-[var(--muted)] hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Presets */}
          <Card>
            <CardHeader>
              <CardTitle>Шаблоны промптов</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {PROMPT_PRESETS.map((preset) => (
                  <div key={preset.category}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[var(--text)]">
                        {preset.category}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addPresetPrompts(preset.prompts)}
                        className="text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Добавить все
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {preset.prompts.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => addPresetPrompts([p])}
                          className="px-2 py-1 text-xs bg-[var(--surface2)] rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors truncate max-w-[200px]"
                          title={p}
                        >
                          {p.slice(0, 30)}...
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={createTasks}
              disabled={isRunning || prompts.filter((p) => p.trim()).length === 0}
              className="flex-1"
            >
              Создать задачи
            </Button>
            {tasks.length > 0 && !isRunning && (
              <Button
                onClick={runGeneration}
                className="flex-1 bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
              >
                <Play className="w-4 h-4 mr-2" />
                Запустить
              </Button>
            )}
            {isRunning && (
              <Button onClick={stopGeneration} variant="outline" className="flex-1">
                <Pause className="w-4 h-4 mr-2" />
                Остановить
              </Button>
            )}
          </div>
        </div>

        {/* Tasks & Results */}
        <div className="space-y-6">
          {/* Progress */}
          {tasks.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  Прогресс: {completedCount}/{tasks.length}
                </CardTitle>
                {!isRunning && tasks.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearTasks}>
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Очистить
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="h-2 bg-[var(--surface2)] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-[var(--gold)] transition-all"
                    style={{ width: `${(completedCount / tasks.length) * 100}%` }}
                  />
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-emerald-400">{completedCount} готово</span>
                  {failedCount > 0 && (
                    <span className="text-red-400">{failedCount} ошибок</span>
                  )}
                  <span className="text-[var(--muted)]">
                    {tasks.length - completedCount - failedCount} в очереди
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task List */}
          <Card>
            <CardHeader>
              <CardTitle>Задачи</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-[var(--muted)]">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Добавьте промпты и создайте задачи</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {tasks.map((task, i) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-[var(--muted)]">#{i + 1}</span>
                            {task.status === "pending" && (
                              <span className="text-xs px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full">
                                В очереди
                              </span>
                            )}
                            {task.status === "generating" && (
                              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {task.progress}%
                              </span>
                            )}
                            {task.status === "completed" && (
                              <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Готово
                              </span>
                            )}
                            {task.status === "failed" && (
                              <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full flex items-center gap-1">
                                <X className="w-3 h-3" />
                                Ошибка
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--text)] line-clamp-2">{task.prompt}</p>
                          {task.error && (
                            <p className="text-xs text-red-400 mt-1">{task.error}</p>
                          )}
                        </div>

                        {/* Result preview */}
                        {task.resultUrl && (
                          <div className="shrink-0">
                            {task.type === "video" ? (
                              <video
                                src={task.resultUrl}
                                className="w-20 h-20 object-cover rounded-lg"
                                muted
                                loop
                                playsInline
                                autoPlay
                              />
                            ) : (
                              <img
                                src={task.resultUrl}
                                alt=""
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions for completed */}
                      {task.status === "completed" && task.resultUrl && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => saveToStyles(task)}
                            className="text-xs"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            В стили
                          </Button>
                          <a href={task.resultUrl} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="ghost" className="text-xs">
                              <Download className="w-3 h-3 mr-1" />
                              Скачать
                            </Button>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
