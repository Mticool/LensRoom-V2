"use client";

import { memo, useEffect, useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";
import type { PhotoModel, ParamKey, Variant } from "@/config/photoVariantRegistry";

type PhotoMode = "t2i" | "i2i";
type PlanGate = "free" | "pro" | "agency";

const PARAM_LABELS: Record<ParamKey, string> = {
  version: "Версия",
  mode: "Вариант",
  resolution: "Разрешение",
  quality: "Качество",
  format: "Формат",
};

function variantMatchesSelection(
  v: Variant,
  selection: Partial<Record<ParamKey, string>>,
  ignoreKey?: ParamKey
): boolean {
  for (const [k, val] of Object.entries(selection)) {
    if (!val) continue;
    if (ignoreKey && k === ignoreKey) continue;
    const key = k as ParamKey;
    if (v.params[key] && v.params[key] !== val) return false;
    // If variant doesn't specify param, treat as wildcard
  }
  return true;
}

function isExactMatch(v: Variant, selection: Partial<Record<ParamKey, string>>): boolean {
  const entries = Object.entries(selection).filter(([, val]) => !!val) as Array<[string, string]>;
  if (!entries.length) return true;
  for (const [k, val] of entries) {
    const key = k as ParamKey;
    if (!v.params[key]) return false;
    if (v.params[key] !== val) return false;
  }
  return true;
}

function matchScore(v: Variant, selection: Partial<Record<ParamKey, string>>): number {
  let score = 0;
  for (const [k, val] of Object.entries(selection)) {
    if (!val) continue;
    const key = k as ParamKey;
    const pv = v.params[key];
    if (!pv) continue; // wildcard => compatible but no score
    if (pv !== val) return -1; // conflict => impossible
    score += 1;
  }
  return score;
}

function resolveVariant(model: PhotoModel, selection: Partial<Record<ParamKey, string>>): Variant | null {
  const enabled = model.variants.filter((v) => v.enabled);
  if (!enabled.length) return null;

  // 1) exact match on all selected params
  const exact = enabled.filter((v) => isExactMatch(v, selection));
  if (exact.length) return exact.slice().sort((a, b) => a.stars - b.stars)[0];

  // 2) fallback: max matches among enabled (no conflicts). Tie-breaker: cheaper.
  const scored = enabled
    .map((v) => ({ v, score: matchScore(v, selection) }))
    .filter((x) => x.score >= 0);
  if (!scored.length) return null;

  scored.sort((a, b) => (b.score - a.score) || (a.v.stars - b.v.stars));
  return scored[0]!.v;
}

function planRank(p: PlanGate): number {
  if (p === "agency") return 30;
  if (p === "pro") return 20;
  return 10;
}

function isAllowedByPlan(v: Variant, currentPlan: PlanGate): boolean {
  const gate = (v.planGate || "free") as PlanGate;
  return planRank(currentPlan) >= planRank(gate);
}

function resolveVariantForPlan(
  model: PhotoModel,
  selection: Partial<Record<ParamKey, string>>,
  currentPlan: PlanGate
): Variant | null {
  const allowedEnabled = model.variants.filter((v) => v.enabled && isAllowedByPlan(v, currentPlan));
  if (!allowedEnabled.length) return null;

  const entries = Object.entries(selection).filter(([, val]) => !!val) as Array<[string, string]>;
  const exact = allowedEnabled.filter((v) => {
    if (!entries.length) return true;
    for (const [k, val] of entries) {
      const key = k as ParamKey;
      if (!v.params[key]) return false;
      if (v.params[key] !== val) return false;
    }
    return true;
  });
  if (exact.length) return exact.slice().sort((a, b) => a.stars - b.stars)[0];

  const scored = allowedEnabled
    .map((v) => ({ v, s: matchScore(v, selection) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => (b.s - a.s) || (a.v.stars - b.v.stars));
  if (!scored.length) return null;
  return scored[0]!.v;
}

function requiredPlanGateForOption(
  model: PhotoModel,
  selection: Partial<Record<ParamKey, string>>,
  key: ParamKey,
  value: string,
  currentPlan: PlanGate
): PlanGate | null {
  const next = { ...selection, [key]: value };
  // Option is "gated" if there exists a base-enabled compatible variant, but all compatible are blocked by plan.
  const compatible = model.variants.filter((v) => v.enabled && matchScore(v, next) >= 0);
  if (!compatible.length) return null;

  const blocked = compatible.filter((v) => !isAllowedByPlan(v, currentPlan) && (v.planGate || "free") !== "free");
  if (!blocked.length) return null;

  // Return the minimal plan required to unlock at least one compatible variant.
  blocked.sort((a, b) => planRank((a.planGate || "free") as PlanGate) - planRank((b.planGate || "free") as PlanGate));
  return (blocked[0]!.planGate || "pro") as PlanGate;
}

function isOptionEnabled(
  model: PhotoModel,
  selection: Partial<Record<ParamKey, string>>,
  key: ParamKey,
  value: string
  ,
  currentPlan: PlanGate
): boolean {
  const next = { ...selection, [key]: value };
  // enabled if there exists at least one enabled, non-conflicting variant under this selection
  return model.variants.some((v) => v.enabled && isAllowedByPlan(v, currentPlan) && matchScore(v, next) >= 0);
}

export interface PhotoSettingsPanelProps {
  model: PhotoModel;
  selection: Partial<Record<ParamKey, string>>;
  onSelectionChange: (next: Partial<Record<ParamKey, string>>) => void;

  mode: PhotoMode;
  onModeChange: (m: PhotoMode) => void;

  aspect: string;
  onAspectChange: (a: string) => void;
  aspectOptions: string[];

  outputFormat: "png" | "jpg";
  onOutputFormatChange: (f: "png" | "jpg") => void;

  referenceImage: File | null;
  onReferenceImageChange: (f: File | null) => void;

  currentPlan?: PlanGate;
}

export const PhotoSettingsPanel = memo(function PhotoSettingsPanel({
  model,
  selection,
  onSelectionChange,
  mode,
  onModeChange,
  aspect,
  onAspectChange,
  aspectOptions,
  outputFormat,
  onOutputFormatChange,
  referenceImage,
  onReferenceImageChange,
  currentPlan = "free",
}: PhotoSettingsPanelProps) {
  const refId = useId();

  const effective = useMemo(() => resolveVariantForPlan(model, selection, currentPlan), [model, selection, currentPlan]);
  const schemaHasFormat = useMemo(() => model.paramSchema.some((s) => s.key === "format"), [model.paramSchema]);
  const referencePreviewUrl = useMemo(() => {
    if (!referenceImage) return null;
    return URL.createObjectURL(referenceImage);
  }, [referenceImage]);

  useEffect(() => {
    return () => {
      if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
    };
  }, [referencePreviewUrl]);

  const applySelection = (key: ParamKey, value: string) => {
    const next = { ...selection, [key]: value };
    // If this creates an impossible selection, snap other params to a valid variant
    const v = resolveVariantForPlan(model, next, currentPlan);
    if (!v) return;
    // Snap selection to that variant's params for keys present in schema
    const snapped: Partial<Record<ParamKey, string>> = { ...next };
    for (const s of model.paramSchema) {
      const pv = v.params[s.key];
      if (pv) snapped[s.key] = pv;
    }
    onSelectionChange(snapped);
  };

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <div className="text-sm font-semibold">{model.title}</div>
        {model.description && (
          <div className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
            {model.description}
          </div>
        )}
        <div className="text-xs text-[var(--muted)] mt-2 pt-2 border-t border-[var(--border)]">
          {effective ? `Выбрано: ⭐${effective.stars}` : "Недоступно"}
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Режим</div>
          <div className="flex flex-wrap gap-2">
            {(["t2i", "i2i"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={cn(
                  "h-9 px-3 rounded-2xl border text-sm font-medium transition-all",
                  "motion-reduce:transition-none",
                  m === mode
                    ? "bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)] shadow-lg shadow-[var(--gold)]/10 ring-1 ring-[var(--gold)]/30"
                    : "bg-transparent text-[var(--text)] border-white/10 hover:border-white/20 hover:bg-[var(--surface2)]"
                )}
              >
                {m === "t2i" ? "Текст → Фото" : "Фото → Фото"}
              </button>
            ))}
          </div>
        </div>

        {model.paramSchema.map((s) => (
          <div key={s.key}>
            <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">{PARAM_LABELS[s.key] || s.label}</div>
            {s.ui === "select" ? (
              <select
                value={selection[s.key] || ""}
                onChange={(e) => applySelection(s.key, e.target.value)}
                className={cn(
                  "w-full h-10 rounded-2xl border bg-[var(--surface2)] px-3 text-sm text-[var(--text)]",
                  "border-white/10 focus:outline-none focus:ring-2 focus:ring-white/10",
                  !effective && "opacity-60 cursor-not-allowed"
                )}
                disabled={!model.variants.some((v) => v.enabled && isAllowedByPlan(v, currentPlan))}
              >
                {s.options.map((opt) => {
                  const enabled = isOptionEnabled(model, selection, s.key, opt.value, currentPlan);
                  const gate = !enabled ? requiredPlanGateForOption(model, selection, s.key, opt.value, currentPlan) : null;
                  return (
                    <option key={opt.value} value={opt.value} disabled={!enabled}>
                      {opt.label}
                      {gate ? ` • ${gate.toUpperCase()}` : ""}
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {s.options.map((opt) => {
                  const enabled = isOptionEnabled(model, selection, s.key, opt.value, currentPlan);
                  const active = selection[s.key] === opt.value;
                  const gate = !enabled ? requiredPlanGateForOption(model, selection, s.key, opt.value, currentPlan) : null;
                  const gateTitle =
                    gate === "agency"
                      ? "Доступно на тарифе Agency"
                      : gate === "pro"
                        ? "Доступно на тарифе Pro"
                        : null;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => enabled && applySelection(s.key, opt.value)}
                      disabled={!enabled}
                      title={!enabled && gateTitle ? gateTitle : undefined}
                      className={cn(
                        "h-9 px-3 rounded-2xl border text-sm font-medium transition-all",
                        "motion-reduce:transition-none",
                        active
                          ? "bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)] shadow-lg shadow-[var(--gold)]/10 ring-1 ring-[var(--gold)]/30"
                          : "bg-transparent border-white/10 text-[var(--text)] hover:border-white/20 hover:bg-[var(--surface2)]",
                        !enabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:border-white/10"
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>{opt.label}</span>
                        {gate && (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border",
                              gate === "agency"
                                ? "border-purple-400/30 bg-purple-500/15 text-purple-200"
                                : "border-[var(--gold)]/30 bg-[var(--gold)]/15 text-[var(--gold)]"
                            )}
                            title={gateTitle || undefined}
                          >
                            {gate.toUpperCase()}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        <div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Формат файла</div>
          <div className="flex gap-2 flex-wrap">
            {(["png", "jpg"] as const).map((f) => (
              <button
                key={f}
                onClick={() => onOutputFormatChange(f)}
                className={cn(
                  "h-9 px-3 rounded-2xl border text-sm font-medium transition-all",
                  "motion-reduce:transition-none",
                  f === outputFormat
                    ? "bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)] shadow-lg shadow-[var(--gold)]/10 ring-1 ring-[var(--gold)]/30"
                    : "bg-transparent border-white/10 text-[var(--text)] hover:border-white/20 hover:bg-[var(--surface2)]"
                )}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {!schemaHasFormat && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Соотношение</div>
            <div className="flex gap-2 flex-wrap">
              {(aspectOptions?.length ? aspectOptions : ["1:1"]).map((a) => (
                <button
                  key={a}
                  onClick={() => onAspectChange(a)}
                  className={cn(
                    "h-9 px-3 rounded-2xl border text-sm font-medium transition-all",
                    "motion-reduce:transition-none",
                    a === aspect
                      ? "bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)] shadow-lg shadow-[var(--gold)]/10 ring-1 ring-[var(--gold)]/30"
                      : "bg-transparent border-white/10 text-[var(--text)] hover:border-white/20 hover:bg-[var(--surface2)]"
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "i2i" && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Референс</div>
            <label
              htmlFor={refId}
              className={cn(
                "block rounded-[18px] border border-white/10 bg-[var(--surface2)] overflow-hidden cursor-pointer",
                "transition-colors hover:border-white/20 motion-reduce:transition-none"
              )}
            >
              <input
                id={refId}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onReferenceImageChange(e.target.files?.[0] || null)}
              />
              <div className="flex items-center gap-3 p-4">
                <div className="w-12 h-12 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center overflow-hidden">
                  {referenceImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={referencePreviewUrl || ""} alt="ref" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-5 h-5 text-white/70" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{referenceImage ? referenceImage.name : "Загрузить изображение"}</div>
                  <div className="text-xs text-[var(--muted)]">Используется для i2i</div>
                </div>
              </div>
            </label>
          </div>
        )}
      </div>
    </div>
  );
});

