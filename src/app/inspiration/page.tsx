"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Eye, User, Sparkles } from "lucide-react";
import { MOCK_GALLERY } from "@/data/gallery";
import { toast } from "sonner";

type TabType = "trending" | "recent" | "top";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function InspirationPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>("trending");

  // Sort based on tab
  const sortedGallery = [...MOCK_GALLERY].sort((a, b) => {
    switch (tab) {
      case "trending":
        return b.likes + b.views - (a.likes + a.views);
      case "recent":
        return parseInt(b.id) - parseInt(a.id);
      case "top":
        return b.likes - a.likes;
      default:
        return 0;
    }
  });

  const handleRepeat = (galleryItem: typeof MOCK_GALLERY[0]) => {
    // Route to generator with prompt pre-filled
    const params = new URLSearchParams();
    params.set("kind", "photo");
    // Use model from gallery item (match to our internal model keys)
    const modelMap: Record<string, string> = {
      "Flux Pro": "flux-2-pro",
      "Midjourney": "nano-banana-pro", // fallback
      "DALL-E 3": "imagen-4",
      "Stable Diffusion": "seedream-4.5",
      "NovelAI": "nano-banana-pro",
    };
    const modelKey = modelMap[galleryItem.model] || "nano-banana-pro";
    params.set("model", modelKey);
    params.set("prompt", galleryItem.prompt);
    
    router.push(`/create/studio?${params.toString()}`);
    toast.success("Открываем генератор", {
      description: "Промпт уже вставлен",
    });
  };

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-16 sm:pb-20 bg-[var(--bg)]">
      <motion.div
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <motion.div
          className="mb-6 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-[var(--text)]">
            Галерея вдохновения
          </h1>
          <p className="text-base sm:text-xl text-[var(--text2)]">
            Лучшие работы — повторите одним кликом
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="flex gap-2 mb-6 sm:mb-10 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Button
            variant={tab === "trending" ? "default" : "secondary"}
            onClick={() => setTab("trending")}
            size="sm"
            className="shrink-0"
          >
            Trending
          </Button>
          <Button
            variant={tab === "recent" ? "default" : "secondary"}
            onClick={() => setTab("recent")}
            size="sm"
            className="shrink-0"
          >
            Recent
          </Button>
          <Button
            variant={tab === "top" ? "default" : "secondary"}
            onClick={() => setTab("top")}
            size="sm"
            className="shrink-0"
          >
            Top
          </Button>
        </motion.div>

        {/* Masonry Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6"
        >
          {sortedGallery.map((galleryItem) => (
            <motion.div
              key={galleryItem.id}
              variants={item}
              className="break-inside-avoid mb-6"
            >
              <Card className="group overflow-hidden hover:border-white/50 transition-all duration-300 p-0 bg-[var(--surface)] border-[var(--border)]">
                {/* Image */}
                <div className="relative overflow-hidden cursor-pointer" onClick={() => handleRepeat(galleryItem)}>
                  <img
                    src={galleryItem.imageUrl}
                    alt="Gallery item"
                    className="w-full group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Overlay на hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                    <div className="w-full space-y-3">
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-4 text-sm font-medium">
                          <div className="flex items-center gap-1.5">
                            <Heart className="w-4 h-4" />
                            {galleryItem.likes}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Eye className="w-4 h-4" />
                            {galleryItem.views}
                          </div>
                        </div>
                        <Badge className="bg-white text-black font-bold text-xs">
                          {galleryItem.model}
                        </Badge>
                      </div>

                      {/* Repeat button */}
                      <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition-colors">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm">Повторить</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 bg-[var(--surface)]">
                  <p className="text-sm text-[var(--text2)] line-clamp-2 mb-3 leading-relaxed">
                    {galleryItem.prompt}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                      <User className="w-3 h-3 text-white" />
                    </div>
                    <span className="font-medium">{galleryItem.author}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
