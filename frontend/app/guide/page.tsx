"use client";
import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";
import { AppHeader } from "@/components/ui";

type Tip = { anchor: string; icon: string; title: string; body: string; freq: string; url: string };
const TIPS: Tip[] = [
  { anchor: "filter", icon: "🌬", title: "필터 청소", freq: "2주~1개월", body: "흡입 필터를 물로 헹궈 그늘에 말려요. 막힌 필터는 전기료↑·냄새·냉방력↓의 가장 흔한 원인이에요.",
    url: "https://www.lge.co.kr/support/solutions-20150131974657" },
  { anchor: "temp", icon: "🌡", title: "적정 온도 26℃", freq: "상시", body: "희망온도를 1℃ 올리면 소비전력 약 7% 절약. 처음엔 강풍으로 빠르게 식히고 이후 자동/약풍이 효율적이에요.",
    url: "https://www.lge.co.kr/support/solutions-20154615449094" },
  { anchor: "outdoor", icon: "🪟", title: "실외기 관리", freq: "계절 시작 전", body: "실외기 주변을 틔우고 직사광선을 피하면 방열이 좋아져 효율이 올라가요. 주변 물건·먼지를 치워 주세요.",
    url: "https://www.lge.co.kr/story/user-guide/4season-air-conditioners" },
  { anchor: "deep-clean", icon: "💧", title: "전문 세척", freq: "연 1회", body: "냉각핀·송풍팬 내부는 가정 청소로 한계가 있어요. 여름 성수기 전 전문 세척 1회로 곰팡이·냄새를 줄여요.",
    url: "https://www.lge.co.kr/support/solutions-20151624946326" },
  { anchor: "storage", icon: "🔌", title: "장기 미사용 관리", freq: "환절기", body: "오래 쓰지 않을 땐 송풍으로 내부를 말린 뒤 전원을 분리해요. 다시 켤 땐 필터·실외기를 먼저 점검하세요.",
    url: "https://www.lge.co.kr/support/solutions-20153058431783" },
];

const CHECK = [
  "사용 6년 이상 — 부품 보유기간(8년) 도래 전 상태 점검",
  "여름 성수기(6월) 전 시운전 + 필터·실외기 점검",
  "전기료가 작년 대비 크게 늘면 효율 저하 신호일 수 있어요",
];

export default function GuidePage() {
  return (
    <div className="pb-28">
      <AppHeader title="관리 가이드" subtitle="오래 쓰는 비결을 알려드려요" />

      <div className="px-6 pt-3">
        {/* 히어로 카드 (틸 그라데이션) */}
        <div className="reveal reveal-1 flex items-center gap-3 rounded-[20px] px-5 pb-5 pt-4 text-white shadow-[0_2px_8px_rgba(5,31,31,.06)]"
          style={{ background: "linear-gradient(140deg,#047d86,#034349)" }}>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-white/85">잘 관리하면</p>
            <p className="mt-0.5 text-[19px] font-extrabold leading-snug">청소·세팅만으로<br />전기료·냄새·소음이 줄어요</p>
            <p className="mt-2 text-[11.5px] text-white/85">교체·수리 전에 먼저 해볼 수 있는 셀프 관리부터 확인하세요.</p>
          </div>
          <img src="/character-head.png" alt="" className="size-[50px] shrink-0 object-contain drop-shadow-lg" />
        </div>

        {/* 팁 카드 목록 */}
        <p className="reveal reveal-2 mb-2.5 mt-5 px-1 text-[13px] font-bold text-muted">이렇게 관리하면 좋아요</p>
        <div className="reveal reveal-2 space-y-2.5">
          {TIPS.map((t) => (
            <div key={t.title} id={t.anchor}
              className="scroll-mt-20 rounded-[16px] bg-white/64 p-4 shadow-[0_2px_8px_rgba(5,31,31,.06)] backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-accent-soft text-[20px]">{t.icon}</span>
                <span className="flex-1 text-[14.5px] font-extrabold text-ink">{t.title}</span>
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10.5px] font-bold text-accent">{t.freq}</span>
              </div>
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-soft">{t.body}</p>
              <a href={t.url} target="_blank" rel="noopener"
                className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-bold text-accent active:opacity-70">
                LG 공식 가이드 보기 <ExternalLink size={13} strokeWidth={2.4} />
              </a>
            </div>
          ))}
        </div>
        <p className="mt-2.5 px-1 text-[10.5px] leading-relaxed text-muted">
          ※ 가이드 링크는 LG전자 고객지원(lge.co.kr) 공식 페이지로 연결됩니다.
        </p>

        {/* 이럴 땐 점검 콜아웃 */}
        <div className="reveal reveal-3 mt-5 rounded-[18px] bg-accent-soft p-4 shadow-[0_2px_8px_rgba(5,31,31,.06)]">
          <h2 className="mb-2 text-[13px] font-extrabold text-ink">⏰ 이럴 땐 점검을 받아보세요</h2>
          <ul className="space-y-1.5">
            {CHECK.map((c) => (
              <li key={c} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-soft">
                <span className="text-accent">•</span>{c}
              </li>
            ))}
          </ul>
          <Link href="/centers"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-accent py-2.5 text-[13px] font-extrabold text-accent active:scale-[.99] transition">
            <MapPin size={16} strokeWidth={2.2} /> 주변 서비스센터 찾기
          </Link>
        </div>

        {/* 푸터 노트 */}
        <p className="px-1 pt-4 text-center text-[11px] leading-relaxed text-muted">
          ※ 관리 주기는 일반 권장값으로 사용 환경에 따라 다를 수 있어요. 정확한 점검·세척은 LG전자 고객지원(1544-7777)을 이용하세요.
        </p>
      </div>
    </div>
  );
}
