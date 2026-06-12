"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSession } from "@/lib/api";
import { GRADE_COLORS } from "@/lib/utils";
import type { SessionData } from "@/lib/types";

/* ── Figma 04-2 진단결과 상세 — 1:1 충실 이식 (절대좌표 390×844, 틸/유리/Pretendard) ── */
const PR = "Pretendard, sans-serif";
const URGENT: Record<string, string> = {
  A: "계속 사용 적합", B: "셀프케어 권장", C: "점검 권장", D: "교체 검토 권장", E: "즉시 점검 권장",
};
const won = (n: number) => "₩" + Math.round(n).toLocaleString("ko-KR");

export default function ResultV2() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [d, setD] = useState<SessionData | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then(setD).catch((e) => setErr(e.message));
  }, [sessionId]);

  if (err) return <div style={{ padding: 40, fontFamily: PR }}>{err}</div>;
  if (!d) return <div style={{ padding: 40, fontFamily: PR, color: "#8C949E" }}>분석 중…</div>;

  const dg = d.diagnosis;
  const inp = d.user_inputs;
  const grade = dg.health_grade as string;
  const score = Math.round(dg.health_score as number);
  const gColor = GRADE_COLORS[grade] ?? "#C23630";
  const age = dg.age_years as number;
  const oldC = d.delta_old.ac_delta_cost as number;
  const newC = d.delta_new.ac_delta_cost as number;
  const months = (inp.usage_months as number) || 4;
  const save5 = Math.max(0, (oldC - newC) * months * 5);
  const byInput = ((inp.ac_monthly_kwh_input as number) || 0) > 0;
  const changed = d.delta_old.tier_changed as boolean;
  const tierOld = String(d.delta_old.tier_with_ac ?? "");
  const tierNew = String(d.delta_new.tier_with_ac ?? "");
  const insp = Math.round(dg.inspection_score_100 as number);
  const waste = Math.round((dg.energy_waste_ratio as number) * 100);

  const A = (s: React.CSSProperties): React.CSSProperties => ({ position: "absolute", fontFamily: PR, ...s });

  return (
    <div style={{ display: "flex", justifyContent: "center", background: "#d9cfc8", minHeight: "100dvh" }}>
      <div style={{ width: 390, height: 844, position: "relative", background: "#ECEDED", overflow: "hidden" }}>
        {/* 헤더 */}
        <div style={A({ left: 23, top: 44, color: "#1A1C21", fontSize: 26, fontWeight: 700 })}>진단 결과</div>
        <div style={A({ left: 24, top: 81, color: "#8C949E", fontSize: 12, fontWeight: 400 })}>
          {inp.product_type} · 설치 {age}년차 · 비용 우선
        </div>
        <div style={A({ left: 220, top: 58, width: 150, textAlign: "right", color: "#8C949E", fontSize: 11, fontWeight: 700 })}>📢 점수 계산이 궁금하다면 ?</div>

        {/* 건강점수 / 에너지등급 링 */}
        <div style={A({ left: 26, top: 139, color: "#8C949E", fontSize: 11, fontWeight: 700 })}>건강 점수</div>
        <div style={A({ left: 22, top: 150, color: "#1A1C21", fontSize: 72, fontWeight: 700, lineHeight: "72px" })}>{score}</div>
        <div style={A({ left: 26, top: 234, color: "#8C949E", fontSize: 13, fontWeight: 600 })}>{inp.product_type} · 설치 {age}년차</div>
        <div style={A({ left: 27, top: 255, color: gColor, fontSize: 12, fontWeight: 600 })}>{URGENT[grade] ?? (dg.grade_description as string)}</div>
        <div style={A({ width: 108, height: 108, left: 258, top: 124, background: gColor, borderRadius: 9999 })} />
        <div style={A({ width: 108, left: 258, top: 151, textAlign: "center", color: "#fff", fontSize: 45, fontWeight: 700 })}>{grade}</div>
        <div style={A({ left: 258, top: 240, width: 108, textAlign: "center", color: "#8C949E", fontSize: 11, fontWeight: 700 })}>건강 등급</div>

        {/* 일러스트 + 아바타 */}
        <img src="/ac-illustration.png" alt="" style={A({ width: 163, height: 163, left: 115, top: 239, objectFit: "contain" })} />
        <img src="/avatar.png" alt="" style={A({ width: 48, height: 48, left: 33, top: 379, borderRadius: 9999, objectFit: "cover" })} />
        <div style={A({ left: 97, top: 392, width: 250, fontSize: 15, fontWeight: 800, color: "#000", lineHeight: "20px" })}>
          매달 <span style={{ color: "#C23630" }}>전기요금</span>을 더 내고 있어요
        </div>

        {/* 전기요금 유리카드 */}
        <div style={A({ width: 343, height: 116, left: 23, top: 441, background: "rgba(255,255,255,0.32)", boxShadow: "0px 16px 40px rgba(179,201,166,0.12)", overflow: "hidden", borderRadius: 16, border: "1px solid rgba(255,255,255,0.35)", backdropFilter: "blur(15px)" })}>
          <div style={A({ left: 14, top: 14, color: "#000", fontSize: 11, fontWeight: 700 })}>전기요금 <span style={{ fontWeight: 400 }}>(에어컨 기여 · 월)</span></div>
          <div style={A({ left: 14, top: 38, color: "#047D86", fontSize: 18, fontWeight: 700 })}>{won(oldC)}</div>
          <div style={A({ left: 14, top: 63, color: "rgba(0,0,0,0.25)", fontSize: 13, fontWeight: 700 })}>내 에어컨</div>
          <div style={A({ width: 168, height: 116, left: 175, top: 0, background: "rgba(255,255,255,0.50)", boxShadow: "0px 4px 4px rgba(0,0,0,0.10)", overflow: "hidden", borderRadius: 16 })}>
            <div style={A({ left: 14, top: 38, color: "#047D86", fontSize: 18, fontWeight: 700 })}>{won(newC)}</div>
            <div style={A({ left: 14, top: 63, color: "rgba(0,0,0,0.25)", fontSize: 13, fontWeight: 700 })}>1등급 신형</div>
            {byInput && (
              <div style={A({ left: 100, top: 10, display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 6px", background: "#EEF8F7", borderRadius: 999 })}>
                <span style={{ width: 3, height: 3, background: "#047D86", borderRadius: 9 }} />
                <span style={{ color: "#047D86", fontSize: 6.5, fontWeight: 700 }}>입력값 기준</span>
              </div>
            )}
          </div>
        </div>

        {/* 5년 절감 */}
        <div style={A({ width: 339, height: 37, left: 28, top: 567, background: "rgba(255,255,255,0.50)", boxShadow: "0px 4px 4px rgba(0,0,0,0.10)", overflow: "hidden", borderRadius: 16 })}>
          <div style={A({ left: 13, top: 13, color: "#000", fontSize: 11, fontWeight: 600 })}>5년 절감 금액 (교체 시)</div>
          <div style={A({ right: 14, top: 9, color: "#000", fontSize: 15, fontWeight: 700 })}>{won(save5)}</div>
        </div>

        {/* 타일: 누진 / 점검 / 낭비 */}
        <div style={A({ width: 166, height: 115, left: 25, top: 617, background: "#fff", boxShadow: "0px 2px 8px rgba(5,31,31,0.06)", overflow: "hidden", borderRadius: 16 })}>
          <div style={A({ left: 14, top: 14, color: "#8C949E", fontSize: 10, fontWeight: 600 })}>누진 구간 {changed ? "이동" : "유지"}</div>
          <div style={A({ left: 0, right: 0, top: 37, textAlign: "center", color: "#1A1C21", fontSize: 14, fontWeight: 600 })}>{tierOld || "—"}</div>
          <div style={A({ left: 0, right: 0, top: 58, textAlign: "center", color: "#047D86", fontSize: 13, fontWeight: 700 })}>↓</div>
          <div style={A({ left: 0, right: 0, top: 80, textAlign: "center", color: "#1A1C21", fontSize: 15, fontWeight: 600 })}>{tierNew || "—"}</div>
        </div>
        <div style={A({ width: 151, height: 55, left: 213, top: 617, background: "#fff", boxShadow: "0px 2px 8px rgba(5,31,31,0.06)", overflow: "hidden", borderRadius: 16 })}>
          <div style={A({ left: 10, top: 10, color: "#8C949E", fontSize: 10, fontWeight: 600 })}>점검 필요도</div>
          <div style={A({ left: 0, right: 12, top: 22, textAlign: "right", color: "#1A1C21", fontSize: 20, fontWeight: 700 })}>{insp}</div>
        </div>
        <div style={A({ width: 151, height: 55, left: 213, top: 676, background: "#fff", boxShadow: "0px 2px 8px rgba(5,31,31,0.06)", overflow: "hidden", borderRadius: 16 })}>
          <div style={A({ left: 12, top: 9, color: "#8C949E", fontSize: 10, fontWeight: 600 })}>에너지 낭비</div>
          <div style={A({ left: 0, right: 14, top: 22, textAlign: "right", color: "#1A1C21", fontSize: 20, fontWeight: 700 })}>{waste}%</div>
        </div>

        {/* CTA */}
        <div style={A({ left: 28, right: 20, top: 753, height: 45, background: "#047D86", boxShadow: "0px 4px 4px rgba(0,0,0,0.10)", borderRadius: 999, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, color: "#fff", fontSize: 14, fontWeight: 700 })}>판단 근거 확인하기</div>

        {/* 하단 탭바 */}
        <div style={A({ width: 390, height: 78, left: 0, top: 766, background: "#fff", boxShadow: "0px -4px 14px rgba(0,0,0,0.08)" })}>
          {[["홈", 58, "#000"], ["진단", 71, "#047D86"], ["내 가전", 155, "#000"], ["더보기", 246, "#000"]].map(([t, l, c]) => (
            <div key={t as string} style={A({ left: l as number, top: 51, color: c as string, fontSize: 10, fontWeight: 600 })}>{t as string}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
