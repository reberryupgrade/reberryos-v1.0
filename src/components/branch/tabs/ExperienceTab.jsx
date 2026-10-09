"use client";
import { CHANNEL_COLORS } from "@/src/lib/constants";
import { fmt, today } from "@/src/lib/format";
import { Badge, Th, Td, Btn, LinkCell, DelBtn, Modal, SectionWithCost } from "@/src/components/ui";
import { SimpleForm } from "@/src/components/forms";

export function ExperienceTab({data,del,modal,setModal,simRefresh,upd}){
  return (
            <SectionWithCost title="체험단" cost={data.experienceCost} onCostChange={v=>upd("experienceCost",v)} color={CHANNEL_COLORS.experience} right={<Btn onClick={()=>setModal("exp")}>+ 추가</Btn>}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr><Th c="제목"/><Th c="플랫폼"/><Th c="조회수"/><Th c="댓글"/><Th c="갱신"/><Th c="상태"/><Th c="URL"/><Th c=""/></tr></thead>
                <tbody>{data.experience.map((e,ri)=>(
                  <tr key={e.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                    <Td><LinkCell url={e.url}><span style={{fontWeight:700}}>{e.title}</span></LinkCell></Td>
                    <Td><span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{e.platform}</span></Td>
                    <Td><span style={{color:"#06b6d4"}}>{fmt(e.views)}</span></Td>
                    <Td>{e.comments}</Td>
                    <Td><span style={{color:"#475569",fontSize:12}}>{e.lastUpdated}</span></Td>
                    <Td><Badge status={e.status}/></Td>
                    <Td><div style={{display:"flex",gap:6}}><input value={e.url||""} onChange={ev=>upd("experience",data.experience.map(r=>r.id===e.id?{...r,url:ev.target.value}:r))} placeholder="URL" style={{background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"5px 9px",color:"#94a3b8",fontSize:12,width:140}}/><button onClick={()=>simRefresh("experience",e)} style={{background:"#334155",border:"none",color:"#06b6d4",borderRadius:6,padding:"5px 9px",cursor:"pointer",fontSize:12}}>↻</button></div></Td>
                    <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editExp",item:e})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>del("experience",e.id)}/></div></Td>
                  </tr>
                ))}</tbody>
              </table>
              {modal?.type==="editExp"&&<Modal title="체험단 편집" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","platform:플랫폼|네이버블로그 / 네이버카페","url:URL","views:조회수","comments:댓글수"]} initial={modal.item} onSave={f=>{upd("experience",data.experience.map(x=>x.id===modal.item.id?{...x,...f,views:+f.views||0,comments:+f.comments||0}:x));setModal(null);}}/></Modal>}
              {modal==="exp"&&<Modal title="체험단 추가" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","platform:플랫폼|네이버블로그 / 네이버카페","url:URL","views:조회수","comments:댓글수"]} onSave={f=>{upd("experience",[...data.experience,{...f,id:Date.now(),views:+f.views||0,comments:+f.comments||0,status:"warn",lastUpdated:today()}]);setModal(null);}}/></Modal>}
            </SectionWithCost>
  );
}
