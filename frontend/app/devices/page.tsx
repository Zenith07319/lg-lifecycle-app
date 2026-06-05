"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Trash2, Snowflake } from "lucide-react";
import { getDevices, removeDevice, type SavedDevice } from "@/lib/myDevice";
import { GRADE_COLORS } from "@/lib/utils";

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
    <div>
      <div className="sticky top-0 z-20 bg-paper/85 backdrop-blur-md border-b border-line px-4 py-3 flex items-center gap-2">
        <Link href="/" className="text-crimson"><ChevronLeft size={22} /></Link>
        <h1 className="text-[16px] font-extrabold text-ink">내 가전</h1>
        {ready && list.length > 0 && <span className="ml-auto text-[11px] text-muted">{list.length}대 등록</span>}
      </div>

      <div className="px-4 py-4">
        {ready && list.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 rounded-3xl bg-[#fdeef4] flex items-center justify-center mx-auto mb-4">
              <Snowflake size={30} className="text-crimson" />
            </div>
            <p className="text-[15px] font-extrabold text-ink">등록된 가전이 없어요</p>
            <p className="text-[12.5px] text-muted mt-1 leading-relaxed">진단을 완료하면 자동으로 여기에<br />등록되고 상태를 추적할 수 있어요.</p>
            <Link href="/diagnose" className="inline-flex items-center gap-1.5 mt-5 rounded-2xl text-white font-extrabold px-5 py-3 text-[14px]" style={{ background: "linear-gradient(135deg,#a50034,#82002a)" }}>
              <Plus size={17} /> 에어컨 진단하기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((dev) => {
              const color = GRADE_COLORS[dev.grade] ?? "#a50034";
              return (
                <div key={dev.sessionId} className="rounded-[20px] bg-surface border border-line p-4 shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${color}1a` }}>
                      <span className="text-[19px] font-extrabold" style={{ fontFamily: "var(--font-display)", color }}>{dev.grade}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-extrabold text-ink truncate">{dev.product_type} ({dev.purchase_year})</p>
                      <p className="text-[12px] text-muted">{dev.capacity_kw}kW · 건강점수 {dev.score.toFixed(0)} · 진단 {ago(dev.savedAt)}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#faf5f2] px-3 py-2 mt-3 text-[12px] text-ink-soft">
                    💡 1순위 추천 · <b className="text-crimson">{dev.recommendation}</b>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link href={`/result/${dev.sessionId}`} className="flex-1 flex items-center justify-center gap-1 rounded-xl text-white font-extrabold py-2.5 text-[13px]" style={{ background: "linear-gradient(135deg,#a50034,#82002a)" }}>
                      결과 보기 <ChevronRight size={15} />
                    </Link>
                    <button onClick={() => { if (confirm("이 가전 등록을 삭제할까요?")) removeDevice(dev.sessionId); }}
                      className="rounded-xl border border-line text-muted px-3.5 py-2.5">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
            <Link href="/diagnose" className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-crimson/40 text-crimson font-extrabold py-3.5 text-[14px] mt-1">
              <Plus size={17} /> 다른 에어컨 진단하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
