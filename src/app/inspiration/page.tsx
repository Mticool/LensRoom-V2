"use client";

import { motion } from "framer-motion";
import { InspirationGallery } from "@/components/inspiration/InspirationGallery";

export default function InspirationPage() {

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-16 sm:pb-20 bg-[var(--bg)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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

        {/* Gallery */}
        <InspirationGallery />
      </div>
    </div>
  );
}
