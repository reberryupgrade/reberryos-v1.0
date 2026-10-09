"use client";
import { useState } from "react";
import { api } from "@/src/lib/api";
import { Btn, Inp, FF } from "@/src/components/ui";

export function LoginScreen({onLogin}){
  const[u,setU]=useState("");
  const[p,setP]=useState("");
  const[err,setErr]=useState("");
  const[busy,setBusy]=useState(false);
  const handleLogin=async()=>{
    if(busy)return;
    setBusy(true);setErr("");
    const r=await api("/api/auth/login",{method:"POST",body:{username:u,password:p}});
    setBusy(false);
    if(!r.ok){setErr(r.body?.error||"로그인에 실패했습니다.");return;}
    onLogin(r.body.user);
  };
  return (
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Apple SD Gothic Neo',sans-serif"}}>
      <div style={{background:"#1e293b",borderRadius:20,padding:"48px 40px",width:380,boxShadow:"0 25px 60px rgba(0,0,0,0.5)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:36,marginBottom:8}}>📊</div>
          <div style={{color:"#6366f1",fontWeight:800,fontSize:24}}>REBERRYOS</div>
          <div style={{color:"#64748b",fontSize:13,marginTop:4}}>마케팅 관리 시스템</div>
        </div>
        <FF label="아이디"><Inp value={u} onChange={setU} placeholder="아이디 입력"/></FF>
        <FF label="비밀번호"><input type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="비밀번호 입력" onKeyDown={e=>e.key==="Enter"&&handleLogin()}
          style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"7px 11px",color:"#f1f5f9",fontSize:13,width:"100%",boxSizing:"border-box"}}/></FF>
        {err&&<div style={{color:"#ef4444",fontSize:12,marginBottom:12}}>{err}</div>}
        <Btn onClick={handleLogin} color="#6366f1" style={{width:"100%",padding:"10px",fontSize:14,marginTop:4}}>{busy?"확인 중…":"로그인"}</Btn>

      </div>
    </div>
  );
}
