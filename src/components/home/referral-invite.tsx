"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Users, Gift } from "lucide-react";
import { useTelegramAuth } from "@/providers/telegram-auth-provider";
import { captureReferralCodeFromUrl, getStoredReferralCode } from "@/lib/referrals/client";
import { LoginDialog } from "@/components/auth/login-dialog";
import { toast } from "sonner";

type ReferralMeResponse = {
  code: string;
  link: string;
  bonusTotal: number;
  inviterBonus: number;
  inviteeBonus: number;
  invitedCount: number;
};

export function ReferralInvite() {
  const telegramAuth = useTelegramAuth();
  const user = telegramAuth.user;
  const [data, setData] = useState<ReferralMeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const hasPendingRef = useMemo(() => {
    try {
      captureReferralCodeFromUrl();
      return !!getStoredReferralCode();
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/referrals/me");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError((json as any)?.error || "Не удалось загрузить реферальную ссылку");
          return;
        }
        setData(json as ReferralMeResponse);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const copyLink = async () => {
    if (!data?.link) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      toast.success("Ссылка скопирована");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  return (
    <section className="py-14 border-t border-[var(--border)]">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Badge className="mb-3 bg-white/5 text-white border border-white/10">
                <Gift className="w-3.5 h-3.5 mr-1.5" />
                Бонус за приглашение
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text)]">
                Пригласи друга — разделите 100⭐
              </h2>
              <p className="mt-2 text-[var(--text2)]">
                Вам +50⭐ и другу +50⭐ после его первого входа по вашей ссылке.
              </p>
              {hasPendingRef && !user && (
                <p className="mt-3 text-sm text-white/90">
                  Бонус уже ждёт вас — войдите, чтобы получить +50⭐.
                </p>
              )}
            </div>

            <div className="sm:text-right">
              {user ? (
                <>
                  <div className="text-sm text-[var(--muted)] flex sm:justify-end items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>
                      {data ? `Приглашено: ${data.invitedCount}` : " "}
                    </span>
                  </div>
                  <div className="mt-3 flex sm:justify-end gap-2">
                    <Button
                      onClick={copyLink}
                      disabled={loading || !data?.link}
                      className="bg-white text-black hover:bg-white/90"
                    >
                      {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                      {copied ? "Скопировано" : "Скопировать ссылку"}
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  onClick={() => setLoginOpen(true)}
                  className="bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)]"
                >
                  Войти, чтобы получить ссылку
                </Button>
              )}
            </div>
          </div>

          {user && data?.link && (
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface2)] px-4 py-3">
              <div className="text-xs text-[var(--muted)] mb-1">Ваша реферальная ссылка</div>
              <div className="text-sm text-[var(--text)] break-all">{data.link}</div>
            </div>
          )}

          {user && error && (
            <div className="mt-4 text-sm text-[var(--muted)]">
              {error}
            </div>
          )}
        </div>
      </div>

      <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </section>
  );
}


