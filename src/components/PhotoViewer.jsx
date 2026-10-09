"use client";
import { useState } from "react";
import { Modal } from "@/src/components/ui";

export function PhotoViewer({photo,startIdx,onClose,onDelete}){
  const[idx,setIdx]=useState(startIdx||0);
  const imgs=photo.images||[];const cur=imgs[idx];
  return (
    <Modal title={photo.title} onClose={onClose} extraWide>
      {!imgs.length?<div style={{color:"#475569",textAlign:"center",padding:40}}>사진이 없습니다.</div>:(
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:16}}>
            <button onClick={()=>setIdx(i=>Math.max(0,i-1))} disabled={idx===0} style={{background:"#334155",border:"none",color:idx===0?"#334155":"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:idx===0?"default":"pointer",fontSize:18}}>‹</button>
            <div style={{flex:1,maxWidth:600,textAlign:"center"}}>
              <img src={cur?.dataUrl} alt={cur?.name} style={{maxWidth:"100%",maxHeight:420,borderRadius:10,objectFit:"contain"}}/>
              <div style={{color:"#94a3b8",fontSize:12,marginTop:8}}>{cur?.name} ({idx+1}/{imgs.length})</div>
            </div>
            <button onClick={()=>setIdx(i=>Math.min(imgs.length-1,i+1))} disabled={idx===imgs.length-1} style={{background:"#334155",border:"none",color:idx===imgs.length-1?"#334155":"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:idx===imgs.length-1?"default":"pointer",fontSize:18}}>›</button>
          </div>
          <div style={{textAlign:"center"}}>
            <button onClick={()=>{if(cur)onDelete(photo.id,cur.id);}} style={{background:"#ef4444",border:"none",color:"#fff",borderRadius:8,padding:"7px 16px",cursor:"pointer",fontSize:13,fontWeight:600}}>🗑 현재 사진 삭제</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
