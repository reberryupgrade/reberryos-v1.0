"use client";
import { CHANNEL_COLORS } from "@/src/lib/constants";
import { fmt, today } from "@/src/lib/format";
import { Th, Td, Btn, DelBtn, Modal, ProgressBar, SectionWithCost } from "@/src/components/ui";
import { SimpleForm } from "@/src/components/forms";
import { PhotoViewer } from "@/src/components/PhotoViewer";

export function InhouseTab({data,handleImgUpload,inhouseTab,modal,setInhouseTab,setModal,updN}){
  return (
            <div>
              <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
                {[{id:"messages",label:"정기 메시지"},{id:"reviews",label:"리뷰 관리"},{id:"photos",label:"전후 사진"},{id:"videos",label:"원내 영상"}].map(t=>(
                  <button key={t.id} onClick={()=>setInhouseTab(t.id)} style={{background:inhouseTab===t.id?"#6366f1":"#1e293b",color:inhouseTab===t.id?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:inhouseTab===t.id?700:400,fontSize:13}}>{t.label}</button>
                ))}
              </div>
              {inhouseTab==="messages"&&(
                <SectionWithCost title="정기 메시지" costLabel="메시지 월 집행비" cost={data.inhouse.messagesCost} onCostChange={v=>updN("inhouse","messagesCost",v)} color={CHANNEL_COLORS.inhouse_messages} right={<Btn onClick={()=>setModal("addMsg")}>+ 추가</Btn>}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr><Th c="제목"/><Th c="플랫폼"/><Th c="발송일"/><Th c="발송수"/><Th c="오픈율"/><Th c="상태"/><Th c=""/></tr></thead>
                    <tbody>{data.inhouse.messages.map((m,ri)=>(
                      <tr key={m.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{fontWeight:700}}>{m.title}</span></Td>
                        <Td><span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{m.platform}</span></Td>
                        <Td>{m.sentDate}</Td>
                        <Td><span style={{color:"#06b6d4"}}>{fmt(m.recipients)}명</span></Td>
                        <Td><span style={{color:"#10b981",fontWeight:700}}>{m.openRate}</span></Td>
                        <Td><span style={{background:m.status==="완료"?"#10b981":"#f59e0b",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{m.status}</span></Td>
                        <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editMsg",item:m})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("inhouse","messages",data.inhouse.messages.filter(x=>x.id!==m.id))}/></div></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {modal?.type==="editMsg"&&<Modal title="메시지 편집" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","platform:플랫폼|카카오 / 문자 / 이메일","sentDate:발송일","recipients:발송수","openRate:오픈율|예: 35%","status:상태|예정 / 진행중 / 완료"]} initial={modal.item} onSave={f=>{updN("inhouse","messages",data.inhouse.messages.map(x=>x.id===modal.item.id?{...x,...f,recipients:+f.recipients||0}:x));setModal(null);}}/></Modal>}
                  {modal==="addMsg"&&<Modal title="메시지 추가" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","platform:플랫폼|카카오 / 문자 / 이메일","sentDate:발송일","recipients:발송수","openRate:오픈율|예: 35%","status:상태|예정 / 진행중 / 완료"]} onSave={f=>{updN("inhouse","messages",[...data.inhouse.messages,{...f,id:Date.now(),recipients:+f.recipients||0}]);setModal(null);}}/></Modal>}
                </SectionWithCost>
              )}
              {inhouseTab==="reviews"&&(
                <SectionWithCost title="리뷰 관리" costLabel="리뷰 월 집행비" cost={data.inhouse.reviewsCost} onCostChange={v=>updN("inhouse","reviewsCost",v)} color={CHANNEL_COLORS.inhouse_reviews} right={<Btn onClick={()=>setModal("addReview")}>+ 추가</Btn>}>
                  {data.inhouse.reviews.map(r=>(
                    <div key={r.id} style={{background:"#0f172a",borderRadius:12,padding:"14px 16px",marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <span style={{fontWeight:700,fontSize:14}}>{r.platform}</span>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <span style={{color:"#94a3b8",fontSize:12}}>{r.lastUpdated}</span>
                          <button onClick={()=>{const d=Math.floor(Math.random()*5+1);updN("inhouse","reviews",data.inhouse.reviews.map(rv=>rv.id===r.id?{...rv,count:rv.count+d,lastUpdated:today()}:rv));}} style={{background:"#334155",border:"none",color:"#06b6d4",borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:12}}>↻</button>
                          <button onClick={()=>setModal({type:"editReview",item:r})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("inhouse","reviews",data.inhouse.reviews.filter(x=>x.id!==r.id))}/>
                        </div>
                      </div>
                      <ProgressBar value={r.count} max={r.target} color={r.count>=r.target?"#10b981":"#6366f1"}/>
                    </div>
                  ))}
                  {modal?.type==="editReview"&&<Modal title="리뷰 편집" onClose={()=>setModal(null)}><SimpleForm fields={["platform:플랫폼","count:현재 리뷰수","target:목표 리뷰수"]} initial={modal.item} onSave={f=>{updN("inhouse","reviews",data.inhouse.reviews.map(x=>x.id===modal.item.id?{...x,...f,count:+f.count||0,target:+f.target||100}:x));setModal(null);}}/></Modal>}
                  {modal==="addReview"&&<Modal title="리뷰 플랫폼 추가" onClose={()=>setModal(null)}><SimpleForm fields={["platform:플랫폼","count:현재 리뷰수","target:목표 리뷰수"]} onSave={f=>{updN("inhouse","reviews",[...data.inhouse.reviews,{...f,id:Date.now(),count:+f.count||0,target:+f.target||100,lastUpdated:today()}]);setModal(null);}}/></Modal>}
                </SectionWithCost>
              )}
              {inhouseTab==="photos"&&(
                <SectionWithCost title="전후 사진" costLabel="사진 월 집행비" cost={data.inhouse.photosCost} onCostChange={v=>updN("inhouse","photosCost",v)} color={CHANNEL_COLORS.inhouse_photos} right={<Btn onClick={()=>setModal("addPhoto")}>+ 세트</Btn>}>
                  {data.inhouse.photos.map(p=>(
                    <div key={p.id} style={{background:"#0f172a",borderRadius:14,padding:"16px 18px",marginBottom:14}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <button onClick={()=>setModal({type:"photoViewer",photo:p,startIdx:0})} style={{background:"none",border:"none",color:"#6366f1",fontWeight:800,fontSize:15,cursor:"pointer",textDecoration:"underline",padding:0}}>{p.title}</button>
                          <span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{p.category}</span>
                          <span style={{color:"#64748b",fontSize:12}}>{(p.images||[]).length}장</span>
                        </div>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <label style={{background:"#10b981",color:"#fff",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",fontWeight:600}}>📷 추가<input type="file" multiple accept="image/*" style={{display:"none"}} onChange={e=>handleImgUpload(p.id,e.target.files)}/></label>
                          <button onClick={()=>setModal({type:"editPhoto",item:p})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("inhouse","photos",data.inhouse.photos.filter(x=>x.id!==p.id))}/>
                        </div>
                      </div>
                      {(p.images||[]).length>0&&(
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          {p.images.map((img,ii)=>(
                            <div key={ii} onClick={()=>setModal({type:"photoViewer",photo:p,startIdx:ii})} style={{width:72,height:72,borderRadius:8,overflow:"hidden",cursor:"pointer",background:"#1e293b",border:"1px solid #334155",flexShrink:0}}>
                              <img src={img.dataUrl} alt={img.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {modal?.type==="editPhoto"&&<Modal title="전후사진 편집" onClose={()=>setModal(null)}><SimpleForm fields={["title:세트 제목","category:시술 카테고리"]} initial={modal.item} onSave={f=>{updN("inhouse","photos",data.inhouse.photos.map(x=>x.id===modal.item.id?{...x,...f}:x));setModal(null);}}/></Modal>}
                  {modal==="addPhoto"&&<Modal title="전후사진 세트 추가" onClose={()=>setModal(null)}><SimpleForm fields={["title:세트 제목","category:시술 카테고리"]} onSave={f=>{updN("inhouse","photos",[...data.inhouse.photos,{...f,id:Date.now(),lastUpdated:today(),images:[]}]);setModal(null);}}/></Modal>}
                  {modal?.type==="photoViewer"&&<PhotoViewer photo={modal.photo} startIdx={modal.startIdx||0} onClose={()=>setModal(null)} onDelete={(photoId,imgId)=>{updN("inhouse","photos",data.inhouse.photos.map(p=>p.id===photoId?{...p,images:p.images.filter(i=>i.id!==imgId)}:p));setModal(null);}}/>}
                </SectionWithCost>
              )}
              {inhouseTab==="videos"&&(
                <SectionWithCost title="원내 영상" costLabel="영상 월 집행비" cost={data.inhouse.videosCost} onCostChange={v=>updN("inhouse","videosCost",v)} color={CHANNEL_COLORS.inhouse_videos} right={<Btn onClick={()=>setModal("addVid")}>+ 추가</Btn>}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr><Th c="제목"/><Th c="위치"/><Th c="러닝타임"/><Th c="갱신"/><Th c="URL"/><Th c=""/></tr></thead>
                    <tbody>{data.inhouse.videos.map((v,ri)=>(
                      <tr key={v.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{fontWeight:700}}>{v.title}</span></Td>
                        <Td><span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{v.location}</span></Td>
                        <Td>{v.duration}</Td>
                        <Td><span style={{color:"#475569",fontSize:12}}>{v.lastUpdated}</span></Td>
                        <Td><input value={v.url||""} onChange={e=>updN("inhouse","videos",data.inhouse.videos.map(vi=>vi.id===v.id?{...vi,url:e.target.value}:vi))} placeholder="링크" style={{background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"5px 9px",color:"#94a3b8",fontSize:12,width:160}}/></Td>
                        <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editVid",item:v})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("inhouse","videos",data.inhouse.videos.filter(x=>x.id!==v.id))}/></div></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {modal?.type==="editVid"&&<Modal title="영상 편집" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","location:상영 위치","duration:러닝타임","url:링크"]} initial={modal.item} onSave={f=>{updN("inhouse","videos",data.inhouse.videos.map(x=>x.id===modal.item.id?{...x,...f}:x));setModal(null);}}/></Modal>}
                  {modal==="addVid"&&<Modal title="영상 추가" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","location:상영 위치","duration:러닝타임","url:링크"]} onSave={f=>{updN("inhouse","videos",[...data.inhouse.videos,{...f,id:Date.now(),lastUpdated:today()}]);setModal(null);}}/></Modal>}
                </SectionWithCost>
              )}
            </div>
  );
}
