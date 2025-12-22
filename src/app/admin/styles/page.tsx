"use client";

import { useState, useEffect } from "react";
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

// Inline styles
const styles = {
  gold: '#D6B36A',
  text: 'rgba(255,255,255,0.95)',
  text2: 'rgba(255,255,255,0.8)',
  muted: 'rgba(255,255,255,0.6)',
  surface: 'rgba(255,255,255,0.05)',
  surface2: 'rgba(255,255,255,0.1)',
  border: 'rgba(255,255,255,0.15)',
  bg: '#0a0a0a',
};

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
        <h1 className="text-3xl font-bold" style={{ color: styles.text }}>Стили</h1>
        <p className="mt-1" style={{ color: styles.muted }}>
          Создавайте и публикуйте контент для главной страницы и раздела вдохновения
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Generator */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: styles.surface, border: `1px solid ${styles.border}` }}>
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5" style={{ color: styles.gold }} />
            <h2 className="text-xl font-semibold" style={{ color: styles.text }}>Генератор</h2>
          </div>

          <div className="space-y-5">
            {/* Type */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: styles.text2 }}>Тип</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setType("photo")}
                  disabled={isGenerating}
                  className="flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all"
                  style={{ 
                    backgroundColor: type === "photo" ? styles.gold : 'transparent',
                    color: type === "photo" ? '#000' : styles.text2,
                    border: `1px solid ${type === "photo" ? styles.gold : styles.border}`,
                  }}
                >
                  <ImageIcon className="w-4 h-4" />
                  Фото
                </button>
                <button
                  onClick={() => setType("video")}
                  disabled={isGenerating}
                  className="flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all"
                  style={{ 
                    backgroundColor: type === "video" ? styles.gold : 'transparent',
                    color: type === "video" ? '#000' : styles.text2,
                    border: `1px solid ${type === "video" ? styles.gold : styles.border}`,
                  }}
                >
                  <Film className="w-4 h-4" />
                  Видео
                </button>
              </div>
            </div>

            {/* Model */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: styles.text2 }}>Нейросеть</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={isGenerating}
                className="w-full px-4 py-3 rounded-xl appearance-none cursor-pointer"
                style={{ 
                  backgroundColor: styles.surface2, 
                  border: `1px solid ${styles.border}`, 
                  color: styles.text,
                }}
              >
                {models.map((m: any) => (
                  <option key={m.id} value={m.id} style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: styles.text2 }}>Формат</label>
              <div className="flex gap-2">
                {["1:1", "9:16", "16:9"].map((ar) => (
                  <button
                    key={ar}
                    onClick={() => setAspectRatio(ar)}
                    disabled={isGenerating}
                    className="flex-1 py-2.5 px-3 rounded-lg font-medium transition-all"
                    style={{ 
                      backgroundColor: aspectRatio === ar ? styles.gold : 'transparent',
                      color: aspectRatio === ar ? '#000' : styles.text2,
                      border: `1px solid ${aspectRatio === ar ? styles.gold : styles.border}`,
                    }}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt */}
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: styles.text2 }}>Промпт</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опишите что хотите создать..."
                rows={4}
                disabled={isGenerating}
                className="w-full px-4 py-3 rounded-xl resize-none"
                style={{ 
                  backgroundColor: styles.surface2, 
                  border: `1px solid ${styles.border}`, 
                  color: styles.text,
                }}
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-4 px-6 rounded-xl text-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ backgroundColor: styles.gold, color: '#000' }}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Генерация... {progress}%
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Сгенерировать
                </>
              )}
            </button>

            {/* Progress */}
            {isGenerating && (
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: styles.surface2 }}>
                <div
                  className="h-full transition-all"
                  style={{ width: `${progress}%`, backgroundColor: styles.gold }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Result & Publish */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: styles.surface, border: `1px solid ${styles.border}` }}>
          <div className="flex items-center gap-2 mb-6">
            <Eye className="w-5 h-5" style={{ color: styles.gold }} />
            <h2 className="text-xl font-semibold" style={{ color: styles.text }}>Результат</h2>
          </div>

          {generatedContent ? (
            <div className="space-y-5">
              {/* Preview */}
              <div className="relative rounded-xl overflow-hidden" style={{ backgroundColor: styles.surface2, border: `1px solid ${styles.border}` }}>
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
              <p className="text-sm p-3 rounded-lg" style={{ backgroundColor: styles.surface2, color: styles.muted }}>
                {generatedContent.prompt}
              </p>

              {/* Placement */}
              <div>
                <label className="text-sm font-medium mb-3 block" style={{ color: styles.text2 }}>
                  Куда опубликовать?
                </label>
                <div className="space-y-2">
                  <label 
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                    style={{ backgroundColor: saveToHome ? styles.surface2 : 'transparent', border: `1px solid ${styles.border}` }}
                  >
                    <input
                      type="checkbox"
                      checked={saveToHome}
                      onChange={(e) => setSaveToHome(e.target.checked)}
                      className="w-5 h-5 rounded"
                      style={{ accentColor: styles.gold }}
                    />
                    <Home className="w-5 h-5" style={{ color: styles.gold }} />
                    <div className="flex-1">
                      <span className="font-medium" style={{ color: styles.text }}>Главная</span>
                      <p className="text-xs" style={{ color: styles.muted }}>Показать на главной странице</p>
                    </div>
                  </label>

                  <label 
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                    style={{ backgroundColor: saveToInspiration ? styles.surface2 : 'transparent', border: `1px solid ${styles.border}` }}
                  >
                    <input
                      type="checkbox"
                      checked={saveToInspiration}
                      onChange={(e) => setSaveToInspiration(e.target.checked)}
                      className="w-5 h-5 rounded"
                      style={{ accentColor: styles.gold }}
                    />
                    <Lightbulb className="w-5 h-5" style={{ color: styles.gold }} />
                    <div className="flex-1">
                      <span className="font-medium" style={{ color: styles.text }}>Вдохновение</span>
                      <p className="text-xs" style={{ color: styles.muted }}>Показать в разделе вдохновения</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: styles.text2 }}>
                  Категория
                </label>
                {!showNewCategory ? (
                  <div className="flex gap-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl"
                      style={{ backgroundColor: styles.surface2, border: `1px solid ${styles.border}`, color: styles.text }}
                    >
                      {categories.length === 0 && (
                        <option value="">Нет категорий</option>
                      )}
                      {categories.map((cat) => (
                        <option key={cat} value={cat} style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowNewCategory(true)}
                      className="px-3 py-2 rounded-xl transition-all"
                      style={{ backgroundColor: styles.surface2, border: `1px solid ${styles.border}`, color: styles.text }}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      placeholder="Новая категория..."
                      className="flex-1 px-4 py-2.5 rounded-xl"
                      style={{ backgroundColor: styles.surface2, border: `1px solid ${styles.border}`, color: styles.text }}
                      autoFocus
                    />
                    <button
                      onClick={handleCreateCategory}
                      className="px-3 py-2 rounded-xl"
                      style={{ backgroundColor: styles.gold, color: '#000' }}
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => { setShowNewCategory(false); setNewCategoryInput(""); }}
                      className="px-3 py-2 rounded-xl"
                      style={{ backgroundColor: styles.surface2, border: `1px solid ${styles.border}`, color: styles.text }}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Publish Button */}
              <button
                onClick={handlePublish}
                disabled={isPublishing || (!saveToHome && !saveToInspiration)}
                className="w-full py-4 px-6 rounded-xl text-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ backgroundColor: '#10B981', color: '#fff' }}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Публикация...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Опубликовать
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: styles.muted }}>
              <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">Сгенерируйте контент</p>
              <p className="text-sm mt-1">Результат появится здесь</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Published */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: styles.surface, border: `1px solid ${styles.border}` }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" style={{ color: styles.gold }} />
            <h2 className="text-xl font-semibold" style={{ color: styles.text }}>Опубликованный контент</h2>
          </div>
          <button
            onClick={loadSavedItems}
            disabled={loadingItems}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all text-sm"
            style={{ color: styles.text2 }}
          >
            <RefreshCw className={`w-4 h-4 ${loadingItems ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>

        {loadingItems ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: styles.gold }} />
          </div>
        ) : savedItems.length === 0 ? (
          <div className="text-center py-8" style={{ color: styles.muted }}>
            <p>Пока нет опубликованного контента</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {savedItems.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden"
                style={{ backgroundColor: styles.surface2, border: `1px solid ${styles.border}` }}
              >
                <img
                  src={item.previewUrl}
                  alt={item.title}
                  className="w-full aspect-square object-cover"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  <span className="text-xs text-white text-center line-clamp-2">{item.title}</span>
                  <div className="flex gap-1">
                    {item.placement === 'home' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-500 text-white rounded">Главная</span>
                    )}
                    {item.placement === 'inspiration' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-500 text-white rounded">Вдохновление</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteItem(item.presetId)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
