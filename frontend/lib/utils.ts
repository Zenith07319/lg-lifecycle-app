export const GRADE_COLORS: Record<string, string> = {
  A: "#1a7f3c", B: "#3d7a1a", C: "#e07b00", D: "#d44000", E: "#C40000",
};

export const GRADE_BG: Record<string, string> = {
  A: "bg-green-50 border-green-500",
  B: "bg-lime-50 border-lime-500",
  C: "bg-amber-50 border-amber-500",
  D: "bg-orange-50 border-orange-500",
  E: "bg-red-50 border-red-600",
};

export const OPTION_ICONS: Record<string, string> = {
  "계속사용":  "🔄",
  "셀프케어":  "🔧",
  "수리후사용":"🔩",
  "구독전환":  "📱",
  "신제품구매":"🛒",
};

export const fmt = (n: number) =>
  n.toLocaleString("ko-KR") + "원";

export const fmtCo2 = (n: number) =>
  n.toFixed(1) + " kgCO₂";
