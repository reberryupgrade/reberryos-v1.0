"use client";
import { CHANNEL_COLORS } from "@/src/lib/constants";
import { Btn, DelBtn, Modal, SectionWithCost } from "@/src/components/ui";
import { ACForm } from "@/src/components/forms";

export function AutocompleteTab({data,del,modal,setModal,upd}){
  return (
            <SectionWithCost title="키워드 자동완성" cost={data.autocompleteCost} onCostChange={v=>upd("autocompleteCost",v)} color={CHANNEL_COLORS.autocomplete} right={<Btn onClick={()=>setModal("ac")}>+ 추가</Btn>}>
              {data.autocomplete.map(a=>(
                <div key={a.id} style={{background:"#0f172a",borderRadius:14,padding:"16px 18px",marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontWeight:800,fontSize:15,color:"#6366f1"}}>🔍 {a.keyword}</div>
                    <div style={{display:"flex",gap:6}}><Btn onClick={()=>setModal({type:"editAC",item:a})} color="#334155" style={{color:"#94a3b8",fontSize:12,padding:"5px 10px"}}>편집</Btn><DelBtn onClick={()=>del("autocomplete",a.id)}/></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                    <div><div style={{color:"#94a3b8",fontSize:12,marginBottom:6,fontWeight:600}}>네이버</div>{a.naver.map((n,i)=><div key={i} style={{background:"#1e293b",borderRadius:6,padding:"6px 10px",marginBottom:4,fontSize:13}}><span style={{color:"#475569",fontSize:11,marginRight:6}}>{i+1}</span>{n}</div>)}</div>
                    <div><div style={{color:"#94a3b8",fontSize:12,marginBottom:6,fontWeight:600}}>인스타</div>{a.instagram.map((n,i)=><div key={i} style={{background:"#1e293b",borderRadius:6,padding:"6px 10px",marginBottom:4,fontSize:13,color:"#ec4899"}}><span style={{color:"#475569",fontSize:11,marginRight:6}}>{i+1}</span>#{n}</div>)}</div>
                  </div>
                </div>
              ))}
              {modal==="ac"&&<Modal title="키워드 추가" onClose={()=>setModal(null)}><ACForm onSave={f=>{upd("autocomplete",[...data.autocomplete,{...f,id:Date.now()}]);setModal(null);}}/></Modal>}
              {modal?.type==="editAC"&&<Modal title="편집" onClose={()=>setModal(null)}><ACForm initial={modal.item} onSave={f=>{upd("autocomplete",data.autocomplete.map(a=>a.id===modal.item.id?{...a,...f}:a));setModal(null);}}/></Modal>}
            </SectionWithCost>
  );
}
