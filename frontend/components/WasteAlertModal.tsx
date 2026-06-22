"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pendingWastePopup, markPopupSeen, type DeviceAlert } from "@/lib/alerts";

// 방치 시 전력 소비가 +10% 늘어난 게 감지되면 한 번 띄우는 팝업.
// 닫아도(또는 행동해도) 알림함엔 그대로 남고, 같은 단계로는 다시 뜨지 않는다(seen 집합).
export default function WasteAlertModal() {
  const router = useRouter();
  const [alert, setAlert] = useState<DeviceAlert | null>(null);

  useEffect(() => {
    const sync = () => setAlert(pendingWastePopup());
    const t = setTimeout(sync, 700);   // 스플래시 직후 노출
    window.addEventListener("ror:devices", sync);
    window.addEventListener("storage", sync);
    return () => {
      clearTimeout(t);
      window.removeEventListener("ror:devices", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!alert) return null;

  const seen = () => markPopupSeen(alert.id);
  const close    = () => { seen(); setAlert(null); };
  const goGuide  = () => { seen(); setAlert(null); router.push("/guide"); };
  const goDiag   = () => { seen(); setAlert(null); router.push("/diagnose"); };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-7" role="dialog" aria-modal="true">
      <button aria-label="닫기" onClick={close} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-[360px] rounded-[24px] bg-white p-6 shadow-[0_24px_60px_rgba(5,31,31,.28)]">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-[#FDF3DF] text-[30px] leading-none">
          {alert.icon}
        </div>
        <p className="text-center text-[18px] font-extrabold text-ink">{alert.title}</p>
        <p className="mt-2 text-center text-[13px] leading-relaxed text-ink-soft">{alert.body}</p>
        <div className="mt-5 space-y-2">
          <button onClick={goGuide}
            className="w-full rounded-full bg-accent py-3.5 text-[14px] font-extrabold text-white shadow-[0_4px_14px_rgba(4,125,134,.32)] transition active:scale-[.99]">
            관리 가이드 보기
          </button>
          <button onClick={goDiag}
            className="w-full rounded-full bg-accent-soft py-3 text-[13px] font-bold text-accent transition active:scale-[.99]">
            다시 진단하기
          </button>
          <button onClick={close}
            className="w-full py-2 text-[12px] font-bold text-muted transition active:scale-95">
            나중에
          </button>
        </div>
      </div>
    </div>
  );
}
