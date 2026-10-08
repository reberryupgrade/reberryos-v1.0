"use client";
import { useState, useRef, useEffect } from "react";
import { loadBranch, saveBranch } from "@/src/lib/api";
import { DEFAULT_BRANCH_DATA } from "@/src/lib/constants";

// 지점 데이터 로드 + 자동 저장 파이프라인
// - 변경 후 0.9초 디바운스로 저장하고, 요청은 한 번에 하나씩만 보낸다
// - 지점을 떠나거나 바꿀 때(flushSave) 대기 중인 변경을 즉시 저장한다
// - 서버 저장본이 더 새로우면(409) 덮어쓸지 다시 불러올지 묻는다
// - 실패하면 변경분을 남겨 두고 5초 뒤 자동 재시도한다
export function useBranchData(activeBranchId) {
  const [branchData, setBranchData] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error | conflict

  const pendingRef = useRef(null);        // {id,data,force}: 아직 서버에 보내지 않은 최신 변경
  const timerRef = useRef(null);
  const baseRef = useRef({});             // branchId -> 마지막으로 서버와 맞춘 updatedAt
  const loadedRef = useRef(null);         // 방금 서버에서 불러온 객체 (그대로 다시 저장하지 않기 위한 식별용)
  const activeRef = useRef(null);
  const inflightRef = useRef(Promise.resolve());
  const errorAlertedRef = useRef(false);
  useEffect(() => { activeRef.current = activeBranchId; }, [activeBranchId]);

  // 지점 선택 시 데이터 로드
  useEffect(() => {
    if (!activeBranchId) return;
    let cancelled = false;
    loadBranch(activeBranchId).then((r) => {
      if (cancelled) return;
      const d = r?.value || { ...DEFAULT_BRANCH_DATA };
      loadedRef.current = d;
      baseRef.current[activeBranchId] = r?.updatedAt || null;
      setBranchData(d);
      setSaveStatus("idle");
    });
    return () => { cancelled = true; };
  }, [activeBranchId]);

  const flushSave = () => {
    const run = inflightRef.current.then(async () => {
      const p = pendingRef.current;
      if (!p) return;
      pendingRef.current = null;
      clearTimeout(timerRef.current);
      const r = await saveBranch(p.id, p.data, { baseUpdatedAt: baseRef.current[p.id] ?? null, force: p.force });
      if (r.ok) {
        baseRef.current[p.id] = r.body.updatedAt;
        errorAlertedRef.current = false;
        setSaveStatus(pendingRef.current ? "saving" : "saved");
        return;
      }
      if (r.status === 409) {
        setSaveStatus("conflict");
        const overwrite = confirm("다른 사용자가 이 지점을 먼저 수정했습니다.\n\n확인: 내 변경으로 덮어쓰기\n취소: 서버의 최신 데이터 다시 불러오기 (내 변경은 사라집니다)");
        if (overwrite) { pendingRef.current = { id: p.id, data: p.data, force: true }; flushSave(); }
        else if (activeRef.current === p.id) {
          baseRef.current[p.id] = r.body.updatedAt;
          loadedRef.current = r.body.value;
          setBranchData(r.body.value);
          setSaveStatus("saved");
        }
        return;
      }
      pendingRef.current = pendingRef.current || p;
      setSaveStatus("error");
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flushSave, 5000);
      if (!errorAlertedRef.current) {
        errorAlertedRef.current = true;
        alert("저장 실패: " + (r.body?.error || "HTTP " + r.status) + "\n연결을 확인해 주세요. 자동으로 다시 시도합니다.");
      }
    });
    inflightRef.current = run.catch(() => {});
    return run;
  };

  // 변경 후 0.9초 뒤 저장 (방금 불러온 데이터는 다시 저장하지 않음)
  useEffect(() => {
    if (!activeBranchId || !branchData || branchData === loadedRef.current) return;
    pendingRef.current = { id: activeBranchId, data: branchData };
    setSaveStatus("saving");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flushSave, 900);
    return () => clearTimeout(timerRef.current);
  }, [branchData, activeBranchId]);

  // 지점을 떠나거나 바꿀 때 대기 중인 변경을 즉시 저장
  useEffect(() => {
    if (!activeBranchId) return;
    return () => { flushSave(); };
  }, [activeBranchId]);

  // 저장이 끝나기 전에 탭을 닫으려 하면 경고
  useEffect(() => {
    const h = (e) => { if (pendingRef.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  return { branchData, setBranchData, saveStatus, flushSave };
}
