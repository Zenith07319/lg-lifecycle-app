"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/api";
import type { SessionData, OptionScore } from "@/lib/types";
import { GRADE_COLORS, OPTION_ICONS, fmt, fmtCo2 } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

const RANK_COLORS = ["#C40000","#d44000","#e07b00","#888","#aaa"];

function GradeCard({ data }: { data: SessionData }) {
  const d = data.diagnosis;
  const color = GRADE_COLORS[d.health_grade as string] ?? "#555";
  return (
    <div className="bg-white rounded-xl border p-6 text-center space-y-2">
      <div className="text-6xl font-black" style={{ color }}>{d.health_grade}</div>
      <div className="text-lg font-semibold text-gray-700">건강점수 {(d.health_score as number).toFixed(1)}점</div>
      <div className="text-sm text-gray-500">{d.grade_description as string}</div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-gray-600">
        <div className="bg-gray-50 rounded p-2">
          <div className="font-semibold">{(d.inspection_score_100 as number).toFixed(0)}점</div>
          <div>점검 필요도</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="font-semibold">{((d.energy_waste_ratio as number)*100).toFixed(1)}%</div>
          <div>에너지 낭비</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="font-semibold">{((d.inconvenience as number)*100).toFixed(0)}점</div>
          <div>생활 불편도</div>
        </div>
      </div>
    </div>
  );
}

function ElecCard({ data }: { data: SessionData }) {
  const changed = data.delta_old.tier_changed as boolean;
  return (
    <div className="bg-white rounded-xl border p-5 space-y-3">
      <h3 className="font-semibold text-gray-800">전기요금 비교 (하계 · AC 기여분)</h3>
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div>
          <div className="text-gray-500">기준 월 요금</div>
          <div className="font-bold text-lg">{fmt((data.delta_old.bill_base as number) ?? 0)}</div>
        </div>
        <div>
          <div className="text-gray-500">구형 AC 기여</div>
          <div className="font-bold text-lg text-orange-600">{fmt(data.delta_old.ac_delta_cost as number)}</div>
          <div className="text-xs text-gray-400">/월</div>
        </div>
        <div>
          <div className="text-gray-500">신형 AC 기여</div>
          <div className="font-bold text-lg text-green-700">{fmt(data.delta_new.ac_delta_cost as number)}</div>
          <div className="text-xs text-gray-400">/월</div>
        </div>
      </div>
      {changed && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700">
          ⚡ 누진구간 변화: 구형 AC 포함 시 {data.delta_old.tier_with_ac as string} → 신형 교체 시 {data.delta_new.tier_with_ac as string}
        </div>
      )}
    </div>
  );
}

function OptionCard({ opt, index }: { opt: OptionScore; index: number }) {
  const [open, setOpen] = useState(index < 2);
  const color = RANK_COLORS[Math.min(opt.rank - 1, 4)];
  const icon  = OPTION_ICONS[opt.key] ?? "";
  const rankTag = opt.rank === 1 ? "🥇 1순위 추천" : opt.rank === 2 ? "🥈 2순위" : `${opt.rank}순위`;

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-gray-800">{opt.label}</span>
          <span className="text-xs text-gray-400">최종점수 {(opt.final_score*100).toFixed(1)}점</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold" style={{ color }}>{rankTag}</span>
          <span className="text-gray-400">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t">
          <div className="grid grid-cols-3 gap-3 pt-4 text-sm text-center">
            <div><div className="text-gray-500">3년 총비용</div><div className="font-bold text-base">{fmt(opt.three_year_cost)}</div></div>
            <div><div className="text-gray-500">초기비용</div><div className="font-bold">{fmt(opt.initial_cost)}</div></div>
            <div><div className="text-gray-500">3년 탄소</div><div className="font-bold">{fmtCo2(opt.carbon_total)}</div></div>
            <div><div className="text-gray-500">점검필요도↓</div><div className="font-bold">{(opt.inspection_after*100).toFixed(0)}점</div></div>
            <div><div className="text-gray-500">에너지낭비↓</div><div className="font-bold">{(opt.energy_waste_after*100).toFixed(0)}%</div></div>
            <div><div className="text-gray-500">생활불편도↓</div><div className="font-bold">{(opt.inconvenience_after*100).toFixed(0)}점</div></div>
          </div>

          <div className="grid grid-cols-5 gap-1 text-xs text-center">
            {[["경제성",opt.economy_score],["신뢰성",opt.reliability_score],["탄소",opt.carbon_score],["편의",opt.comfort_score],["초기",opt.initial_score]].map(([l,v]) => (
              <div key={l as string} className="bg-gray-50 rounded p-2">
                <div className="font-semibold">{((v as number)*100).toFixed(0)}</div>
                <div className="text-gray-500">{l}</div>
              </div>
            ))}
          </div>

          {opt.highlights.map((h, i) => (
            <div key={i} className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">ℹ {h}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function CostChart({ options }: { options: OptionScore[] }) {
  const data = [...options].sort((a,b) => a.three_year_cost - b.three_year_cost).map((o) => ({
    name: o.label,
    cost: o.three_year_cost,
    rank: o.rank,
  }));
  return (
    <div className="bg-white rounded-xl border p-5">
      <h3 className="font-semibold text-gray-800 mb-4">3년 총비용 비교</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(v) => `${(v/10000).toFixed(0)}만`} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
          <Tooltip formatter={(v: unknown) => fmt(v as number)} />
          <Bar dataKey="cost" radius={[0,4,4,0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.rank === 1 ? "#C40000" : "#d1d5db"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReportSection({ data }: { data: SessionData }) {
  const r = data.report;
  const [showAS, setShowAS] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const gradColor = GRADE_COLORS[data.diagnosis.health_grade as string] ?? "#555";

  return (
    <div className="space-y-4">
      {/* 1순위 추천 */}
      <div className="bg-red-50 border-2 border-red-600 rounded-xl p-6">
        <div className="text-xs text-gray-500 mb-1">1순위 추천 (현재 입력 조건 기준 추정)</div>
        <div className="text-3xl font-black text-red-700">{r.recommendation_1st}</div>
        <div className="text-sm text-gray-600 mt-1">2순위 대안: <strong>{r.recommendation_2nd}</strong></div>
        <div className="text-sm text-gray-700 mt-3">{r.reason_summary}</div>
      </div>

      {/* Confidence Cards */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-2">판단 근거</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {r.confidence_cards.map((c, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{c}</div>
          ))}
        </div>
      </div>

      {/* 주의사항 */}
      {r.caution_notes.length > 0 && (
        <div className="space-y-2">
          {r.caution_notes.map((n, i) => (
            <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">{n}</div>
          ))}
        </div>
      )}

      {/* 행동 버튼 */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowAS(!showAS)}
          className="border border-gray-300 rounded-full px-4 py-2 text-sm hover:bg-gray-50">
          📋 A/S Fast Pass 초안
        </button>
        <button onClick={() => setShowShare(!showShare)}
          className="border border-gray-300 rounded-full px-4 py-2 text-sm hover:bg-gray-50">
          📤 가족 공유 요약
        </button>
      </div>
      {showAS && (
        <pre className="bg-gray-50 border rounded-lg p-4 text-xs text-gray-700 whitespace-pre-wrap">
          {r.as_fast_pass_text}
        </pre>
      )}
      {showShare && (
        <pre className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-gray-700 whitespace-pre-wrap">
          {r.family_share_summary}
        </pre>
      )}
    </div>
  );
}

export default function ResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<SessionData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [sessionId]);

  if (error) return (
    <div className="text-center py-16 space-y-4">
      <div className="text-red-600">{error}</div>
      <Link href="/diagnose" className="text-red-700 underline">다시 진단하기</Link>
    </div>
  );

  if (!data) return (
    <div className="text-center py-16 text-gray-400">분석 중...</div>
  );

  const d = data.diagnosis;
  const inputs = data.user_inputs;

  return (
    <div className="space-y-6">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">진단 결과</h1>
          <p className="text-sm text-gray-500">
            {inputs.product_type} · {inputs.purchase_year}년식 · 사용 {d.age_years as number}년 · {(["비용", "환경", "편의"] as const)[[inputs.priority_cost_score, inputs.priority_env_score, inputs.priority_convenience_score].reduce((mi, v, i, arr) => (v > arr[mi] ? i : mi), 0)]} 우선
          </p>
        </div>
        <Link href="/diagnose"
          className="border border-gray-300 text-sm rounded-full px-4 py-2 hover:bg-gray-50">
          다시 진단
        </Link>
      </div>

      {/* 건강등급 + 전기요금 */}
      <div className="grid md:grid-cols-2 gap-4">
        <GradeCard data={data} />
        <ElecCard  data={data} />
      </div>

      {/* 리포트 */}
      <ReportSection data={data} />

      {/* 비용 차트 */}
      <CostChart options={data.ranked_options} />

      {/* 선택지 상세 */}
      <div className="space-y-2">
        <h2 className="font-bold text-gray-800">선택지 상세 비교</h2>
        {data.ranked_options.map((opt, i) => (
          <OptionCard key={opt.key} opt={opt} index={i} />
        ))}
      </div>

      {/* 탄소 */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-800 mb-3">탄소 영향</h3>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div><div className="text-gray-500">구형 3년 탄소</div><div className="font-bold">{fmtCo2(data.carbon_summary.old_use_carbon_3y)}</div></div>
          <div><div className="text-gray-500">신형 3년 탄소</div><div className="font-bold">{fmtCo2(data.carbon_summary.new_use_carbon_3y)}</div></div>
          <div><div className="text-gray-500">교체 회수기간</div><div className="font-bold">{data.carbon_summary.carbon_payback_years.toFixed(1)}년</div></div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        ※ 모든 수치는 현재 입력 조건 기준 추정 결과이며, 정확한 고장 예측이 아닙니다. (KEPCO 2025.04 기준)
      </p>
    </div>
  );
}
