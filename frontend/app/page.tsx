import Link from "next/link";

const GRADES = [
  { grade: "A", color: "#1a7f3c", desc: "계속 사용 적합" },
  { grade: "B", color: "#3d7a1a", desc: "셀프케어 권장" },
  { grade: "C", color: "#e07b00", desc: "점검 권장" },
  { grade: "D", color: "#d44000", desc: "구독·교체 검토" },
  { grade: "E", color: "#C40000", desc: "점검 필요도 높음" },
];

const FEATURES = [
  { icon: "⚡", title: "전기요금 계산", desc: "KEPCO 2025 요금표 기준 누진구간 영향 포함" },
  { icon: "🌿", title: "탄소 영향", desc: "LG ESG 보고서 기반 제조·사용·폐기 탄소 분석" },
  { icon: "🔎", title: "점검 필요도", desc: "증상·연식·수리이력·VOC 데이터 종합 분석" },
  { icon: "📊", title: "5가지 비교", desc: "계속사용 / 셀프케어 / 수리 / 구독 / 신제품 비교" },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="text-center space-y-4 py-8">
        <h1 className="text-3xl font-black text-gray-900">
          우리 집 에어컨, 어떻게 할까?
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          연식·증상·관리 상태를 입력하면 <strong>수리 vs 교체 vs 구독</strong>을
          비용·탄소·불편도 기준으로 비교해드립니다.
        </p>
        <Link
          href="/diagnose"
          className="inline-block bg-red-700 hover:bg-red-800 text-white font-bold px-8 py-3 rounded-full text-lg transition-colors"
        >
          진단 시작하기 →
        </Link>
      </section>

      {/* 기능 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="bg-white rounded-xl border p-4 text-center space-y-1">
            <div className="text-2xl">{f.icon}</div>
            <div className="font-semibold text-sm text-gray-800">{f.title}</div>
            <div className="text-xs text-gray-500">{f.desc}</div>
          </div>
        ))}
      </section>

      {/* 건강등급 안내 */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3">건강등급 안내</h2>
        <div className="grid grid-cols-5 gap-2">
          {GRADES.map((g) => (
            <div
              key={g.grade}
              className="bg-white rounded-xl border p-3 text-center"
            >
              <div className="text-3xl font-black" style={{ color: g.color }}>
                {g.grade}
              </div>
              <div className="text-xs text-gray-500 mt-1">{g.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 고지 */}
      <p className="text-xs text-gray-400 text-center">
        ※ MVP 대상: 에어컨 (4인 가구 기준) · 모든 수치는 현재 입력 조건 기준 추정 결과입니다.
      </p>
    </div>
  );
}
