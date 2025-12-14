"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Eye, User, Copy, Check } from "lucide-react";
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
  const [tab, setTab] = useState<TabType>("trending");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopyPrompt = async (item: typeof MOCK_GALLERY[0]) => {
    await navigator.clipboard.writeText(item.prompt);
    setCopiedId(item.id);
    toast.success("Промпт скопирован!", {
      description: "Вставьте его в генератор",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-[var(--bg)]">
      <motion.div
        className="container mx-auto px-4 lg:px-8 py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[var(--text)]">
            Галерея <span className="text-[var(--gold)]">вдохновения</span>
          </h1>
          <p className="text-xl text-[var(--text2)]">
            Лучшие работы сообщества LensRoom
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="flex gap-2 mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Button
            variant={tab === "trending" ? "default" : "secondary"}
            onClick={() => setTab("trending")}
          >
            🔥 Trending
          </Button>
          <Button
            variant={tab === "recent" ? "default" : "secondary"}
            onClick={() => setTab("recent")}
          >
            🆕 Recent
          </Button>
          <Button
            variant={tab === "top" ? "default" : "secondary"}
            onClick={() => setTab("top")}
          >
            ⭐ Top
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
              <Card
                
                className="group cursor-pointer overflow-hidden hover:shadow-[0_0_30px_var(--gold-glow)] transition-all duration-300 p-0"
                onClick={() => handleCopyPrompt(galleryItem)}
              >
                {/* Image */}
                <div className="relative overflow-hidden">
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
                        <Badge className="bg-[var(--gold)] text-[#0a0a0f] font-bold">
                          {galleryItem.model}
                        </Badge>
                      </div>

                      {/* Copy indicator */}
                      <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-black/60">
                        {copiedId === galleryItem.id ? (
                          <>
                            <Check className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-green-400 font-medium">
                              Скопировано!
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              Скопировать промпт
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 bg-[var(--surface)]">
                  <p className="text-sm text-[var(--text2)] line-clamp-2 mb-3 leading-relaxed">
                    {galleryItem.prompt}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <div className="w-6 h-6 rounded-full bg-[var(--gold)] flex items-center justify-center">
                      <User className="w-3 h-3 text-[#0a0a0f]" />
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
