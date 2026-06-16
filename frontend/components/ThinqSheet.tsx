"use client";
import { useEffect, useState } from "react";
import { Loader2, X, ChevronRight, Smartphone } from "lucide-react";
import { thinqDevices, thinqPrefill } from "@/lib/api";
import type { ThinqDevice, ThinqPrefill } from "@/lib/types";

// 진단 페이지로 넘길 적용값(사용자가 확인 화면에서 수정 가능)
export type ThinqApplied = {
  capacity_kw:    number | null;
  ac_monthly_kwh: number | null;
  purchase_year:  number | null;
  filter_months:  number | null;
  alias:          string;
  model_name:     string;
  source:         "thinq" | "mock";
  online:         boolean;
};

export default function ThinqSheet({ open, onClose, onApply }: {
  open: boolean;
  onClose: () => void;
  onApply: (a: ThinqApplied) => void;
}) {
  const [step, setStep] = useState<"loading" | "list" | "confirm" | "error">("loading");
  const [devices, setDevices] = useState<ThinqDevice[]>([]);
  const [source, setSource] = useState<"thinq" | "mock">("thinq");
  const [prefill, setPrefill] = useState<ThinqPrefill | null>(null);
  const [errMsg, setErrMsg] = useState("");

  const pick = (deviceId: string) => {
    setStep("loading");
    thinqPrefill(deviceId).then((p) => { setPrefill(p); setStep("confirm"); })
      .catch((e) => { setStep("error"); setErrMsg(e instanceof Error ? e.message : "기기 정보 불러오기 실패"); });
  };

  useEffect(() => {
    if (!open) return;
    setStep("loading"); setPrefill(null); setErrMsg("");
    thinqDevices().then((r) => {
      setDevices(r.items); setSource(r.source);
      if (r.items.length === 0) { setStep("error"); setErrMsg("연결된 에어컨을 찾지 못했어요."); return; }
      if (r.items.length === 1) { pick(r.items[0].device_id); return; }   // 1대면 바로 확인
      setStep("list");
    }).catch((e) => { setStep("error"); setErrMsg(e instanceof Error ? e.message : "불러오기 실패"); });
  }, [open]);   // eslint-disable-line react-hooks/exhaustive-deps

  const apply = () => {
    if (!prefill) return;
    onApply({
      capacity_kw:    prefill.capacity_kw,
      ac_monthly_kwh: prefill.ac_monthly_kwh,
      purchase_year:  prefill.purchase_year,
      filter_months:  prefill.filter_months,
      alias:          prefill.alias,
      model_name:     prefill.model_name,
      source:         prefill.source,
      online:         prefill.online,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="ThinQ 가전 불러오기">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="reveal relative w-full max-w-md rounded-t-3xl bg-paper px-5 pb-8 pt-4 shadow-[0_-8px_30px_rgba(0,0,0,.18)]">
        <div className="relative mb-3 flex items-center">
          <div className="mx-auto h-1 w-10 rounded-full bg-line" />
          <button onClick={onClose} aria-label="닫기" className="absolute right-0 top-0 text-muted"><X size={20} /></button>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-accent-soft"><Smartphone size={17} className="text-accent" /></span>
          <p className="text-[16px] font-extrabold text-ink">ThinQ 가전 불러오기</p>
        </div>

        {step === "loading" && (
          <div className="flex flex-col items-center gap-3 py-12 text-muted">
            <Loader2 className="animate-spin text-accent" size={26} />
            <p className="text-[13px]">ThinQ에서 기기를 불러오는 중…</p>
          </div>
        )}

        {step === "error" && (
          <div className="py-8 text-center">
            <p className="text-[13px] text-ink-soft">{errMsg}</p>
            <button onClick={onClose} className="mt-4 w-full rounded-full border border-line bg-white py-3 text-[14px] font-bold text-ink-soft">직접 입력으로 진행</button>
          </div>
        )}

        {step === "list" && (
          <div className="space-y-2.5">
            <p className="text-[12px] text-muted">불러올 에어컨을 선택하세요.</p>
            {devices.map((d) => (
              <button key={d.device_id} onClick={() => pick(d.device_id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-left active:scale-[.99] transition">
                <span aria-hidden className="text-[20px]">❄️</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-ink">{d.alias}</p>
                  <p className="truncate text-[11px] text-muted">{d.model_name}</p>
                </div>
                <ChevronRight size={16} className="text-ink-300" />
              </button>
            ))}
          </div>
        )}

        {step === "confirm" && prefill && (
          <div>
            {source === "mock" && (
              <p className="mb-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold" style={{ background: "#FEF3C7", color: "#92400E" }}>
                샘플 데이터로 표시 중 (ThinQ 미연결)
              </p>
            )}
            <div className="flex items-center gap-3 rounded-2xl bg-accent-soft px-4 py-4">
              <span aria-hidden className="text-[22px]">❄️</span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-extrabold text-ink">{prefill.alias}</p>
                <p className="truncate text-[12px] text-muted">{prefill.model_name}</p>
              </div>
            </div>

            <button onClick={apply}
              className="mt-4 w-full rounded-full bg-accent py-3.5 text-[15px] font-extrabold text-white shadow-[0_8px_22px_rgba(4,125,134,.30)] active:scale-[.99] transition">
              이 기기로 진단 시작
            </button>
            <button onClick={onClose} className="mt-1.5 w-full py-2 text-[12px] font-bold text-muted">직접 입력으로 할게요</button>
          </div>
        )}
      </div>
    </div>
  );
}
