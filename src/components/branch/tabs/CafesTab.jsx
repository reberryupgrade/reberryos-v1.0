"use client";
import { CHANNEL_COLORS } from "@/src/lib/constants";
import { fmt } from "@/src/lib/format";
import { Th, Td, Btn, LinkCell, DelBtn, Modal, CommentsPanel, SectionWithCost } from "@/src/components/ui";
import { SimpleForm } from "@/src/components/forms";

export function CafesTab({data,modal,setModal,upd}){
  return (
            <SectionWithCost title="카페 바이럴" costLabel="카페 바이럴 월 집행비" cost={data.cafesCost} onCostChange={v=>upd("cafesCost",v)} color={CHANNEL_COLORS.cafes} right={<Btn onClick={()=>setModal("cafe")}>+ 카페</Btn>}>
              {data.cafes.map(cafe=>(
                <div key={cafe.id} style={{background:"#0f172a",borderRadius:14,padding:"16px 18px",marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <LinkCell url={cafe.url}><span style={{fontWeight:800,fontSize:15}}>{cafe.name}</span></LinkCell>
                      <span style={{color:"#64748b",fontSize:12}}>회원 {cafe.members}</span>
                      <span style={{background:cafe.penetrated?"#10b981":"#ef4444",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{cafe.penetrated?"✓ 완료":"✗ 미침투"}</span>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <button onClick={()=>setModal({type:"editCafe",item:cafe})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:12}}>편집</button><button onClick={()=>upd("cafes",data.cafes.map(c=>c.id===cafe.id?{...c,penetrated:!c.penetrated}:c))} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:12}}>상태전환</button>
                      <Btn onClick={()=>setModal({type:"addPost",cafeId:cafe.id})} style={{padding:"5px 12px",fontSize:12}}>+ 게시물</Btn>
                      <DelBtn onClick={()=>upd("cafes",data.cafes.filter(c=>c.id!==cafe.id))}/>
                    </div>
                  </div>
                  {cafe.posts.length>0&&(
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                      <thead><tr><Th c="게시물"/><Th c="조회수"/><Th c="댓글"/><Th c="URL"/><Th c=""/></tr></thead>
                      <tbody>{cafe.posts.map(post=>(
                        <tr key={post.id} style={{borderBottom:"1px solid #0f172a"}}>
                          <Td><LinkCell url={post.url}><span style={{fontWeight:600}}>{post.title}</span></LinkCell></Td>
                          <Td><span style={{color:"#06b6d4"}}>{fmt(post.views)}</span></Td>
                          <Td><button onClick={()=>setModal({type:"comments",comments:post.comments,title:post.title})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:12}}>💬 {post.comments?.length||0}</button></Td>
                          <Td><input value={post.url||""} onChange={e=>upd("cafes",data.cafes.map(c=>c.id===cafe.id?{...c,posts:c.posts.map(p=>p.id===post.id?{...p,url:e.target.value}:p)}:c))} placeholder="URL" style={{background:"#0f172a",border:"1px solid #334155",borderRadius:6,padding:"5px 9px",color:"#94a3b8",fontSize:12,width:140}}/></Td>
                          <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editPost",cafeId:cafe.id,item:post})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>upd("cafes",data.cafes.map(c=>c.id===cafe.id?{...c,posts:c.posts.filter(p=>p.id!==post.id)}:c))}/></div></Td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
              ))}
              {modal?.type==="editCafe"&&<Modal title="카페 편집" onClose={()=>setModal(null)}><SimpleForm fields={["name:카페명","members:회원수|예: 5만","url:카페 URL"]} initial={modal.item} onSave={f=>{upd("cafes",data.cafes.map(c=>c.id===modal.item.id?{...c,...f}:c));setModal(null);}}/></Modal>}
              {modal==="cafe"&&<Modal title="카페 추가" onClose={()=>setModal(null)}><SimpleForm fields={["name:카페명","members:회원수|예: 5만","url:카페 URL"]} onSave={f=>{upd("cafes",[...data.cafes,{...f,id:Date.now(),penetrated:false,posts:[]}]);setModal(null);}}/></Modal>}
              {modal?.type==="editPost"&&<Modal title="게시물 편집" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","url:URL","views:조회수"]} initial={modal.item} onSave={f=>{upd("cafes",data.cafes.map(c=>c.id===modal.cafeId?{...c,posts:c.posts.map(p=>p.id===modal.item.id?{...p,...f,views:+f.views||0}:p)}:c));setModal(null);}}/></Modal>}
              {modal?.type==="addPost"&&<Modal title="게시물 추가" onClose={()=>setModal(null)}><SimpleForm fields={["title:제목","url:URL","views:조회수"]} onSave={f=>{upd("cafes",data.cafes.map(c=>c.id===modal.cafeId?{...c,posts:[...c.posts,{...f,id:Date.now(),views:+f.views||0,comments:[]}]}:c));setModal(null);}}/></Modal>}
              {modal?.type==="comments"&&<CommentsPanel comments={modal.comments} title={modal.title} onClose={()=>setModal(null)}/>}
            </SectionWithCost>
  );
}
