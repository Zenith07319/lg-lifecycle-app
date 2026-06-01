"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { diagnose, SAMPLE_INPUT } from "@/lib/api";
import type { DiagnoseInput } from "@/lib/types";

const SYMPTOMS  = ["이상없음","냄새","냉방약화","소음","전기료부담","누수","작동불가"];
const SEVERITIES = ["없음","낮음","중간","높음"];
const PRIORITIES = ["기본","비용절감","친환경","초기비용최소","관리편의","오래쓰기"];

export default function DiagnosePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState<DiagnoseInput>(SAMPLE_INPUT);

  const set = (k: keyof DiagnoseInput, v: string | number) =>
    setForm((prev) => ({ ...prev, [k]: v }));

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
            <Input label="에어컨 제외 월 전력사용량 (kWh)" field="base_monthly_kwh" min={50} max={1000} />
            <Select label="계절" field="season" options={["하계","기타"]} />
          </div>
        </section>

        {/* 증상 */}
        <section className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">증상 및 관리</h2>
          <div className="grid grid-cols-2 gap-4">
            <Select label="주요 증상" field="symptom_type" options={SYMPTOMS} />
            <Select label="증상 심각도" field="symptom_severity" options={SEVERITIES} />
            <Input label="마지막 필터 청소 후 경과 개월" field="filter_clean_months" min={0} max={60} />
            <Input label="최근 3년 수리 횟수" field="repair_history_count" min={0} max={10} />
          </div>
        </section>

        {/* 우선순위 */}
        <section className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">나에게 가장 중요한 것은?</h2>
          <div className="grid grid-cols-3 gap-2">
            {PRIORITIES.map((p) => (
              <label key={p}
                className={`flex items-center justify-center border rounded-lg p-2 text-sm cursor-pointer transition-colors
                  ${form.customer_priority === p
                    ? "border-red-600 bg-red-50 text-red-700 font-semibold"
                    : "border-gray-200 hover:border-gray-400"}`}
              >
                <input type="radio" name="priority" value={p} className="hidden"
                  checked={form.customer_priority === p}
                  onChange={() => set("customer_priority", p)} />
                {p}
              </label>
            ))}
          </div>
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
