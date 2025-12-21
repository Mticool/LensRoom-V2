"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tag, Check, X, Loader2, Gift } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PromocodeResult {
  valid: boolean;
  error?: string;
  promocode_id?: string;
  bonus_type?: string;
  bonus_value?: number;
  description?: string;
}

interface PromocodeInputProps {
  onApply?: (result: PromocodeResult) => void;
  packId?: string;
  className?: string;
  // For bonus_stars type - can apply directly
  allowDirectApply?: boolean;
}

const BONUS_TYPE_LABELS: Record<string, string> = {
  bonus_stars: "звёзд",
  percent_discount: "% скидка",
  fixed_discount: "₽ скидка",
  multiplier: "множитель",
  free_pack: "бесплатный пакет",
};

export function PromocodeInput({
  onApply,
  packId,
  className,
  allowDirectApply = false,
}: PromocodeInputProps) {
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState<PromocodeResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const validateCode = useCallback(async () => {
    if (!code.trim()) {
      toast.error("Введите промокод");
      return;
    }

    setIsValidating(true);
    setResult(null);

    try {
      const res = await fetch("/api/promocodes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: code.trim(), pack_id: packId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ошибка проверки");
      }

      setResult(data);

      if (data.valid) {
        onApply?.(data);
        toast.success("Промокод применён!");
      } else {
        toast.error(data.error || "Промокод недействителен");
      }
    } catch (error: any) {
      toast.error(error.message || "Ошибка проверки промокода");
      setResult({ valid: false, error: error.message });
    } finally {
      setIsValidating(false);
    }
  }, [code, packId, onApply]);

  const applyDirectly = useCallback(async () => {
    if (!code.trim()) {
      toast.error("Введите промокод");
      return;
    }

    setIsApplying(true);

    try {
      const res = await fetch("/api/promocodes/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ошибка применения");
      }

      setResult({ valid: true, ...data });
      toast.success(data.message || `Получено +${data.bonus_value} ⭐`);
      setCode("");
      onApply?.(data);
    } catch (error: any) {
      toast.error(error.message || "Ошибка применения промокода");
    } finally {
      setIsApplying(false);
    }
  }, [code, onApply]);

  const clearResult = () => {
    setResult(null);
    setCode("");
    onApply?.({ valid: false });
  };

  const formatBonusValue = (type: string, value: number) => {
    switch (type) {
      case "bonus_stars":
        return `+${value} ⭐`;
      case "percent_discount":
        return `-${value}%`;
      case "fixed_discount":
        return `-${value} ₽`;
      case "multiplier":
        return `x${value}`;
      default:
        return value;
    }
  };

  // Collapsed state - just a button
  if (!isExpanded && !result?.valid) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          "flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors",
          className
        )}
      >
        <Tag className="w-4 h-4" />
        Есть промокод?
      </button>
    );
  }

  // Applied state
  if (result?.valid) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30",
          className
        )}
      >
        <Check className="w-5 h-5 text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-emerald-400">{code}</span>
            <span className="text-sm text-emerald-300">
              {result.bonus_type && result.bonus_value
                ? formatBonusValue(result.bonus_type, result.bonus_value)
                : ""}
            </span>
          </div>
          {result.description && (
            <p className="text-xs text-emerald-300/70 truncate">{result.description}</p>
          )}
        </div>
        <button
          onClick={clearResult}
          className="p-1 text-emerald-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Input state
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && validateCode()}
            placeholder="Введите промокод"
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50 font-mono uppercase"
          />
        </div>
        <Button
          onClick={allowDirectApply ? applyDirectly : validateCode}
          disabled={isValidating || isApplying || !code.trim()}
          className="shrink-0 bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
        >
          {isValidating || isApplying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Применить"
          )}
        </Button>
        <button
          onClick={() => {
            setIsExpanded(false);
            setCode("");
            setResult(null);
          }}
          className="p-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {result && !result.valid && result.error && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          <X className="w-3 h-3" />
          {result.error}
        </p>
      )}
    </div>
  );
}

// Standalone component for redeeming bonus_stars codes (profile page)
export function PromocodeRedeemBox({ className }: { className?: string }) {
  const [code, setCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [success, setSuccess] = useState<{ stars: number } | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;

    setIsApplying(true);
    setSuccess(null);

    try {
      const res = await fetch("/api/promocodes/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ошибка применения");
      }

      setSuccess({ stars: data.bonus_value });
      toast.success(data.message || `Получено +${data.bonus_value} ⭐`);
      setCode("");

      // Refresh page to update credits
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || "Ошибка применения промокода");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      className={cn(
        "p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-5 h-5 text-[var(--gold)]" />
        <h3 className="font-semibold text-[var(--text)]">Активировать промокод</h3>
      </div>

      {success ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="text-emerald-300">+{success.stars} ⭐ начислено!</span>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
            placeholder="WELCOME50"
            className="flex-1 px-4 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50 font-mono uppercase"
          />
          <Button
            onClick={handleApply}
            disabled={isApplying || !code.trim()}
            className="shrink-0 bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
          >
            {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Активировать"}
          </Button>
        </div>
      )}
    </div>
  );
}
