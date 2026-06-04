"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { diagnose, SAMPLE_INPUT } from "@/lib/api";
import type { DiagnoseInput, SymptomLabel } from "@/lib/types";

const SYMPTOMS: SymptomLabel[] = ["성능저하","소음","냄새","누수","전기요금증가","작동불량"];
const PRIORITY_AXES: { key: keyof DiagnoseInput; label: string }[] = [
  { key: "priority_cost_score",        label: "💰 비용 중시" },
  { key: "priority_env_score",         label: "🌱 환경 중시" },
  { key: "priority_convenience_score", label: "🛠 편의 중시" },
];

export default function DiagnosePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState<DiagnoseInput>(SAMPLE_INPUT);

  const set = (k: keyof DiagnoseInput, v: string | number) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const toggleSymptom = (label: SymptomLabel) =>
    setForm((prev) => {
      const exists = prev.symptoms.some((s) => s.type === label);
      return {
        ...prev,
        symptoms: exists
          ? prev.symptoms.filter((s) => s.type !== label)
          : [...prev.symptoms, { type: label, severity: 3 }],
      };
    });

  const setSeverity = (label: SymptomLabel, severity: number) =>
    setForm((prev) => ({
      ...prev,
      symptoms: prev.symptoms.map((s) => (s.type === label ? { ...s, severity } : s)),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await diagnose(form);
      router.push(`/result/${res.session_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setLoading(false);
    }
  };

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>
  );

  const Input = ({ label, type = "number", field, min, max, step }: {
    label: string; type?: string; field: keyof DiagnoseInput;
    min?: number; max?: number; step?: number;
  }) => (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        min={min} max={max} step={step}
        value={form[field] as number}
        onChange={(e) => set(field, type === "number" ? Number(e.target.value) : e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
      />
    </div>
  );

  const Select = ({ label, field, options }: {
    label: string; field: keyof DiagnoseInput; options: string[];
  }) => (
    <div>
      <Label>{label}</Label>
      <select
        value={form[field] as string}
        onChange={(e) => set(field, e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">보유 가전 정보 입력</h1>
      <p className="text-sm text-gray-500 mb-6">
        정확하지 않아도 됩니다. 대략적인 값을 입력해주세요.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 제품 정보 */}
        <section className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">제품 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <Select label="제품군" field="product_type" options={["에어컨"]} />
            <Input  label="구매 연도" field="purchase_year" min={2000} max={2026} />
            <Select label="용량" field="capacity_kw"
              options={["2.5","3.6","5.0","6.0"].map(String)} />
            <div>
              <Label>계약 종류</Label>
              <div className="flex gap-3">
                {(["고압","저압"] as const).map((v) => (
                  <label key={v} className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="contract" value={v}
                      checked={form.contract_type === v}
                      onChange={() => set("contract_type", v)} />
                    <span className="text-sm">{v === "고압" ? "고압 (아파트)" : "저압 (빌라·원룸)"}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 사용 패턴 */}
        <section className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">사용 패턴</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="하루 사용시간 (시간)" field="daily_usage_hours" min={1} max={24} />
            <Input label="연간 사용 개월수" field="usage_months" min={1} max={12} />
            <Select label="계절" field="season" options={["하계","기타"]} />
          </div>
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-600">전기 사용량 (고지서 기준)</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                여름 월 평균 전력사용량 kWh
                <span className="ml-1 text-xs text-gray-400">(에어컨 켜는 달 고지서)</span>
              </label>
              <input
                type="number" min={0} max={1000} step={10}
                value={form.summer_monthly_kwh}
                onChange={(e) => set("summer_monthly_kwh", Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                입력 시 효율감퇴 모델로 에어컨 기여분을 자동 분리합니다. 0이면 카탈로그 기반 추정.
              </p>
            </div>
            <Input label="기저 전력사용량 참고 kWh (겨울 고지서, 선택)" field="base_monthly_kwh" min={50} max={800} />
          </div>
        </section>

        {/* 증상 */}
        <section className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">증상 및 관리</h2>
          <div>
            <Label>증상 (복수 선택 · 각 심각도 1~5점)</Label>
            <div className="space-y-2">
              {SYMPTOMS.map((label) => {
                const sel = form.symptoms.find((s) => s.type === label);
                return (
                  <div key={label} className="flex items-center gap-3">
                    <label className="flex-1 flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!sel}
                        onChange={() => toggleSymptom(label)} />
                      <span className="text-sm">{label}</span>
                    </label>
                    {sel && (
                      <select value={sel.severity}
                        onChange={(e) => setSeverity(label, Number(e.target.value))}
                        className="border rounded-lg px-2 py-1 text-sm">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n}점</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1">아무것도 선택하지 않으면 ‘증상없음’으로 진단합니다.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="마지막 필터 청소 후 경과 개월" field="filter_clean_months" min={0} max={60} />
            <Input label="최근 3년 수리 횟수" field="repair_history_count" min={0} max={10} />
          </div>
        </section>

        {/* 우선순위 3축 */}
        <section className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">나에게 가장 중요한 것은? (비용 / 환경 / 편의)</h2>
          <p className="text-xs text-gray-500">중요하게 보는 가치에 점수를 더 주세요. (미응답 시 비용 우선)</p>
          {PRIORITY_AXES.map(({ key, label }) => (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{label}</span>
                <span className="font-bold text-red-700">{form[key] as number}</span>
              </div>
              <input type="range" min={0} max={100}
                value={form[key] as number}
                onChange={(e) => set(key, Number(e.target.value))}
                className="w-full accent-red-700" />
            </div>
          ))}
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setForm(SAMPLE_INPUT)}
            className="flex-1 border border-gray-300 rounded-full py-3 text-sm text-gray-600 hover:bg-gray-50"
          >
            샘플 데이터 불러오기
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-red-700 hover:bg-red-800 disabled:bg-gray-300 text-white font-bold rounded-full py-3 transition-colors"
          >
            {loading ? "분석 중..." : "진단 시작 →"}
          </button>
        </div>
      </form>
    </div>
  );
}
