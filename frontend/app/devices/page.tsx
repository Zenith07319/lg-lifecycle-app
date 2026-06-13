"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Trash2, Snowflake } from "lucide-react";
import Image from "next/image";
import { AppHeader } from "@/components/ui";
import { getDevices, removeDevice, type SavedDevice } from "@/lib/myDevice";

/* 03 내 가전 — Figma 3-3/3-4 충실 재구축:
   제목 + 부제(N대 등록) / 등급별 틸 그라데이션 대형 카드(우측 일러스트 패널) / 빈 상태 변형 */

// Figma 3-3 카드색을 등급에 매핑(연두→틸, 경고색 미추가 — 시안 충실).
// A(최상)=연두 → E(최하)=진한틸. 모두 검정 텍스트가 읽히는 명도 유지.
const GRADE_CARD_BG: Record<string, string> = {
  A: "rgba(145, 222, 107, 0.51)", // 연두 (Figma 카드1)
  B: "#C7ECE6",                   // 아주 밝은 틸
  C: "#B7EAE4",                   // 밝은 틸 (Figma 카드2)
  D: "#94D6D2",                   // 중간 틸
  E: "#79C7CD",                   // 진한 틸 (Figma 카드3)
};

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
        subtitle={ready && list.length > 0 ? `${list.length}대 등록` : undefined}
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
          /* ── 목록 (Figma 3-3: 등급별 틸 카드 스택) ── */
          <div className="space-y-1.5">
            {list.map((dev) => {
              const bg = GRADE_CARD_BG[dev.grade] ?? GRADE_CARD_BG.C;
              return (
                <div key={dev.sessionId} className="reveal relative">
                  {/* 카드 전체가 결과로 진입 */}
                  <Link
                    href={`/result/${dev.sessionId}`}
                    className="relative block h-[188px] overflow-hidden rounded-[22px] shadow-[0_10px_24px_-10px_rgba(0,0,0,.16)_inset] active:scale-[.995] transition"
                    style={{ background: bg }}
                  >
                    {/* 우측 흰 반투명 일러스트 패널 */}
                    <div className="absolute right-0 top-0 h-full w-[110px] rounded-[22px] bg-white/75">
                      <Image
                        src="/ac-illustration.png"
                        alt=""
                        width={120}
                        height={120}
                        className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-90"
                      />
                    </div>

                    {/* 모델명 + 메타 */}
                    <div className="absolute left-4 top-4 right-[120px]">
                      <p className="truncate text-[15px] font-bold text-ink">
                        {dev.product_type} ({dev.purchase_year})
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-ink/70">
                        {dev.capacity_kw}kW · 건강점수 {dev.score.toFixed(0)} · 진단 {ago(dev.savedAt)}
                      </p>
                    </div>

                    {/* 우하단 결과보기 */}
                    <span className="absolute bottom-4 right-[122px] flex items-center gap-0.5 text-[12px] font-semibold text-ink/80">
                      결과보기 <ChevronRight size={14} />
                    </span>
                  </Link>

                  {/* 삭제(은은하게) — 카드 좌하단 */}
                  <button
                    onClick={() => { if (confirm("이 가전 등록을 삭제할까요?")) removeDevice(dev.sessionId); }}
                    className="absolute bottom-3 left-3 z-10 rounded-full p-2 text-ink/35 hover:text-ink/60 active:scale-95 transition"
                    aria-label="가전 등록 삭제"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              );
            })}

            <Link
              href="/diagnose"
              className="!mt-3 flex h-[44px] items-center justify-center gap-1.5 rounded-full border border-accent text-[12px] font-bold text-accent shadow-[0_4px_4px_rgba(0,0,0,.10)] active:scale-[.99] transition"
            >
              <Plus size={16} /> 다른 에어컨 진단하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
