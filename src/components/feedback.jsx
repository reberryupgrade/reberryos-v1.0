"use client";
import { useState, useEffect } from "react";

// 브라우저 alert/confirm 을 대신하는 화면 안 알림(토스트)과 확인창.
// 컴포넌트 밖(라이브러리 코드)에서도 부를 수 있도록 모듈 단위 함수로 둔다.

const toastListeners = new Set();
let toastSeq = 0;

function guessType(message) {
  return /실패|오류|에러|없습니다|할 수 없|먼저|해주세요|않습니다|초과|너무/.test(message) ? "error" : "info";
}

export function notify(message, type) {
  const t = { id: ++toastSeq, message: String(message), type: type || guessType(String(message)) };
  if (toastListeners.size === 0) { window.alert(t.message); return; } // 호스트가 아직 없으면 브라우저 기본값
  toastListeners.forEach((l) => l(t));
}
notify.success = (m) => notify(m, "success");
notify.error = (m) => notify(m, "error");

const TOAST_COLORS = { info: "#6366f1", success: "#10b981", error: "#ef4444" };

export function Toaster() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const l = (t) => {
      setItems((x) => [...x.slice(-4), t]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== t.id)), t.type === "error" ? 7000 : 3500);
    };
    toastListeners.add(l);
    return () => toastListeners.delete(l);
  }, []);
  if (!items.length) return null;
  return (
    <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 10000, display: "flex", flexDirection: "column", gap: 8, maxWidth: 380 }}>
      {items.map((t) => (
        <div key={t.id} onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))}
          style={{ background: "#1e293b", color: "#f1f5f9", borderLeft: `4px solid ${TOAST_COLORS[t.type] || TOAST_COLORS.info}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", boxShadow: "0 10px 30px rgba(0,0,0,0.4)", cursor: "pointer" }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

let confirmHandler = null;

// 사용: if (!(await confirmDialog("정말 삭제할까요?"))) return;
export function confirmDialog(message, { okLabel = "확인", cancelLabel = "취소", danger = false } = {}) {
  return new Promise((resolve) => {
    if (!confirmHandler) { resolve(window.confirm(message)); return; }
    confirmHandler({ message: String(message), okLabel, cancelLabel, danger, resolve });
  });
}

export function ConfirmHost() {
  const [req, setReq] = useState(null);
  useEffect(() => {
    confirmHandler = (r) => setReq(r);
    return () => { confirmHandler = null; };
  }, []);
  useEffect(() => {
    if (!req) return;
    const onKey = (e) => { if (e.key === "Escape") done(false); if (e.key === "Enter") done(true); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (!req) return null;
  const done = (v) => { req.resolve(v); setReq(null); };
  return (
    <div onClick={() => done(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#1e293b", color: "#f1f5f9", borderRadius: 14, padding: "22px 24px", width: 380, maxWidth: "90vw", boxShadow: "0 25px 60px rgba(0,0,0,0.5)", fontFamily: "'Apple SD Gothic Neo',sans-serif" }}>
        <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 18 }}>{req.message}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => done(false)} style={{ background: "#334155", color: "#cbd5e1", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13 }}>{req.cancelLabel}</button>
          <button autoFocus onClick={() => done(true)} style={{ background: req.danger ? "#ef4444" : "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>{req.okLabel}</button>
        </div>
      </div>
    </div>
  );
}
