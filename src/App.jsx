"use client";
import { useState, useRef, useEffect } from "react";
import { api, loadSys, loadBranch, saveBranch } from "@/src/lib/api";
import { DEFAULT_BRANCH_DATA } from "@/src/lib/constants";
import { Btn } from "@/src/components/ui";
import { LoginScreen } from "@/src/components/LoginScreen";
import { AdminDashboard } from "@/src/components/AdminDashboard";
import { ClientPortal } from "@/src/components/ClientPortal";
import { BranchApp } from "@/src/components/BranchApp";

export default function App(){
  const[user,setUser]=useState(null);
  const[system,setSystem]=useState(null);
  const[activeBranchId,setActiveBranchId]=useState(null);
  const[branchData,setBranchData]=useState(null);
  const[branchSummaries,setBranchSummaries]=useState({});
  const[loaded,setLoaded]=useState(false);          // 세션 확인 완료 여부
  const[saveStatus,setSaveStatus]=useState("idle"); // idle | saving | saved | error | conflict

  // 저장 파이프라인 상태 (렌더와 무관하므로 ref)
  const pendingRef=useRef(null);          // {id,data,force}: 아직 서버에 보내지 않은 최신 변경
  const timerRef=useRef(null);
  const baseRef=useRef({});               // branchId -> 마지막으로 서버와 맞춘 updatedAt
  const loadedRef=useRef(null);           // 방금 서버에서 불러온 객체 (그대로 다시 저장하지 않기 위한 식별용)
  const activeRef=useRef(null);
  const inflightRef=useRef(Promise.resolve());
  const errorAlertedRef=useRef(false);
  useEffect(()=>{activeRef.current=activeBranchId;},[activeBranchId]);

  const applyUser=u=>{
    setUser(u);
    if(u.role==="manager"||u.role==="client")setActiveBranchId(u.branchId);
  };

  // 새로고침해도 세션 쿠키가 살아 있으면 로그인 유지
  useEffect(()=>{
    api("/api/auth/me").then(r=>{if(r.ok&&r.body?.user)applyUser(r.body.user);setLoaded(true);});
  },[]);

  // 로그인 후 시스템 설정 로드. 실패(세션 만료 등)하면 로그인 화면으로
  useEffect(()=>{
    if(!user){setSystem(null);return;}
    loadSys().then(s=>{if(s)setSystem(s);else setUser(null);});
  },[user]);

  // 지점 선택 시 데이터 로드
  useEffect(()=>{
    if(!activeBranchId)return;
    let cancelled=false;
    loadBranch(activeBranchId).then(r=>{
      if(cancelled)return;
      const d=r?.value||{...DEFAULT_BRANCH_DATA};
      loadedRef.current=d;
      baseRef.current[activeBranchId]=r?.updatedAt||null;
      setBranchData(d);
      setSaveStatus("idle");
    });
    return()=>{cancelled=true;};
  },[activeBranchId]);

  // 대기 중인 변경을 서버에 저장. 요청은 한 번에 하나씩만 보낸다.
  const flushSave=()=>{
    const run=inflightRef.current.then(async()=>{
      const p=pendingRef.current;
      if(!p)return;
      pendingRef.current=null;
      clearTimeout(timerRef.current);
      const r=await saveBranch(p.id,p.data,{baseUpdatedAt:baseRef.current[p.id]??null,force:p.force});
      if(r.ok){
        baseRef.current[p.id]=r.body.updatedAt;
        errorAlertedRef.current=false;
        setSaveStatus(pendingRef.current?"saving":"saved");
        return;
      }
      if(r.status===409){
        setSaveStatus("conflict");
        const overwrite=confirm("다른 사용자가 이 지점을 먼저 수정했습니다.\n\n확인: 내 변경으로 덮어쓰기\n취소: 서버의 최신 데이터 다시 불러오기 (내 변경은 사라집니다)");
        if(overwrite){pendingRef.current={id:p.id,data:p.data,force:true};flushSave();}
        else if(activeRef.current===p.id){
          baseRef.current[p.id]=r.body.updatedAt;
          loadedRef.current=r.body.value;
          setBranchData(r.body.value);
          setSaveStatus("saved");
        }
        return;
      }
      // 실패: 변경분을 남겨 두고 5초 뒤 자동 재시도 (그 사이 새 변경이 오면 그것으로 대체)
      pendingRef.current=pendingRef.current||p;
      setSaveStatus("error");
      clearTimeout(timerRef.current);
      timerRef.current=setTimeout(flushSave,5000);
      if(!errorAlertedRef.current){
        errorAlertedRef.current=true;
        alert("저장 실패: "+(r.body?.error||"HTTP "+r.status)+"\n연결을 확인해 주세요. 자동으로 다시 시도합니다.");
      }
    });
    inflightRef.current=run.catch(()=>{});
    return run;
  };

  // 변경 후 0.9초 뒤 저장 (방금 불러온 데이터는 다시 저장하지 않음)
  useEffect(()=>{
    if(!activeBranchId||!branchData||branchData===loadedRef.current)return;
    pendingRef.current={id:activeBranchId,data:branchData};
    setSaveStatus("saving");
    clearTimeout(timerRef.current);
    timerRef.current=setTimeout(flushSave,900);
    return()=>clearTimeout(timerRef.current);
  },[branchData,activeBranchId]);

  // 지점을 떠나거나 바꿀 때 대기 중인 변경을 즉시 저장
  useEffect(()=>{
    if(!activeBranchId)return;
    return()=>{flushSave();};
  },[activeBranchId]);

  // 저장이 끝나기 전에 탭을 닫으려 하면 경고
  useEffect(()=>{
    const h=e=>{if(pendingRef.current){e.preventDefault();e.returnValue="";}};
    window.addEventListener("beforeunload",h);
    return()=>window.removeEventListener("beforeunload",h);
  },[]);

  // Load summaries for admin dashboard
  useEffect(()=>{
    if(!system||!user||user.role!=="admin")return;
    const loadAll=async()=>{
      const sums={};
      for(const b of system.branches){
        const d=(await loadBranch(b.id))?.value;
        if(d){
          const off=[...(d.offline?.elevator||[]),...(d.offline?.subway||[]),...(d.offline?.other||[])].filter(a=>a.status==="집행중").reduce((a,x)=>a+(+x.cost||0),0);
          const kwC=Object.values(d.keywordCosts||{}).reduce((a,x)=>a+x,0);
          const commC=Object.values(d.community||{}).reduce((a,p)=>a+(p.cost||0),0);
          const inhC=(d.inhouse?.messagesCost||0)+(d.inhouse?.reviewsCost||0)+(d.inhouse?.photosCost||0)+(d.inhouse?.videosCost||0);
          sums[b.id]={
            keywords:d.keywords?.length||0,
            ytViews:d.youtube?.reduce((a,x)=>a+x.views,0)||0,
            cost:kwC+(d.mapsCost||0)+(d.experienceCost||0)+(d.cafesCost||0)+(d.youtubeCost||0)+(d.shortformCost||0)+(d.autocompleteCost||0)+(d.seoCost||0)+commC+inhC+off,
          };
        }
      }
      setBranchSummaries(sums);
    };
    loadAll();
  },[system,user]);

  const logout=async()=>{
    await flushSave();
    await api("/api/auth/logout",{method:"POST"});
    setUser(null);setActiveBranchId(null);setBranchData(null);setBranchSummaries({});
  };

  const loadingView=<div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",color:"#6366f1",fontSize:18,fontFamily:"sans-serif"}}>로딩 중...</div>;
  if(!loaded)return loadingView;

  // Not logged in
  if(!user)return <LoginScreen onLogin={applyUser}/>;
  if(!system)return loadingView;

  // Client → portal only
  if(user.role==="client"){
    if(!branchData)return <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontFamily:"sans-serif"}}>데이터 로딩 중...</div>;
    return (
      <div style={{minHeight:"100vh",background:"#0f172a",fontFamily:"'Apple SD Gothic Neo',sans-serif",color:"#f1f5f9"}}>
        <div style={{background:"#0a0f1e",borderBottom:"1px solid #1e293b",padding:"10px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:800,color:"#6366f1"}}>REBERRYOS</span>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{color:"#94a3b8",fontSize:13}}>👤 {user.name}</span>
            <Btn onClick={logout} color="#334155" style={{color:"#94a3b8",padding:"5px 14px"}}>로그아웃</Btn>
          </div>
        </div>
        <div style={{maxWidth:900,margin:"0 auto",padding:24}}>
          <ClientPortal data={branchData} budgetTotal={0} standalone/>
        </div>
      </div>
    );
  }

  // Admin without active branch → dashboard
  if(user.role==="admin"&&!activeBranchId){
    return <AdminDashboard system={system} setSystem={setSystem} onSelectBranch={id=>setActiveBranchId(id)} branchSummaries={branchSummaries} user={user} onLogout={logout}/>;
  }

  // Admin with branch selected OR Manager → BranchApp
  if(!branchData)return <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontFamily:"sans-serif"}}>데이터 로딩 중...</div>;
  const branch=system.branches.find(b=>b.id===activeBranchId);

  return <BranchApp
    branchId={activeBranchId}
    branchName={branch?.name}
    data={branchData}
    setData={setBranchData}
    user={user}
    onBack={user.role==="admin"?()=>{setActiveBranchId(null);setBranchData(null);}:null}
    onLogout={logout}
    saveStatus={saveStatus}
  />;
}
