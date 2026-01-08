"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Users, Gift, Sparkles, ArrowRight } from "lucide-react";
import { useTelegramAuth } from "@/providers/telegram-auth-provider";
import { captureReferralCodeFromUrl, getStoredReferralCode } from "@/lib/referrals/client";
import { LoginDialog } from "@/components/auth/login-dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
    <section className="py-24 px-6">
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        className="max-w-4xl mx-auto"
      >
        {/* Background card with gradient */}
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#a78bfa]/10 via-[var(--surface)] to-[#f472b6]/10 border border-[var(--border)] p-8 sm:p-12">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#a78bfa]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#f472b6]/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="max-w-lg">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#a78bfa]/20 to-[#f472b6]/20 border border-[#a78bfa]/30 mb-6">
                  <Gift className="w-4 h-4 text-[#a78bfa]" />
                  <span className="text-[12px] font-semibold text-[#a78bfa] uppercase tracking-wider">Бонус за приглашение</span>
                </div>
                
                {/* Title */}
                <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold tracking-tight text-[var(--text)] mb-4">
                  Пригласи друга — <br />
                  <span className="bg-gradient-to-r from-[#a78bfa] to-[#f472b6] bg-clip-text text-transparent">
                    разделите 100⭐
                  </span>
                </h2>
                
                {/* Description */}
                <p className="text-[16px] text-[var(--muted)] leading-relaxed">
                  Вам <span className="text-[var(--text)] font-semibold">+50⭐</span> и другу <span className="text-[var(--text)] font-semibold">+50⭐</span> после его первого входа по вашей ссылке.
                </p>
                
                {hasPendingRef && !user && (
                  <p className="mt-4 text-[14px] text-[#a78bfa] flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Бонус уже ждёт вас — войдите, чтобы получить +50⭐
                  </p>
                )}
              </div>

              {/* Right side - Stats & CTA */}
              <div className="flex flex-col items-start lg:items-end gap-4">
                {user ? (
                  <>
                    {/* Stats */}
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-[var(--text)]">
                          {data?.invitedCount ?? 0}
                        </div>
                        <div className="text-[12px] text-[var(--muted)] uppercase tracking-wider">приглашено</div>
                      </div>
                      <div className="w-px h-10 bg-[var(--border)]" />
                      <div className="text-center">
                        <div className="text-3xl font-bold text-[#a78bfa]">
                          {(data?.invitedCount ?? 0) * 50}⭐
                        </div>
                        <div className="text-[12px] text-[var(--muted)] uppercase tracking-wider">заработано</div>
                      </div>
                    </div>
                    
                    {/* Copy button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={copyLink}
                      disabled={loading || !data?.link}
                      className="group flex items-center gap-3 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#a78bfa] to-[#f472b6] text-white font-semibold text-[14px] shadow-lg shadow-[#a78bfa]/25 hover:shadow-xl hover:shadow-[#a78bfa]/30 transition-all disabled:opacity-50"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Скопировано!" : "Скопировать ссылку"}
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setLoginOpen(true)}
                    className="group flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-[#a78bfa] to-[#f472b6] text-white font-semibold text-[15px] shadow-lg shadow-[#a78bfa]/25 hover:shadow-xl hover:shadow-[#a78bfa]/30 transition-all"
                  >
                    Войти и получить ссылку
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Referral link display */}
            {user && data?.link && (
              <div className="mt-8 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                <div className="text-[11px] text-[var(--muted)] uppercase tracking-wider mb-2">Ваша реферальная ссылка</div>
                <div className="text-[14px] text-[var(--text)] font-mono break-all select-all">{data.link}</div>
              </div>
            )}

            {user && error && (
              <div className="mt-4 text-[14px] text-[var(--muted)]">
                {error}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </section>
  );
}



