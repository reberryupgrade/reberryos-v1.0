"use client";
import { useState } from "react";
import { saveSys, saveBranch, deleteBranch } from "@/src/lib/api";
import { DEFAULT_BRANCH_DATA } from "@/src/lib/constants";
import { fmt, fmtW } from "@/src/lib/format";
import { useBranchSummaries } from "@/src/hooks/useBranchSummaries";
import { Th, Td, Btn, DelBtn, Modal } from "@/src/components/ui";
import { SimpleForm, AddUserForm, ChangePasswordForm } from "@/src/components/forms";

export function AdminDashboard({system,setSystem,onSelectBranch,user,onLogout}){
  const[modal,setModal]=useState(null);
  const[tab,setTab]=useState("branches");
  const branchSummaries=useBranchSummaries(system.branches);

  // 서버가 확정한 설정으로 화면을 맞춘다 (비밀번호는 서버에서 해시되며 다시 내려오지 않는다)
  const commitSys=async(newSys)=>{
    const r=await saveSys(newSys);
    if(r.ok)setSystem(r.body.value);
    return r.ok;
  };
  const addBranch=async(f)=>{
    const nb={id:Date.now(),name:f.name,clinicName:f.clinicName||f.name};
    if(!(await commitSys({...system,branches:[...system.branches,nb]})))return;
    // 새 지점의 기본 데이터 저장
    const r=await saveBranch(nb.id,{...DEFAULT_BRANCH_DATA,portalConfig:{...DEFAULT_BRANCH_DATA.portalConfig,clinicName:nb.clinicName}});
    if(!r.ok)alert("지점 기본 데이터 저장 실패: "+(r.body?.error||"HTTP "+r.status));
    setModal(null);
  };
  const delBranch=async(id)=>{
    if(!confirm("이 지점과 모든 데이터를 삭제합니다. 계속할까요?"))return;
    const newSys={...system,branches:system.branches.filter(b=>b.id!==id),users:system.users.map(u=>u.branchId===id?{...u,branchId:null}:u)};
    if(!(await commitSys(newSys)))return;
    const r=await deleteBranch(id);
    if(!r.ok)alert("지점 데이터 삭제 실패: "+(r.body?.error||"HTTP "+r.status));
  };
  const addUser=async(f)=>{
    const nu={id:Date.now(),username:f.username.trim(),password:f.password,role:f.role,name:f.name,branchId:f.role!=="admin"?(+f.branchId||null):null};
    if(await commitSys({...system,users:[...system.users,nu]}))setModal(null);
  };
  const changePassword=async(id,password)=>{
    if(await commitSys({...system,users:system.users.map(u=>u.id===id?{...u,password}:u)}))setModal(null);
  };
  const delUser=(id)=>{
    if(id===user.id)return alert("자신의 계정은 삭제할 수 없습니다.");
    if(!confirm("이 사용자를 삭제할까요?"))return;
    commitSys({...system,users:system.users.filter(u=>u.id!==id)});
  };

  return (
    <div style={{minHeight:"100vh",background:"#0f172a",color:"#f1f5f9",fontFamily:"'Apple SD Gothic Neo',sans-serif"}}>
      <div style={{background:"#0a0f1e",borderBottom:"1px solid #1e293b",padding:"14px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>📊</span>
          <div>
            <span style={{fontWeight:800,fontSize:17,color:"#6366f1"}}>REBERRYOS</span>
            <span style={{color:"#475569",fontSize:12,marginLeft:8}}>통합관리</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{color:"#94a3b8",fontSize:13}}>👤 {user.name}</span>
          <Btn onClick={onLogout} color="#334155" style={{color:"#94a3b8",padding:"5px 14px"}}>로그아웃</Btn>
        </div>
      </div>

      <div style={{padding:"24px 28px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{display:"flex",gap:8,marginBottom:24}}>
          <button onClick={()=>setTab("branches")} style={{background:tab==="branches"?"#6366f1":"#1e293b",color:tab==="branches"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>🏢 지점 관리</button>
          <button onClick={()=>setTab("users")} style={{background:tab==="users"?"#6366f1":"#1e293b",color:tab==="users"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>👥 사용자 관리</button>
        </div>

        {tab==="branches"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontWeight:800,fontSize:18}}>전체 지점 ({system.branches.length})</div>
              <Btn onClick={()=>setModal("addBranch")} color="#6366f1">+ 새 지점 추가</Btn>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:16}}>
              {system.branches.map(b=>{
                const sm=branchSummaries[b.id]||{};
                const mgrs=system.users.filter(u=>u.branchId===b.id&&u.role==="manager");
                return (
                  <div key={b.id} style={{background:"#1e293b",borderRadius:14,overflow:"hidden",border:"1px solid #334155"}}>
                    <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81)",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontWeight:800,fontSize:16}}>{b.name}</div>
                        <div style={{color:"#a5b4fc",fontSize:12,marginTop:2}}>{b.clinicName}</div>
                      </div>
                      <DelBtn onClick={()=>delBranch(b.id)}/>
                    </div>
                    <div style={{padding:"16px 20px"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                        <div style={{background:"#0f172a",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                          <div style={{color:"#94a3b8",fontSize:10}}>키워드</div>
                          <div style={{color:"#6366f1",fontWeight:800,fontSize:16}}>{sm.keywords||0}</div>
                        </div>
                        <div style={{background:"#0f172a",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                          <div style={{color:"#94a3b8",fontSize:10}}>유튜브</div>
                          <div style={{color:"#f97316",fontWeight:800,fontSize:16}}>{fmt(sm.ytViews||0)}</div>
                        </div>
                        <div style={{background:"#0f172a",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                          <div style={{color:"#94a3b8",fontSize:10}}>월비용</div>
                          <div style={{color:"#f59e0b",fontWeight:800,fontSize:13}}>{fmtW(sm.cost||0)}</div>
                        </div>
                      </div>
                      <div style={{color:"#64748b",fontSize:12,marginBottom:12}}>담당: {mgrs.length?mgrs.map(m=>m.name).join(", "):"미배정"}</div>
                      <Btn onClick={()=>onSelectBranch(b.id)} color="#6366f1" style={{width:"100%"}}>관리 →</Btn>
                    </div>
                  </div>
                );
              })}
            </div>
            {modal==="addBranch"&&(
              <Modal title="새 지점 추가" onClose={()=>setModal(null)}>
                <SimpleForm fields={["name:지점명|예: 분당점","clinicName:병원/클라이언트명|예: 분당 피부과"]} onSave={addBranch}/>
              </Modal>
            )}
          </div>
        )}

        {tab==="users"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontWeight:800,fontSize:18}}>사용자 관리 ({system.users.length})</div>
              <Btn onClick={()=>setModal("addUser")} color="#6366f1">+ 사용자 추가</Btn>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr><Th c="이름"/><Th c="아이디"/><Th c="비밀번호"/><Th c="역할"/><Th c="소속 지점"/><Th c=""/></tr></thead>
              <tbody>{system.users.map((u,ri)=>(
                <tr key={u.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                  <Td><span style={{fontWeight:700}}>{u.name}</span></Td>
                  <Td>{u.username}</Td>
                  <Td><Btn onClick={()=>setModal({pw:u.id})} color="#334155" style={{color:"#94a3b8",padding:"3px 10px",fontSize:11}}>변경</Btn></Td>
                  <Td><span style={{background:u.role==="admin"?"#6366f1":u.role==="manager"?"#10b981":"#f59e0b",color:"#fff",borderRadius:99,padding:"2px 10px",fontSize:12,fontWeight:700}}>
                    {u.role==="admin"?"통합관리자":u.role==="manager"?"지점관리자":"클라이언트"}
                  </span></Td>
                  <Td>{u.branchId?system.branches.find(b=>b.id===u.branchId)?.name||"-":"-"}</Td>
                  <Td><DelBtn onClick={()=>delUser(u.id)}/></Td>
                </tr>
              ))}</tbody>
            </table>
            {modal==="addUser"&&(
              <Modal title="사용자 추가" onClose={()=>setModal(null)}>
                <AddUserForm branches={system.branches} onSave={addUser}/>
              </Modal>
            )}
            {modal?.pw&&(
              <Modal title={`비밀번호 변경: ${system.users.find(u=>u.id===modal.pw)?.name||""}`} onClose={()=>setModal(null)}>
                <ChangePasswordForm onSave={pw=>changePassword(modal.pw,pw)}/>
              </Modal>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
