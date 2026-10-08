"use client";
import { SC, SL } from "@/src/lib/constants";
import { fmt, calcDelta, getDday } from "@/src/lib/format";

export const SAVE_BADGE={saving:["저장 중…","#64748b"],saved:["저장됨","#10b981"],error:["저장 실패","#ef4444"],conflict:["충돌 확인 필요","#f59e0b"]};

export const SaveBadge=({status})=>{const s=SAVE_BADGE[status];if(!s)return null;return <span style={{color:s[1],fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>● {s[0]}</span>;};

// Shared UI
export const Badge=({status})=> <span style={{background:SC[status]||"#475569",color:"#fff",borderRadius:99,padding:"2px 10px",fontSize:12,fontWeight:700}}>{SL[status]||status}</span>;

export const Th=({c,style={}})=><th style={{padding:"10px 14px",color:"#94a3b8",textAlign:"left",fontWeight:600,whiteSpace:"nowrap",background:"#1e293b",...style}}>{c}</th>;

export const Td=({children,style={}})=><td style={{padding:"10px 14px",color:"#e2e8f0",...style}}>{children}</td>;

export const Btn=({onClick,children,color="#10b981",style={}})=><button onClick={onClick} style={{background:color,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:13,cursor:"pointer",fontWeight:600,...style}}>{children}</button>;

export const Inp=({value,onChange,placeholder,type="text",style={}})=><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"7px 11px",color:"#f1f5f9",fontSize:13,width:"100%",boxSizing:"border-box",...style}}/>;

export const FF=({label,children})=><div style={{marginBottom:14}}><div style={{color:"#94a3b8",fontSize:12,marginBottom:5}}>{label}</div>{children}</div>;

export const LinkCell=({url,children})=>url?<a href={url} target="_blank" rel="noreferrer" style={{color:"#6366f1",textDecoration:"underline"}}>{children}</a>:<span>{children}</span>;

export const DelBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick();}} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:14,padding:"2px 6px",opacity:0.6}} title="삭제">✕</button>;

export const CostBox=({label,value,onChange,color="#f59e0b"})=>(
  <div style={{background:"#0f172a",borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
    <span style={{color:"#94a3b8",fontSize:13,fontWeight:600}}>{label}</span>
    <div style={{display:"flex",alignItems:"center",gap:4}}>
      <span style={{color:"#64748b",fontSize:12}}>₩</span>
      <input type="number" value={value||""} onChange={e=>onChange(+e.target.value||0)} placeholder="0"
        style={{background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"5px 10px",color,fontSize:14,fontWeight:700,width:120,textAlign:"right"}}/>
      <span style={{color:"#64748b",fontSize:11}}>/월</span>
    </div>
  </div>
);

export const Modal=({title,onClose,children,wide,extraWide})=>(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:"#1e293b",borderRadius:16,padding:28,width:"90%",maxWidth:extraWide?920:wide?720:520,maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontWeight:800,fontSize:17}}>{title}</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

export const CommentsPanel=({comments,title,onClose})=>(
  <Modal title={`💬 ${title}`} onClose={onClose}>
    {(!comments||!comments.length)?<div style={{color:"#475569"}}>댓글이 없습니다.</div>
    :comments.map((c,i)=>(
      <div key={i} style={{background:"#0f172a",borderRadius:10,padding:"12px 14px",marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontWeight:700,fontSize:13,color:"#6366f1"}}>@{c.author}</span>
          <span style={{color:"#475569",fontSize:11}}>{c.date}</span>
        </div>
        <div style={{color:"#e2e8f0",fontSize:14}}>{c.text}</div>
      </div>
    ))}
  </Modal>
);

export const ProgressBar=({value,max,color="#6366f1"})=>{
  const pct=max>0?Math.min(100,Math.round(value/max*100)):0;
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,background:"#0f172a",borderRadius:99,height:8,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,background:color,height:"100%",borderRadius:99}}/>
      </div>
      <span style={{color:"#94a3b8",fontSize:12,whiteSpace:"nowrap"}}>{fmt(value)}/{fmt(max)} ({pct}%)</span>
    </div>
  );
};

export const SectionWithCost=({title,costLabel,cost,onCostChange,color,children,right})=>(
  <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:15}}>{title}</div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>{right}</div>
    </div>
    <div style={{marginBottom:16}}>
      <CostBox label={costLabel||`${title} 월 집행비`} value={cost} onChange={onCostChange} color={color||"#f59e0b"}/>
    </div>
    {children}
  </div>
);

export const DeltaBadge=({cur,pre})=>{const d=calcDelta(cur,pre);if(!d)return null;return <span style={{background:d.up?"#022c22":"#2d0f0f",color:d.up?"#10b981":"#ef4444",borderRadius:99,padding:"1px 7px",fontSize:11,fontWeight:700,marginLeft:6}}>{d.up?"▲":"▼"}{Math.abs(d.pct)}%</span>;};

export const StatCard=({icon,label,value,color,cur,pre})=>(
  <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px",border:"1px solid #1e293b"}}>
    <div style={{fontSize:22,marginBottom:6}}>{icon}</div>
    <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>{label}</div>
    <div style={{display:"flex",alignItems:"baseline",gap:4}}>
      <span style={{color,fontSize:20,fontWeight:800}}>{value}</span>
      <DeltaBadge cur={cur} pre={pre}/>
    </div>
  </div>
);

export function DdayBadge({dateStr}){
  const d=getDday(dateStr);
  const color=d<0?"#475569":d===0?"#ef4444":d<=3?"#ef4444":d<=7?"#f59e0b":d<=14?"#f59e0b":"#10b981";
  const bg=d<0?"#1e293b":d<=3?"#2d0f0f":d<=7?"#422006":"#022c22";
  const label=d<0?`D+${Math.abs(d)}`:d===0?"D-Day":`D-${d}`;
  return <span style={{background:bg,color,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:800}}>{label}</span>;
}

export const RankBadge=({value,color})=>{
  if(!value||value==="-")return <span style={{color:"#334155",fontSize:12}}>—</span>;
  const n=parseInt(value);
  const bg=n===1?"#10b981":n<=3?color||"#6366f1":n<=5?"#f59e0b":n<=10?"#f97316":"#ef4444";
  return <span style={{background:bg,color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:800,display:"inline-block",minWidth:28,textAlign:"center"}}>{value}</span>;
};
