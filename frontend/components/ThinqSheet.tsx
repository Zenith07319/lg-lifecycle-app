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
  const [cap, setCap] = useState("");   // 편집 가능(시드 추정 → 사용자 확인·수정)
  const [kwh, setKwh] = useState("");
  const [year, setYear] = useState("");

  const pick = (deviceId: string) => {
    setStep("loading");
    thinqPrefill(deviceId).then((p) => {
      setPrefill(p);
      setCap(p.capacity_kw != null ? String(p.capacity_kw) : "");
      setKwh(p.ac_monthly_kwh != null ? String(p.ac_monthly_kwh) : "");
      setYear(p.purchase_year != null ? String(p.purchase_year) : "");
      setStep("confirm");
    }).catch((e) => { setStep("error"); setErrMsg(e instanceof Error ? e.message : "기기 정보 불러오기 실패"); });
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
      capacity_kw:    cap ? Number(cap) : null,
      ac_monthly_kwh: kwh ? Number(kwh) : null,
      purchase_year:  year ? Number(year) : null,
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
            <div className="mb-3 flex items-center gap-2 rounded-2xl bg-accent-soft px-3.5 py-2.5">
              <span aria-hidden className="text-[18px]">❄️</span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-extrabold text-ink">{prefill.alias}</p>
                <p className="truncate text-[11px] text-muted">{prefill.model_name}</p>
              </div>
            </div>

            <p className="mb-2 text-[11px] text-muted">불러온 값이에요. 다르면 바로 고칠 수 있어요 <span className="font-semibold text-accent">(추정값 포함)</span>.</p>
            <div className="space-y-2">
              <EditRow label="냉방능력 (kW)" value={cap} onChange={setCap} />
              <EditRow label="월 소비전력 (kWh)" value={kwh} onChange={setKwh} />
              <EditRow label="구매연도" value={year} onChange={setYear} />
            </div>

            <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-[11px] text-ink-soft">
              🧹 필터: {prefill.resolved.filter
                ? `사용 추정 ${prefill.filter_months}개월 (자동 반영)`
                : prefill.online ? "정보 없음 — 설문에서 직접 선택" : "기기를 켜면 자동으로 불러와요 — 지금은 설문에서 선택"}
            </p>

            <button onClick={apply}
              className="mt-4 w-full rounded-full bg-accent py-3.5 text-[15px] font-extrabold text-white shadow-[0_8px_22px_rgba(4,125,134,.30)] active:scale-[.99] transition">
              이 정보로 진단 시작
            </button>
            <button onClick={onClose} className="mt-1.5 w-full py-2 text-[12px] font-bold text-muted">직접 입력으로 할게요</button>
          </div>
        )}
      </div>
    </div>
  );
}

function EditRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-line bg-white px-3.5 py-2">
      <label className="flex-1 text-[12.5px] font-semibold text-ink-soft">
        {label}<span className="ml-1 rounded bg-accent-soft px-1 text-[9px] font-bold text-accent">추정</span>
      </label>
      <input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-24 rounded-lg border border-line bg-white px-2.5 py-1.5 text-right text-[14px] font-bold text-ink outline-none focus:border-accent" />
    </div>
  );
}
