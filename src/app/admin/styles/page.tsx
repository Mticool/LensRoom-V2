"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export default function AdminStylesPage() {
  const router = useRouter();

  useEffect(() => {
    // Автоматический редирект через 3 секунды
    const timer = setTimeout(() => {
      router.push("/admin/content");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
      <Card className="max-w-2xl w-full bg-[var(--surface)] border-[var(--border)]">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-[var(--gold)]/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-[var(--gold)]" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">
            Страница "Стили" перенесена
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-[var(--text2)] text-lg">
              Управление контентом теперь находится в новом разделе:
            </p>
            
            <div className="p-6 rounded-xl bg-[var(--surface2)] border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text)] mb-3 text-lg">
                Контент-конструктор
              </h3>
              <p className="text-sm text-[var(--muted)] mb-4">
                Единое место для управления контентом главной страницы и раздела Inspiration.
                С улучшенным интерфейсом и новыми возможностями:
              </p>
              <ul className="text-sm text-[var(--text2)] space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--gold)]">✓</span>
                  <span>Вкладки: Главная / Inspiration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--gold)]">✓</span>
                  <span>Drag & drop сортировка</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--gold)]">✓</span>
                  <span>Категории и фильтры</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--gold)]">✓</span>
                  <span>Редактирование прямо в интерфейсе</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                onClick={() => router.push("/admin/content")}
                className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 font-semibold"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Перейти в Контент-конструктор
              </Button>
              
              <Button
                onClick={() => router.push("/admin/generator")}
                variant="outline"
                className="border-[var(--border)] text-[var(--text)]"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Генератор контента
              </Button>
            </div>

            <p className="text-xs text-[var(--muted)] pt-4">
              Автоматический переход через несколько секунд...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
