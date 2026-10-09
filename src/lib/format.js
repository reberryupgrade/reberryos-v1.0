

export const fmt=n=>(n||0).toLocaleString();

export const fmtW=n=>"₩"+(n||0).toLocaleString();

export const today=()=>new Date().toISOString().slice(0,10);

export const calcDelta=(cur,p)=>{if(!p||!cur)return null;const d=cur-p;return{val:d,pct:p?Math.round(d/p*100):0,up:d>=0};};

// D-day calculator
export function getDday(dateStr){
  const t=new Date(dateStr);const n=new Date();t.setHours(0,0,0,0);n.setHours(0,0,0,0);
  return Math.ceil((t-n)/(1000*60*60*24));
}
