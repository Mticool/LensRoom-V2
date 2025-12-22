"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Star, Search, Plus, History, User, Hash } from "lucide-react";

type GrantResult = {
  success: boolean;
  message: string;
  data?: {
    username: string;
    userId: string;
    amount: number;
    previousBalance: number;
    newBalance: number;
    transactionRecorded: boolean;
  };
  error?: string;
};

type SearchResult = {
  auth_user_id: string;
  telegram_username: string | null;
  telegram_id: number | null;
  first_name: string | null;
  last_name: string | null;
  balance: number;
};

export default function AdminCreditsClient() {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"username" | "telegram_id">("username");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Grant state
  const [amount, setAmount] = useState<string>("1000");
  const [reason, setReason] = useState("");
  const [isGranting, setIsGranting] = useState(false);
  const [lastGrant, setLastGrant] = useState<GrantResult | null>(null);

  // Quick grant (without search)
  const [quickUsername, setQuickUsername] = useState("");
  const [quickAmount, setQuickAmount] = useState<string>("1000");
  const [quickReason, setQuickReason] = useState("");

  // Search user
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError("Введите username или Telegram ID");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const params = new URLSearchParams({
        query: searchQuery.trim(),
        type: searchType,
      });

      const res = await fetch(`/api/admin/users/search?${params.toString()}`, {
        credentials: "include",
      });

      const json = await res.json();

      if (!res.ok) {
        setSearchError(json.error || "Пользователь не найден");
        return;
      }

      setSearchResult(json.user);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Ошибка поиска");
    } finally {
      setIsSearching(false);
    }
  };

  // Grant to searched user
  const handleGrantToSearched = async () => {
    if (!searchResult) return;

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Укажите корректное количество звезд");
      return;
    }

    setIsGranting(true);

    try {
      const res = await fetch("/api/admin/credits/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: searchResult.telegram_username || "",
          telegramId: searchResult.telegram_id,
          amount: amountNum,
          reason: reason || undefined,
        }),
      });

      const json: GrantResult = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Ошибка начисления");
        return;
      }

      setLastGrant(json);
      toast.success(json.message);

      // Update search result with new balance
      if (json.data) {
        setSearchResult((prev) =>
          prev ? { ...prev, balance: json.data!.newBalance } : prev
        );
      }

      // Reset form
      setAmount("1000");
      setReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setIsGranting(false);
    }
  };

  // Quick grant by username
  const handleQuickGrant = async () => {
    if (!quickUsername.trim()) {
      toast.error("Введите username");
      return;
    }

    const amountNum = parseInt(quickAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Укажите корректное количество звезд");
      return;
    }

    setIsGranting(true);

    try {
      const res = await fetch("/api/admin/credits/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: quickUsername.trim(),
          amount: amountNum,
          reason: quickReason || undefined,
        }),
      });

      const json: GrantResult = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Ошибка начисления");
        return;
      }

      setLastGrant(json);
      toast.success(json.message);

      // Reset form
      setQuickUsername("");
      setQuickAmount("1000");
      setQuickReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
          Начисление звезд ⭐
        </h1>
        <p className="text-[var(--muted)]">
          Начисление звезд пользователям по username или Telegram ID
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Grant Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Быстрое начисление
            </CardTitle>
            <CardDescription>
              Начислить звезды по username в Telegram
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-[var(--muted)]">
                Username в Telegram
              </label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 bg-[var(--surface2)] border border-[var(--border)] rounded-l-lg text-[var(--muted)]">
                  @
                </span>
                <Input
                  placeholder="Mticool"
                  value={quickUsername}
                  onChange={(e) => setQuickUsername(e.target.value)}
                  className="rounded-l-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--muted)]">
                Количество звезд
              </label>
              <Input
                type="number"
                placeholder="1000"
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value)}
                min={1}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--muted)]">
                Причина (опционально)
              </label>
              <Input
                placeholder="Бонус за активность"
                value={quickReason}
                onChange={(e) => setQuickReason(e.target.value)}
              />
            </div>

            <Button
              onClick={handleQuickGrant}
              disabled={isGranting || !quickUsername.trim()}
              className="w-full bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
            >
              {isGranting ? (
                "Начисление..."
              ) : (
                <>
                  <Star className="w-4 h-4 mr-2" />
                  Начислить {quickAmount || 0} ⭐
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Search & Grant Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Поиск пользователя
            </CardTitle>
            <CardDescription>
              Найти пользователя и посмотреть баланс
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <select
                className="h-10 rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 text-sm text-[var(--text)]"
                value={searchType}
                onChange={(e) =>
                  setSearchType(e.target.value as "username" | "telegram_id")
                }
              >
                <option value="username">Username</option>
                <option value="telegram_id">Telegram ID</option>
              </select>
              <Input
                placeholder={
                  searchType === "username" ? "Mticool" : "123456789"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? "..." : <Search className="w-4 h-4" />}
              </Button>
            </div>

            {searchError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {searchError}
              </div>
            )}

            {searchResult && (
              <div className="p-4 rounded-lg bg-[var(--surface2)] border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--gold)]/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-[var(--gold)]" />
                    </div>
                    <div>
                      <div className="font-medium text-[var(--text)]">
                        {searchResult.first_name} {searchResult.last_name}
                      </div>
                      <div className="text-sm text-[var(--muted)]">
                        @{searchResult.telegram_username || "—"}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    <Star className="w-3 h-3 mr-1 text-[var(--gold)]" />
                    {searchResult.balance.toLocaleString()}
                  </Badge>
                </div>

                <div className="text-xs text-[var(--muted)] flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    TG ID: {searchResult.telegram_id || "—"}
                  </span>
                </div>

                <div className="pt-3 border-t border-[var(--border)] space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Количество"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={1}
                      className="w-32"
                    />
                    <Input
                      placeholder="Причина (опционально)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <Button
                    onClick={handleGrantToSearched}
                    disabled={isGranting}
                    className="w-full bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
                  >
                    {isGranting ? (
                      "Начисление..."
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Начислить {amount || 0} ⭐
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last Grant Result */}
      {lastGrant?.success && lastGrant.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <History className="w-5 h-5" />
              Последнее начисление
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-[var(--surface2)]">
                <div className="text-xs text-[var(--muted)] mb-1">
                  Пользователь
                </div>
                <div className="font-medium text-[var(--text)]">
                  @{lastGrant.data.username}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--surface2)]">
                <div className="text-xs text-[var(--muted)] mb-1">
                  Начислено
                </div>
                <div className="font-medium text-green-400">
                  +{lastGrant.data.amount.toLocaleString()} ⭐
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--surface2)]">
                <div className="text-xs text-[var(--muted)] mb-1">Было</div>
                <div className="font-medium text-[var(--text)]">
                  {lastGrant.data.previousBalance.toLocaleString()} ⭐
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--surface2)]">
                <div className="text-xs text-[var(--muted)] mb-1">Стало</div>
                <div className="font-medium text-[var(--gold)]">
                  {lastGrant.data.newBalance.toLocaleString()} ⭐
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые суммы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[100, 500, 1000, 2000, 5000, 10000, 50000].map((val) => (
              <Button
                key={val}
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuickAmount(String(val));
                  setAmount(String(val));
                }}
              >
                {val.toLocaleString()} ⭐
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

