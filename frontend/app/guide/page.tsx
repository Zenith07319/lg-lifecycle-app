"use client";
import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";

type Tip = { icon: string; title: string; body: string; freq: string; url: string };
const TIPS: Tip[] = [
  { icon: "🌬", title: "필터 청소", freq: "2주~1개월", body: "흡입 필터를 물로 헹궈 그늘에 말려요. 막힌 필터는 전기료↑·냄새·냉방력↓의 가장 흔한 원인이에요.",
    url: "https://www.lge.co.kr/support/solutions-20150131974657" },
  { icon: "🌡", title: "적정 온도 26℃", freq: "상시", body: "희망온도를 1℃ 올리면 소비전력 약 7% 절약. 처음엔 강풍으로 빠르게 식히고 이후 자동/약풍이 효율적이에요.",
    url: "https://www.lge.co.kr/support/solutions-20154615449094" },
  { icon: "🪟", title: "실외기 관리", freq: "계절 시작 전", body: "실외기 주변을 틔우고 직사광선을 피하면 방열이 좋아져 효율이 올라가요. 주변 물건·먼지를 치워 주세요.",
    url: "https://www.lge.co.kr/story/user-guide/4season-air-conditioners" },
  { icon: "💧", title: "전문 세척", freq: "연 1회", body: "냉각핀·송풍팬 내부는 가정 청소로 한계가 있어요. 여름 성수기 전 전문 세척 1회로 곰팡이·냄새를 줄여요.",
    url: "https://www.lge.co.kr/support/solutions-20151624946326" },
  { icon: "🔌", title: "장기 미사용 관리", freq: "환절기", body: "오래 쓰지 않을 땐 송풍으로 내부를 말린 뒤 전원을 분리해요. 다시 켤 땐 필터·실외기를 먼저 점검하세요.",
    url: "https://www.lge.co.kr/support/solutions-20153058431783" },
];

const CHECK = [
  "사용 6년 이상 — 부품 보유기간(8년) 도래 전 상태 점검",
  "여름 성수기(6월) 전 시운전 + 필터·실외기 점검",
  "전기료가 작년 대비 크게 늘면 효율 저하 신호일 수 있어요",
];

export default function GuidePage() {
  return (
    <div>
      <div className="sticky top-0 z-20 bg-paper/85 backdrop-blur-md border-b border-line px-4 py-3 flex items-center gap-2">
        <Link href="/more" className="text-accent"><ChevronLeft size={22} /></Link>
        <h1 className="text-[16px] font-extrabold text-ink">에어컨 관리 가이드</h1>
      </div>

      <div className="px-4 py-4 space-y-5">
        <div className="rounded-[20px] p-5 text-white shadow-[var(--shadow-pop)]" style={{ background: "linear-gradient(140deg,#047d86,#034349)" }}>
          <p className="text-[12px] text-white/85">잘 관리하면</p>
          <p className="text-[19px] font-extrabold leading-snug mt-0.5">청소·세팅만으로<br />전기료·냄새·소음이 줄어요</p>
          <p className="text-[11.5px] text-white/85 mt-2">교체·수리 전에 먼저 해볼 수 있는 셀프 관리부터 확인하세요.</p>
        </div>

        <section className="space-y-2.5">
          {TIPS.map((t) => (
            <div key={t.title} className="rounded-[18px] bg-surface border border-line p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2.5">
                <span className="text-[20px]">{t.icon}</span>
                <span className="text-[14.5px] font-extrabold text-ink flex-1">{t.title}</span>
                <span className="text-[10.5px] font-bold text-accent bg-accent-soft rounded-full px-2.5 py-1">{t.freq}</span>
              </div>
              <p className="text-[12.5px] text-ink-soft leading-relaxed mt-2">{t.body}</p>
              <a href={t.url} target="_blank" rel="noopener"
                className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-bold text-accent">
                LG 공식 가이드 보기 <ExternalLink size={13} />
              </a>
            </div>
          ))}
        </section>
        <p className="text-[10.5px] text-muted px-1 -mt-2">※ 가이드 링크는 LG전자 고객지원(lge.co.kr) 공식 페이지로 연결됩니다.</p>

        <section className="rounded-[18px] bg-accent-soft border border-line p-4">
          <h2 className="text-[13px] font-extrabold text-ink mb-2">⏰ 이럴 땐 점검을 받아보세요</h2>
          <ul className="space-y-1.5">
            {CHECK.map((c) => (
              <li key={c} className="text-[12.5px] text-ink-soft leading-relaxed flex gap-2"><span className="text-accent">•</span>{c}</li>
            ))}
          </ul>
          <Link href="/centers" className="mt-3 flex items-center justify-center gap-1 rounded-xl border border-accent text-accent font-extrabold py-2.5 text-[13px]">
            주변 서비스센터 찾기
          </Link>
        </section>

        <p className="text-[11px] text-muted text-center leading-relaxed">
          ※ 관리 주기는 일반 권장값으로 사용 환경에 따라 다를 수 있어요. 정확한 점검·세척은 LG전자 고객지원(1544-7777)을 이용하세요.
        </p>
      </div>
    </div>
  );
}
