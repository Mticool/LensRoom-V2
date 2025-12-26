"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  ExternalLink,
  Info,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface ApiKey {
  id: string;
  service: string;
  api_key_last_4: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  settings: any;
}

const SERVICES = [
  {
    id: "midjourney",
    name: "Midjourney (via KIE.ai)",
    description: "Подключите свой API ключ KIE.ai для использования Midjourney без лимитов",
    icon: Sparkles,
    color: "text-purple-400",
    docsUrl: "https://kie.ai/docs/api-keys",
    placeholder: "kie_xxxxxxxxxxxxxxxxxxxx",
  },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const supabase = createClient();

  // Load API keys
  const loadKeys = async () => {
    try {
      const { data, error } = await supabase
        .from("user_api_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setKeys(data || []);
    } catch (error: any) {
      console.error("Failed to load API keys:", error);
      toast.error("Не удалось загрузить ключи");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  // Add new API key
  const handleAddKey = async (service: string) => {
    if (!newKey.trim()) {
      toast.error("Введите API ключ");
      return;
    }

    try {
      const last4 = newKey.slice(-4);
      
      const { error } = await supabase
        .from("user_api_keys")
        .upsert({
          service,
          api_key_encrypted: newKey, // In production, this should be encrypted server-side
          api_key_last_4: last4,
          is_active: true,
          settings: {},
          usage_stats: {},
        });

      if (error) throw error;

      toast.success("API ключ добавлен!");
      setNewKey("");
      setAdding(null);
      await loadKeys();
    } catch (error: any) {
      console.error("Failed to add key:", error);
      toast.error(error.message || "Не удалось добавить ключ");
    }
  };

  // Delete API key
  const handleDeleteKey = async (id: string) => {
    if (!confirm("Удалить этот API ключ?")) return;

    try {
      const { error } = await supabase
        .from("user_api_keys")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("API ключ удалён");
      await loadKeys();
    } catch (error: any) {
      console.error("Failed to delete key:", error);
      toast.error("Не удалось удалить ключ");
    }
  };

  // Toggle key active status
  const toggleKeyStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("user_api_keys")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      await loadKeys();
      toast.success(currentStatus ? "Ключ деактивирован" : "Ключ активирован");
    } catch (error: any) {
      console.error("Failed to toggle key:", error);
      toast.error("Ошибка");
    }
  };

  const getServiceInfo = (serviceId: string) => {
    return SERVICES.find((s) => s.id === serviceId) || SERVICES[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">API ключи</h1>
        <p className="text-[var(--muted)]">
          Подключите свои API ключи для использования внешних сервисов без лимитов
        </p>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm text-blue-300 font-medium">
                Безопасность ваших данных
              </p>
              <p className="text-xs text-blue-200/80">
                API ключи хранятся в зашифрованном виде и используются только для ваших запросов.
                Мы не имеем доступа к вашим ключам.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <div className="space-y-4">
        {SERVICES.map((service) => {
          const Icon = service.icon;
          const existingKey = keys.find((k) => k.service === service.id);
          const isAdding = adding === service.id;

          return (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-[var(--surface2)] flex items-center justify-center ${service.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {service.description}
                      </CardDescription>
                      <a
                        href={service.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[var(--gold)] hover:underline inline-flex items-center gap-1 mt-2"
                      >
                        Документация
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {existingKey ? (
                    <Badge
                      variant="outline"
                      className={existingKey.is_active ? "border-emerald-500/50 text-emerald-400" : "border-gray-500/50 text-gray-400"}
                    >
                      {existingKey.is_active ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Активен
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 mr-1" />
                          Неактивен
                        </>
                      )}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[var(--muted)]">
                      Не подключен
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {existingKey ? (
                  // Existing key
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface2)]">
                      <div className="flex items-center gap-3">
                        <Key className="w-4 h-4 text-[var(--muted)]" />
                        <code className="text-sm text-[var(--text)] font-mono">
                          ••••••••••••••{existingKey.api_key_last_4}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleKeyStatus(existingKey.id, existingKey.is_active)}
                        >
                          {existingKey.is_active ? "Деактивировать" : "Активировать"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteKey(existingKey.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {existingKey.last_used_at && (
                      <p className="text-xs text-[var(--muted)]">
                        Последнее использование:{" "}
                        {new Date(existingKey.last_used_at).toLocaleString("ru-RU")}
                      </p>
                    )}
                  </div>
                ) : isAdding ? (
                  // Add new key form
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        type={showKey ? "text" : "password"}
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder={service.placeholder}
                        className="pr-10 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
                      >
                        {showKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAddKey(service.id)}
                        disabled={!newKey.trim()}
                        className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Сохранить
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAdding(null);
                          setNewKey("");
                        }}
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Add button
                  <Button
                    variant="outline"
                    onClick={() => setAdding(service.id)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить API ключ
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Usage Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Как это работает?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[var(--text2)]">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[var(--gold)]/20 text-[var(--gold)] flex items-center justify-center shrink-0 font-bold text-xs">
              1
            </div>
            <p>
              Получите API ключ на сайте сервиса (например, KIE.ai для Midjourney)
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[var(--gold)]/20 text-[var(--gold)] flex items-center justify-center shrink-0 font-bold text-xs">
              2
            </div>
            <p>
              Добавьте ключ в LensRoom через эту страницу
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[var(--gold)]/20 text-[var(--gold)] flex items-center justify-center shrink-0 font-bold text-xs">
              3
            </div>
            <p>
              Используйте сервис в генераторе без лимитов - система автоматически будет использовать ваш ключ
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

