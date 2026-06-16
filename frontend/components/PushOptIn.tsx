"use client";
import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2, Send, Check, Smartphone } from "lucide-react";
import { pushPublicKey, pushSubscribe, pushSendDemo } from "@/lib/api";

// VAPID 공개키(base64url) → Uint8Array(applicationServerKey)
function urlB64ToUint8(base64: string): Uint8Array {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type Status = "checking" | "unsupported" | "need-install" | "idle" | "subscribing" | "subscribed" | "denied";

export default function PushOptIn() {
  const [status, setStatus] = useState<Status>("checking");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) { setStatus("unsupported"); return; }
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS && !standalone) { setStatus("need-install"); return; }       // iOS는 홈화면 PWA에서만
    if (Notification.permission === "denied") { setStatus("denied"); return; }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "subscribed" : "idle"))
      .catch(() => setStatus("idle"));
  }, []);

  const subscribe = async () => {
    try {
      setStatus("subscribing"); setMsg("");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setStatus(perm === "denied" ? "denied" : "idle"); return; }
      const reg = await navigator.serviceWorker.ready;
      const { public_key, enabled } = await pushPublicKey();
      if (!enabled || !public_key) { setMsg("서버 푸시가 아직 설정되지 않았어요."); setStatus("idle"); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8(public_key) as BufferSource,
      });
      await pushSubscribe(sub.toJSON());
      setStatus("subscribed"); setMsg("알림이 켜졌어요. 여름 전 점검 시기에 알려드릴게요!");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "구독에 실패했어요"); setStatus("idle");
    }
  };

  const sendDemo = async () => {
    try {
      setSending(true); setMsg("");
      const r = await pushSendDemo();
      setMsg(r.error ? r.error : `발송 완료 · ${r.sent}건${r.failed ? ` (실패 ${r.failed})` : ""}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "발송 실패");
    } finally { setSending(false); }
  };

  const subscribed = status === "subscribed";

  return (
    <div className="reveal reveal-2 rounded-[18px] bg-white/64 p-4 shadow-[0_2px_8px_rgba(5,31,31,.06)] backdrop-blur-sm">
      <div className="flex items-center gap-3.5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[13px] bg-accent-soft">
          {subscribed ? <BellRing size={21} className="text-accent" strokeWidth={2} /> : <Bell size={21} className="text-accent" strokeWidth={2} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-ink">여름 전 점검 알림</p>
          <p className="text-[11px] text-muted">더워지기 전에 미리 점검받도록 알려드려요</p>
        </div>
      </div>

      {/* 상태별 액션 */}
      <div className="mt-3">
        {status === "checking" && <p className="text-[12px] text-muted">확인 중…</p>}

        {status === "unsupported" && (
          <p className="text-[12px] text-muted">이 브라우저는 웹 알림을 지원하지 않아요.</p>
        )}

        {status === "need-install" && (
          <p className="flex items-start gap-1.5 text-[12px] leading-snug text-ink-soft">
            <Smartphone size={14} className="mt-0.5 shrink-0 text-accent" />
            아이폰은 <b className="mx-1">공유 → 홈 화면에 추가</b> 후, 홈 화면 아이콘으로 열어 사용하면 알림을 받을 수 있어요.
          </p>
        )}

        {status === "denied" && (
          <p className="text-[12px] leading-snug text-ink-soft">알림이 차단돼 있어요. 기기 설정에서 ROR 알림을 허용해 주세요.</p>
        )}

        {(status === "idle" || status === "subscribing") && (
          <button onClick={subscribe} disabled={status === "subscribing"}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-accent py-3 text-[14px] font-extrabold text-white shadow-[0_6px_18px_rgba(4,125,134,.28)] active:scale-[.99] transition disabled:opacity-60">
            {status === "subscribing" ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
            {status === "subscribing" ? "켜는 중…" : "알림 받기"}
          </button>
        )}

        {subscribed && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 rounded-full bg-green-050 py-2.5 text-[13px] font-bold text-success">
              <Check size={15} className="mx-auto -mr-1" strokeWidth={3} /> <span className="mx-auto -ml-1">알림 켜짐</span>
            </div>
            {/* 시연용 즉시 발송 */}
            <button onClick={sendDemo} disabled={sending}
              className="flex w-full items-center justify-center gap-1.5 rounded-full border border-accent/40 bg-white py-2.5 text-[12.5px] font-bold text-accent active:scale-[.99] transition disabled:opacity-60">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? "보내는 중…" : "[데모] 점검 알림 보내기"}
            </button>
          </div>
        )}

        {msg && <p className="mt-2 text-[11px] leading-snug text-muted">{msg}</p>}
      </div>
    </div>
  );
}
