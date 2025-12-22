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
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg)' }}>
      <Card className="max-w-2xl w-full" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
              <Sparkles className="w-8 h-8" style={{ color: 'var(--gold)' }} />
            </div>
          </div>
          <CardTitle className="text-center text-2xl" style={{ color: 'var(--text)' }}>
            Страница "Стили" перенесена
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-lg" style={{ color: 'var(--text2)' }}>
              Управление контентом теперь находится в новом разделе:
            </p>
            
            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
              <h3 className="font-semibold mb-3 text-lg" style={{ color: 'var(--text)' }}>
                Контент-конструктор
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                Единое место для управления контентом главной страницы и раздела Inspiration.
                С улучшенным интерфейсом и новыми возможностями:
              </p>
              <ul className="text-sm space-y-2 text-left" style={{ color: 'var(--text2)' }}>
                <li className="flex items-start gap-2">
                  <span style={{ color: 'var(--gold)' }}>✓</span>
                  <span>Вкладки: Главная / Inspiration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: 'var(--gold)' }}>✓</span>
                  <span>Drag & drop сортировка</span>
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: 'var(--gold)' }}>✓</span>
                  <span>Категории и фильтры</span>
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: 'var(--gold)' }}>✓</span>
                  <span>Редактирование прямо в интерфейсе</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                onClick={() => router.push("/admin/content")}
                className="font-semibold"
                style={{ backgroundColor: 'var(--gold)', color: '#000' }}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Перейти в Контент-конструктор
              </Button>
              
              <Button
                onClick={() => router.push("/admin/generator")}
                variant="outline"
                className="border"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Генератор контента
              </Button>
            </div>

            <p className="text-xs pt-4" style={{ color: 'var(--muted)' }}>
              Автоматический переход через несколько секунд...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
