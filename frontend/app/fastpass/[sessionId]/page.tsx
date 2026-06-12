"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Printer, Share2, Loader2, Check } from "lucide-react";
import { getSession } from "@/lib/api";
import type { SessionData } from "@/lib/types";

export default function FastPassPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then(setData).catch((e) => setError(e.message));
    const d = new Date();
    setNow(`${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
  }, [sessionId]);

  const share = async () => {
    const text = data?.report.as_fast_pass_text ?? "";
    try {
      if (navigator.share) await navigator.share({ title: "ROR A/S Fast Pass", text });
      else { await navigator.clipboard.writeText(text); alert("접수 내용을 클립보드에 복사했어요."); }
    } catch { /* 사용자 취소 */ }
  };

  if (error) return <div className="text-center py-24 text-[14px] text-red-600">{error}</div>;
  if (!data) return <div className="flex flex-col items-center py-32 text-muted gap-3"><Loader2 className="animate-spin text-accent" size={28} /><p className="text-[14px]">불러오는 중…</p></div>;

  const d = data.diagnosis;
  const inp = data.user_inputs;
  const sid = (sessionId ?? "").slice(0, 8).toUpperCase();
  const syms = inp.symptoms.filter((s) => s.type !== "증상없음");

  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="flex items-center text-[12.5px] py-2 border-b border-[#E3E6E6] last:border-0">
      <span className="w-24 shrink-0 text-[#8C949E] font-semibold">{k}</span>
      <span className="flex-1 text-right text-[#1A1C21] font-bold">{v}</span>
    </div>
  );

  return (
    <div className="pb-24">
      {/* 상단바 (인쇄 제외) */}
      <div className="no-print sticky top-0 z-20 bg-paper/85 backdrop-blur-md border-b border-line px-4 py-3 flex items-center gap-2">
        <button onClick={() => router.back()} className="text-accent" aria-label="뒤로">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-[16px] font-extrabold text-ink">A/S Fast Pass</h1>
      </div>

      <div className="px-5 pt-4">
        {/* Fast Pass 번호 카드 (다크) */}
        <div className="no-print rounded-[20px] p-4 flex items-center gap-3.5" style={{ background: "#1A1C21" }}>
          <div className="size-[68px] shrink-0 rounded-[12px] bg-white p-2 flex items-center justify-center">
            <div className="grid grid-cols-6 gap-[2px]" aria-hidden>
              {Array.from({ length: 36 }).map((_, i) => (
                <span key={i} className={`size-[7px] rounded-[1px] ${(i * 7 + 3) % 3 ? "bg-black" : "bg-white"}`} />
              ))}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-wider text-white/55" style={{ fontFamily: "var(--font-display)" }}>FAST PASS No.</p>
            <p className="text-[17px] font-extrabold text-white leading-tight" style={{ fontFamily: "var(--font-display)" }}>{sid}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-[9px] bg-white/12 px-2.5 py-1">
              <Check size={11} className="text-green-400" strokeWidth={3} />
              <span className="text-[10px] font-bold text-white">센터 제시 시 접수 대기 단축</span>
            </span>
          </div>
        </div>

        <p className="mt-5 mb-2 px-0.5 text-[13px] font-bold text-muted">공유 문서 미리보기</p>

        {/* 문서 본체 (인쇄 대상) */}
        <div className="printable rounded-[16px] bg-white border border-line-200 shadow-[0_5px_18px_rgba(0,0,0,0.07)] overflow-hidden">
          {/* 브랜드 헤더 */}
          <div className="px-4 py-4 text-white" style={{ background: "linear-gradient(135deg,#047d86,#034349)" }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[9px] font-bold tracking-[0.72px] text-white/85" style={{ fontFamily: "var(--font-display)" }}>ROR × LG ThinQ</p>
                <p className="mt-0.5 text-[16px] font-extrabold">가전 상태 리포트</p>
              </div>
              <span className="shrink-0 text-[10.5px] font-semibold text-white/85 mt-1">접수번호 {sid}</span>
            </div>
            <p className="mt-1 text-[11px] text-white/85">방문 전 증상·진단 요약을 미리 전달해 상담을 빠르게</p>
          </div>

          <div className="px-4 py-4 space-y-4">
            {/* ① 제품 정보 */}
            <section>
              <h2 className="text-[12px] font-extrabold text-accent mb-1.5">① 제품 정보</h2>
              <Row k="제품" v={`${inp.product_type}`} />
              <Row k="구매연도" v={`${inp.purchase_year}년 (사용 ${d.age_years as number}년차)`} />
              <Row k="냉방용량" v={`${inp.capacity_kw} kW`} />
              <Row k="사용환경" v={`하루 ${inp.daily_usage_hours}시간 · 연 ${inp.usage_months}개월 · ${inp.contract_type}`} />
            </section>

            {/* ② 진단 요약 */}
            <section>
              <h2 className="text-[12px] font-extrabold text-accent mb-1.5">② 진단 요약</h2>
              <Row k="건강등급" v={`${d.health_grade as string}등급 · 건강점수 ${(d.health_score as number).toFixed(0)}점`} />
              <Row k="점검 필요도" v={`${(d.inspection_score_100 as number).toFixed(0)} / 100`} />
              <Row k="관리상태" v={`필터 미청소 ${inp.filter_clean_months}개월 · 최근 수리 ${inp.repair_history_count}회`} />
              <Row k="추천 방향" v={data.report.recommendation_1st} />
            </section>

            {/* ③ 신고 증상 (심각도 바) */}
            <section>
              <h2 className="text-[12px] font-extrabold text-accent mb-1.5">③ 신고 증상 (심각도 1~5)</h2>
              {syms.length ? (
                <div className="space-y-1.5">
                  {syms.map((s) => (
                    <div key={s.type} className="flex items-center gap-2">
                      <span className="text-[12.5px] font-semibold text-[#1A1C21] w-20">{s.type}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} className={`w-3.5 h-3.5 rounded-[4px] ${n <= s.severity ? "bg-accent" : "bg-[#E3E6E6]"}`} />
                        ))}
                      </div>
                      <span className="text-[11px] text-muted ml-auto">{s.severity}점</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-[12px] text-muted">특이 증상 없음 (정기 점검 목적)</p>}
            </section>

            {/* ④ 방문 시 확인 요청 */}
            <section>
              <h2 className="text-[12px] font-extrabold text-accent mb-1.5">④ 방문 시 확인 요청</h2>
              {["증상 재현 및 원인 점검", "부품 보유/수리 가능 여부 안내", "수리비 견적 사전 안내"].map((t) => (
                <div key={t} className="flex items-center gap-2 text-[12.5px] text-[#1A1C21] py-0.5">
                  <Check size={13} className="text-accent" strokeWidth={3} />{t}
                </div>
              ))}
            </section>

            {/* 푸터 면책 */}
            <p className="text-[10.5px] text-muted leading-relaxed border-t border-[#E3E6E6] pt-3">
              ※ 본 접수증은 ROR 진단 결과 기반 <b>참고용 추정</b>이며 정확한 고장 진단이 아닙니다.
              실제 점검·수리는 LG전자 고객지원(1544-7777)에서 진행됩니다. · 생성 {now} · 접수번호 {sid}
            </p>
          </div>
        </div>

        {/* 공유 / 센터 전송 (인쇄 제외) */}
        <div className="no-print grid grid-cols-2 gap-2.5 mt-4">
          <button onClick={share} className="flex items-center justify-center gap-1.5 rounded-full bg-white border border-line-200 text-ink-soft font-bold py-3 text-[13px]">
            <Share2 size={15} /> 공유하기
          </button>
          <button onClick={share} className="flex items-center justify-center gap-1.5 rounded-full bg-white border border-line-200 text-ink-soft font-bold py-3 text-[13px]">
            <Share2 size={15} /> 센터에 전송
          </button>
        </div>

        {/* PDF로 저장 (인쇄 제외, 틸 그라데이션) */}
        <button onClick={() => window.print()} className="no-print mt-3 w-full flex items-center justify-center gap-2 rounded-full text-white font-bold py-3.5 text-[14px] shadow-[0_4px_4px_rgba(0,0,0,0.10)]" style={{ background: "linear-gradient(135deg,#047d86,#034349)" }}>
          <Printer size={16} /> PDF로 저장
        </button>

        <p className="no-print text-[10.5px] text-muted text-center mt-3 leading-relaxed">
          ※ 리포트의 모든 수치는 입력 조건 기준 추정값이며, 정확한 고장 예측이 아닙니다.
        </p>
      </div>
    </div>
  );
}
