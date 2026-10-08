"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { api, loadSys } from "@/src/lib/api";
import { useBranchData } from "@/src/hooks/useBranchData";
import { Btn } from "@/src/components/ui";
import { Toaster, ConfirmHost } from "@/src/components/feedback";
import { LoginScreen } from "@/src/components/LoginScreen";

const centered = { minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" };
const Loading = ({ text = "로딩 중...", color = "#6366f1" }) => <div style={{ ...centered, color, fontSize: 18 }}>{text}</div>;

// 로그인 화면에서는 큰 화면 코드를 내려받지 않도록, 로그인 뒤에 쓰는 화면은 지연 로드
const lazyScreen = (loader) => dynamic(loader, { loading: () => <Loading />, ssr: false });
const AdminDashboard = lazyScreen(() => import("@/src/components/AdminDashboard").then((m) => m.AdminDashboard));
const ClientPortal = lazyScreen(() => import("@/src/components/ClientPortal").then((m) => m.ClientPortal));
const BranchApp = lazyScreen(() => import("@/src/components/BranchApp").then((m) => m.BranchApp));

export default function App() {
  return (
    <>
      <Toaster />
      <ConfirmHost />
      <AppRouter />
    </>
  );
}

function AppRouter() {
  const [user, setUser] = useState(null);
  const [system, setSystem] = useState(null);
  const [activeBranchId, setActiveBranchId] = useState(null);
  const [loaded, setLoaded] = useState(false); // 세션 확인 완료 여부
  const { branchData, setBranchData, saveStatus, flushSave } = useBranchData(activeBranchId);

  const applyUser = (u) => {
    setUser(u);
    if (u.role === "manager" || u.role === "client") setActiveBranchId(u.branchId);
  };

  // 새로고침해도 세션 쿠키가 살아 있으면 로그인 유지
  useEffect(() => {
    api("/api/auth/me").then((r) => { if (r.ok && r.body?.user) applyUser(r.body.user); setLoaded(true); });
  }, []);

  // 로그인 후 시스템 설정 로드. 실패(세션 만료 등)하면 로그인 화면으로
  useEffect(() => {
    if (!user) { setSystem(null); return; }
    loadSys().then((s) => { if (s) setSystem(s); else setUser(null); });
  }, [user]);

  const logout = async () => {
    await flushSave();
    await api("/api/auth/logout", { method: "POST" });
    setUser(null); setActiveBranchId(null); setBranchData(null);
  };

  if (!loaded) return <Loading />;
  if (!user) return <LoginScreen onLogin={applyUser} />;
  if (!system) return <Loading />;

  // 클라이언트 → 포털만
  if (user.role === "client") {
    if (!branchData) return <Loading text="데이터 로딩 중..." color="#94a3b8" />;
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", fontFamily: "'Apple SD Gothic Neo',sans-serif", color: "#f1f5f9" }}>
        <div style={{ background: "#0a0f1e", borderBottom: "1px solid #1e293b", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, color: "#6366f1" }}>REBERRYOS</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "#94a3b8", fontSize: 13 }}>👤 {user.name}</span>
            <Btn onClick={logout} color="#334155" style={{ color: "#94a3b8", padding: "5px 14px" }}>로그아웃</Btn>
          </div>
        </div>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
          <ClientPortal data={branchData} budgetTotal={0} standalone />
        </div>
      </div>
    );
  }

  // 관리자, 지점 미선택 → 대시보드
  if (user.role === "admin" && !activeBranchId) {
    return <AdminDashboard system={system} setSystem={setSystem} onSelectBranch={(id) => setActiveBranchId(id)} user={user} onLogout={logout} />;
  }

  // 관리자가 지점을 골랐거나 매니저 → 지점 화면
  if (!branchData) return <Loading text="데이터 로딩 중..." color="#94a3b8" />;
  const branch = system.branches.find((b) => b.id === activeBranchId);

  return (
    <BranchApp
      branchId={activeBranchId}
      branchName={branch?.name}
      data={branchData}
      setData={setBranchData}
      user={user}
      onBack={user.role === "admin" ? () => { setActiveBranchId(null); setBranchData(null); } : null}
      onLogout={logout}
      saveStatus={saveStatus}
    />
  );
}
