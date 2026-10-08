"use client";
import { extractYtId } from "@/src/lib/youtube";
import { CHANNEL_COLORS } from "@/src/lib/constants";
import { fmt, today } from "@/src/lib/format";
import { Th, Td, Btn, Inp, FF, LinkCell, DelBtn, Modal, CommentsPanel, SectionWithCost } from "@/src/components/ui";
import { SimpleForm } from "@/src/components/forms";

export function ShortformTab({data,del,modal,setModal,simRefresh,upd,ytAddByUrl,ytLoading,ytRefresh}){
  return (
            <SectionWithCost title="숏폼" cost={data.shortformCost} onCostChange={v=>upd("shortformCost",v)} color={CHANNEL_COLORS.shortform} right={<Btn onClick={()=>setModal({type:"addSf",_sfUrl:""})}>+ 추가</Btn>}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr><Th c="플랫폼"/><Th c="제목"/><Th c="조회수"/><Th c="댓글"/><Th c="좋아요"/><Th c="갱신"/><Th c="URL"/><Th c=""/></tr></thead>
                <tbody>{data.shortform.map((s,ri)=>(
                  <tr key={s.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                    <Td><span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{s.platform}</span></Td>
                    <Td><LinkCell url={s.url}><span style={{fontWeight:700}}>{s.title}</span></LinkCell></Td>
                    <Td><span style={{color:"#06b6d4"}}>{fmt(s.views)}</span></Td>
                    <Td><button onClick={()=>setModal({type:"comments",comments:s.comments,title:s.title})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:12}}>💬 {s.comments?.length||0}</button></Td>
                    <Td>{s.likes}</Td>
                    <Td><span style={{color:"#475569",fontSize:12}}>{s.lastUpdated}</span></Td>
                    <Td><div style={{display:"flex",gap:6}}><input value={s.url||""} onChange={e=>upd("shortform",data.shortform.map(r=>r.id===s.id?{...r,url:e.target.value}:r))} placeholder="URL" style={{background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"5px 9px",color:"#94a3b8",fontSize:12,width:140}}/><button onClick={()=>{if(extractYtId(s.url))ytRefresh(s,"shortform");else simRefresh("shortform",s);}} disabled={ytLoading===s.id} style={{background:ytLoading===s.id?"#1e293b":"#334155",border:"none",color:"#06b6d4",borderRadius:6,padding:"5px 9px",cursor:"pointer",fontSize:12}}>{ytLoading===s.id?"⏳":"↻"}</button></div></Td>
                    <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editSf",item:s})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>del("shortform",s.id)}/></div></Td>
                  </tr>
                ))}</tbody>
              </table>
              {modal?.type==="editSf"&&<Modal title="숏폼 편집" onClose={()=>setModal(null)}><SimpleForm fields={["platform:플랫폼|인스타그램 / 틱톡 / 유튜브쇼츠","title:제목","url:URL","views:조회수","likes:좋아요수"]} initial={modal.item} onSave={f=>{upd("shortform",data.shortform.map(x=>x.id===modal.item.id?{...x,...f,views:+f.views||0,likes:+f.likes||0}:x));setModal(null);}}/></Modal>}
              {modal?.type==="addSf"&&<Modal title="숏폼 추가" onClose={()=>setModal(null)}><div>
                <FF label="YouTube Shorts URL (자동)"><Inp value={modal?._sfUrl||""} onChange={v=>setModal({...modal,_sfUrl:v})} placeholder="https://youtube.com/shorts/..."/></FF>
                <Btn onClick={async()=>{const ok=await ytAddByUrl(modal?._sfUrl||"","shortform","유튜브쇼츠");if(ok)setModal(null);}} disabled={ytLoading==="adding"} style={{width:"100%",marginTop:4}}>{ytLoading==="adding"?"⏳ 데이터 가져오는 중...":"URL로 자동 추가"}</Btn>
                <div style={{textAlign:"center",color:"#475569",fontSize:12,margin:"10px 0"}}>또는 직접 입력 (인스타/틱톡)</div>
                <SimpleForm fields={["platform:플랫폼|인스타그램 / 틱톡 / 유튜브쇼츠","title:제목","url:URL","views:조회수","likes:좋아요수"]} onSave={f=>{upd("shortform",[...data.shortform,{...f,id:Date.now(),views:+f.views||0,likes:+f.likes||0,lastUpdated:today(),comments:[]}]);setModal(null);}}/></div></Modal>}
              {modal?.type==="comments"&&<CommentsPanel comments={modal.comments} title={modal.title} onClose={()=>setModal(null)}/>}
            </SectionWithCost>
  );
}
