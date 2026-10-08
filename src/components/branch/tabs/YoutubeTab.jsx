"use client";
import { CHANNEL_COLORS } from "@/src/lib/constants";
import { fmt, today } from "@/src/lib/format";
import { Th, Td, Btn, Inp, FF, LinkCell, DelBtn, Modal, CommentsPanel, SectionWithCost } from "@/src/components/ui";
import { SimpleForm } from "@/src/components/forms";

export function YoutubeTab({data,del,modal,setModal,setYtChTab,upd,ytAddByUrl,ytAddChannel,ytChTab,ytLoading,ytRefresh,ytRefreshChannel}){
  return (
            <SectionWithCost title="유튜브" cost={data.youtubeCost} onCostChange={v=>upd("youtubeCost",v)} color={CHANNEL_COLORS.youtube} right={<div style={{display:"flex",gap:6}}><Btn onClick={()=>setModal({type:"addYtCh"})}>+ 채널</Btn><Btn onClick={()=>setModal({type:"addYt",_ytUrl:""})}>+ 영상</Btn></div>}>
              {(data.ytChannels||[]).length>0&&(
                <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                  {(data.ytChannels||[]).map(ch=>(
                    <div key={ch.id} style={{background:ytChTab===ch.id?"#1e293b":"#0f172a",borderRadius:10,padding:"12px 16px",flex:"1 1 220px",border:ytChTab===ch.id?"1px solid #6366f1":"1px solid #1e293b",cursor:"pointer"}} onClick={()=>setYtChTab(ytChTab===ch.id?"all":ch.id)}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          {ch.thumbnail&&<img src={ch.thumbnail} alt="" style={{width:28,height:28,borderRadius:99}}/>}
                          <span style={{fontWeight:800,fontSize:14}}>{ch.name}</span>
                        </div>
                        <div style={{display:"flex",gap:4}}>
                          <button onClick={e=>{e.stopPropagation();ytRefreshChannel(ch);}} disabled={ytLoading==="ch_"+ch.id} style={{background:"#334155",border:"none",color:"#06b6d4",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11}}>{ytLoading==="ch_"+ch.id?"⏳":"↻"}</button>
                          <button onClick={e=>{e.stopPropagation();if(confirm(ch.name+" 채널을 삭제하시겠습니까?"))upd("ytChannels",(data.ytChannels||[]).filter(x=>x.id!==ch.id));}} style={{background:"#334155",border:"none",color:"#ef4444",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11}}>✕</button>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                        <div><div style={{color:"#94a3b8",fontSize:11}}>구독자</div><div style={{color:"#f43f5e",fontWeight:800,fontSize:15}}>{(ch.subscribers||0).toLocaleString()}명</div></div>
                        <div><div style={{color:"#94a3b8",fontSize:11}}>총 조회수</div><div style={{color:"#06b6d4",fontWeight:800,fontSize:15}}>{(ch.totalViews||0).toLocaleString()}</div></div>
                        <div><div style={{color:"#94a3b8",fontSize:11}}>영상</div><div style={{color:"#a78bfa",fontWeight:800,fontSize:15}}>{ch.videoCount||0}개</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(data.ytChannels||[]).length>0&&(
                <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                  <button onClick={()=>setYtChTab("all")} style={{background:ytChTab==="all"?"#6366f1":"#1e293b",color:ytChTab==="all"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:ytChTab==="all"?700:400}}>전체 ({data.youtube.length})</button>
                  {(data.ytChannels||[]).map(ch=><button key={ch.id} onClick={()=>setYtChTab(ch.id)} style={{background:ytChTab===ch.id?"#6366f1":"#1e293b",color:ytChTab===ch.id?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:ytChTab===ch.id?700:400}}>{ch.name} ({data.youtube.filter(y=>y.channelId===ch.id).length})</button>)}
                  <button onClick={()=>setYtChTab("noChannel")} style={{background:ytChTab==="noChannel"?"#6366f1":"#1e293b",color:ytChTab==="noChannel"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:ytChTab==="noChannel"?700:400}}>직접추가 ({data.youtube.filter(y=>!y.channelId).length})</button>
                </div>
              )}
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr><Th c="제목"/><Th c="조회수"/><Th c="댓글"/><Th c="좋아요"/><Th c="갱신"/><Th c="URL"/><Th c=""/></tr></thead>
                <tbody>{data.youtube.filter(y=>ytChTab==="all"?true:ytChTab==="noChannel"?!y.channelId:y.channelId===ytChTab).map((y,ri)=>(
                  <tr key={y.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                    <Td><LinkCell url={y.url}><span style={{fontWeight:700}}>{y.title}</span></LinkCell></Td>
                    <Td><span style={{color:"#06b6d4"}}>{fmt(y.views)}</span></Td>
                    <Td><button onClick={()=>setModal({type:"comments",comments:y.comments,title:y.title})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:12}}>💬 {y.commentCount||y.comments?.length||0}</button></Td>
                    <Td><span style={{color:"#f43f5e"}}>{fmt(y.likes)}</span></Td>
                    <Td><span style={{color:"#475569",fontSize:12}}>{y.lastUpdated}</span></Td>
                    <Td><div style={{display:"flex",gap:6}}><input value={y.url||""} onChange={e=>upd("youtube",data.youtube.map(r=>r.id===y.id?{...r,url:e.target.value}:r))} placeholder="URL" style={{background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"5px 9px",color:"#94a3b8",fontSize:12,width:140}}/><button onClick={()=>ytRefresh(y,"youtube")} disabled={ytLoading===y.id} style={{background:ytLoading===y.id?"#1e293b":"#334155",border:"none",color:"#06b6d4",borderRadius:6,padding:"5px 9px",cursor:"pointer",fontSize:12}}>{ytLoading===y.id?"⏳":"↻"}</button></div></Td>
                    <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editYt",item:y})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>del("youtube",y.id)}/></div></Td>
                  </tr>
                ))}</tbody>
              </table>
              {modal?.type==="editYt"&&<Modal title="유튜브 편집" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","url:URL","views:조회수","likes:좋아요수"]} initial={modal.item} onSave={f=>{upd("youtube",data.youtube.map(x=>x.id===modal.item.id?{...x,...f,views:+f.views||0,likes:+f.likes||0}:x));setModal(null);}}/></Modal>}
              {modal?.type==="addYt"&&<Modal title="유튜브 추가" onClose={()=>setModal(null)}><div>
                <FF label="YouTube URL"><Inp value={modal?._ytUrl||""} onChange={v=>setModal({...modal,_ytUrl:v})} placeholder="https://youtube.com/watch?v=... 또는 shorts/..."/></FF>
                <Btn onClick={async()=>{const ok=await ytAddByUrl(modal?._ytUrl||"","youtube");if(ok)setModal(null);}} disabled={ytLoading==="adding"} style={{width:"100%",marginTop:4}}>{ytLoading==="adding"?"⏳ 데이터 가져오는 중...":"URL로 자동 추가"}</Btn>
                <div style={{textAlign:"center",color:"#475569",fontSize:12,margin:"10px 0"}}>또는 직접 입력</div>
                <SimpleForm fields={["title:제목","url:URL","views:조회수","likes:좋아요수"]} onSave={f=>{upd("youtube",[...data.youtube,{...f,id:Date.now(),views:+f.views||0,likes:+f.likes||0,lastUpdated:today(),comments:[]}]);setModal(null);}}/></div></Modal>}
              {modal?.type==="addYtCh"&&<Modal title="📺 채널 등록" onClose={()=>setModal(null)}><div>
                <FF label="채널 URL 또는 이름"><Inp value={modal?._chUrl||""} onChange={v=>setModal({...modal,_chUrl:v})} placeholder="https://youtube.com/@채널명 또는 채널 검색어"/></FF>
                <div style={{color:"#64748b",fontSize:11,marginBottom:8}}>예: https://youtube.com/@channelname, 채널명 직접 검색도 가능</div>
                <Btn onClick={async()=>{await ytAddChannel(modal?._chUrl||"");setModal(null);}} disabled={ytLoading==="addCh"} style={{width:"100%"}}>{ytLoading==="addCh"?"⏳ 채널 검색 중...":"채널 등록 + 영상 자동 수집"}</Btn>
              </div></Modal>}
              {modal?.type==="comments"&&<CommentsPanel comments={modal.comments} title={modal.title} onClose={()=>setModal(null)}/>}
            </SectionWithCost>
  );
}
