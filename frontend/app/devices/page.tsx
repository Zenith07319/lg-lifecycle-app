"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Trash2, Snowflake } from "lucide-react";
import { AppHeader } from "@/components/ui";
import { getDevices, removeDevice, type SavedDevice } from "@/lib/myDevice";
import { GRADE_COLORS } from "@/lib/utils";

/* 03 내 가전 — Figma: 큰 제목 + N대 등록 / 가전 카드 스택 / 빈 상태 변형 */
export default function DevicesPage() {
  const [list, setList] = useState<SavedDevice[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => { setList(getDevices()); setReady(true); };
    sync();
    window.addEventListener("ror:devices", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("ror:devices", sync); window.removeEventListener("storage", sync); };
  }, []);

  const ago = (ms: number) => {
    const days = Math.floor((Date.now() - ms) / 86400000);
    return days <= 0 ? "오늘" : days === 1 ? "어제" : `${days}일 전`;
  };

  return (
    <div className="pb-28">
      <AppHeader
        title="내 가전"
        right={ready && list.length > 0 ? (
          <span className="pb-1 text-[13px] font-medium text-muted">{list.length}대 등록</span>
        ) : undefined}
      />

      <div className="px-6 pt-3">
        {ready && list.length === 0 ? (
          /* ── 빈 상태 ── */
          <div className="flex flex-col items-center px-6 pt-20 text-center">
            <div className="flex size-[95px] items-center justify-center rounded-full bg-[#D5E2E3]">
              <Snowflake size={40} className="text-accent" strokeWidth={2} />
            </div>
            <p className="mt-6 text-[15px] font-extrabold text-ink">등록된 가전이 없어요</p>
            <p className="mt-2.5 text-[13px] font-semibold leading-relaxed text-muted">
              진단을 완료하면 자동으로 여기에 등록되고<br />상태를 추적할 수 있어요.
            </p>
            <Link
              href="/diagnose"
              className="mt-7 inline-flex h-[54px] w-[200px] items-center justify-center gap-1.5 rounded-full border-[1.5px] border-accent text-[15px] font-semibold text-accent active:scale-[.99] transition"
            >
              <Plus size={18} /> 에어컨 진단하기
            </Link>
          </div>
        ) : (
          /* ── 목록 ── */
          <div className="space-y-3">
            {list.map((dev) => {
              const color = GRADE_COLORS[dev.grade] ?? "#a50034";
              return (
                <div
                  key={dev.sessionId}
                  className="reveal rounded-[22px] bg-white/64 p-4 shadow-[0_2px_8px_rgba(5,31,31,.06)] backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
                      style={{ background: `${color}1a` }}
                    >
                      <span
                        className="text-[19px] font-extrabold"
                        style={{ fontFamily: "var(--font-display)", color }}
                      >
                        {dev.grade}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-extrabold text-ink">
                        {dev.product_type} ({dev.purchase_year})
                      </p>
                      <p className="mt-0.5 text-[12px] text-muted">
                        {dev.capacity_kw}kW · 건강점수 {dev.score.toFixed(0)} · 진단 {ago(dev.savedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-[12px] text-ink-soft">
                    💡 1순위 추천 · <b className="text-accent">{dev.recommendation}</b>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/result/${dev.sessionId}`}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-accent py-2.5 text-[13px] font-extrabold text-white shadow-[0_4px_14px_rgba(4,125,134,.28)] active:scale-[.99] transition"
                    >
                      결과 보기 <ChevronRight size={15} />
                    </Link>
                    <button
                      onClick={() => { if (confirm("이 가전 등록을 삭제할까요?")) removeDevice(dev.sessionId); }}
                      className="rounded-xl border border-line px-3.5 py-2.5 text-muted active:scale-[.99] transition"
                      aria-label="가전 등록 삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            <Link
              href="/diagnose"
              className="mt-1 flex h-[44px] items-center justify-center gap-1.5 rounded-full border border-accent text-[12px] font-bold text-accent shadow-[0_2px_8px_rgba(5,31,31,.06)] active:scale-[.99] transition"
            >
              <Plus size={16} /> 다른 에어컨 진단하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
