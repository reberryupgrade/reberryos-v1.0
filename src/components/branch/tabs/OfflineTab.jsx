"use client";
import { fmt, fmtW } from "@/src/lib/format";
import { Th, Td, Btn, DelBtn, Modal } from "@/src/components/ui";
import { OfflineForm } from "@/src/components/forms";

export function OfflineTab({data,modal,offlineTab,setModal,setOfflineTab,updN}){
  return (
            <div>
              <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
                {[{id:"elevator",label:"엘리베이터"},{id:"subway",label:"역사 광고"},{id:"other",label:"기타 거점"}].map(t=>(
                  <button key={t.id} onClick={()=>setOfflineTab(t.id)} style={{background:offlineTab===t.id?"#6366f1":"#1e293b",color:offlineTab===t.id?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:offlineTab===t.id?700:400,fontSize:13}}>{t.label}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
                {[
                  {label:"집행중",value:[...data.offline.elevator,...data.offline.subway,...data.offline.other].filter(a=>a.status==="집행중").length+"건",color:"#10b981"},
                  {label:"총 비용",value:fmtW([...data.offline.elevator,...data.offline.subway,...data.offline.other].filter(a=>a.status==="집행중").reduce((a,b)=>a+(+b.cost||0),0))+"/월",color:"#f59e0b"},
                ].map((s,i)=>(
                  <div key={i} style={{background:"#1e293b",borderRadius:10,padding:"12px 16px",flex:"1 1 120px"}}>
                    <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>{s.label}</div>
                    <div style={{color:s.color,fontSize:20,fontWeight:800}}>{s.value}</div>
                  </div>
                ))}
              </div>
              {offlineTab==="elevator"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontWeight:700,fontSize:15}}>엘리베이터 광고</div><Btn onClick={()=>setModal("addElev")}>+ 추가</Btn>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr><Th c="단지명"/><Th c="세대"/><Th c="시작"/><Th c="종료"/><Th c="비용"/><Th c="상태"/><Th c=""/></tr></thead>
                    <tbody>{data.offline.elevator.map((e,ri)=>(
                      <tr key={e.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{fontWeight:700}}>{e.complex}</span></Td>
                        <Td>{fmt(e.units)}세대</Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{e.startDate}</span></Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{e.endDate}</span></Td>
                        <Td><span style={{color:"#f59e0b",fontWeight:700}}>{fmtW(e.cost)}</span></Td>
                        <Td><span style={{background:e.status==="집행중"?"#10b981":"#475569",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{e.status}</span></Td>
                        <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editElev",item:e})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("offline","elevator",data.offline.elevator.filter(x=>x.id!==e.id))}/></div></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {modal?.type==="editElev"&&<Modal title="엘리베이터 편집" onClose={()=>setModal(null)}><OfflineForm fields={["complex:단지명","units:세대수","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} initial={modal.item} onSave={f=>{updN("offline","elevator",data.offline.elevator.map(x=>x.id===modal.item.id?{...x,...f,units:+f.units||0,cost:+f.cost||0,totalCost:+f.totalCost||0}:x));setModal(null);}}/></Modal>}
                  {modal==="addElev"&&<Modal title="엘리베이터 추가" onClose={()=>setModal(null)}><OfflineForm fields={["complex:단지명","units:세대수","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} onSave={f=>{updN("offline","elevator",[...data.offline.elevator,{...f,id:Date.now(),units:+f.units||0,cost:+f.cost||0,totalCost:+f.totalCost||0}]);setModal(null);}}/></Modal>}
                </div>
              )}
              {offlineTab==="subway"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontWeight:700,fontSize:15}}>역사 광고</div><Btn onClick={()=>setModal("addSub")}>+ 추가</Btn>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr><Th c="역명"/><Th c="위치"/><Th c="시작"/><Th c="종료"/><Th c="비용"/><Th c="상태"/><Th c=""/></tr></thead>
                    <tbody>{data.offline.subway.map((s,ri)=>(
                      <tr key={s.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{fontWeight:700}}>{s.station}</span></Td><Td>{s.location}</Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{s.startDate}</span></Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{s.endDate}</span></Td>
                        <Td><span style={{color:"#f59e0b",fontWeight:700}}>{fmtW(s.cost)}</span></Td>
                        <Td><span style={{background:s.status==="집행중"?"#10b981":"#475569",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{s.status}</span></Td>
                        <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editSub",item:s})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("offline","subway",data.offline.subway.filter(x=>x.id!==s.id))}/></div></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {modal?.type==="editSub"&&<Modal title="역사 광고 편집" onClose={()=>setModal(null)}><OfflineForm fields={["station:역명","location:위치","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} initial={modal.item} onSave={f=>{updN("offline","subway",data.offline.subway.map(x=>x.id===modal.item.id?{...x,...f,cost:+f.cost||0,totalCost:+f.totalCost||0}:x));setModal(null);}}/></Modal>}
                  {modal==="addSub"&&<Modal title="역사 광고 추가" onClose={()=>setModal(null)}><OfflineForm fields={["station:역명","location:위치","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} onSave={f=>{updN("offline","subway",[...data.offline.subway,{...f,id:Date.now(),cost:+f.cost||0,totalCost:+f.totalCost||0}]);setModal(null);}}/></Modal>}
                </div>
              )}
              {offlineTab==="other"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontWeight:700,fontSize:15}}>기타 거점</div><Btn onClick={()=>setModal("addOth")}>+ 추가</Btn>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr><Th c="유형"/><Th c="위치"/><Th c="시작"/><Th c="종료"/><Th c="비용"/><Th c="상태"/><Th c=""/></tr></thead>
                    <tbody>{data.offline.other.map((o,ri)=>(
                      <tr key={o.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{o.type}</span></Td>
                        <Td><span style={{fontWeight:700}}>{o.location}</span></Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{o.startDate}</span></Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{o.endDate}</span></Td>
                        <Td><span style={{color:"#f59e0b",fontWeight:700}}>{fmtW(o.cost)}</span></Td>
                        <Td><span style={{background:o.status==="집행중"?"#10b981":"#475569",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{o.status}</span></Td>
                        <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editOth",item:o})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("offline","other",data.offline.other.filter(x=>x.id!==o.id))}/></div></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {modal?.type==="editOth"&&<Modal title="기타 편집" onClose={()=>setModal(null)}><OfflineForm fields={["type:유형|버스정류장 / 현수막 등","location:위치","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} initial={modal.item} onSave={f=>{updN("offline","other",data.offline.other.map(x=>x.id===modal.item.id?{...x,...f,cost:+f.cost||0,totalCost:+f.totalCost||0}:x));setModal(null);}}/></Modal>}
                  {modal==="addOth"&&<Modal title="기타 추가" onClose={()=>setModal(null)}><OfflineForm fields={["type:유형|버스정류장 / 현수막 등","location:위치","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} onSave={f=>{updN("offline","other",[...data.offline.other,{...f,id:Date.now(),cost:+f.cost||0,totalCost:+f.totalCost||0}]);setModal(null);}}/></Modal>}
                </div>
              )}
            </div>
  );
}
