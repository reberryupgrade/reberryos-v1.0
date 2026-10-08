"use client";
import { COMM_PLATFORMS, CHANNEL_COLORS } from "@/src/lib/constants";
import { fmt, today } from "@/src/lib/format";
import { Th, Td, Btn, LinkCell, DelBtn, CostBox, Modal } from "@/src/components/ui";
import { SimpleForm } from "@/src/components/forms";

export function CommunityTab({commTab,data,modal,setCommTab,setModal,simRefreshComm,updComm}){
  return (
            <div>
              <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
                {COMM_PLATFORMS.map(p=>(
                  <button key={p} onClick={()=>setCommTab(p)} style={{background:commTab===p?"#6366f1":"#1e293b",color:commTab===p?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:commTab===p?700:400,fontSize:13}}>
                    {p} <span style={{opacity:0.7,fontSize:11}}>({(data.community[p]?.items||[]).length})</span>
                  </button>
                ))}
                <Btn onClick={()=>setModal({type:"addComm",platform:commTab})} style={{marginLeft:"auto"}}>+ 추가</Btn>
              </div>
              <div style={{marginBottom:14}}>
                <CostBox label={`${commTab} 월 집행비`} value={data.community[commTab]?.cost||0} onChange={v=>updComm(commTab,"cost",v)} color={CHANNEL_COLORS[`community_${commTab}`]||"#f59e0b"}/>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr><Th c="제목"/><Th c="조회수"/><Th c="갱신"/><Th c="URL"/><Th c=""/></tr></thead>
                <tbody>
                  {(data.community[commTab]?.items||[]).map(c=>(
                    <tr key={c.id} style={{borderBottom:"1px solid #1e293b"}}>
                      <Td><LinkCell url={c.url}><span style={{fontWeight:700}}>{c.title}</span></LinkCell></Td>
                      <Td><span style={{color:"#06b6d4"}}>{fmt(c.views)}</span></Td>
                      <Td><span style={{color:"#475569",fontSize:12}}>{c.lastUpdated}</span></Td>
                      <Td><div style={{display:"flex",gap:6}}>
                        <input value={c.url||""} onChange={e=>updComm(commTab,"items",data.community[commTab].items.map(r=>r.id===c.id?{...r,url:e.target.value}:r))} placeholder="URL" style={{background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"5px 9px",color:"#94a3b8",fontSize:12,width:140}}/>
                        <button onClick={()=>simRefreshComm(commTab,c)} style={{background:"#334155",border:"none",color:"#06b6d4",borderRadius:6,padding:"5px 9px",cursor:"pointer",fontSize:12}}>↻</button>
                      </div></Td>
                      <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editComm",platform:commTab,item:c})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updComm(commTab,"items",data.community[commTab].items.filter(r=>r.id!==c.id))}/></div></Td>
                    </tr>
                  ))}
                  {!(data.community[commTab]?.items||[]).length&&<tr><td colSpan={5} style={{padding:20,textAlign:"center",color:"#475569"}}>등록된 게시물이 없습니다.</td></tr>}
                </tbody>
              </table>
              {modal?.type==="editComm"&&<Modal title={`${modal.platform} 편집`} onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","url:URL","views:조회수"]} initial={modal.item} onSave={f=>{updComm(modal.platform,"items",data.community[modal.platform].items.map(r=>r.id===modal.item.id?{...r,...f,views:+f.views||0}:r));setModal(null);}}/></Modal>}
              {modal?.type==="addComm"&&<Modal title={`${modal.platform} 추가`} onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","url:URL","views:조회수"]} onSave={f=>{updComm(modal.platform,"items",[...(data.community[modal.platform]?.items||[]),{...f,id:Date.now(),views:+f.views||0,lastUpdated:today()}]);setModal(null);}}/></Modal>}
            </div>
  );
}
