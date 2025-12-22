"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Image as ImageIcon,
  Film,
  Plus,
  Loader2,
  Check,
  X,
  Eye,
  Trash2,
  RefreshCw,
  Home,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { PHOTO_MODELS, VIDEO_MODELS, getModelById } from "@/config/models";

interface GeneratedContent {
  id: string;
  url: string;
  prompt: string;
  model: string;
  type: "photo" | "video";
  aspectRatio: string;
}

interface SavedItem {
  id: string;
  presetId: string;
  title: string;
  previewUrl: string;
  modelKey: string;
  placement: string;
  category: string;
  status: string;
  createdAt: string;
}

export default function AdminStylesPage() {
  // Generation state
  const [type, setType] = useState<"photo" | "video">("photo");
  const [model, setModel] = useState(PHOTO_MODELS[0]?.id || "");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [progress, setProgress] = useState(0);

  // Save state
  const [saveToHome, setSaveToHome] = useState(true);
  const [saveToInspiration, setSaveToInspiration] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Saved items
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const models = type === "photo" ? PHOTO_MODELS : VIDEO_MODELS;

  // Load categories and saved items
  useEffect(() => {
    loadCategories();
    loadSavedItems();
  }, []);

  // Update model when type changes
  useEffect(() => {
    setModel(models[0]?.id || "");
  }, [type]);

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories", { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data.categories)) {
        setCategories(data.categories);
        if (data.categories.length > 0) {
          setSelectedCategory(data.categories[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const loadSavedItems = async () => {
    setLoadingItems(true);
    try {
      const res = await fetch("/api/admin/gallery?limit=20", { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data.effects)) {
        setSavedItems(data.effects.map((e: any) => ({
          id: e.id,
          presetId: e.preset_id,
          title: e.title,
          previewUrl: e.preview_url || e.preview_image,
          modelKey: e.model_key,
          placement: e.placement,
          category: e.category,
          status: e.status,
          createdAt: e.created_at,
        })));
      }
    } catch (error) {
      console.error("Failed to load saved items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  // Generate content
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Введите промпт");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedContent(null);

    try {
      // Start generation
      const endpoint = type === "video" ? "/api/generate/video" : "/api/generate/photo";
      const payload = type === "video"
        ? { prompt, model, duration: 5, mode: "t2v", aspectRatio, variants: 1 }
        : { prompt, model, aspectRatio, variants: 1, mode: "t2i" };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Ошибка генерации");

      const jobId = data.jobId;
      const provider = data.provider;

      // Poll for result
      let attempts = 0;
      const maxAttempts = 180;

      while (attempts < maxAttempts) {
        const qs = new URLSearchParams();
        qs.set("kind", type === "video" ? "video" : "image");
        if (provider) qs.set("provider", provider);

        const statusRes = await fetch(`/api/jobs/${jobId}?${qs.toString()}`, {
          credentials: "include",
        });
        const statusData = await statusRes.json();

        if (statusData.status === "completed" && statusData.results?.[0]?.url) {
          const resultUrl = statusData.results[0].url;
          setGeneratedContent({
            id: `gen-${Date.now()}`,
            url: resultUrl,
            prompt,
            model,
            type,
            aspectRatio,
          });
          setProgress(100);
          toast.success("Генерация завершена!");
          break;
        }

        if (statusData.status === "failed") {
          throw new Error(statusData.error || "Ошибка генерации");
        }

        if (typeof statusData.progress === "number") {
          setProgress(statusData.progress);
        }

        await new Promise((r) => setTimeout(r, 2000));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error("Превышено время ожидания");
      }
    } catch (error: any) {
      toast.error(error.message || "Ошибка генерации");
    } finally {
      setIsGenerating(false);
    }
  };

  // Create new category
  const handleCreateCategory = async () => {
    const name = newCategoryInput.trim();
    if (!name) {
      toast.error("Введите название категории");
      return;
    }

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });

      if (!res.ok) throw new Error("Ошибка создания");

      await loadCategories();
      setSelectedCategory(name);
      setNewCategoryInput("");
      setShowNewCategory(false);
      toast.success("Категория создана!");
    } catch (error) {
      toast.error("Не удалось создать категорию");
    }
  };

  // Publish content
  const handlePublish = async () => {
    if (!generatedContent) return;

    if (!saveToHome && !saveToInspiration) {
      toast.error("Выберите куда опубликовать");
      return;
    }

    setIsPublishing(true);

    try {
      const modelInfo = getModelById(generatedContent.model);
      const placements = [];
      if (saveToHome) placements.push("home");
      if (saveToInspiration) placements.push("inspiration");

      for (const placement of placements) {
        const presetId = `style-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const galleryData = {
          presetId,
          title: generatedContent.prompt.slice(0, 100),
          contentType: generatedContent.type,
          modelKey: generatedContent.model,
          tileRatio: generatedContent.aspectRatio,
          costStars: typeof modelInfo?.pricing === 'number' ? modelInfo.pricing : 0,
          mode: generatedContent.type === "video" ? "t2v" : "t2i",
          variantId: "default",
          previewImage: generatedContent.url,
          previewUrl: generatedContent.url,
          templatePrompt: generatedContent.prompt,
          featured: false,
          published: true,
          order: 0,
          placement,
          status: "published",
          category: selectedCategory || "",
          priority: 0,
          type: generatedContent.type === "video" ? "video" : "image",
          assetUrl: generatedContent.url,
          posterUrl: generatedContent.type === "video" ? generatedContent.url : "",
          aspect: generatedContent.aspectRatio,
          shortDescription: `Создано с ${modelInfo?.name || generatedContent.model}`,
        };

        const res = await fetch("/api/admin/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(galleryData),
        });

        if (!res.ok) throw new Error("Ошибка публикации");
      }

      const placementsText = placements.map(p => p === "home" ? "Главную" : "Вдохновение").join(" и ");
      toast.success(`Опубликовано в ${placementsText}!`);
      
      // Reset and reload
      setGeneratedContent(null);
      setPrompt("");
      loadSavedItems();
    } catch (error: any) {
      toast.error(error.message || "Ошибка публикации");
    } finally {
      setIsPublishing(false);
    }
  };

  // Delete saved item
  const handleDeleteItem = async (presetId: string) => {
    if (!confirm("Удалить этот контент?")) return;

    try {
      const res = await fetch(`/api/admin/gallery?presetId=${encodeURIComponent(presetId)}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Ошибка удаления");

      toast.success("Удалено!");
      loadSavedItems();
    } catch (error) {
      toast.error("Не удалось удалить");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--text)]">Стили</h1>
        <p className="text-[var(--muted)] mt-1">
          Создавайте и публикуйте контент для главной страницы и раздела вдохновения
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Generator */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--gold)]" />
                Генератор
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Type */}
              <div>
                <label className="text-sm font-medium text-[var(--text)] mb-2 block">Тип</label>
                <div className="flex gap-2">
                  <Button
                    variant={type === "photo" ? "default" : "outline"}
                    onClick={() => setType("photo")}
                    className="flex-1"
                    disabled={isGenerating}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Фото
                  </Button>
                  <Button
                    variant={type === "video" ? "default" : "outline"}
                    onClick={() => setType("video")}
                    className="flex-1"
                    disabled={isGenerating}
                  >
                    <Film className="w-4 h-4 mr-2" />
                    Видео
                  </Button>
                </div>
              </div>

              {/* Model */}
              <div>
                <label className="text-sm font-medium text-[var(--text)] mb-2 block">Нейросеть</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={isGenerating}
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
                <label className="text-sm font-medium text-[var(--text)] mb-2 block">Формат</label>
                <div className="flex gap-2">
                  {["1:1", "9:16", "16:9"].map((ar) => (
                    <Button
                      key={ar}
                      variant={aspectRatio === ar ? "default" : "outline"}
                      onClick={() => setAspectRatio(ar)}
                      size="sm"
                      disabled={isGenerating}
                    >
                      {ar}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Prompt */}
              <div>
                <label className="text-sm font-medium text-[var(--text)] mb-2 block">Промпт</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Опишите что хотите создать..."
                  rows={4}
                  disabled={isGenerating}
                  className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] resize-none placeholder:text-[var(--muted)]"
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 py-6 text-lg font-semibold"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Генерация... {progress}%
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Сгенерировать
                  </>
                )}
              </Button>

              {/* Progress */}
              {isGenerating && (
                <div className="h-2 bg-[var(--surface2)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--gold)] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Result & Publish */}
        <div className="space-y-6">
          {/* Result Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-[var(--gold)]" />
                Результат
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedContent ? (
                <div className="space-y-4">
                  {/* Preview */}
                  <div className="relative rounded-xl overflow-hidden bg-[var(--surface2)] border border-[var(--border)]">
                    {generatedContent.type === "video" ? (
                      <video
                        src={generatedContent.url}
                        className="w-full aspect-video object-contain"
                        controls
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <img
                        src={generatedContent.url}
                        alt="Generated"
                        className="w-full aspect-square object-contain cursor-pointer"
                        onClick={() => window.open(generatedContent.url, '_blank')}
                      />
                    )}
                  </div>

                  {/* Prompt display */}
                  <p className="text-sm text-[var(--muted)] bg-[var(--surface2)] p-3 rounded-lg">
                    {generatedContent.prompt}
                  </p>

                  {/* Placement */}
                  <div>
                    <label className="text-sm font-medium text-[var(--text)] mb-3 block">
                      Куда опубликовать?
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface2)] cursor-pointer hover:bg-[var(--border)] transition-colors">
                        <input
                          type="checkbox"
                          checked={saveToHome}
                          onChange={(e) => setSaveToHome(e.target.checked)}
                          className="w-5 h-5 rounded border-[var(--border)] text-[var(--gold)]"
                        />
                        <Home className="w-5 h-5 text-[var(--gold)]" />
                        <div className="flex-1">
                          <span className="font-medium text-[var(--text)]">Главная</span>
                          <p className="text-xs text-[var(--muted)]">Показать на главной странице</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface2)] cursor-pointer hover:bg-[var(--border)] transition-colors">
                        <input
                          type="checkbox"
                          checked={saveToInspiration}
                          onChange={(e) => setSaveToInspiration(e.target.checked)}
                          className="w-5 h-5 rounded border-[var(--border)] text-[var(--gold)]"
                        />
                        <Lightbulb className="w-5 h-5 text-[var(--gold)]" />
                        <div className="flex-1">
                          <span className="font-medium text-[var(--text)]">Вдохновение</span>
                          <p className="text-xs text-[var(--muted)]">Показать в разделе вдохновения</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-sm font-medium text-[var(--text)] mb-2 block">
                      Категория
                    </label>
                    {!showNewCategory ? (
                      <div className="flex gap-2">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="flex-1 px-4 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                        >
                          {categories.length === 0 && (
                            <option value="">Нет категорий</option>
                          )}
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          onClick={() => setShowNewCategory(true)}
                          className="shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                          placeholder="Новая категория..."
                          className="flex-1 px-4 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                          autoFocus
                        />
                        <Button variant="default" onClick={handleCreateCategory}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" onClick={() => { setShowNewCategory(false); setNewCategoryInput(""); }}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Publish Button */}
                  <Button
                    onClick={handlePublish}
                    disabled={isPublishing || (!saveToHome && !saveToInspiration)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg font-semibold"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Публикация...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Опубликовать
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--muted)]">
                  <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg">Сгенерируйте контент</p>
                  <p className="text-sm mt-1">Результат появится здесь</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Published */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-[var(--gold)]" />
            Опубликованный контент
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadSavedItems} disabled={loadingItems}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loadingItems ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </CardHeader>
        <CardContent>
          {loadingItems ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
            </div>
          ) : savedItems.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted)]">
              <p>Пока нет опубликованного контента</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {savedItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface2)]"
                >
                  <img
                    src={item.previewUrl}
                    alt={item.title}
                    className="w-full aspect-square object-cover"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                    <span className="text-xs text-white text-center line-clamp-2">{item.title}</span>
                    <div className="flex gap-1">
                      {item.placement === 'home' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/80 text-white rounded">Главная</span>
                      )}
                      {item.placement === 'inspiration' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/80 text-white rounded">Вдохновление</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteItem(item.presetId)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
