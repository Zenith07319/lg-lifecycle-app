"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Snowflake, Repeat, Loader2 } from "lucide-react";
import { getSession } from "@/lib/api";
import type { SessionData } from "@/lib/types";
import { fmt } from "@/lib/utils";

type P = { n: string; kwh: number; price: number; tag: string };
const PRODUCTS: Record<string, P[]> = {
  "2.5": [
    { n: "LG 휘센 벽걸이 오브제 1등급", kwh: 640, price: 850000, tag: "최고효율" },
    { n: "LG 듀얼인버터 벽걸이 1등급", kwh: 660, price: 720000, tag: "가성비" },
  ],
  "3.6": [
    { n: "LG 휘센 타워 오브제 1등급", kwh: 940, price: 1300000, tag: "최고효율" },
    { n: "LG 휘센 타워 1등급", kwh: 960, price: 1150000, tag: "가성비" },
  ],
  "5.0": [
    { n: "LG 휘센 타워 오브제 1등급", kwh: 1160, price: 1700000, tag: "최고효율" },
    { n: "LG 휘센 타워 1등급", kwh: 1200, price: 1500000, tag: "가성비" },
  ],
};
const SUBS: Record<string, { n: string; monthly: number }> = {
  "2.5": { n: "LG 구독 휘센 벽걸이 1등급", monthly: 39000 },
  "3.6": { n: "LG 구독 휘센 타워 1등급", monthly: 49000 },
  "5.0": { n: "LG 구독 휘센 타워 1등급", monthly: 59000 },
};
const lgUrl = (cap: string) => `https://www.lge.co.kr/aircons?capacity=${cap}&grade=1&utm_source=ROR&utm_medium=recommend`;
const LG_SUB = "https://www.lge.co.kr/subscription?utm_source=ROR&utm_medium=recommend";

export default function ProductsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<SessionData | null>(null);
  const [tab, setTab] = useState<"buy" | "sub">("buy");
  useEffect(() => { if (sessionId) getSession(sessionId).then(setData).catch(() => {}); }, [sessionId]);

  const capRaw = (data?.user_inputs.capacity_kw as number) ?? 3.6;
  const cap = ["2.5", "3.6", "5.0"].reduce((b, c) => (Math.abs(+c - capRaw) < Math.abs(+b - capRaw) ? c : b));
  const months = (data?.user_inputs.usage_months as number) ?? 4;
  const oldC = (data?.delta_old.ac_delta_cost as number) ?? 0;
  const newC = (data?.delta_new.ac_delta_cost as number) ?? 0;
  const save5 = Math.max(0, (oldC - newC) * months * 5);
  const sub = SUBS[cap];

  return (
    <div>
      <div className="sticky top-0 z-20 bg-paper/85 backdrop-blur-md border-b border-line px-4 py-3 flex items-center gap-2">
        <Link href={`/result/${sessionId}`} className="text-crimson"><ChevronLeft size={22} /></Link>
        <h1 className="text-[16px] font-extrabold text-ink">추천 제품</h1>
        <span className="ml-auto text-[11px] text-muted">LG 연계</span>
      </div>

      <div className="px-4 py-4">
        <div className="flex gap-2 mb-3">
          {([["buy", "🛒 신제품 구매"], ["sub", "🔁 구독"]] as const).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 rounded-xl border py-2.5 text-[13px] font-bold ${tab === t ? "border-crimson bg-[#fdeef4] text-crimson" : "border-line text-muted"}`}>{l}</button>
          ))}
        </div>

        <div className="rounded-xl bg-[#faf5f2] border border-line px-4 py-3 mb-3 text-[12px] text-ink-soft">
          💡 내 에어컨(<b>{cap}kW</b>)에 맞는 1등급 제품 · 교체 시 여름철 5년 전기료 절감 약{" "}
          <b className="text-crimson">{fmt(save5)}</b>
        </div>

        {tab === "buy" ? (
          <div className="space-y-3">
            {PRODUCTS[cap].map((p) => (
              <div key={p.n} className="rounded-[20px] bg-surface border border-line p-4 shadow-[var(--shadow-card)]">
                <div className="h-20 rounded-xl bg-gradient-to-br from-[#eef1f6] to-[#e1e7f0] flex items-center justify-center mb-3">
                  <Snowflake size={32} className="text-crimson/70" />
                </div>
                <div className="flex items-start gap-2">
                  <h3 className="flex-1 text-[14px] font-extrabold text-ink">{p.n}</h3>
                  <span className="text-[10px] font-extrabold text-crimson bg-[#fdeef4] rounded-full px-2 py-0.5">{p.tag}</span>
                </div>
                <p className="text-[12px] text-muted mt-0.5">{cap}kW · 1등급 · 연 {p.kwh}kWh</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-muted">예상 구매가</span>
                  <span className="text-[15px] font-extrabold text-ink" style={{ fontFamily: "var(--font-display)" }}>{fmt(p.price)}</span>
                </div>
                <div className="rounded-lg bg-[#eef8f0] text-[#1a7f3c] text-[11.5px] font-bold px-3 py-2 mt-2">💰 5년 전기료 절감 약 {fmt(save5)} · 용량 적합 + 1등급</div>
                <a href={lgUrl(cap)} target="_blank" rel="noopener"
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-crimson text-crimson font-extrabold py-2.5 text-[13px]">
                  LG에서 보기 <ExternalLink size={15} />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[20px] bg-surface border border-line p-4 shadow-[var(--shadow-card)]">
            <div className="h-20 rounded-xl bg-gradient-to-br from-[#fdeef4] to-[#f7d4e2] flex items-center justify-center mb-3">
              <Repeat size={30} className="text-crimson" />
            </div>
            <div className="flex items-start gap-2">
              <h3 className="flex-1 text-[14px] font-extrabold text-ink">{sub.n}</h3>
              <span className="text-[10px] font-extrabold text-crimson bg-[#fdeef4] rounded-full px-2 py-0.5">관리포함</span>
            </div>
            <p className="text-[12px] text-muted mt-0.5">{cap}kW · 1등급 · 5년 약정 · 설치+연1회 세척·관리 포함</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-muted">월 구독료</span>
              <span className="text-[15px] font-extrabold text-ink" style={{ fontFamily: "var(--font-display)" }}>{fmt(sub.monthly)}/월</span>
            </div>
            <div className="rounded-lg bg-[#eef8f0] text-[#1a7f3c] text-[11.5px] font-bold px-3 py-2 mt-2">💰 초기비용 0원 · 신형 효율로 전기료 ↓ · 청소·관리 부담 ↓</div>
            <a href={LG_SUB} target="_blank" rel="noopener"
              className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-crimson text-crimson font-extrabold py-2.5 text-[13px]">
              LG 구독 상담 <ExternalLink size={15} />
            </a>
          </div>
        )}

        <p className="text-[11px] text-muted mt-3 leading-relaxed">
          ※ 표시 가격·구독료는 참고용 추정이며, 실제 가격·재고·프로모션은 LG.com에서 확인하세요. 추천은 가중치 기반 비교 결과입니다.
        </p>
        {!data && <p className="text-center text-muted text-[12px] mt-3"><Loader2 className="inline animate-spin mr-1" size={13} />진단 정보 불러오는 중…</p>}
      </div>
    </div>
  );
}
