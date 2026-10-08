"use client";
import { useState, useRef, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell, AreaChart, Area, Legend } from "recharts";
import * as XLSX from "xlsx";
import { extractYtId, fetchYtVideo, fetchYtComments, resolveYtChannelId, fetchYtChannelVideos } from "@/src/lib/youtube";
import { TAB_TYPES, COMM_PLATFORMS, TABS, CHANNEL_COLORS, EVENT_TYPES, PRIORITY_OPTS, RANK_FIELDS } from "@/src/lib/constants";
import { fmt, fmtW, today, getDday } from "@/src/lib/format";
import { exportExcel } from "@/src/lib/excel";
import { Badge, Th, Td, Btn, Inp, FF, LinkCell, DelBtn, CostBox, Modal, CommentsPanel, ProgressBar, SectionWithCost, SaveBadge, RankBadge, DdayBadge } from "@/src/components/ui";
import { SimpleForm, OfflineForm, EventForm, TodoForm, PerfForm, KwForm, MapForm, ACForm, SeoFormInner } from "@/src/components/forms";
import { ClientPortal } from "@/src/components/ClientPortal";
import { PhotoViewer } from "@/src/components/PhotoViewer";

export function BranchApp({branchId,branchName,data,setData,user,onBack,onLogout,saveStatus}){
  const[tab,setTab]=useState("overview");
  const[modal,setModal]=useState(null);
  const[sidebar,setSidebar]=useState(true);
  const[aiLoading,setAiLoading]=useState(false);
  const[aiResult,setAiResult]=useState([]);
  const[aiRegion,setAiRegion]=useState("");
  const[aiSpec,setAiSpec]=useState("");
  const[commTab,setCommTab]=useState("당근마켓");
  const[inhouseTab,setInhouseTab]=useState("messages");
  const[offlineTab,setOfflineTab]=useState("elevator");
  const[portalView,setPortalView]=useState(false);
  const[budgetTab,setBudgetTab]=useState("cost");
  const[calTab,setCalTab]=useState("calendar");
  const[calMonth,setCalMonth]=useState(()=>{const n=new Date();return{y:n.getFullYear(),m:n.getMonth()};});
  const fileRef=useRef();
  const mapFileRef=useRef();

  const upd=(k,v)=>setData(d=>({...d,[k]:v}));
  const updN=(o,k,v)=>setData(d=>({...d,[o]:{...d[o],[k]:v}}));
  const updComm=(p,k,v)=>setData(d=>({...d,community:{...d.community,[p]:{...d.community[p],[k]:v}}}));
  const del=(key,id)=>upd(key,data[key].filter(r=>r.id!==id));


  const[ytLoading,setYtLoading]=useState(null);

  const[rankLoading,setRankLoading]=useState(null);
  const dataRef=useRef(data);
  useEffect(()=>{dataRef.current=data;},[data]);
  const fetchRankData=async(keyword,targets)=>{
    const res=await fetch("/api/naver-rank",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({keyword,targets})});
    return await res.json();
  };
  const applyRankResult=(kwId,d)=>{
    const r=d.results||{};
    const k=(dataRef.current.keywords||[]).find(x=>x.id===kwId)||{};
    const updates={lastRankCheck:today()};
    if(r.blog?.rank)updates.myBlogRank=r.blog.rank+"위";
    else if(r.blog?.titles?.length)updates.myBlogRank="미노출";
    if(r.place?.rank)updates.myPlaceRank=r.place.rank+"위";
    else if(r.place?.titles?.length)updates.myPlaceRank="미노출";
    if(r.cafe?.rank)updates.rankCafe=r.cafe.rank+"위";
    else if(r.cafe?.titles?.length)updates.rankCafe="미노출";
    if(r.knowledge?.rank)updates.rankKnowledge=r.knowledge.rank+"위";
    if(r.news?.rank)updates.rankNews=r.news.rank+"위";
    if(r.powerlink?.rank)updates.rankPowerlink=r.powerlink.rank+"위";
    if(r.googleMap?.rank)updates.rankGoogle=r.googleMap.rank+"위";
    else if(r.googleMap?.titles?.length)updates.rankGoogle="미노출";
    if(r.kakaoMap?.rank)updates.rankKakao=r.kakaoMap.rank+"위";
    else if(r.kakaoMap?.titles?.length)updates.rankKakao="미노출";
    updates._kakaoInfo={titles:r.kakaoMap?.titles||[],rank:r.kakaoMap?.rank||null,debug:r.kakaoMap?._debug||null};
    if(r.tabOrder&&r.tabOrder.length>0)updates.detectedTabOrder=r.tabOrder;
    if(r.monthlySearch)updates.monthlySearch=r.monthlySearch;
    if(r.monthlySearchDetail)updates.monthlySearchDetail=r.monthlySearchDetail;
    updates._rankDetail={
      blog:r.blog?.titles||[],place:r.place?.titles||[],cafe:r.cafe?.titles||[],
      knowledge:r.knowledge?.titles||[],news:r.news?.titles||[],
      powerlink:r.powerlink?.titles||[],naverMap:r.naverMap?.titles||[],
      googleMap:r.googleMap?.titles||[],kakaoMap:r.kakaoMap?.titles||[],
      tabOrder:r.tabOrder&&r.tabOrder.length>0?r.tabOrder:(k.detectedTabOrder||[]),
      _tabDebug:r._tabDebug||null,
      _placeDebug:r.place?._debug||null
    };
    return updates;
  };
  const checkNaverRank=async(kwItem)=>{
    const targets=dataRef.current.rankTargets||{};
    if(!targets.blogName&&!targets.placeName&&!targets.cafeName){alert("먼저 '내 콘텐츠 식별자'를 설정해주세요 (블로그명, 업체명 등)");return;}
    setRankLoading(kwItem.id);
    try{
      const d=await fetchRankData(kwItem.keyword,targets);
      if(d.error){alert("오류: "+d.error);setRankLoading(null);return;}
      const updates=applyRankResult(kwItem.id,d);
      upd("keywords",dataRef.current.keywords.map(k=>k.id===kwItem.id?{...k,...updates}:k));
    }catch(e){alert("네트워크 오류: "+e.message);}
    setRankLoading(null);
  };
  const checkAllRanks=async()=>{
    const targets=dataRef.current.rankTargets||{};
    if(!targets.blogName&&!targets.placeName&&!targets.cafeName){alert("먼저 '내 콘텐츠 식별자'를 설정해주세요");return;}
    const kws=[...dataRef.current.keywords];
    if(!kws.length)return;
    setRankLoading("all");
    const BATCH=3;
    let done=0;
    for(let i=0;i<kws.length;i+=BATCH){
      const batch=kws.slice(i,i+BATCH);
      const results=await Promise.allSettled(batch.map(kw=>fetchRankData(kw.keyword,targets).then(d=>({kw,d})).catch(e=>({kw,d:{error:e.message}}))));
      let cur=dataRef.current.keywords;
      for(const r of results){
        if(r.status==="fulfilled"&&!r.value.d.error){
          const{kw,d}=r.value;
          const updates=applyRankResult(kw.id,d);
          cur=cur.map(k=>k.id===kw.id?{...k,...updates}:k);
        }
        done++;
      }
      upd("keywords",cur);
      setRankLoading(`all:${done}/${kws.length}`);
      if(i+BATCH<kws.length)await new Promise(r=>setTimeout(r,500));
    }
    setRankLoading(null);
  };
  const checkMapRank=async(mapItem)=>{
    const targets=dataRef.current.rankTargets||{};
    if(!targets.placeName){alert("먼저 '내 콘텐츠 식별자'에서 업체명을 설정해주세요");return;}
    setRankLoading("map_"+mapItem.id);
    try{
      const d=await fetchRankData(mapItem.keyword,targets);
      if(!d.error){
        const r=d.results||{};
        const updates={lastRankCheck:today()};
        if(r.place?.rank)updates.naverPlace=r.place.rank+"위";
        else if(r.place?.titles?.length)updates.naverPlace="미노출";
        if(r.googleMap?.rank)updates.google=r.googleMap.rank+"위";
        else if(r.googleMap?.titles?.length)updates.google="미노출";
        if(r.kakaoMap?.rank)updates.kakao=r.kakaoMap.rank+"위";
        else if(r.kakaoMap?.titles?.length)updates.kakao="미노출";
        updates._mapDetail={place:r.place?.titles||[],googleMap:r.googleMap?.titles||[],kakaoMap:r.kakaoMap?.titles||[],_placeDebug:r.place?._debug||null,_kakaoDebug:r.kakaoMap?._debug||null,_googleDebug:r.googleMap?.error||null};
        const rn=parseInt(updates.naverPlace)||99;const rg=parseInt(updates.google)||99;const rk=parseInt(updates.kakao)||99;
        const best=Math.min(rn,rg,rk);updates.status=best<=3?"good":best<=5?"warn":"danger";
        upd("maps",dataRef.current.maps.map(m=>m.id===mapItem.id?{...m,...updates}:m));
      }
    }catch(e){console.error(e);}
    setRankLoading(null);
  };
  const checkAllMapRanks=async()=>{
    const targets=dataRef.current.rankTargets||{};
    if(!targets.placeName){alert("먼저 업체명을 설정해주세요");return;}
    const maps=[...dataRef.current.maps];
    if(!maps.length)return;
    setRankLoading("allMaps");
    const BATCH=3;
    let done=0;
    for(let i=0;i<maps.length;i+=BATCH){
      const batch=maps.slice(i,i+BATCH);
      const results=await Promise.allSettled(batch.map(m=>fetchRankData(m.keyword,targets).then(d=>({m,d})).catch(e=>({m,d:{error:e.message}}))));
      let cur=dataRef.current.maps;
      for(const res of results){
        if(res.status==="fulfilled"&&!res.value.d.error){
          const{m,d}=res.value;
          const r=d.results||{};
          const updates={lastRankCheck:today()};
          if(r.place?.rank)updates.naverPlace=r.place.rank+"위";
          else if(r.place?.titles?.length)updates.naverPlace="미노출";
          if(r.googleMap?.rank)updates.google=r.googleMap.rank+"위";
          else if(r.googleMap?.titles?.length)updates.google="미노출";
          if(r.kakaoMap?.rank)updates.kakao=r.kakaoMap.rank+"위";
          else if(r.kakaoMap?.titles?.length)updates.kakao="미노출";
          updates._mapDetail={place:r.place?.titles||[],googleMap:r.googleMap?.titles||[],kakaoMap:r.kakaoMap?.titles||[],_placeDebug:r.place?._debug||null,_kakaoDebug:r.kakaoMap?._debug||null,_googleDebug:r.googleMap?.error||null};
          const rn=parseInt(updates.naverPlace)||99;const rg=parseInt(updates.google)||99;const rk=parseInt(updates.kakao)||99;
          const best=Math.min(rn,rg,rk);updates.status=best<=3?"good":best<=5?"warn":"danger";
          cur=cur.map(x=>x.id===m.id?{...x,...updates}:x);
        }
        done++;
      }
      upd("maps",cur);
      setRankLoading(`allMaps:${done}/${maps.length}`);
      if(i+BATCH<maps.length)await new Promise(r=>setTimeout(r,500));
    }
    setRankLoading(null);
  };
  const fetchReviews=async(keyword,platform="naver")=>{
    const targets=dataRef.current.rankTargets||{};
    if(!targets.placeName){alert("업체명을 먼저 설정해주세요");return;}
    setRankLoading("reviews_"+platform);
    try{
      const res=await fetch("/api/naver-rank",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({keyword,targets,action:"reviews",platform})});
      const d=await res.json();
      if(d.results?.reviews){setModal({type:"reviews",data:d.results.reviews,keyword,platform});}
      else{alert((platform==="naver"?"플레이스":platform==="google"?"구글맵":"카카오맵")+" 리뷰를 가져올 수 없습니다.");}
    }catch(e){alert("오류: "+e.message);}
    setRankLoading(null);
  };
  const runApiDiag=async()=>{
    setRankLoading("diag");
    try{
      const res=await fetch("/api/naver-rank/test");
      const d=await res.json();
      setModal({type:"apiDiag",data:d});
    }catch(e){alert("진단 실패: "+e.message);}
    setRankLoading(null);
  };
  const[ytChTab,setYtChTab]=useState("all");
  const ytRefresh=async(item,key="youtube")=>{
    const vid=extractYtId(item.url);if(!vid){alert("유효한 YouTube URL이 아닙니다.");return;}
    setYtLoading(item.id);
    try{
      const[vd,cm]=await Promise.all([fetchYtVideo(vid),fetchYtComments(vid)]);
      if(!vd){alert("영상 정보를 가져올 수 없습니다.");setYtLoading(null);return;}
      const updated={...item,title:vd.title||item.title,views:vd.views,likes:vd.likes,commentCount:vd.commentCount,comments:cm,channelTitle:vd.channelTitle,channelId:vd.channelId,thumbnail:vd.thumbnail,lastUpdated:today()};
      upd(key,data[key].map(r=>r.id===item.id?{...r,...updated}:r));
    }catch(e){alert("API 오류: "+e.message);}
    setYtLoading(null);
  };
  const ytAddByUrl=async(url,key="youtube",platform="")=>{
    const vid=extractYtId(url);if(!vid){alert("유효한 YouTube URL이 아닙니다.");return false;}
    setYtLoading("adding");
    try{
      const[vd,cm]=await Promise.all([fetchYtVideo(vid),fetchYtComments(vid)]);
      if(!vd){alert("영상 정보를 가져올 수 없습니다.");setYtLoading(null);return false;}
      const entry={id:Date.now(),url,title:vd.title,views:vd.views,likes:vd.likes,commentCount:vd.commentCount,comments:cm,channelTitle:vd.channelTitle,channelId:vd.channelId,thumbnail:vd.thumbnail,lastUpdated:today()};
      if(platform)entry.platform=platform;
      upd(key,[...data[key],entry]);
    }catch(e){alert("API 오류: "+e.message);}
    setYtLoading(null);return true;
  };
  const ytAddChannel=async(input)=>{
    setYtLoading("addCh");
    try{
      const cid=await resolveYtChannelId(input);
      if(!cid){alert("채널을 찾을 수 없습니다.");setYtLoading(null);return;}
      if((data.ytChannels||[]).some(c=>c.id===cid)){alert("이미 등록된 채널입니다.");setYtLoading(null);return;}
      const result=await fetchYtChannelVideos(cid);
      if(!result){alert("채널 정보를 가져올 수 없습니다.");setYtLoading(null);return;}
      const ch={...result.channel,id:cid,addedAt:today()};
      upd("ytChannels",[...(data.ytChannels||[]),ch]);
      const newVids=result.videos.filter(v=>!data.youtube.some(y=>y.url===v.url)).map(v=>({...v,id:Date.now()+Math.random(),channelId:cid,channelTitle:result.channel.name,lastUpdated:today(),comments:[]}));
      if(newVids.length)upd("youtube",[...data.youtube,...newVids]);
      alert(`${result.channel.name} 등록 완료! ${newVids.length}개 영상 추가됨`);
    }catch(e){alert("오류: "+e.message);}
    setYtLoading(null);
  };
  const ytRefreshChannel=async(ch)=>{
    setYtLoading("ch_"+ch.id);
    try{
      const result=await fetchYtChannelVideos(ch.id);
      if(!result){setYtLoading(null);return;}
      upd("ytChannels",(data.ytChannels||[]).map(c=>c.id===ch.id?{...c,...result.channel}:c));
      const newVids=result.videos.filter(v=>!data.youtube.some(y=>y.url===v.url)).map(v=>({...v,id:Date.now()+Math.random(),channelId:ch.id,channelTitle:result.channel.name,lastUpdated:today(),comments:[]}));
      if(newVids.length)upd("youtube",[...data.youtube,...newVids]);
    }catch(e){console.error(e);}
    setYtLoading(null);
  };

  const simRefresh=(key,item)=>{upd(key,data[key].map(r=>r.id===item.id?{...r,views:Math.max(0,(r.views||0)+Math.floor(Math.random()*200+20)),lastUpdated:today()}:r));};
  const simRefreshComm=(p,item)=>{updComm(p,"items",data.community[p].items.map(r=>r.id===item.id?{...r,views:Math.max(0,(r.views||0)+Math.floor(Math.random()*100+10)),lastUpdated:today()}:r));};

  const handleExcel=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{const wb=XLSX.read(ev.target.result,{type:"binary"});const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{header:1});
      const nk=rows.slice(1).filter(r=>r[0]).map((r,i)=>({id:Date.now()+i,keyword:String(r[0]).trim(),tabOrder:[...TAB_TYPES],myBlogRank:r[1]||"-",myPlaceRank:r[2]||"-",status:"warn"}));
      upd("keywords",[...data.keywords,...nk]);alert(`${nk.length}개 키워드 추가 완료`);};
    reader.readAsBinaryString(file);e.target.value="";
  };
  const handleGoogleSheet=async()=>{
    const url=prompt("구글시트 링크를 붙여넣으세요:\n\n※ 시트가 '링크가 있는 모든 사용자에게 공개'로 설정되어야 합니다.\n※ A열: 키워드 (필수), B열: 블로그순위, C열: 플레이스순위, D열: 월검색량\n※ 1행은 헤더로 건너뜁니다.");
    if(!url)return;
    const idMatch=url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if(!idMatch){alert("유효한 구글시트 URL이 아닙니다.\n예: https://docs.google.com/spreadsheets/d/1abc.../edit");return;}
    const sheetId=idMatch[1];
    const gidMatch=url.match(/gid=(\d+)/);
    const gid=gidMatch?gidMatch[1]:"0";
    const csvUrl=`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    try{
      setRankLoading("gsheet");
      const res=await fetch(csvUrl);
      if(!res.ok)throw new Error(`시트 접근 실패 (${res.status}). 공유 설정을 확인하세요.`);
      const text=await res.text();
      const lines=text.split("\n").map(l=>{
        const cells=[];let cur="",inQ=false;
        for(let i=0;i<l.length;i++){const c=l[i];if(c==='"'){inQ=!inQ;}else if(c===","&&!inQ){cells.push(cur.trim());cur="";}else{cur+=c;}}
        cells.push(cur.trim());return cells;
      });
      const nk=lines.slice(1).filter(r=>r[0]&&r[0].length>0).map((r,i)=>({
        id:Date.now()+i,keyword:r[0].replace(/^"|"$/g,"").trim(),tabOrder:[...TAB_TYPES],
        myBlogRank:r[1]||"-",myPlaceRank:r[2]||"-",monthlySearch:r[3]?parseInt(r[3]):null,status:"warn"
      }));
      if(nk.length===0){alert("키워드를 찾을 수 없습니다. A열에 키워드를 입력해주세요.");setRankLoading(null);return;}
      upd("keywords",[...data.keywords,...nk]);
      alert(`✅ ${nk.length}개 키워드 추가 완료!`);
    }catch(e){alert("구글시트 불러오기 실패: "+e.message);}
    setRankLoading(null);
  };
  const handleMapExcel=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{const wb=XLSX.read(ev.target.result,{type:"binary"});const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{header:1});
      const nm=rows.slice(1).filter(r=>r[0]).map((r,i)=>({id:Date.now()+i,keyword:String(r[0]).trim(),naverPlace:"-",google:"-",kakao:"-",status:"warn"}));
      upd("maps",[...data.maps,...nm]);alert(`${nm.length}개 지도 키워드 추가 완료`);};
    reader.readAsBinaryString(file);e.target.value="";
  };
  const handleMapGoogleSheet=async()=>{
    const url=prompt("구글시트 링크를 붙여넣으세요:\n\n※ 시트가 '링크가 있는 모든 사용자에게 공개'로 설정되어야 합니다.\n※ A열: 키워드 (필수)\n※ 1행은 헤더로 건너뜁니다.");
    if(!url)return;
    const idMatch=url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if(!idMatch){alert("유효한 구글시트 URL이 아닙니다.");return;}
    const sheetId=idMatch[1];
    const gidMatch=url.match(/gid=(\d+)/);
    const gid=gidMatch?gidMatch[1]:"0";
    try{
      setRankLoading("gsheetMap");
      const res=await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`);
      if(!res.ok)throw new Error(`시트 접근 실패 (${res.status}). 공유 설정을 확인하세요.`);
      const text=await res.text();
      const lines=text.split("\n").map(l=>{
        const cells=[];let cur="",inQ=false;
        for(let i=0;i<l.length;i++){const c=l[i];if(c==='"'){inQ=!inQ;}else if(c===","&&!inQ){cells.push(cur.trim());cur="";}else{cur+=c;}}
        cells.push(cur.trim());return cells;
      });
      const nm=lines.slice(1).filter(r=>r[0]&&r[0].length>0).map((r,i)=>({
        id:Date.now()+i,keyword:r[0].replace(/^"|"$/g,"").trim(),naverPlace:"-",google:"-",kakao:"-",status:"warn"
      }));
      if(nm.length===0){alert("키워드를 찾을 수 없습니다. A열에 키워드를 입력해주세요.");setRankLoading(null);return;}
      upd("maps",[...data.maps,...nm]);
      alert(`✅ ${nm.length}개 지도 키워드 추가 완료!`);
    }catch(e){alert("구글시트 불러오기 실패: "+e.message);}
    setRankLoading(null);
  };
  const callAI=async()=>{
    if(!aiRegion)return alert("지역을 입력해주세요.");
    setAiLoading(true);setAiResult([]);
    try{const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,messages:[{role:"user",content:`당신은 한국 로컬 마케팅 전문가입니다. ${aiRegion} 지역의 ${aiSpec||"미용 피부과/성형외과"} 병원에 방문할 잠재 고객이 네이버에서 검색할만한 키워드를 중요도 순으로 20개 제안해주세요. 월간 예상 검색량과 지난 12개월 월별 추이를 포함하세요. JSON 배열로만:\n[{"keyword":"강남 피부과","priority":1,"monthlySearch":12000,"trend":[{"month":"1월","count":10000},{"month":"2월","count":11000},{"month":"3월","count":13000},{"month":"4월","count":14000},{"month":"5월","count":13500},{"month":"6월","count":12000},{"month":"7월","count":11000},{"month":"8월","count":10500},{"month":"9월","count":11500},{"month":"10월","count":12500},{"month":"11월","count":13000},{"month":"12월","count":12000}]}]`}]})});
      const d=await res.json();setAiResult(JSON.parse((d.content?.[0]?.text||"[]").replace(/```json|```/g,"").trim()));
    }catch{setAiResult([]);}setAiLoading(false);
  };
  const addAIKws=()=>{upd("keywords",[...data.keywords,...aiResult.map((r,i)=>({id:Date.now()+i,keyword:r.keyword,tabOrder:[...TAB_TYPES],myBlogRank:"-",myPlaceRank:"-",status:"warn",monthlySearch:r.monthlySearch,trend:r.trend}))]);setModal(null);setAiResult([]);};
  const handleImgUpload=(photoId,files)=>{
    Promise.all(Array.from(files).map(f=>new Promise(res=>{const r=new FileReader();r.onload=ev=>res({id:Date.now()+Math.random(),name:f.name,dataUrl:ev.target.result});r.readAsDataURL(f);}))).then(imgs=>updN("inhouse","photos",data.inhouse.photos.map(p=>p.id===photoId?{...p,images:[...(p.images||[]),...imgs]}:p)));
  };

  // Budget calc
  const calcBudget=()=>{
    const offTotal=[...data.offline.elevator,...data.offline.subway,...data.offline.other].filter(a=>a.status==="집행중").reduce((a,b)=>a+(+b.cost||0),0);
    const rows=[
      ...Object.entries(data.keywordCosts||{}).filter(([,v])=>v>0).map(([k,v])=>({label:`키워드·${k}`,cost:v,color:CHANNEL_COLORS.keywords})),
      {label:"지도 노출",cost:data.mapsCost||0,color:CHANNEL_COLORS.maps},
      {label:"체험단",cost:data.experienceCost||0,color:CHANNEL_COLORS.experience},
      {label:"카페 바이럴",cost:data.cafesCost||0,color:CHANNEL_COLORS.cafes},
      {label:"유튜브",cost:data.youtubeCost||0,color:CHANNEL_COLORS.youtube},
      {label:"숏폼",cost:data.shortformCost||0,color:CHANNEL_COLORS.shortform},
      {label:"자동완성",cost:data.autocompleteCost||0,color:CHANNEL_COLORS.autocomplete},
      {label:"홈페이지 SEO",cost:data.seoCost||0,color:CHANNEL_COLORS.seo},
      ...COMM_PLATFORMS.filter(p=>(data.community[p]?.cost||0)>0).map(p=>({label:`커뮤·${p}`,cost:data.community[p].cost||0,color:CHANNEL_COLORS[`community_${p}`]||"#94a3b8"})),
      {label:"원내·메시지",cost:data.inhouse.messagesCost||0,color:CHANNEL_COLORS.inhouse_messages},
      {label:"원내·리뷰",cost:data.inhouse.reviewsCost||0,color:CHANNEL_COLORS.inhouse_reviews},
      {label:"원내·사진",cost:data.inhouse.photosCost||0,color:CHANNEL_COLORS.inhouse_photos},
      {label:"원내·영상",cost:data.inhouse.videosCost||0,color:CHANNEL_COLORS.inhouse_videos},
      {label:"오프라인",cost:offTotal,color:CHANNEL_COLORS.offline},
    ];
    return{rows,total:rows.reduce((a,b)=>a+b.cost,0)};
  };
  const{rows:budgetRows,total:budgetTotal}=calcBudget();

  // ROI Calculation
  const calcROI=()=>{
    const conv=data.conversions||{};
    const avgRev=data.avgRevenuePerPatient||0;
    const latest=data.performanceLogs?.[data.performanceLogs.length-1]||{};
    const kwCost=Object.values(data.keywordCosts||{}).reduce((a,b)=>a+b,0);
    const commCost=Object.values(data.community||{}).reduce((a,p)=>a+(p.cost||0),0);
    const inhCost=(data.inhouse?.messagesCost||0)+(data.inhouse?.reviewsCost||0)+(data.inhouse?.photosCost||0)+(data.inhouse?.videosCost||0);
    const offCost=[...data.offline.elevator,...data.offline.subway,...data.offline.other].filter(a=>a.status==="집행중").reduce((a,b)=>a+(+b.cost||0),0);
    const cafeViews=(data.cafes||[]).reduce((a,c)=>a+c.posts.reduce((b,p)=>b+(p.views||0),0),0);
    const commViews=Object.values(data.community||{}).reduce((a,p)=>a+(p.items||[]).reduce((b,i)=>b+(i.views||0),0),0);

    const channels=[
      {key:"keywords",label:"네이버 키워드",cost:kwCost,views:(latest.blog_visits||0),patients:conv.keywords||0,color:"#6366f1",icon:"🔍"},
      {key:"maps",label:"지도 노출",cost:data.mapsCost||0,views:(latest.place_views||0),patients:conv.maps||0,color:"#06b6d4",icon:"📍"},
      {key:"experience",label:"체험단",cost:data.experienceCost||0,views:data.experience?.reduce((a,e)=>a+(e.views||0),0)||0,patients:conv.experience||0,color:"#10b981",icon:"📝"},
      {key:"cafes",label:"카페 바이럴",cost:data.cafesCost||0,views:cafeViews,patients:conv.cafes||0,color:"#ec4899",icon:"☕"},
      {key:"youtube",label:"유튜브",cost:data.youtubeCost||0,views:data.youtube?.reduce((a,y)=>a+(y.views||0),0)||0,patients:conv.youtube||0,color:"#f97316",icon:"📺"},
      {key:"shortform",label:"숏폼",cost:data.shortformCost||0,views:data.shortform?.reduce((a,s)=>a+(s.views||0),0)||0,patients:conv.shortform||0,color:"#8b5cf6",icon:"🎬"},
      {key:"autocomplete",label:"자동완성",cost:data.autocompleteCost||0,views:0,patients:conv.autocomplete||0,color:"#14b8a6",icon:"⌨️"},
      {key:"seo",label:"홈페이지 SEO",cost:data.seoCost||0,views:0,patients:conv.seo||0,color:"#0ea5e9",icon:"🌐"},
      {key:"community",label:"커뮤니티",cost:commCost,views:commViews,patients:conv.community||0,color:"#f97316",icon:"👥"},
      {key:"inhouse",label:"원내 마케팅",cost:inhCost,views:0,patients:conv.inhouse||0,color:"#3b82f6",icon:"🏥"},
      {key:"offline",label:"오프라인",cost:offCost,views:0,patients:conv.offline||0,color:"#ef4444",icon:"📋"},
    ];
    const totalPatients=channels.reduce((a,c)=>a+c.patients,0);
    return{channels,totalPatients,avgRev};
  };
  const roi=calcROI();
  const stats=[
    {title:"총 키워드",value:data.keywords.length,color:"#10b981"},
    {title:"지도 1위",value:data.maps.filter(m=>m.naverPlace==="1위").length,color:"#06b6d4"},
    {title:"카페 침투",value:`${data.cafes.filter(c=>c.penetrated).length}/${data.cafes.length}`,color:"#ec4899"},
    {title:"유튜브 조회",value:fmt(data.youtube.reduce((a,b)=>a+b.views,0)),color:"#f97316"},
    {title:"숏폼 조회",value:fmt(data.shortform.reduce((a,b)=>a+b.views,0)),color:"#8b5cf6"},
    {title:"월 총 비용",value:fmtW(budgetTotal),color:"#f59e0b"},
  ];

  return (
    <div style={{display:"flex",height:"100vh",background:"#0f172a",color:"#f1f5f9",fontFamily:"'Apple SD Gothic Neo',sans-serif",overflow:"hidden"}}>
      {/* Sidebar */}
      <div style={{width:sidebar?208:52,background:"#0a0f1e",flexShrink:0,borderRight:"1px solid #1e293b",display:"flex",flexDirection:"column",transition:"width 0.2s",overflow:"hidden"}}>
        <div style={{padding:"14px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #1e293b"}}>
          {sidebar&&<span style={{fontWeight:800,fontSize:15,color:"#6366f1",whiteSpace:"nowrap"}}>REBERRYOS</span>}
          <button onClick={()=>setSidebar(!sidebar)} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:18,flexShrink:0}}>☰</button>
        </div>
        {onBack&&(
          <button onClick={onBack} style={{display:"flex",alignItems:"center",padding:"10px 14px",background:"#1e1b4b",border:"none",color:"#a5b4fc",cursor:"pointer",textAlign:"left",fontWeight:600,fontSize:12,borderBottom:"1px solid #1e293b",whiteSpace:"nowrap",overflow:"hidden"}}>
            {sidebar?"← 지점 목록":"←"}
          </button>
        )}
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);if(t.id!=="portal")setPortalView(false);}}
            style={{display:"flex",alignItems:"center",padding:"10px 14px",background:tab===t.id?"#1e293b":"none",border:"none",color:tab===t.id?"#6366f1":"#94a3b8",cursor:"pointer",textAlign:"left",fontWeight:tab===t.id?700:400,fontSize:13,borderLeft:tab===t.id?"3px solid #6366f1":"3px solid transparent",whiteSpace:"nowrap",overflow:"hidden"}}>
            {sidebar?t.label:t.label[0]}
          </button>
        ))}
        <div style={{flex:1}}/>
        <div style={{padding:"8px 10px",borderTop:"1px solid #1e293b"}}>
          {sidebar&&<div style={{color:"#64748b",fontSize:11,marginBottom:6}}>👤 {user.name}</div>}
          <button onClick={onLogout} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11,width:"100%"}}>{sidebar?"로그아웃":"🚪"}</button>
        </div>
      </div>

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"13px 24px",borderBottom:"1px solid #1e293b",background:"#0a0f1e",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontWeight:800,fontSize:17}}>{branchName&&<span style={{color:"#a5b4fc",marginRight:8,fontSize:13,background:"#1e1b4b",borderRadius:6,padding:"2px 8px"}}>{branchName}</span>}{TABS.find(t=>t.id===tab)?.label}</div>
          </div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <SaveBadge status={saveStatus}/>
            <Btn onClick={()=>exportExcel(data,branchName)} color="#334155" style={{color:"#94a3b8",padding:"5px 12px",fontSize:12}}>📥 엑셀</Btn>
          </div>
        </div>

        <div style={{flex:1,overflow:"auto",padding:"20px 24px"}}>

          {/* OVERVIEW */}
          {tab==="overview"&&(
            <div>
              {/* D-Day Alerts Banner */}
              {(()=>{
                const urgentItems=[];
                (data.calendarEvents||[]).filter(e=>e.type==="deadline"&&!e.done).forEach(e=>{const d=getDday(e.date);if(d>=0&&d<=7)urgentItems.push({title:e.title,date:e.date,d});});
                [...(data.offline?.elevator||[]),...(data.offline?.subway||[]),...(data.offline?.other||[])].filter(a=>a.status==="집행중").forEach(a=>{const d=getDday(a.endDate);if(d>=0&&d<=14)urgentItems.push({title:`${a.complex||a.station||a.location||a.type} 광고 종료`,date:a.endDate,d});});
                (data.todos||[]).filter(t=>!t.done).forEach(t=>{const d=getDday(t.dueDate);if(d>=0&&d<=3)urgentItems.push({title:t.text,date:t.dueDate,d});});
                urgentItems.sort((a,b)=>a.d-b.d);
                if(!urgentItems.length)return null;
                return (
                  <div style={{background:"linear-gradient(135deg,#2d0f0f,#422006)",borderRadius:12,padding:"14px 18px",marginBottom:16,border:"1px solid #ef444433",cursor:"pointer"}} onClick={()=>{setTab("calendar");setCalTab("alerts");}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:20}}>🔔</span>
                      <div style={{flex:1}}>
                        <div style={{color:"#ef4444",fontWeight:700,fontSize:13,marginBottom:4}}>긴급 알림 {urgentItems.length}건</div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          {urgentItems.slice(0,4).map((a,i)=>(
                            <span key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:12}}>
                              <DdayBadge dateStr={a.date}/>
                              <span style={{color:"#f1f5f9"}}>{a.title}</span>
                            </span>
                          ))}
                          {urgentItems.length>4&&<span style={{color:"#64748b",fontSize:11}}>외 {urgentItems.length-4}건</span>}
                        </div>
                      </div>
                      <span style={{color:"#64748b",fontSize:12}}>상세보기 →</span>
                    </div>
                  </div>
                );
              })()}

              {/* Todo Progress Mini */}
              {(()=>{
                const todos=data.todos||[];
                const pending=todos.filter(t=>!t.done);
                if(!pending.length)return null;
                const done=todos.filter(t=>t.done).length;
                const pct=todos.length>0?Math.round(done/todos.length*100):0;
                return (
                  <div style={{background:"#1e293b",borderRadius:12,padding:"12px 16px",marginBottom:16,cursor:"pointer"}} onClick={()=>{setTab("calendar");setCalTab("todos");}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <span style={{color:"#94a3b8",fontSize:12,fontWeight:600}}>✅ 할 일 진행 ({done}/{todos.length})</span>
                      <span style={{color:pct>=80?"#10b981":"#f59e0b",fontWeight:800,fontSize:13}}>{pct}%</span>
                    </div>
                    <div style={{background:"#0f172a",borderRadius:99,height:6,overflow:"hidden",marginBottom:8}}>
                      <div style={{width:`${pct}%`,background:pct>=80?"#10b981":"#f59e0b",height:"100%",borderRadius:99}}/>
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {pending.slice(0,3).map(t=>{
                        const pr=PRIORITY_OPTS.find(p=>p.v===t.priority);
                        return <span key={t.id} style={{background:"#0f172a",borderRadius:6,padding:"3px 8px",fontSize:11,color:pr?.c||"#94a3b8",borderLeft:`2px solid ${pr?.c||"#f59e0b"}`}}>{t.text}</span>;
                      })}
                      {pending.length>3&&<span style={{color:"#475569",fontSize:11}}>+{pending.length-3}건</span>}
                    </div>
                  </div>
                );
              })()}

              <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:24}}>
                {stats.map((s,i)=>(
                  <div key={i} style={{background:"#1e293b",borderRadius:12,padding:"15px 18px",flex:"1 1 110px"}}>
                    <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>{s.title}</div>
                    <div style={{color:s.color,fontSize:22,fontWeight:800}}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px",marginBottom:20}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>월간 마케팅 비용</div>
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={budgetRows.filter(r=>r.cost>0)} margin={{top:0,right:10,left:0,bottom:0}}>
                    <XAxis dataKey="label" tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v=>[fmtW(v),"비용"]} contentStyle={{background:"#0f172a",border:"none",fontSize:11}}/>
                    <Bar dataKey="cost" radius={[4,4,0,0]}>{budgetRows.filter(r=>r.cost>0).map((r,i)=><Cell key={i} fill={r.color}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:10}}>
                {TABS.slice(3).map((t,i)=>(
                  <div key={i} onClick={()=>setTab(t.id)} style={{background:"#1e293b",borderRadius:12,padding:"13px 15px",cursor:"pointer",border:"1px solid #334155"}}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:3}}>{t.label}</div>
                    <div style={{color:"#64748b",fontSize:11}}>클릭하여 이동</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PERFORMANCE */}
          {tab==="performance"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                <div><div style={{fontWeight:800,fontSize:16}}>성과 추이 분석</div></div>
                <Btn color="#334155" style={{color:"#94a3b8"}} onClick={()=>setModal("addPerf")}>+ 데이터 입력</Btn>
              </div>
              <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px",marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>📺 콘텐츠 조회수 추이</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.performanceLogs||[]} margin={{top:10,right:20,left:10,bottom:0}}>
                    <defs>
                      <linearGradient id="ytG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                      <linearGradient id="sfG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/>
                    <XAxis dataKey="period" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:"#94a3b8"}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} width={40}/>
                    <Tooltip formatter={(v,n)=>[fmt(v)+"회",n==="youtube_views"?"유튜브":"숏폼"]} contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:12}}/>
                    <Legend formatter={n=>n==="youtube_views"?"유튜브":"숏폼"} wrapperStyle={{fontSize:12}}/>
                    <Area type="monotone" dataKey="youtube_views" stroke="#f97316" fill="url(#ytG)" strokeWidth={2} dot={{fill:"#f97316",r:3}}/>
                    <Area type="monotone" dataKey="shortform_views" stroke="#8b5cf6" fill="url(#sfG)" strokeWidth={2} dot={{fill:"#8b5cf6",r:3}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px",marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🗺️ 네이버 노출 추이</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data.performanceLogs||[]} margin={{top:10,right:20,left:10,bottom:0}}>
                    <defs>
                      <linearGradient id="blG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                      <linearGradient id="plG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/>
                    <XAxis dataKey="period" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:"#94a3b8"}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} width={40}/>
                    <Tooltip formatter={(v,n)=>[fmt(v)+"회",n==="blog_visits"?"블로그":"플레이스"]} contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:12}}/>
                    <Legend formatter={n=>n==="blog_visits"?"블로그":"플레이스"} wrapperStyle={{fontSize:12}}/>
                    <Area type="monotone" dataKey="blog_visits" stroke="#6366f1" fill="url(#blG)" strokeWidth={2} dot={{fill:"#6366f1",r:3}}/>
                    <Area type="monotone" dataKey="place_views" stroke="#06b6d4" fill="url(#plG)" strokeWidth={2} dot={{fill:"#06b6d4",r:3}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
                <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px"}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>⭐ 신규 리뷰</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={data.performanceLogs||[]}><CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/><XAxis dataKey="period" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:"#94a3b8"}} width={26}/><Tooltip formatter={v=>[v+"건","리뷰"]} contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:11}}/><Bar dataKey="new_reviews" fill="#10b981" radius={[3,3,0,0]}/></BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px"}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>☕ 카페 게시물</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={data.performanceLogs||[]}><CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/><XAxis dataKey="period" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:"#94a3b8"}} width={26}/><Tooltip formatter={v=>[v+"건","게시물"]} contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:11}}/><Bar dataKey="cafe_posts" fill="#ec4899" radius={[3,3,0,0]}/></BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px"}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>📋 월별 상세</div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead><tr><Th c="기간"/><Th c="유튜브"/><Th c="숏폼"/><Th c="블로그"/><Th c="플레이스"/><Th c="리뷰"/><Th c="카페"/><Th c="메모"/><Th c=""/></tr></thead>
                    <tbody>{(data.performanceLogs||[]).map((log,ri)=>(
                      <tr key={log.id} style={{borderBottom:"1px solid #0f172a",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{fontWeight:700,color:"#6366f1"}}>{log.period}</span></Td>
                        <Td><span style={{color:"#f97316"}}>{fmt(log.youtube_views)}</span></Td>
                        <Td><span style={{color:"#8b5cf6"}}>{fmt(log.shortform_views)}</span></Td>
                        <Td><span style={{color:"#6366f1"}}>{fmt(log.blog_visits)}</span></Td>
                        <Td><span style={{color:"#06b6d4"}}>{fmt(log.place_views)}</span></Td>
                        <Td><span style={{color:"#10b981"}}>{log.new_reviews}건</span></Td>
                        <Td><span style={{color:"#ec4899"}}>{log.cafe_posts}건</span></Td>
                        <Td><span style={{color:"#64748b",fontSize:11}}>{log.notes||"-"}</span></Td>
                        <Td><DelBtn onClick={()=>upd("performanceLogs",(data.performanceLogs||[]).filter(l=>l.id!==log.id))}/></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
              {modal==="addPerf"&&<Modal title="📊 성과 데이터 입력" onClose={()=>setModal(null)}><PerfForm onSave={f=>{upd("performanceLogs",[...(data.performanceLogs||[]),{...f,id:Date.now()}]);setModal(null);}}/></Modal>}
            </div>
          )}

          {/* PORTAL */}
          {tab==="portal"&&(
            <div>
              {!portalView?(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                    <div><div style={{fontWeight:800,fontSize:16}}>클라이언트 포털 설정</div><div style={{color:"#64748b",fontSize:12,marginTop:2}}>고객사에게 보여줄 보고서를 설정합니다</div></div>
                    <Btn onClick={()=>setPortalView(true)} color="#6366f1">👁 포털 미리보기</Btn>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>기본 정보</div>
                      <FF label="병원/클라이언트명"><Inp value={data.portalConfig?.clinicName||""} onChange={v=>updN("portalConfig","clinicName",v)}/></FF>
                      <FF label="보고 기간"><Inp value={data.portalConfig?.reportMonth||""} onChange={v=>updN("portalConfig","reportMonth",v)}/></FF>
                      <FF label="담당자명"><Inp value={data.portalConfig?.managerName||""} onChange={v=>updN("portalConfig","managerName",v)}/></FF>
                      <FF label="로고 이모지"><Inp value={data.portalConfig?.logoText||""} onChange={v=>updN("portalConfig","logoText",v)}/></FF>
                    </div>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>공개 항목</div>
                      {[{key:"showKeywords",label:"키워드 순위"},{key:"showMaps",label:"지도 순위"},{key:"showYoutube",label:"유튜브"},{key:"showShortform",label:"숏폼"},{key:"showReviews",label:"리뷰 현황"},{key:"showCafes",label:"카페 바이럴"},{key:"showBudget",label:"마케팅 비용 (민감)"}].map(item=>(
                        <div key={item.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <span style={{fontSize:13}}>{item.label}</span>
                          <button onClick={()=>setData(d=>({...d,portalConfig:{...d.portalConfig,[item.key]:!d.portalConfig?.[item.key]}}))}
                            style={{background:data.portalConfig?.[item.key]?"#10b981":"#334155",border:"none",borderRadius:99,padding:"4px 16px",cursor:"pointer",color:"#fff",fontSize:12,fontWeight:600}}>{data.portalConfig?.[item.key]?"공개":"비공개"}</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                    <FF label="클라이언트 메모">
                      <textarea value={data.portalConfig?.memo||""} onChange={e=>setData(d=>({...d,portalConfig:{...d.portalConfig,memo:e.target.value}}))}
                        placeholder="안녕하세요! 이번 달 보고서입니다..." style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:13,width:"100%",boxSizing:"border-box",minHeight:80,resize:"vertical"}}/>
                    </FF>
                  </div>
                </div>
              ):(
                <ClientPortal data={data} onClose={()=>setPortalView(false)} budgetTotal={budgetTotal}/>
              )}
            </div>
          )}

          {/* BUDGET + ROI */}
          {tab==="budget"&&(
            <div>
              <div style={{display:"flex",gap:8,marginBottom:20}}>
                <button onClick={()=>setBudgetTab("cost")} style={{background:budgetTab==="cost"?"#6366f1":"#1e293b",color:budgetTab==="cost"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>💰 비용 현황</button>
                <button onClick={()=>setBudgetTab("exposure")} style={{background:budgetTab==="exposure"?"#6366f1":"#1e293b",color:budgetTab==="exposure"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>📊 노출 효율</button>
                <button onClick={()=>setBudgetTab("cpa")} style={{background:budgetTab==="cpa"?"#6366f1":"#1e293b",color:budgetTab==="cpa"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>🎯 환자 획득 (CPA)</button>
              </div>

              {budgetTab==="cost"&&(
                <div>
                  <div style={{background:"#1e293b",borderRadius:14,padding:"20px 22px",marginBottom:20}}>
                    <div style={{color:"#94a3b8",fontSize:13,marginBottom:6}}>월간 총 마케팅 비용</div>
                    <div style={{color:"#f59e0b",fontSize:36,fontWeight:800}}>{fmtW(budgetTotal)}</div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:10,marginBottom:24}}>
                    {budgetRows.map((r,i)=>(
                      <div key={i} style={{background:"#1e293b",borderRadius:12,padding:"13px 16px",borderLeft:`3px solid ${r.color}`}}>
                        <div style={{color:"#94a3b8",fontSize:12,marginBottom:3}}>{r.label}</div>
                        <div style={{color:r.color,fontSize:18,fontWeight:800}}>{fmtW(r.cost)}</div>
                        {budgetTotal>0&&<div style={{color:"#475569",fontSize:11,marginTop:2}}>{r.cost>0?`${Math.round(r.cost/budgetTotal*100)}%`:"미입력"}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px"}}>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>채널별 비용 비교</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={budgetRows} margin={{top:0,right:10,left:10,bottom:50}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false}/>
                        <XAxis dataKey="label" tick={{fontSize:10,fill:"#94a3b8"}} angle={-35} textAnchor="end" axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:10,fill:"#94a3b8"}} tickFormatter={v=>`${(v/10000).toFixed(0)}만`} width={44}/>
                        <Tooltip formatter={v=>[fmtW(v),"비용"]} contentStyle={{background:"#0f172a",border:"none",fontSize:11}}/>
                        <Bar dataKey="cost" radius={[4,4,0,0]}>{budgetRows.map((r,i)=><Cell key={i} fill={r.color}/>)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {budgetTab==="exposure"&&(
                <div>
                  <div style={{background:"#1e293b",borderRadius:14,padding:"20px 22px",marginBottom:20}}>
                    <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>📊 비용 대비 노출 효율 분석</div>
                    <div style={{color:"#64748b",fontSize:12}}>₩1,000당 조회수를 기준으로 채널 효율을 비교합니다</div>
                  </div>
                  {(()=>{
                    const effData=roi.channels.filter(c=>c.cost>0&&c.views>0).map(c=>({
                      ...c,
                      viewsPer1000:Math.round(c.views/c.cost*1000),
                      costPerView:c.views>0?Math.round(c.cost/c.views):0,
                    })).sort((a,b)=>b.viewsPer1000-a.viewsPer1000);
                    const bestCh=effData[0];
                    return (
                      <div>
                        {bestCh&&(
                          <div style={{background:"linear-gradient(135deg,#022c22,#064e3b)",borderRadius:14,padding:"18px 22px",marginBottom:20,border:"1px solid #10b981"}}>
                            <div style={{color:"#10b981",fontSize:12,fontWeight:700,marginBottom:6}}>🏆 최고 효율 채널</div>
                            <div style={{display:"flex",alignItems:"baseline",gap:12}}>
                              <span style={{fontSize:28}}>{bestCh.icon}</span>
                              <span style={{color:"#fff",fontWeight:800,fontSize:20}}>{bestCh.label}</span>
                              <span style={{color:"#10b981",fontWeight:800,fontSize:18}}>₩1,000당 {fmt(bestCh.viewsPer1000)}회</span>
                            </div>
                          </div>
                        )}
                        <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px",marginBottom:16}}>
                          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>₩1,000당 조회수 비교</div>
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={effData} margin={{top:10,right:10,left:10,bottom:50}} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" horizontal={false}/>
                              <XAxis type="number" tick={{fontSize:11,fill:"#94a3b8"}} tickFormatter={v=>`${v}회`}/>
                              <YAxis type="category" dataKey="label" tick={{fontSize:12,fill:"#e2e8f0"}} width={90}/>
                              <Tooltip formatter={v=>[`${fmt(v)}회/₩1,000`,"노출 효율"]} contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:12}}/>
                              <Bar dataKey="viewsPer1000" radius={[0,4,4,0]}>
                                {effData.map((c,i)=><Cell key={i} fill={c.color}/>)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px"}}>
                          <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>채널별 상세</div>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                            <thead><tr><Th c="채널"/><Th c="월 비용"/><Th c="총 조회수"/><Th c="₩1,000당 조회"/><Th c="조회당 비용"/><Th c="효율등급"/></tr></thead>
                            <tbody>{roi.channels.filter(c=>c.cost>0||c.views>0).map((c,ri)=>{
                              const vp1k=c.cost>0&&c.views>0?Math.round(c.views/c.cost*1000):0;
                              const cpv=c.views>0?Math.round(c.cost/c.views):0;
                              const grade=vp1k>=10?"S":vp1k>=5?"A":vp1k>=2?"B":vp1k>0?"C":"-";
                              const gradeColor={S:"#10b981",A:"#6366f1",B:"#f59e0b",C:"#ef4444","-":"#475569"}[grade];
                              return (
                                <tr key={c.key} style={{borderBottom:"1px solid #0f172a",background:ri%2===0?"#0f172a":"#111827"}}>
                                  <Td><span style={{color:c.color,fontWeight:700}}>{c.icon} {c.label}</span></Td>
                                  <Td><span style={{color:"#f59e0b",fontWeight:700}}>{fmtW(c.cost)}</span></Td>
                                  <Td><span style={{color:"#06b6d4"}}>{c.views>0?fmt(c.views)+"회":"—"}</span></Td>
                                  <Td><span style={{fontWeight:800,color:c.cost>0&&c.views>0?"#e2e8f0":"#475569"}}>{vp1k>0?fmt(vp1k)+"회":"—"}</span></Td>
                                  <Td><span style={{color:"#94a3b8"}}>{cpv>0?fmtW(cpv):"—"}</span></Td>
                                  <Td><span style={{background:gradeColor,color:"#fff",borderRadius:6,padding:"2px 10px",fontSize:12,fontWeight:800}}>{grade}</span></Td>
                                </tr>
                              );
                            })}</tbody>
                          </table>
                          <div style={{marginTop:12,padding:"10px 14px",background:"#0f172a",borderRadius:8,fontSize:11,color:"#64748b"}}>
                            효율등급: <span style={{color:"#10b981"}}>S</span>=₩1,000당 10회↑ <span style={{color:"#6366f1"}}>A</span>=5~9회 <span style={{color:"#f59e0b"}}>B</span>=2~4회 <span style={{color:"#ef4444"}}>C</span>=1회이하
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {budgetTab==="cpa"&&(
                <div>
                  <div style={{background:"#1e293b",borderRadius:14,padding:"20px 22px",marginBottom:20}}>
                    <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>🎯 환자 획득 비용 (CPA) 분석</div>
                    <div style={{color:"#64748b",fontSize:12}}>채널별 신규 내원 환자 수를 입력하면 환자 1명 획득에 드는 비용을 분석합니다</div>
                  </div>

                  {/* Summary Cards */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:20}}>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                      <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>총 신규 내원</div>
                      <div style={{color:"#10b981",fontSize:28,fontWeight:800}}>{roi.totalPatients}명</div>
                    </div>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                      <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>평균 CPA</div>
                      <div style={{color:"#f59e0b",fontSize:28,fontWeight:800}}>{roi.totalPatients>0?fmtW(Math.round(budgetTotal/roi.totalPatients)):"—"}</div>
                    </div>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                      <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>월 총 비용</div>
                      <div style={{color:"#f59e0b",fontSize:24,fontWeight:800}}>{fmtW(budgetTotal)}</div>
                    </div>
                    <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px"}}>
                      <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>예상 ROAS</div>
                      <div style={{color:roi.totalPatients*roi.avgRev>budgetTotal?"#10b981":"#ef4444",fontSize:24,fontWeight:800}}>{budgetTotal>0&&roi.avgRev>0?`${Math.round(roi.totalPatients*roi.avgRev/budgetTotal*100)}%`:"—"}</div>
                    </div>
                  </div>

                  {/* 환자 1인당 평균 매출 입력 */}
                  <div style={{background:"#1e293b",borderRadius:14,padding:"16px 20px",marginBottom:20}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:14}}>💵 환자 1인당 평균 매출</div>
                        <div style={{color:"#64748b",fontSize:11,marginTop:2}}>초진 + 재진 평균 매출을 입력하면 ROAS를 계산합니다</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <span style={{color:"#64748b",fontSize:13}}>₩</span>
                        <input type="number" value={data.avgRevenuePerPatient||""} onChange={e=>upd("avgRevenuePerPatient",+e.target.value||0)} placeholder="500000"
                          style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"8px 12px",color:"#10b981",fontSize:18,fontWeight:800,width:160,textAlign:"right"}}/>
                      </div>
                    </div>
                  </div>

                  {/* 채널별 신규 내원 입력 */}
                  <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px",marginBottom:20}}>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>📋 채널별 월간 신규 내원 입력</div>
                    <div style={{color:"#64748b",fontSize:11,marginBottom:16}}>내원 시 설문, 전화 추적, 예약 경로 등으로 파악한 채널별 신규 환자 수를 입력하세요</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
                      {roi.channels.map(c=>{
                        const cpa=c.cost>0&&c.patients>0?Math.round(c.cost/c.patients):0;
                        return (
                          <div key={c.key} style={{background:"#0f172a",borderRadius:10,padding:"12px 14px",borderLeft:`3px solid ${c.color}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                              <span style={{fontSize:13,fontWeight:700,color:c.color}}>{c.icon} {c.label}</span>
                              {cpa>0&&<span style={{color:"#94a3b8",fontSize:11}}>CPA: {fmtW(cpa)}</span>}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <input type="number" value={data.conversions?.[c.key]||""} onChange={e=>upd("conversions",{...data.conversions,[c.key]:+e.target.value||0})}
                                placeholder="0" style={{background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"6px 10px",color:"#f1f5f9",fontSize:15,fontWeight:700,width:70,textAlign:"right"}}/>
                              <span style={{color:"#64748b",fontSize:12}}>명/월</span>
                              {c.cost>0&&<span style={{color:"#475569",fontSize:11,marginLeft:"auto"}}>비용: {fmtW(c.cost)}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* CPA 비교 차트 */}
                  {(()=>{
                    const cpaData=roi.channels.filter(c=>c.cost>0&&c.patients>0).map(c=>({
                      ...c,
                      cpa:Math.round(c.cost/c.patients),
                      revenue:c.patients*roi.avgRev,
                      roas:roi.avgRev>0?Math.round(c.patients*roi.avgRev/c.cost*100):0,
                    })).sort((a,b)=>a.cpa-b.cpa);
                    const bestCpa=cpaData[0];
                    return cpaData.length>0?(
                      <div>
                        {bestCpa&&(
                          <div style={{background:"linear-gradient(135deg,#022c22,#064e3b)",borderRadius:14,padding:"18px 22px",marginBottom:20,border:"1px solid #10b981"}}>
                            <div style={{color:"#10b981",fontSize:12,fontWeight:700,marginBottom:6}}>🏆 최저 CPA 채널 (가장 효율적)</div>
                            <div style={{display:"flex",alignItems:"baseline",gap:12}}>
                              <span style={{fontSize:28}}>{bestCpa.icon}</span>
                              <span style={{color:"#fff",fontWeight:800,fontSize:20}}>{bestCpa.label}</span>
                              <span style={{color:"#10b981",fontWeight:800,fontSize:18}}>환자 1명당 {fmtW(bestCpa.cpa)}</span>
                            </div>
                          </div>
                        )}
                        <div style={{background:"#1e293b",borderRadius:14,padding:"18px 20px",marginBottom:16}}>
                          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>채널별 환자 획득 비용 (CPA) 비교</div>
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={cpaData} margin={{top:10,right:10,left:10,bottom:50}} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" horizontal={false}/>
                              <XAxis type="number" tick={{fontSize:11,fill:"#94a3b8"}} tickFormatter={v=>`${(v/10000).toFixed(0)}만`}/>
                              <YAxis type="category" dataKey="label" tick={{fontSize:12,fill:"#e2e8f0"}} width={90}/>
                              <Tooltip formatter={v=>[fmtW(v),"환자 1명당"]} contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:12}}/>
                              <Bar dataKey="cpa" radius={[0,4,4,0]}>
                                {cpaData.map((c,i)=><Cell key={i} fill={c.color}/>)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px"}}>
                          <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>채널별 ROI 상세</div>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                            <thead><tr><Th c="채널"/><Th c="월 비용"/><Th c="신규내원"/><Th c="CPA"/><Th c="예상매출"/><Th c="ROAS"/></tr></thead>
                            <tbody>{roi.channels.filter(c=>c.cost>0||c.patients>0).map((c,ri)=>{
                              const cpa=c.cost>0&&c.patients>0?Math.round(c.cost/c.patients):0;
                              const rev=c.patients*(roi.avgRev||0);
                              const roas=c.cost>0&&rev>0?Math.round(rev/c.cost*100):0;
                              return (
                                <tr key={c.key} style={{borderBottom:"1px solid #0f172a",background:ri%2===0?"#0f172a":"#111827"}}>
                                  <Td><span style={{color:c.color,fontWeight:700}}>{c.icon} {c.label}</span></Td>
                                  <Td><span style={{color:"#f59e0b",fontWeight:700}}>{fmtW(c.cost)}</span></Td>
                                  <Td><span style={{color:"#10b981",fontWeight:800,fontSize:15}}>{c.patients>0?c.patients+"명":"—"}</span></Td>
                                  <Td><span style={{fontWeight:700,color:cpa>0?"#e2e8f0":"#475569"}}>{cpa>0?fmtW(cpa):"—"}</span></Td>
                                  <Td><span style={{color:rev>0?"#06b6d4":"#475569"}}>{rev>0?fmtW(rev):"—"}</span></Td>
                                  <Td>{roas>0?<span style={{background:roas>=100?"#10b981":roas>=50?"#f59e0b":"#ef4444",color:"#fff",borderRadius:6,padding:"2px 10px",fontSize:12,fontWeight:800}}>{roas}%</span>:<span style={{color:"#475569"}}>—</span>}</Td>
                                </tr>
                              );
                            })}</tbody>
                          </table>
                          <div style={{marginTop:12,padding:"10px 14px",background:"#0f172a",borderRadius:8,fontSize:11,color:"#64748b"}}>
                            CPA = 채널 비용 ÷ 신규 내원 수 · ROAS = 예상 매출 ÷ 비용 × 100% · <span style={{color:"#10b981"}}>100%↑</span> 수익 · <span style={{color:"#f59e0b"}}>50~99%</span> 손익분기 근접 · <span style={{color:"#ef4444"}}>50%↓</span> 비효율
                          </div>
                        </div>
                      </div>
                    ):(
                      <div style={{background:"#1e293b",borderRadius:14,padding:"40px 20px",textAlign:"center"}}>
                        <div style={{fontSize:40,marginBottom:12}}>🎯</div>
                        <div style={{color:"#94a3b8",fontSize:14}}>위에서 채널별 신규 내원 수를 입력하면</div>
                        <div style={{color:"#94a3b8",fontSize:14}}>CPA 비교 차트가 여기에 표시됩니다</div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* KEYWORDS */}
          {tab==="keywords"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:15}}>네이버 키워드</div>
                <div style={{display:"flex",gap:8}}>
                  <Btn color="#10b981" onClick={()=>checkAllRanks()} disabled={!!rankLoading}>
                    {rankLoading&&String(rankLoading).startsWith("all:")?`⏳ ${rankLoading.split(":")[1]}`:rankLoading==="all"?"⏳ 준비중...":"🔍 전체 순위 조회"}
                  </Btn>
                  <Btn color="#8b5cf6" onClick={()=>setModal("aiKw")}>🤖 AI 제안</Btn>
                  <Btn color="#f59e0b" onClick={()=>fileRef.current.click()}>📂 엑셀</Btn>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={handleExcel}/>
                  <Btn color="#34a853" onClick={handleGoogleSheet} disabled={rankLoading==="gsheet"}>{rankLoading==="gsheet"?"⏳":"📊"} 구글시트</Btn>
                  <Btn color="#334155" onClick={()=>setModal("sheetGuide")} style={{padding:"5px 10px",fontSize:11,color:"#94a3b8"}}>❓ 양식</Btn>
                  <Btn onClick={()=>setModal("kw")}>+ 추가</Btn>
                </div>
              </div>
              <div style={{background:"#0f172a",borderRadius:12,padding:"14px 18px",marginBottom:14,border:"1px solid #334155"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#10b981"}}>🎯 내 콘텐츠 식별자</div>
                  <span style={{color:"#475569",fontSize:11}}>순위 조회 시 이 이름으로 검색 결과에서 찾습니다</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
                  <div><div style={{color:"#94a3b8",fontSize:11,marginBottom:4}}>블로그/병원명</div><input value={data.rankTargets?.blogName||""} onChange={e=>upd("rankTargets",{...data.rankTargets,blogName:e.target.value})} placeholder="예: 강남피부과" style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"8px 12px",color:"#e2e8f0",fontSize:13}}/></div>
                  <div><div style={{color:"#94a3b8",fontSize:11,marginBottom:4}}>플레이스/업체명</div><input value={data.rankTargets?.placeName||""} onChange={e=>upd("rankTargets",{...data.rankTargets,placeName:e.target.value})} placeholder="예: 강남피부과의원" style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"8px 12px",color:"#e2e8f0",fontSize:13}}/></div>
                  <div><div style={{color:"#94a3b8",fontSize:11,marginBottom:4}}>카페/닉네임</div><input value={data.rankTargets?.cafeName||""} onChange={e=>upd("rankTargets",{...data.rankTargets,cafeName:e.target.value})} placeholder="예: 강남피부과공식" style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"8px 12px",color:"#e2e8f0",fontSize:13}}/></div>
                </div>
              </div>
              <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px",marginBottom:18}}>
                <div style={{fontWeight:700,fontSize:13,color:"#94a3b8",marginBottom:12}}>📋 탭별 월 집행비</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
                  {TAB_TYPES.map(tp=>(
                    <div key={tp} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0f172a",borderRadius:8,padding:"8px 12px"}}>
                      <span style={{fontSize:13,fontWeight:600}}>{tp}</span>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <span style={{color:"#64748b",fontSize:11}}>₩</span>
                        <input type="number" value={data.keywordCosts?.[tp]||""} onChange={e=>upd("keywordCosts",{...data.keywordCosts,[tp]:+e.target.value||0})}
                          placeholder="0" style={{background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"4px 8px",color:"#f59e0b",fontSize:13,fontWeight:700,width:100,textAlign:"right"}}/>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #1e293b",display:"flex",justifyContent:"flex-end"}}>
                  <span style={{color:"#94a3b8",fontSize:12,marginRight:8}}>합계</span>
                  <span style={{color:"#f59e0b",fontWeight:800,fontSize:14}}>{fmtW(Object.values(data.keywordCosts||{}).reduce((a,b)=>a+b,0))}/월</span>
                </div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr>
                    <Th c="키워드"/><Th c="월검색량"/>
                    <Th c="📝 블로그" style={{textAlign:"center",fontSize:11,padding:"8px 6px"}}/>
                    <Th c="📍 플레이스" style={{textAlign:"center",fontSize:11,padding:"8px 6px"}}/>
                    <Th c="☕ 카페" style={{textAlign:"center",fontSize:11,padding:"8px 6px"}}/>
                    <Th c="❓ 지식인" style={{textAlign:"center",fontSize:11,padding:"8px 6px"}}/>
                    <Th c="📰 뉴스" style={{textAlign:"center",fontSize:11,padding:"8px 6px"}}/>
                    <Th c="💎 파워링크" style={{textAlign:"center",fontSize:11,padding:"8px 6px"}}/>
                    
                    <Th c="🌐 G맵" style={{textAlign:"center",fontSize:11,padding:"8px 6px"}}/>
                    <Th c="🟡 K맵" style={{textAlign:"center",fontSize:11,padding:"8px 6px"}}/>
                    <Th c="검색탭순서"/><Th c="설정순서"/><Th c="최근조회"/><Th c=""/>
                  </tr></thead>
                  <tbody>{data.keywords.map((k,ri)=>(
                    <tr key={k.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                      <Td><span style={{fontWeight:700}}>{k.keyword}</span></Td>
                      <Td>{k.monthlySearch?<button onClick={()=>setModal({type:"trend",item:k})} style={{background:"none",border:"none",color:"#06b6d4",cursor:"pointer",fontWeight:700,fontSize:13,padding:0}}>{fmt(k.monthlySearch)}회 📈</button>:<span style={{color:"#475569"}}>-</span>}</Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.myBlogRank} color="#6366f1"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.myPlaceRank} color="#06b6d4"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankCafe} color="#ec4899"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankKnowledge} color="#f59e0b"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankNews} color="#94a3b8"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankPowerlink} color="#10b981"/></Td>
                      
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankGoogle} color="#f97316"/></Td>
                      <Td style={{textAlign:"center"}}><RankBadge value={k.rankKakao} color="#fbbf24"/></Td>
                      <Td>{k.detectedTabOrder&&k.detectedTabOrder.length>0?<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{k.detectedTabOrder.slice(0,5).map((tp,idx)=><span key={idx} style={{background:idx===0?"#10b981":idx===1?"#06b6d4":idx===2?"#6366f1":idx===3?"#f59e0b":"#ec4899",color:"#fff",borderRadius:4,padding:"2px 6px",fontSize:10,fontWeight:700}}>{idx+1}.{tp}</span>)}{k.detectedTabOrder.length>5&&<span style={{color:"#64748b",fontSize:10}}>+{k.detectedTabOrder.length-5}</span>}</div>:<span style={{color:"#475569",fontSize:11}}>미조회</span>}</Td>
                      <Td><div style={{display:"flex",gap:2,flexWrap:"wrap"}}>{(k.tabOrder||TAB_TYPES).slice(0,6).map((tp,idx)=><span key={idx} style={{background:idx===0?"#6366f1":idx<3?"#334155":"#1e293b",color:idx===0?"#fff":idx<3?"#e2e8f0":"#64748b",borderRadius:4,padding:"1px 5px",fontSize:10,fontWeight:idx<3?700:400}}>{idx+1}.{tp}</span>)}</div></Td>
                      <Td><span style={{color:"#475569",fontSize:11}}>{k.lastRankCheck||"-"}</span></Td>
                      <Td><div style={{display:"flex",gap:4}}><button onClick={()=>checkNaverRank(k)} disabled={rankLoading===k.id} style={{background:rankLoading===k.id?"#1e293b":"#10b981",border:"none",color:"#fff",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11,fontWeight:700}}>{rankLoading===k.id?"⏳":"🔍"}</button><button onClick={()=>setModal({type:"editKw",item:k})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><button onClick={()=>k._rankDetail?setModal({type:"rankDetail",item:k}):null} disabled={!k._rankDetail} style={{background:k._rankDetail?"#334155":"#1e293b",border:"none",color:k._rankDetail?"#06b6d4":"#334155",borderRadius:6,padding:"4px 8px",cursor:k._rankDetail?"pointer":"default",fontSize:11}}>상세</button><DelBtn onClick={()=>del("keywords",k.id)}/></div></Td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>

              {/* 순위 요약 카드 */}
              {data.keywords.length>0&&(
                <div style={{background:"#1e293b",borderRadius:14,padding:"16px 20px",marginTop:16}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>📊 키워드별 순위 히트맵</div>
                  <div style={{overflowX:"auto"}}>
                    {data.keywords.map(k=>{
                      const allRanks=RANK_FIELDS.map(f=>({...f,val:k[f.key]||"-"}));
                      const ranked=allRanks.filter(r=>r.val&&r.val!=="-");
                      const top3=ranked.filter(r=>{const n=parseInt(r.val);return n>=1&&n<=3;}).length;
                      return (
                        <div key={k.id} style={{background:"#0f172a",borderRadius:10,padding:"12px 16px",marginBottom:8}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <span style={{fontWeight:800,fontSize:14}}>{k.keyword}</span>
                              {k.monthlySearch&&<span style={{color:"#06b6d4",fontSize:12}}>월 {fmt(k.monthlySearch)}회</span>}
                            </div>
                            <div style={{display:"flex",gap:8,alignItems:"center"}}>
                              {top3>0&&<span style={{background:"#022c22",color:"#10b981",borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:700}}>🏆 TOP3 {top3}개</span>}
                              {ranked.length>0&&<span style={{color:"#64748b",fontSize:11}}>노출 {ranked.length}/{allRanks.length}</span>}
                            </div>
                          </div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {allRanks.map(r=>(
                              <div key={r.key} style={{background:"#1e293b",borderRadius:8,padding:"6px 10px",textAlign:"center",minWidth:60,border:r.val!=="-"?`1px solid ${r.color}33`:"1px solid #1e293b"}}>
                                <div style={{fontSize:10,color:r.color,marginBottom:3,fontWeight:600}}>{r.icon} {r.label}</div>
                                <RankBadge value={r.val} color={r.color}/>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {modal==="aiKw"&&(
                <Modal title="🤖 AI 키워드 제안" onClose={()=>{setModal(null);setAiResult([]);}} wide>
                  <div style={{display:"flex",gap:10,marginBottom:14}}>
                    <div style={{flex:1}}><FF label="지역"><Inp value={aiRegion} onChange={setAiRegion} placeholder="강남"/></FF></div>
                    <div style={{flex:1}}><FF label="전문분야"><Inp value={aiSpec} onChange={setAiSpec} placeholder="피부과"/></FF></div>
                  </div>
                  <Btn onClick={callAI} style={{width:"100%",marginBottom:14}}>{aiLoading?"분석 중...":"키워드 생성"}</Btn>
                  {aiResult.length>0&&(
                    <div>
                      <div style={{maxHeight:360,overflowY:"auto",marginBottom:12}}>
                        {aiResult.map((r,i)=>(
                          <div key={i} style={{background:"#0f172a",borderRadius:10,padding:"10px 14px",marginBottom:8}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                              <span style={{fontWeight:700,color:"#6366f1"}}>{r.priority||i+1}. {r.keyword}</span>
                              <span style={{color:"#06b6d4",fontWeight:700,fontSize:13}}>월 {fmt(r.monthlySearch)}회</span>
                            </div>
                            {r.trend&&<ResponsiveContainer width="100%" height={48}><LineChart data={r.trend} margin={{top:0,right:4,left:0,bottom:0}}><Line type="monotone" dataKey="count" stroke="#6366f1" dot={false} strokeWidth={2}/><XAxis dataKey="month" tick={{fontSize:8,fill:"#475569"}} axisLine={false} tickLine={false}/></LineChart></ResponsiveContainer>}
                          </div>
                        ))}
                      </div>
                      <Btn onClick={addAIKws} style={{width:"100%"}}>전체 추가 ({aiResult.length}개)</Btn>
                    </div>
                  )}
                </Modal>
              )}
              {modal?.type==="trend"&&(
                <Modal title={`📈 ${modal.item.keyword}`} onClose={()=>setModal(null)} wide>
                  <div style={{textAlign:"center",marginBottom:12}}><span style={{color:"#06b6d4",fontWeight:800,fontSize:22}}>{fmt(modal.item.monthlySearch)}</span><span style={{color:"#94a3b8",fontSize:14}}> 회/월</span></div>
                  {modal.item.monthlySearchDetail&&(
                    <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:16,flexWrap:"wrap"}}>
                      <div style={{background:"#0f172a",borderRadius:10,padding:"10px 16px",textAlign:"center"}}><div style={{color:"#94a3b8",fontSize:11}}>PC</div><div style={{color:"#6366f1",fontWeight:800,fontSize:16}}>{fmt(modal.item.monthlySearchDetail.pc)}</div></div>
                      <div style={{background:"#0f172a",borderRadius:10,padding:"10px 16px",textAlign:"center"}}><div style={{color:"#94a3b8",fontSize:11}}>모바일</div><div style={{color:"#10b981",fontWeight:800,fontSize:16}}>{fmt(modal.item.monthlySearchDetail.mobile)}</div></div>
                      {modal.item.monthlySearchDetail.comp&&<div style={{background:"#0f172a",borderRadius:10,padding:"10px 16px",textAlign:"center"}}><div style={{color:"#94a3b8",fontSize:11}}>경쟁강도</div><div style={{color:modal.item.monthlySearchDetail.comp==="HIGH"?"#ef4444":modal.item.monthlySearchDetail.comp==="MEDIUM"?"#f59e0b":"#10b981",fontWeight:800,fontSize:14}}>{modal.item.monthlySearchDetail.comp==="HIGH"?"높음":modal.item.monthlySearchDetail.comp==="MEDIUM"?"보통":"낮음"}</div></div>}
                      {modal.item.monthlySearchDetail.monthlyAvgClickRate>0&&<div style={{background:"#0f172a",borderRadius:10,padding:"10px 16px",textAlign:"center"}}><div style={{color:"#94a3b8",fontSize:11}}>평균 클릭률</div><div style={{color:"#f59e0b",fontWeight:800,fontSize:14}}>{(modal.item.monthlySearchDetail.monthlyAvgClickRate*100).toFixed(1)}%</div></div>}
                    </div>
                  )}
                  {modal.item.trend?<ResponsiveContainer width="100%" height={200}><LineChart data={modal.item.trend} margin={{top:10,right:20,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/><XAxis dataKey="month" tick={{fontSize:11,fill:"#94a3b8"}}/><YAxis tick={{fontSize:11,fill:"#94a3b8"}} width={50}/><Tooltip formatter={v=>[fmt(v)+"회",""]} contentStyle={{background:"#1e293b",border:"none"}}/><Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{fill:"#6366f1",r:3}}/></LineChart></ResponsiveContainer>:<div style={{color:"#475569",textAlign:"center",padding:20}}>추이 없음 (AI 제안 키워드만 차트 제공)</div>}
                </Modal>
              )}
              {modal?.type==="rankDetail"&&(
                <Modal title={`🔍 ${modal.item.keyword} - 검색결과 상세`} onClose={()=>setModal(null)} wide>
                  <div style={{maxHeight:"70vh",overflowY:"auto"}}>
                    {modal.item.detectedTabOrder&&modal.item.detectedTabOrder.length>0&&(
                      <div style={{marginBottom:16,background:"#0f172a",borderRadius:10,padding:"12px 16px"}}>
                        <div style={{color:"#10b981",fontWeight:700,fontSize:13,marginBottom:8}}>📋 검색 탭 노출 순서</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{modal.item.detectedTabOrder.map((tp,idx)=>(
                          <span key={idx} style={{background:idx===0?"#10b981":idx===1?"#06b6d4":idx===2?"#6366f1":idx===3?"#f59e0b":idx===4?"#ec4899":"#334155",color:"#fff",borderRadius:8,padding:"4px 12px",fontSize:13,fontWeight:700}}>{idx+1}위 {tp}</span>
                        ))}</div>
                      </div>
                    )}
                    {modal.item._rankDetail?._tabDebug&&(
                      <div style={{marginBottom:16,background:"#1a1a2e",borderRadius:10,padding:"12px 16px",border:"1px solid #334155"}}>
                        <div style={{color:"#f59e0b",fontWeight:700,fontSize:12,marginBottom:8}}>🔧 탭 감지 디버그</div>
                        <pre style={{color:"#94a3b8",fontSize:10,margin:0,whiteSpace:"pre-wrap",wordBreak:"break-all",maxHeight:200,overflowY:"auto"}}>{JSON.stringify(modal.item._rankDetail._tabDebug,null,2)}</pre>
                      </div>
                    )}
                    {[
                      {key:"blog",label:"📝 블로그",color:"#6366f1"},
                      {key:"place",label:"📍 플레이스",color:"#06b6d4"},
                      {key:"cafe",label:"☕ 카페",color:"#ec4899"},
                      {key:"googleMap",label:"🌐 구글맵",color:"#f97316"},
                      {key:"kakaoMap",label:"🟡 카카오맵",color:"#fbbf24"},
                      {key:"knowledge",label:"❓ 지식인",color:"#f59e0b"},
                      {key:"news",label:"📰 뉴스",color:"#94a3b8"},
                      {key:"powerlink",label:"💎 파워링크",color:"#10b981"},
                    ].map(sec=>{
                      const items=modal.item._rankDetail?.[sec.key]||[];
                      if(!items.length)return null;
                      const tgt=data.rankTargets||{};
                      const searchTerm=(sec.key==="blog"||sec.key==="knowledge"||sec.key==="news"||sec.key==="powerlink")?tgt.blogName:(sec.key==="cafe")?tgt.cafeName:tgt.placeName;
                      return(
                        <div key={sec.key} style={{marginBottom:16}}>
                          <div style={{color:sec.color,fontWeight:700,fontSize:13,marginBottom:8}}>{sec.label} ({items.length}건)</div>
                          {items.map((t,i)=>{
                            const isMe=searchTerm&&t.toLowerCase().includes(searchTerm.toLowerCase());
                            return(
                              <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 10px",background:isMe?"#1e293b":"#0f172a",borderRadius:8,marginBottom:4,border:isMe?"1px solid "+sec.color:"1px solid transparent"}}>
                                <span style={{color:i<3?sec.color:"#475569",fontWeight:800,fontSize:13,minWidth:24}}>{i+1}</span>
                                <span style={{color:isMe?"#e2e8f0":"#94a3b8",fontSize:13,fontWeight:isMe?700:400}}>{t}</span>
                                {isMe&&<span style={{background:sec.color,color:"#fff",borderRadius:99,padding:"1px 8px",fontSize:10,fontWeight:700,marginLeft:"auto"}}>내 콘텐츠</span>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                    <div style={{color:"#475569",fontSize:11,marginTop:10}}>조회일시: {modal.item.lastRankCheck||"-"}</div>
                  </div>
                </Modal>
              )}
              {modal==="sheetGuide"&&(
                <Modal title="📊 키워드 업로드 양식 가이드" onClose={()=>setModal(null)}>
                  <div style={{maxHeight:"65vh",overflowY:"auto",lineHeight:"1.8"}}>
                    <div style={{background:"#0f172a",borderRadius:10,padding:"16px 20px",marginBottom:16,border:"1px solid #334155"}}>
                      <div style={{color:"#10b981",fontWeight:800,fontSize:14,marginBottom:10}}>📂 엑셀 파일 (.xlsx)</div>
                      <div style={{color:"#e2e8f0",fontSize:13}}>엑셀 파일을 직접 업로드합니다. 같은 양식을 사용합니다.</div>
                    </div>
                    <div style={{background:"#0f172a",borderRadius:10,padding:"16px 20px",marginBottom:16,border:"1px solid #34a853"}}>
                      <div style={{color:"#34a853",fontWeight:800,fontSize:14,marginBottom:10}}>📊 구글시트 연동</div>
                      <div style={{color:"#e2e8f0",fontSize:13,marginBottom:8}}>구글시트 링크를 붙여넣으면 자동으로 키워드를 불러옵니다.</div>
                      <div style={{color:"#f59e0b",fontSize:12,fontWeight:700,marginBottom:6}}>⚠️ 시트 공유 설정 필수:</div>
                      <div style={{color:"#94a3b8",fontSize:12,paddingLeft:12}}>시트 → 공유 → '링크가 있는 모든 사용자' → '뷰어'로 설정</div>
                    </div>
                    <div style={{background:"#1e293b",borderRadius:10,padding:"16px 20px",marginBottom:16}}>
                      <div style={{color:"#06b6d4",fontWeight:800,fontSize:14,marginBottom:12}}>📋 시트 양식 (공통)</div>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                        <thead><tr style={{borderBottom:"2px solid #334155"}}>
                          <th style={{padding:"8px 12px",textAlign:"left",color:"#10b981",fontWeight:700}}>열</th>
                          <th style={{padding:"8px 12px",textAlign:"left",color:"#10b981",fontWeight:700}}>내용</th>
                          <th style={{padding:"8px 12px",textAlign:"left",color:"#10b981",fontWeight:700}}>필수</th>
                          <th style={{padding:"8px 12px",textAlign:"left",color:"#10b981",fontWeight:700}}>예시</th>
                        </tr></thead>
                        <tbody>
                          {[
                            ["A","키워드","✅ 필수","강남 피부과"],
                            ["B","블로그 순위","선택","3위"],
                            ["C","플레이스 순위","선택","1위"],
                            ["D","월 검색량","선택","12000"],
                          ].map(([col,desc,req,ex],i)=>(
                            <tr key={i} style={{borderBottom:"1px solid #1e293b"}}>
                              <td style={{padding:"8px 12px",color:"#f59e0b",fontWeight:700}}>{col}</td>
                              <td style={{padding:"8px 12px",color:"#e2e8f0"}}>{desc}</td>
                              <td style={{padding:"8px 12px",color:req.includes("필수")?"#10b981":"#475569"}}>{req}</td>
                              <td style={{padding:"8px 12px",color:"#94a3b8",fontFamily:"monospace"}}>{ex}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{background:"#0f172a",borderRadius:10,padding:"16px 20px",border:"1px solid #334155"}}>
                      <div style={{color:"#8b5cf6",fontWeight:800,fontSize:14,marginBottom:10}}>📝 예시</div>
                      <div style={{background:"#020617",borderRadius:8,padding:"12px 16px",fontFamily:"monospace",fontSize:12,color:"#94a3b8",lineHeight:"1.8"}}>
                        <div><span style={{color:"#475569"}}>1행:</span> <span style={{color:"#f59e0b"}}>키워드</span> | <span style={{color:"#f59e0b"}}>블로그순위</span> | <span style={{color:"#f59e0b"}}>플레이스순위</span> | <span style={{color:"#f59e0b"}}>월검색량</span></div>
                        <div><span style={{color:"#475569"}}>2행:</span> 강남 피부과 | 3위 | 1위 | 12000</div>
                        <div><span style={{color:"#475569"}}>3행:</span> 강남 보톡스 | - | - | 8500</div>
                        <div><span style={{color:"#475569"}}>4행:</span> 신논현 피부과 | | | 3200</div>
                      </div>
                      <div style={{color:"#64748b",fontSize:11,marginTop:8}}>※ 1행(헤더)은 자동으로 건너뜁니다. A열만 있어도 됩니다.</div>
                    </div>
                  </div>
                </Modal>
              )}
              {(modal==="kw"||modal?.type==="editKw")&&(
                <Modal title={modal==="kw"?"키워드 추가":"편집"} onClose={()=>setModal(null)}>
                  <KwForm initial={modal?.item} onSave={f=>{
                    if(modal==="kw")upd("keywords",[...data.keywords,{...f,id:Date.now(),status:"warn"}]);
                    else upd("keywords",data.keywords.map(k=>k.id===modal.item.id?{...k,...f}:k));setModal(null);
                  }}/>
                </Modal>
              )}
            </div>
          )}

          {/* MAPS */}
          {tab==="maps"&&(
            <SectionWithCost title="지도 노출 순위" cost={data.mapsCost} onCostChange={v=>upd("mapsCost",v)} color={CHANNEL_COLORS.maps} right={<div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Btn color="#f59e0b" onClick={()=>runApiDiag()} disabled={rankLoading==="diag"}>{rankLoading==="diag"?"⏳":"🔧 API 진단"}</Btn><Btn color="#10b981" onClick={()=>checkAllMapRanks()} disabled={!!rankLoading}>{String(rankLoading).startsWith("allMaps:")?"⏳ "+rankLoading.split(":")[1]:rankLoading==="allMaps"?"⏳ 준비중...":"🔍 전체 조회"}</Btn><Btn color="#f59e0b" onClick={()=>mapFileRef.current.click()}>📂 엑셀</Btn><input ref={mapFileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={handleMapExcel}/><Btn color="#34a853" onClick={handleMapGoogleSheet} disabled={rankLoading==="gsheetMap"}>{rankLoading==="gsheetMap"?"⏳":"📊"} 구글시트</Btn><Btn onClick={()=>setModal("map")}>+ 추가</Btn></div>}>
              <div style={{background:"#0f172a",borderRadius:12,padding:"14px 18px",marginBottom:14,border:"1px solid #334155"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#10b981"}}>🎯 내 콘텐츠 식별자</div>
                  <span style={{color:"#475569",fontSize:11}}>지도 순위 조회 시 이 업체명으로 찾습니다</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
                  <div><div style={{color:"#94a3b8",fontSize:11,marginBottom:4}}>플레이스/업체명</div><input value={data.rankTargets?.placeName||""} onChange={e=>upd("rankTargets",{...data.rankTargets,placeName:e.target.value})} placeholder="예: 강남피부과의원" style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"8px 12px",color:"#e2e8f0",fontSize:13}}/></div>
                </div>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr><Th c="키워드"/><Th c="📍 플레이스"/><Th c="🌐 G맵"/><Th c="🟡 K맵"/><Th c="상태"/><Th c="조회일"/><Th c=""/></tr></thead>
                <tbody>{data.maps.map((m,ri)=>(
                  <tr key={m.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                    <Td><span style={{color:"#6366f1",fontWeight:700}}>{m.keyword}</span></Td>
                    <Td><RankBadge value={m.naverPlace} color="#06b6d4"/></Td>
                    <Td><RankBadge value={m.google} color="#f97316"/></Td>
                    <Td><RankBadge value={m.kakao} color="#fbbf24"/></Td>
                    <Td><Badge status={m.status}/></Td>
                    <Td><span style={{color:"#475569",fontSize:11}}>{m.lastRankCheck||"-"}</span></Td>
                    <Td><div style={{display:"flex",gap:4}}>
                      <button onClick={()=>checkMapRank(m)} disabled={rankLoading==="map_"+m.id} style={{background:rankLoading==="map_"+m.id?"#1e293b":"#10b981",border:"none",color:"#fff",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11,fontWeight:700}}>{rankLoading==="map_"+m.id?"⏳":"🔍"}</button>
                      <button onClick={()=>fetchReviews(m.keyword,"naver")} disabled={rankLoading==="reviews_naver"} style={{background:"#334155",border:"none",color:"#06b6d4",borderRadius:6,padding:"4px 6px",cursor:"pointer",fontSize:10}}>{rankLoading==="reviews_naver"?"⏳":"📍리뷰"}</button>
                      <button onClick={()=>fetchReviews(m.keyword,"google")} disabled={rankLoading==="reviews_google"} style={{background:"#334155",border:"none",color:"#f97316",borderRadius:6,padding:"4px 6px",cursor:"pointer",fontSize:10}}>{rankLoading==="reviews_google"?"⏳":"🌐리뷰"}</button>
                      <button onClick={()=>fetchReviews(m.keyword,"kakao")} disabled={rankLoading==="reviews_kakao"} style={{background:"#334155",border:"none",color:"#fbbf24",borderRadius:6,padding:"4px 6px",cursor:"pointer",fontSize:10}}>{rankLoading==="reviews_kakao"?"⏳":"🟡리뷰"}</button>
                      <button onClick={()=>m._mapDetail?setModal({type:"mapDetail",item:m}):null} disabled={!m._mapDetail} style={{background:m._mapDetail?"#334155":"#1e293b",border:"none",color:m._mapDetail?"#06b6d4":"#334155",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11}}>상세</button>
                      <button onClick={()=>setModal({type:"editMap",item:m})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button>
                      <DelBtn onClick={()=>del("maps",m.id)}/>
                    </div></Td>
                  </tr>
                ))}</tbody>
              </table>
              {modal?.type==="mapDetail"&&(
                <Modal title={`🗺️ ${modal.item.keyword} - 지도 검색결과`} onClose={()=>setModal(null)}>
                  <div style={{maxHeight:"60vh",overflowY:"auto"}}>
                    {[{key:"place",label:"📍 네이버 플레이스",color:"#06b6d4"},{key:"googleMap",label:"🌐 구글맵",color:"#f97316"},{key:"kakaoMap",label:"🟡 카카오맵",color:"#fbbf24"}].map(sec=>{
                      const items=modal.item._mapDetail?.[sec.key]||[];
                      const tgt=(data.rankTargets?.placeName||"").toLowerCase();
                      return(
                        <div key={sec.key} style={{marginBottom:16}}>
                          <div style={{color:sec.color,fontWeight:700,fontSize:13,marginBottom:8}}>{sec.label} ({items.length}건){items.length===0&&<span style={{color:"#ef4444",fontSize:11,marginLeft:8}}>결과 없음</span>}</div>
                          {items.length>0?items.map((t,i)=>{
                            const isMe=tgt&&t.toLowerCase().includes(tgt);
                            return(
                              <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 10px",background:isMe?"#1e293b":"#0f172a",borderRadius:8,marginBottom:4,border:isMe?"1px solid "+sec.color:"1px solid transparent"}}>
                                <span style={{color:i<3?sec.color:"#475569",fontWeight:800,fontSize:13,minWidth:24}}>{i+1}</span>
                                <span style={{color:isMe?"#e2e8f0":"#94a3b8",fontSize:13,fontWeight:isMe?700:400}}>{t}</span>
                                {isMe&&<span style={{background:sec.color,color:"#fff",borderRadius:99,padding:"1px 8px",fontSize:10,fontWeight:700,marginLeft:"auto"}}>내 업체</span>}
                              </div>
                            );
                          }):<div style={{color:"#475569",fontSize:12,padding:"8px 10px"}}>데이터를 가져올 수 없습니다</div>}
                        </div>
                      );
                    })}
                    {modal.item._mapDetail?._placeDebug&&(
                      <div style={{background:"#1a1a2e",borderRadius:8,padding:"10px 14px",marginTop:8,border:"1px solid #334155"}}>
                        <div style={{color:"#06b6d4",fontSize:11,fontWeight:700,marginBottom:6}}>🔧 네이버 플레이스 디버그</div>
                        <pre style={{color:"#94a3b8",fontSize:10,margin:0,whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{JSON.stringify(modal.item._mapDetail._placeDebug,null,2)}</pre>
                      </div>
                    )}
                    {modal.item._mapDetail?._kakaoDebug&&(
                      <div style={{background:"#1a1a2e",borderRadius:8,padding:"10px 14px",marginTop:8,border:"1px solid #334155"}}>
                        <div style={{color:"#f59e0b",fontSize:11,fontWeight:700,marginBottom:6}}>🔧 카카오맵 디버그</div>
                        <pre style={{color:"#94a3b8",fontSize:10,margin:0,whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{JSON.stringify(modal.item._mapDetail._kakaoDebug,null,2)}</pre>
                      </div>
                    )}
                  </div>
                </Modal>
              )}
              {modal?.type==="apiDiag"&&(
                <Modal title="🔧 API 연동 진단" onClose={()=>setModal(null)} wide>
                  <div style={{maxHeight:"65vh",overflowY:"auto"}}>
                    <div style={{color:"#94a3b8",fontSize:11,marginBottom:12}}>테스트 키워드: {modal.data.keyword} | {modal.data.timestamp}</div>
                    {Object.entries(modal.data.results||{}).map(([key,val])=>{
                      const labels={env:"📋 환경변수",kakao:"🟡 카카오맵 API",naverAd:"📊 네이버 검색광고 API",google:"🌐 구글맵",naverMap:"🗺️ 네이버 지도"};
                      const isOk=val.status===200||val.results||val.placeCount>0||key==="env";
                      const hasError=val.error||val.status>=400;
                      return(
                        <div key={key} style={{background:hasError?"#1a0f0f":"#0f172a",borderRadius:10,padding:"12px 16px",marginBottom:10,borderLeft:`3px solid ${hasError?"#ef4444":isOk?"#10b981":"#f59e0b"}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                            <span style={{color:"#e2e8f0",fontWeight:700,fontSize:13}}>{labels[key]||key}</span>
                            <span style={{color:hasError?"#ef4444":isOk?"#10b981":"#f59e0b",fontSize:12,fontWeight:700}}>{hasError?"❌ 실패":isOk?"✅ 정상":"⚠️ 확인필요"}</span>
                          </div>
                          <pre style={{color:"#94a3b8",fontSize:11,margin:0,whiteSpace:"pre-wrap",wordBreak:"break-all",background:"#0a0f1a",borderRadius:6,padding:8}}>{JSON.stringify(val,null,2)}</pre>
                        </div>
                      );
                    })}
                  </div>
                </Modal>
              )}
              {modal?.type==="reviews"&&(
                <Modal title={`💬 ${modal.data.placeName||modal.keyword} - ${modal.platform==="google"?"구글맵":modal.platform==="kakao"?"카카오맵":"플레이스"} ${modal.data.reviewType||"리뷰"} 분석`} onClose={()=>setModal(null)}>
                  <div style={{maxHeight:"65vh",overflowY:"auto"}}>
                    {modal.data.error&&(
                      <div style={{background:"#2d1f0f",borderRadius:10,padding:"12px 16px",marginBottom:14,border:"1px solid #f59e0b44"}}>
                        <div style={{color:"#f59e0b",fontWeight:700,fontSize:13}}>⚠️ {modal.data.error}</div>
                      </div>
                    )}
                    {modal.data.negCount>0&&(
                      <div style={{background:"#2d0f0f",borderRadius:10,padding:"12px 16px",marginBottom:14,border:"1px solid #ef444444"}}>
                        <div style={{color:"#ef4444",fontWeight:800,fontSize:14}}>⚠️ 부정적 리뷰 {modal.data.negCount}건 감지</div>
                        <div style={{color:"#f87171",fontSize:12,marginTop:4}}>총 {modal.data.reviews?.length||0}건 중 부정 {modal.data.negCount}건 ({Math.round(modal.data.negCount/(modal.data.reviews?.length||1)*100)}%)</div>
                      </div>
                    )}
                    {(modal.data.reviews||[]).map((rv,i)=>(
                      <div key={i} style={{background:rv.sentiment==="negative"?"#1a0f0f":rv.sentiment==="positive"?"#0f1a15":"#0f172a",borderRadius:10,padding:"12px 14px",marginBottom:8,borderLeft:`3px solid ${rv.sentiment==="negative"?"#ef4444":rv.sentiment==="positive"?"#10b981":"#475569"}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:12,fontWeight:700,color:rv.sentiment==="negative"?"#ef4444":rv.sentiment==="positive"?"#10b981":"#94a3b8"}}>{rv.sentiment==="negative"?"👎 부정":rv.sentiment==="positive"?"👍 긍정":"😐 중립"}{rv.type?` (${rv.type})`:""}{rv.author?` · ${rv.author}`:""}</span>
                          {rv.negWords&&rv.negWords.length>0&&<span style={{fontSize:11,color:"#ef4444"}}>{rv.negWords.join(", ")}</span>}
                        </div>
                        <div style={{color:"#e2e8f0",fontSize:13,lineHeight:"1.5"}}>{rv.text}</div>
                      </div>
                    ))}
                    {(!modal.data.reviews||!modal.data.reviews.length)&&<div style={{color:"#475569",textAlign:"center",padding:20}}>리뷰를 찾을 수 없습니다</div>}
                    {modal.data._debug&&(
                      <div style={{marginTop:12,background:"#1a1a2e",borderRadius:8,padding:"10px 12px",border:"1px solid #334155"}}>
                        <div style={{color:"#f59e0b",fontSize:11,fontWeight:700,marginBottom:4}}>🔧 디버그</div>
                        <pre style={{color:"#64748b",fontSize:10,margin:0,whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{JSON.stringify(modal.data._debug,null,2)}</pre>
                      </div>
                    )}
                  </div>
                </Modal>
              )}
              {(modal==="map"||modal?.type==="editMap")&&(
                <Modal title={modal==="map"?"지도 추가":"편집"} onClose={()=>setModal(null)}>
                  <MapForm initial={modal?.item} onSave={f=>{if(modal==="map")upd("maps",[...data.maps,{...f,id:Date.now(),status:"warn"}]);else upd("maps",data.maps.map(m=>m.id===modal.item.id?{...m,...f}:m));setModal(null);}}/>
                </Modal>
              )}
            </SectionWithCost>
          )}

          {/* EXPERIENCE */}
          {tab==="experience"&&(
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
          )}

          {/* CAFES */}
          {tab==="cafes"&&(
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
          )}

          {/* YOUTUBE */}
          {tab==="youtube"&&(
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
          )}

          {/* SHORTFORM */}
          {tab==="shortform"&&(
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
          )}

          {/* AUTOCOMPLETE */}
          {tab==="autocomplete"&&(
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
          )}

          {/* HOMEPAGE SEO */}
          {tab==="seo"&&(
            <div>
              <SectionWithCost title="홈페이지 SEO" costLabel="SEO 월 관리비" cost={data.seoCost} onCostChange={v=>upd("seoCost",v)} color={CHANNEL_COLORS.seo} right={<Btn onClick={()=>setModal("addSeo")}>+ 페이지 추가</Btn>}>

                {/* Summary */}
                {(()=>{
                  const pages=data.seoPages||[];
                  const done=pages.filter(p=>p.status==="설정완료").length;
                  const need=pages.filter(p=>p.status==="수정필요").length;
                  const none=pages.filter(p=>p.status==="미설정").length;
                  const checkKeys=["titleLen","descLen","h1Has","altText","internalLink","schema","mobileOpt","pageSpeed","ssl","sitemap"];
                  const totalChecks=pages.length*checkKeys.length;
                  const passedChecks=pages.reduce((a,p)=>a+checkKeys.filter(k=>p.seoChecklist?.[k]).length,0);
                  return (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:20}}>
                      <div style={{background:"#1e293b",borderRadius:12,padding:"14px 16px"}}>
                        <div style={{color:"#94a3b8",fontSize:11}}>전체 페이지</div>
                        <div style={{color:"#0ea5e9",fontSize:24,fontWeight:800}}>{pages.length}</div>
                      </div>
                      <div style={{background:"#1e293b",borderRadius:12,padding:"14px 16px"}}>
                        <div style={{color:"#94a3b8",fontSize:11}}>✅ 설정완료</div>
                        <div style={{color:"#10b981",fontSize:24,fontWeight:800}}>{done}</div>
                      </div>
                      <div style={{background:"#1e293b",borderRadius:12,padding:"14px 16px"}}>
                        <div style={{color:"#94a3b8",fontSize:11}}>⚠️ 수정필요</div>
                        <div style={{color:"#f59e0b",fontSize:24,fontWeight:800}}>{need}</div>
                      </div>
                      <div style={{background:"#1e293b",borderRadius:12,padding:"14px 16px"}}>
                        <div style={{color:"#94a3b8",fontSize:11}}>❌ 미설정</div>
                        <div style={{color:"#ef4444",fontSize:24,fontWeight:800}}>{none}</div>
                      </div>
                      <div style={{background:"#1e293b",borderRadius:12,padding:"14px 16px"}}>
                        <div style={{color:"#94a3b8",fontSize:11}}>SEO 점수</div>
                        <div style={{color:passedChecks/totalChecks>=0.8?"#10b981":passedChecks/totalChecks>=0.5?"#f59e0b":"#ef4444",fontSize:24,fontWeight:800}}>{totalChecks>0?Math.round(passedChecks/totalChecks*100):0}%</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Page Cards */}
                {(data.seoPages||[]).map(page=>{
                  const checkItems=[
                    {key:"titleLen",label:"Meta Title (50~60자)",icon:"📌"},
                    {key:"descLen",label:"Meta Desc (150~160자)",icon:"📝"},
                    {key:"h1Has",label:"H1에 키워드 포함",icon:"🏷️"},
                    {key:"altText",label:"이미지 Alt 텍스트",icon:"🖼️"},
                    {key:"internalLink",label:"내부 링크 구조",icon:"🔗"},
                    {key:"schema",label:"Schema 마크업",icon:"📊"},
                    {key:"mobileOpt",label:"모바일 최적화",icon:"📱"},
                    {key:"pageSpeed",label:"페이지 속도",icon:"⚡"},
                    {key:"ssl",label:"SSL (HTTPS)",icon:"🔒"},
                    {key:"sitemap",label:"사이트맵 등록",icon:"🗺️"},
                  ];
                  const passed=checkItems.filter(c=>page.seoChecklist?.[c.key]).length;
                  const score=Math.round(passed/checkItems.length*100);
                  const statusColor=page.status==="설정완료"?"#10b981":page.status==="수정필요"?"#f59e0b":"#ef4444";
                  const statusBg=page.status==="설정완료"?"#022c22":page.status==="수정필요"?"#422006":"#2d0f0f";
                  return (
                    <div key={page.id} style={{background:"#0f172a",borderRadius:14,marginBottom:16,overflow:"hidden",border:`1px solid ${statusColor}33`}}>
                      {/* Header */}
                      <div style={{background:statusBg,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:12}}>
                          <span style={{background:statusColor,color:"#fff",borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:700}}>{page.status}</span>
                          <div>
                            <div style={{fontWeight:800,fontSize:15}}>{page.targetKeyword}</div>
                            <div style={{color:"#64748b",fontSize:12,marginTop:2}}>{page.pageTitle} · <span style={{color:"#0ea5e9"}}>{page.pageUrl}</span></div>
                          </div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{textAlign:"right"}}>
                            <div style={{color:"#64748b",fontSize:10}}>현재 → 목표</div>
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              <RankBadge value={page.currentRank} color="#f59e0b"/>
                              <span style={{color:"#475569"}}>→</span>
                              <RankBadge value={page.targetRank} color="#10b981"/>
                            </div>
                          </div>
                          <button onClick={()=>setModal({type:"editSeo",item:page})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12}}>편집</button>
                          <DelBtn onClick={()=>upd("seoPages",(data.seoPages||[]).filter(p=>p.id!==page.id))}/>
                        </div>
                      </div>
                      {/* Meta Info */}
                      <div style={{padding:"14px 20px",borderBottom:"1px solid #1e293b"}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                          <div>
                            <div style={{color:"#64748b",fontSize:10,marginBottom:3}}>Meta Title {page.metaTitle&&<span style={{color:page.metaTitle.length>=50&&page.metaTitle.length<=60?"#10b981":"#f59e0b"}}>({page.metaTitle.length}자)</span>}</div>
                            <div style={{color:page.metaTitle?"#e2e8f0":"#334155",fontSize:13,fontWeight:600,background:"#1e293b",borderRadius:6,padding:"6px 10px",minHeight:20}}>{page.metaTitle||"미설정"}</div>
                          </div>
                          <div>
                            <div style={{color:"#64748b",fontSize:10,marginBottom:3}}>H1 태그</div>
                            <div style={{color:page.h1Tag?"#e2e8f0":"#334155",fontSize:13,fontWeight:600,background:"#1e293b",borderRadius:6,padding:"6px 10px",minHeight:20}}>{page.h1Tag||"미설정"}</div>
                          </div>
                        </div>
                        <div style={{marginTop:8}}>
                          <div style={{color:"#64748b",fontSize:10,marginBottom:3}}>Meta Description {page.metaDesc&&<span style={{color:page.metaDesc.length>=150&&page.metaDesc.length<=160?"#10b981":"#f59e0b"}}>({page.metaDesc.length}자)</span>}</div>
                          <div style={{color:page.metaDesc?"#94a3b8":"#334155",fontSize:12,background:"#1e293b",borderRadius:6,padding:"6px 10px",minHeight:20}}>{page.metaDesc||"미설정"}</div>
                        </div>
                        {page.notes&&<div style={{marginTop:8,color:"#64748b",fontSize:12,fontStyle:"italic"}}>💡 {page.notes}</div>}
                      </div>
                      {/* SEO Checklist */}
                      <div style={{padding:"14px 20px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <span style={{color:"#94a3b8",fontSize:12,fontWeight:600}}>SEO 체크리스트</span>
                          <span style={{color:score>=80?"#10b981":score>=50?"#f59e0b":"#ef4444",fontWeight:800,fontSize:13}}>{score}% ({passed}/{checkItems.length})</span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:6}}>
                          {checkItems.map(c=>{
                            const ok=page.seoChecklist?.[c.key];
                            return (
                              <button key={c.key} onClick={()=>upd("seoPages",(data.seoPages||[]).map(p=>p.id===page.id?{...p,seoChecklist:{...p.seoChecklist,[c.key]:!ok}}:p))}
                                style={{display:"flex",alignItems:"center",gap:6,background:ok?"#022c2288":"#1e293b",border:`1px solid ${ok?"#10b98144":"#33415544"}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",textAlign:"left"}}>
                                <span style={{fontSize:14,width:18,textAlign:"center"}}>{ok?"✅":"⬜"}</span>
                                <span style={{color:ok?"#10b981":"#64748b",fontSize:12,fontWeight:ok?600:400}}>{c.icon} {c.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Empty State */}
                {!(data.seoPages||[]).length&&(
                  <div style={{background:"#1e293b",borderRadius:14,padding:"40px 20px",textAlign:"center"}}>
                    <div style={{fontSize:40,marginBottom:12}}>🌐</div>
                    <div style={{color:"#94a3b8",fontSize:14}}>등록된 SEO 페이지가 없습니다</div>
                    <div style={{color:"#64748b",fontSize:12,marginTop:4}}>상위노출할 키워드별로 페이지를 추가하세요</div>
                  </div>
                )}
              </SectionWithCost>

              {/* SEO Form Modal */}
              {(modal==="addSeo"||modal?.type==="editSeo")&&(
                <Modal title={modal==="addSeo"?"🌐 SEO 페이지 추가":"🌐 SEO 페이지 편집"} onClose={()=>setModal(null)} wide>
                  <SeoFormInner initial={modal?.item||{}} existingKws={(data.keywords||[]).map(k=>k.keyword)} onSave={(f)=>{
                    const init=modal?.item||{};
                    const entry={...f,seoChecklist:init.seoChecklist||{titleLen:false,descLen:false,h1Has:false,altText:false,internalLink:false,schema:false,mobileOpt:false,pageSpeed:false,ssl:false,sitemap:false},lastUpdated:today()};
                    if(modal==="addSeo")upd("seoPages",[...(data.seoPages||[]),{...entry,id:Date.now()}]);
                    else upd("seoPages",(data.seoPages||[]).map(p=>p.id===init.id?{...p,...entry}:p));
                    setModal(null);
                  }}/>
                </Modal>
              )}
            </div>
          )}

          {/* CALENDAR & TODOS */}
          {tab==="calendar"&&(
            <div>
              <div style={{display:"flex",gap:8,marginBottom:20}}>
                <button onClick={()=>setCalTab("calendar")} style={{background:calTab==="calendar"?"#6366f1":"#1e293b",color:calTab==="calendar"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>📅 캘린더</button>
                <button onClick={()=>setCalTab("todos")} style={{background:calTab==="todos"?"#6366f1":"#1e293b",color:calTab==="todos"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>✅ 할 일</button>
                <button onClick={()=>setCalTab("alerts")} style={{background:calTab==="alerts"?"#6366f1":"#1e293b",color:calTab==="alerts"?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:14}}>🔔 D-Day</button>
              </div>

              {calTab==="calendar"&&(
                <div>
                  {/* Month Nav */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <button onClick={()=>setCalMonth(p=>{let m=p.m-1,y=p.y;if(m<0){m=11;y--;}return{y,m};})} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:16}}>‹</button>
                    <div style={{fontWeight:800,fontSize:18}}>{calMonth.y}년 {calMonth.m+1}월</div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{const n=new Date();setCalMonth({y:n.getFullYear(),m:n.getMonth()});}} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>오늘</button>
                      <Btn onClick={()=>setModal("addEvent")} style={{padding:"6px 12px",fontSize:12}}>+ 일정</Btn>
                      <Btn onClick={()=>setModal("addTodo")} color="#f59e0b" style={{padding:"6px 12px",fontSize:12}}>+ 할 일</Btn>
                      <button onClick={()=>setCalMonth(p=>{let m=p.m+1,y=p.y;if(m>11){m=0;y++;}return{y,m};})} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:16}}>›</button>
                    </div>
                  </div>

                  {/* Monthly Todo Progress */}
                  {(()=>{
                    const mTodos=(data.todos||[]).filter(t=>{const d=new Date(t.dueDate);return d.getFullYear()===calMonth.y&&d.getMonth()===calMonth.m;});
                    const mDone=mTodos.filter(t=>t.done).length;
                    const mPct=mTodos.length>0?Math.round(mDone/mTodos.length*100):0;
                    const mEvents=(data.calendarEvents||[]).filter(e=>{const d=new Date(e.date);return d.getFullYear()===calMonth.y&&d.getMonth()===calMonth.m;});
                    const eDone=mEvents.filter(e=>e.done).length;
                    return mTodos.length+mEvents.length>0?(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:16}}>
                        <div style={{background:"#1e293b",borderRadius:10,padding:"12px 14px"}}>
                          <div style={{color:"#94a3b8",fontSize:11}}>이달 일정</div>
                          <div style={{color:"#6366f1",fontSize:20,fontWeight:800}}>{mEvents.length}<span style={{fontSize:12,color:"#475569",fontWeight:400}}> ({eDone}완료)</span></div>
                        </div>
                        <div style={{background:"#1e293b",borderRadius:10,padding:"12px 14px"}}>
                          <div style={{color:"#94a3b8",fontSize:11}}>이달 할 일</div>
                          <div style={{color:"#f59e0b",fontSize:20,fontWeight:800}}>{mTodos.length}<span style={{fontSize:12,color:"#475569",fontWeight:400}}> ({mDone}완료)</span></div>
                        </div>
                        <div style={{background:"#1e293b",borderRadius:10,padding:"12px 14px"}}>
                          <div style={{color:"#94a3b8",fontSize:11}}>할 일 진행률</div>
                          <div style={{color:mPct>=80?"#10b981":mPct>=50?"#f59e0b":"#ef4444",fontSize:20,fontWeight:800}}>{mPct}%</div>
                          <div style={{background:"#0f172a",borderRadius:99,height:4,overflow:"hidden",marginTop:4}}>
                            <div style={{width:`${mPct}%`,background:mPct>=80?"#10b981":mPct>=50?"#f59e0b":"#ef4444",height:"100%",borderRadius:99}}/>
                          </div>
                        </div>
                        <div style={{background:"#1e293b",borderRadius:10,padding:"12px 14px"}}>
                          <div style={{color:"#94a3b8",fontSize:11}}>미완료 합계</div>
                          <div style={{color:"#ef4444",fontSize:20,fontWeight:800}}>{mTodos.filter(t=>!t.done).length+mEvents.filter(e=>!e.done).length}건</div>
                        </div>
                      </div>
                    ):null;
                  })()}

                  {/* Calendar Grid */}
                  {(()=>{
                    const firstDay=new Date(calMonth.y,calMonth.m,1).getDay();
                    const daysInMonth=new Date(calMonth.y,calMonth.m+1,0).getDate();
                    const todayStr=today();
                    const cells=[];
                    for(let i=0;i<firstDay;i++)cells.push(null);
                    for(let d=1;d<=daysInMonth;d++)cells.push(d);
                    const events=data.calendarEvents||[];
                    const todos=data.todos||[];
                    return (
                      <div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
                          {["일","월","화","수","목","금","토"].map((d,i)=>(
                            <div key={i} style={{textAlign:"center",padding:"6px",color:i===0?"#ef4444":i===6?"#6366f1":"#64748b",fontSize:12,fontWeight:700}}>{d}</div>
                          ))}
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                          {cells.map((d,i)=>{
                            if(!d)return <div key={i} style={{background:"#0a0f1e",borderRadius:6,minHeight:85}}/>;
                            const dateStr=`${calMonth.y}-${String(calMonth.m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                            const dayEvents=events.filter(e=>e.date===dateStr);
                            const dayTodos=todos.filter(t=>t.dueDate===dateStr);
                            const allItems=[...dayEvents.map(e=>({...e,_type:"event"})),...dayTodos.map(t=>({...t,_type:"todo"}))];
                            const isToday=dateStr===todayStr;
                            const dow=new Date(calMonth.y,calMonth.m,d).getDay();
                            return (
                              <div key={i} style={{background:isToday?"#1e1b4b":"#0f172a",borderRadius:6,minHeight:85,padding:"4px 6px",border:isToday?"1px solid #6366f1":"1px solid #1e293b"}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                                  <span style={{fontSize:12,fontWeight:isToday?800:600,color:isToday?"#6366f1":dow===0?"#ef4444":dow===6?"#818cf8":"#94a3b8"}}>{d}</span>
                                  {allItems.length>0&&<span style={{fontSize:8,color:"#475569"}}>{allItems.length}</span>}
                                </div>
                                {allItems.slice(0,3).map((item,idx)=>{
                                  if(item._type==="event"){
                                    const et=EVENT_TYPES.find(t=>t.v===item.type);
                                    return (
                                      <div key={"e"+item.id} style={{background:et?.c+"22",borderLeft:`2px solid ${et?.c||"#6366f1"}`,borderRadius:3,padding:"1px 5px",marginBottom:2,fontSize:10,color:item.done?"#475569":et?.c||"#94a3b8",textDecoration:item.done?"line-through":"none",cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                                        onClick={()=>upd("calendarEvents",events.map(e=>e.id===item.id?{...e,done:!e.done}:e))}>
                                        {item.title}
                                      </div>
                                    );
                                  }else{
                                    const pr=PRIORITY_OPTS.find(p=>p.v===item.priority);
                                    return (
                                      <div key={"t"+item.id} style={{background:pr?.c+"15",borderLeft:`2px solid ${pr?.c||"#f59e0b"}`,borderRadius:3,padding:"1px 5px",marginBottom:2,fontSize:10,color:item.done?"#475569":pr?.c||"#f59e0b",textDecoration:item.done?"line-through":"none",cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                                        onClick={()=>upd("todos",todos.map(t=>t.id===item.id?{...t,done:!t.done}:t))}>
                                        ✓ {item.text}
                                      </div>
                                    );
                                  }
                                })}
                                {allItems.length>3&&<div style={{color:"#475569",fontSize:9}}>+{allItems.length-3}건</div>}
                              </div>
                            );
                          })}
                        </div>
                        <div style={{display:"flex",gap:12,marginTop:8,justifyContent:"center"}}>
                          {EVENT_TYPES.map(t=><span key={t.v} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:"#64748b"}}><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:t.c}}/>{t.l}</span>)}
                          <span style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:"#64748b"}}><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:"#f59e0b"}}/>✓ 할 일</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Combined Monthly List: Events + Todos */}
                  {(()=>{
                    const mEvents=(data.calendarEvents||[]).filter(e=>{const d=new Date(e.date);return d.getFullYear()===calMonth.y&&d.getMonth()===calMonth.m;});
                    const mTodos=(data.todos||[]).filter(t=>{const d=new Date(t.dueDate);return d.getFullYear()===calMonth.y&&d.getMonth()===calMonth.m;});
                    const allItems=[
                      ...mEvents.map(e=>({...e,_type:"event",_date:e.date,_done:e.done})),
                      ...mTodos.map(t=>({...t,_type:"todo",_date:t.dueDate,_done:t.done})),
                    ].sort((a,b)=>a._done-b._done||a._date.localeCompare(b._date));
                    return (
                      <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px",marginTop:16}}>
                        <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>📋 {calMonth.m+1}월 전체 ({allItems.length}건)</div>
                        {allItems.length===0&&<div style={{color:"#334155",padding:12,textAlign:"center",fontSize:13}}>이달 일정/할 일이 없습니다</div>}
                        {allItems.map(item=>{
                          if(item._type==="event"){
                            const et=EVENT_TYPES.find(t=>t.v===item.type);
                            return (
                              <div key={"e"+item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#0f172a",borderRadius:8,marginBottom:4,borderLeft:`3px solid ${et?.c||"#6366f1"}`,opacity:item.done?0.5:1}}>
                                <button onClick={()=>upd("calendarEvents",(data.calendarEvents||[]).map(e=>e.id===item.id?{...e,done:!e.done}:e))}
                                  style={{background:"none",border:"none",fontSize:16,cursor:"pointer",padding:0}}>{item.done?"✅":"⬜"}</button>
                                <span style={{color:"#64748b",fontSize:12,fontWeight:700,minWidth:55}}>{item.date.slice(5)}</span>
                                <span style={{background:et?.c+"22",color:et?.c,borderRadius:4,padding:"1px 7px",fontSize:11,fontWeight:600}}>{et?.l||item.type}</span>
                                <span style={{color:item.done?"#475569":"#e2e8f0",fontSize:13,flex:1,textDecoration:item.done?"line-through":"none"}}>{item.title}</span>
                                <span style={{background:"#1e293b",color:"#64748b",borderRadius:4,padding:"1px 7px",fontSize:10}}>{item.channel}</span>
                                <DdayBadge dateStr={item.date}/>
                                <DelBtn onClick={()=>upd("calendarEvents",(data.calendarEvents||[]).filter(e=>e.id!==item.id))}/>
                              </div>
                            );
                          }else{
                            const pr=PRIORITY_OPTS.find(p=>p.v===item.priority);
                            return (
                              <div key={"t"+item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#0f172a",borderRadius:8,marginBottom:4,borderLeft:`3px solid ${pr?.c||"#f59e0b"}`,opacity:item.done?0.5:1}}>
                                <button onClick={()=>upd("todos",(data.todos||[]).map(t=>t.id===item.id?{...t,done:!t.done}:t))}
                                  style={{background:item.done?"#10b981":"none",border:item.done?"none":`2px solid ${pr?.c||"#64748b"}`,borderRadius:6,width:22,height:22,cursor:"pointer",flexShrink:0,color:"#fff",fontSize:11,lineHeight:"22px",textAlign:"center"}}>{item.done?"✓":""}</button>
                                <span style={{color:"#64748b",fontSize:12,fontWeight:700,minWidth:55}}>{item.dueDate.slice(5)}</span>
                                <span style={{background:pr?.c+"22",color:pr?.c,borderRadius:4,padding:"1px 7px",fontSize:11,fontWeight:600}}>{pr?.l}</span>
                                <span style={{color:item.done?"#475569":"#e2e8f0",fontSize:13,flex:1,textDecoration:item.done?"line-through":"none"}}>{item.text}</span>
                                <span style={{background:"#1e293b",color:"#64748b",borderRadius:4,padding:"1px 7px",fontSize:10}}>{item.channel}</span>
                                <DdayBadge dateStr={item.dueDate}/>
                                <DelBtn onClick={()=>upd("todos",(data.todos||[]).filter(t=>t.id!==item.id))}/>
                              </div>
                            );
                          }
                        })}
                      </div>
                    );
                  })()}
                  {modal==="addEvent"&&<Modal title="📅 일정 추가" onClose={()=>setModal(null)}><EventForm onSave={f=>{upd("calendarEvents",[...(data.calendarEvents||[]),{...f,id:Date.now(),done:false}]);setModal(null);}}/></Modal>}
                  {modal==="addTodo"&&<Modal title="✅ 할 일 추가" onClose={()=>setModal(null)}><TodoForm onSave={f=>{upd("todos",[...(data.todos||[]),{...f,id:Date.now(),done:false}]);setModal(null);}}/></Modal>}
                </div>
              )}

              {calTab==="todos"&&(
                <div>
                  {/* Month Nav (shared with calendar) */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <button onClick={()=>setCalMonth(p=>{let m=p.m-1,y=p.y;if(m<0){m=11;y--;}return{y,m};})} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:16}}>‹</button>
                    <div style={{fontWeight:800,fontSize:18}}>{calMonth.y}년 {calMonth.m+1}월 할 일</div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{const n=new Date();setCalMonth({y:n.getFullYear(),m:n.getMonth()});}} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>이번 달</button>
                      <Btn onClick={()=>setModal("addTodo")}>+ 할 일</Btn>
                      <button onClick={()=>setCalMonth(p=>{let m=p.m+1,y=p.y;if(m>11){m=0;y++;}return{y,m};})} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:16}}>›</button>
                    </div>
                  </div>

                  {(()=>{
                    const allTodos=data.todos||[];
                    const mTodos=allTodos.filter(t=>{const d=new Date(t.dueDate);return d.getFullYear()===calMonth.y&&d.getMonth()===calMonth.m;});
                    const mPending=mTodos.filter(t=>!t.done);
                    const mDone=mTodos.filter(t=>t.done);
                    const mPct=mTodos.length>0?Math.round(mDone.length/mTodos.length*100):0;

                    const totalAll=allTodos.length;
                    const totalDone=allTodos.filter(t=>t.done).length;
                    const totalPct=totalAll>0?Math.round(totalDone/totalAll*100):0;

                    return (
                      <div>
                        {/* Progress Cards */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
                          <div style={{background:"#1e293b",borderRadius:14,padding:"16px 20px"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                              <span style={{color:"#94a3b8",fontSize:13,fontWeight:600}}>📊 전체 진행률</span>
                              <span style={{color:totalPct>=80?"#10b981":totalPct>=50?"#f59e0b":"#ef4444",fontWeight:800,fontSize:20}}>{totalPct}%</span>
                            </div>
                            <div style={{background:"#0f172a",borderRadius:99,height:10,overflow:"hidden",marginBottom:6}}>
                              <div style={{width:`${totalPct}%`,background:totalPct>=80?"#10b981":totalPct>=50?"#f59e0b":"#ef4444",height:"100%",borderRadius:99,transition:"width 0.3s"}}/>
                            </div>
                            <div style={{color:"#475569",fontSize:11}}>{totalDone}완료 / {totalAll}전체 · 미완료 {totalAll-totalDone}건</div>
                          </div>
                          <div style={{background:"#1e293b",borderRadius:14,padding:"16px 20px"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                              <span style={{color:"#94a3b8",fontSize:13,fontWeight:600}}>📅 {calMonth.m+1}월 진행률</span>
                              <span style={{color:mPct>=80?"#10b981":mPct>=50?"#f59e0b":"#ef4444",fontWeight:800,fontSize:20}}>{mTodos.length>0?mPct:"-"}%</span>
                            </div>
                            <div style={{background:"#0f172a",borderRadius:99,height:10,overflow:"hidden",marginBottom:6}}>
                              <div style={{width:`${mPct}%`,background:mPct>=80?"#10b981":mPct>=50?"#f59e0b":"#ef4444",height:"100%",borderRadius:99,transition:"width 0.3s"}}/>
                            </div>
                            <div style={{color:"#475569",fontSize:11}}>{mDone.length}완료 / {mTodos.length}전체 · 미완료 {mPending.length}건</div>
                          </div>
                        </div>

                        {/* Channel Summary */}
                        {mTodos.length>0&&(
                          <div style={{background:"#1e293b",borderRadius:14,padding:"14px 18px",marginBottom:20}}>
                            <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"#94a3b8"}}>채널별 현황</div>
                            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                              {[...new Set(mTodos.map(t=>t.channel))].map(ch=>{
                                const chTodos=mTodos.filter(t=>t.channel===ch);
                                const chDone=chTodos.filter(t=>t.done).length;
                                const chPct=Math.round(chDone/chTodos.length*100);
                                return (
                                  <div key={ch} style={{background:"#0f172a",borderRadius:8,padding:"8px 12px",minWidth:100}}>
                                    <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0",marginBottom:4}}>{ch}</div>
                                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                                      <div style={{background:"#1e293b",borderRadius:99,height:5,flex:1,overflow:"hidden"}}>
                                        <div style={{width:`${chPct}%`,background:chPct>=100?"#10b981":chPct>=50?"#f59e0b":"#ef4444",height:"100%",borderRadius:99}}/>
                                      </div>
                                      <span style={{color:"#64748b",fontSize:10,fontWeight:700}}>{chDone}/{chTodos.length}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Pending Todos for this month */}
                        <div style={{marginBottom:20}}>
                          <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#e2e8f0"}}>📌 미완료 ({mPending.length}건)</div>
                          {mPending.sort((a,b)=>{const po={high:0,medium:1,low:2};return(po[a.priority]||1)-(po[b.priority]||1)||a.dueDate.localeCompare(b.dueDate);}).map(todo=>{
                            const pr=PRIORITY_OPTS.find(p=>p.v===todo.priority);
                            return (
                              <div key={todo.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#0f172a",borderRadius:10,marginBottom:6,borderLeft:`3px solid ${pr?.c||"#f59e0b"}`}}>
                                <button onClick={()=>upd("todos",allTodos.map(t=>t.id===todo.id?{...t,done:true}:t))}
                                  style={{background:"none",border:`2px solid ${pr?.c||"#64748b"}`,borderRadius:6,width:22,height:22,cursor:"pointer",flexShrink:0}}/>
                                <div style={{flex:1}}>
                                  <div style={{color:"#e2e8f0",fontSize:14,fontWeight:600}}>{todo.text}</div>
                                  <div style={{display:"flex",gap:6,marginTop:4,alignItems:"center"}}>
                                    <span style={{background:pr?.c+"22",color:pr?.c,borderRadius:4,padding:"1px 7px",fontSize:10,fontWeight:700}}>{pr?.l}</span>
                                    <span style={{background:"#1e293b",color:"#64748b",borderRadius:4,padding:"1px 7px",fontSize:10}}>{todo.channel}</span>
                                    <span style={{color:"#475569",fontSize:11}}>마감 {todo.dueDate?.slice(5)}</span>
                                  </div>
                                </div>
                                <DdayBadge dateStr={todo.dueDate}/>
                                <DelBtn onClick={()=>upd("todos",allTodos.filter(t=>t.id!==todo.id))}/>
                              </div>
                            );
                          })}
                          {!mPending.length&&(
                            <div style={{background:"#022c22",borderRadius:10,padding:"20px",textAlign:"center",color:"#10b981",fontSize:14}}>🎉 {calMonth.m+1}월 할 일을 모두 완료했습니다!</div>
                          )}
                        </div>

                        {/* Done Todos for this month */}
                        {mDone.length>0&&(
                          <div>
                            <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#475569"}}>✅ 완료 ({mDone.length}건)</div>
                            {mDone.map(todo=>(
                              <div key={todo.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",background:"#0f172a",borderRadius:8,marginBottom:4,opacity:0.5}}>
                                <button onClick={()=>upd("todos",allTodos.map(t=>t.id===todo.id?{...t,done:false}:t))}
                                  style={{background:"#10b981",border:"none",borderRadius:6,width:22,height:22,cursor:"pointer",color:"#fff",fontSize:12,lineHeight:"22px",textAlign:"center",flexShrink:0}}>✓</button>
                                <span style={{color:"#475569",fontSize:13,textDecoration:"line-through",flex:1}}>{todo.text}</span>
                                <span style={{color:"#334155",fontSize:10}}>{todo.channel} · {todo.dueDate?.slice(5)}</span>
                                <DelBtn onClick={()=>upd("todos",allTodos.filter(t=>t.id!==todo.id))}/>
                              </div>
                            ))}
                          </div>
                        )}

                        {!mTodos.length&&(
                          <div style={{background:"#1e293b",borderRadius:14,padding:"40px 20px",textAlign:"center"}}>
                            <div style={{fontSize:40,marginBottom:12}}>📋</div>
                            <div style={{color:"#94a3b8",fontSize:14}}>{calMonth.m+1}월에 등록된 할 일이 없습니다</div>
                            <div style={{color:"#64748b",fontSize:12,marginTop:4}}>+ 할 일 버튼으로 추가하세요</div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {modal==="addTodo"&&<Modal title="✅ 할 일 추가" onClose={()=>setModal(null)}><TodoForm onSave={f=>{upd("todos",[...(data.todos||[]),{...f,id:Date.now(),done:false}]);setModal(null);}}/></Modal>}
                </div>
              )}

              {calTab==="alerts"&&(
                <div>
                  <div style={{fontWeight:800,fontSize:16,marginBottom:16}}>🔔 D-Day 알림</div>
                  {(()=>{
                    // Collect all deadlines
                    const alerts=[];
                    // From calendar events (deadlines)
                    (data.calendarEvents||[]).filter(e=>e.type==="deadline"&&!e.done).forEach(e=>alerts.push({title:e.title,date:e.date,channel:e.channel,source:"캘린더"}));
                    // From offline ads
                    [...(data.offline?.elevator||[]),...(data.offline?.subway||[]),...(data.offline?.other||[])].filter(a=>a.status==="집행중").forEach(a=>{
                      const loc=a.complex||a.station||a.location||a.type;
                      alerts.push({title:`${loc} 광고 종료`,date:a.endDate,channel:"오프라인",source:"오프라인 광고"});
                    });
                    // From todos
                    (data.todos||[]).filter(t=>!t.done).forEach(t=>alerts.push({title:t.text,date:t.dueDate,channel:t.channel,source:"할 일"}));
                    // Sort
                    alerts.sort((a,b)=>getDday(a.date)-getDday(b.date));
                    const urgent=alerts.filter(a=>{const d=getDday(a.date);return d>=0&&d<=7;});
                    const upcoming=alerts.filter(a=>{const d=getDday(a.date);return d>7&&d<=30;});
                    const overdue=alerts.filter(a=>getDday(a.date)<0);
                    const renderList=(items,emptyMsg)=>items.length?items.map((a,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#0f172a",borderRadius:8,marginBottom:4}}>
                        <DdayBadge dateStr={a.date}/>
                        <span style={{color:"#e2e8f0",fontSize:13,flex:1,fontWeight:600}}>{a.title}</span>
                        <span style={{background:"#1e293b",color:"#64748b",borderRadius:4,padding:"1px 7px",fontSize:10}}>{a.channel}</span>
                        <span style={{color:"#334155",fontSize:10}}>{a.source}</span>
                        <span style={{color:"#475569",fontSize:11}}>{a.date}</span>
                      </div>
                    )):<div style={{color:"#334155",padding:12,textAlign:"center",fontSize:13}}>{emptyMsg}</div>;

                    return (
                      <div>
                        {/* Summary */}
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                          <div style={{background:"#2d0f0f",borderRadius:12,padding:"16px 18px",border:"1px solid #ef444444"}}>
                            <div style={{color:"#ef4444",fontSize:12,fontWeight:600}}>🚨 긴급 (7일 이내)</div>
                            <div style={{color:"#ef4444",fontSize:28,fontWeight:800,marginTop:4}}>{urgent.length}건</div>
                          </div>
                          <div style={{background:"#422006",borderRadius:12,padding:"16px 18px",border:"1px solid #f59e0b44"}}>
                            <div style={{color:"#f59e0b",fontSize:12,fontWeight:600}}>⏳ 예정 (30일 이내)</div>
                            <div style={{color:"#f59e0b",fontSize:28,fontWeight:800,marginTop:4}}>{upcoming.length}건</div>
                          </div>
                          <div style={{background:"#1e293b",borderRadius:12,padding:"16px 18px",border:"1px solid #47556944"}}>
                            <div style={{color:"#94a3b8",fontSize:12,fontWeight:600}}>⚠️ 지난 기한</div>
                            <div style={{color:"#94a3b8",fontSize:28,fontWeight:800,marginTop:4}}>{overdue.length}건</div>
                          </div>
                        </div>

                        {urgent.length>0&&(
                          <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px",marginBottom:16}}>
                            <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#ef4444"}}>🚨 긴급 알림</div>
                            {renderList(urgent,"없음")}
                          </div>
                        )}
                        {upcoming.length>0&&(
                          <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px",marginBottom:16}}>
                            <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#f59e0b"}}>⏳ 다가오는 기한</div>
                            {renderList(upcoming,"없음")}
                          </div>
                        )}
                        {overdue.length>0&&(
                          <div style={{background:"#1e293b",borderRadius:14,padding:"16px 18px",marginBottom:16}}>
                            <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#94a3b8"}}>⚠️ 지난 항목</div>
                            {renderList(overdue,"없음")}
                          </div>
                        )}
                        {!alerts.length&&(
                          <div style={{background:"#1e293b",borderRadius:14,padding:"40px 20px",textAlign:"center"}}>
                            <div style={{fontSize:40,marginBottom:12}}>🎉</div>
                            <div style={{color:"#10b981",fontSize:15,fontWeight:700}}>등록된 기한이 없습니다</div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* COMMUNITY */}
          {tab==="community"&&(
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
          )}

          {/* INHOUSE */}
          {tab==="inhouse"&&(
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
          )}

          {/* OFFLINE */}
          {tab==="offline"&&(
            <div>
              <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
                {[{id:"elevator",label:"엘리베이터"},{id:"subway",label:"역사 광고"},{id:"other",label:"기타 거점"}].map(t=>(
                  <button key={t.id} onClick={()=>setOfflineTab(t.id)} style={{background:offlineTab===t.id?"#6366f1":"#1e293b",color:offlineTab===t.id?"#fff":"#94a3b8",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:offlineTab===t.id?700:400,fontSize:13}}>{t.label}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
                {[
                  {label:"집행중",value:[...data.offline.elevator,...data.offline.subway,...data.offline.other].filter(a=>a.status==="집행중").length+"건",color:"#10b981"},
                  {label:"총 비용",value:fmtW([...data.offline.elevator,...data.offline.subway,...data.offline.other].filter(a=>a.status==="집행중").reduce((a,b)=>a+(+b.cost||0),0))+"/월",color:"#f59e0b"},
                ].map((s,i)=>(
                  <div key={i} style={{background:"#1e293b",borderRadius:10,padding:"12px 16px",flex:"1 1 120px"}}>
                    <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>{s.label}</div>
                    <div style={{color:s.color,fontSize:20,fontWeight:800}}>{s.value}</div>
                  </div>
                ))}
              </div>
              {offlineTab==="elevator"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontWeight:700,fontSize:15}}>엘리베이터 광고</div><Btn onClick={()=>setModal("addElev")}>+ 추가</Btn>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr><Th c="단지명"/><Th c="세대"/><Th c="시작"/><Th c="종료"/><Th c="비용"/><Th c="상태"/><Th c=""/></tr></thead>
                    <tbody>{data.offline.elevator.map((e,ri)=>(
                      <tr key={e.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{fontWeight:700}}>{e.complex}</span></Td>
                        <Td>{fmt(e.units)}세대</Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{e.startDate}</span></Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{e.endDate}</span></Td>
                        <Td><span style={{color:"#f59e0b",fontWeight:700}}>{fmtW(e.cost)}</span></Td>
                        <Td><span style={{background:e.status==="집행중"?"#10b981":"#475569",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{e.status}</span></Td>
                        <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editElev",item:e})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("offline","elevator",data.offline.elevator.filter(x=>x.id!==e.id))}/></div></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {modal?.type==="editElev"&&<Modal title="엘리베이터 편집" onClose={()=>setModal(null)}><OfflineForm fields={["complex:단지명","units:세대수","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} initial={modal.item} onSave={f=>{updN("offline","elevator",data.offline.elevator.map(x=>x.id===modal.item.id?{...x,...f,units:+f.units||0,cost:+f.cost||0,totalCost:+f.totalCost||0}:x));setModal(null);}}/></Modal>}
                  {modal==="addElev"&&<Modal title="엘리베이터 추가" onClose={()=>setModal(null)}><OfflineForm fields={["complex:단지명","units:세대수","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} onSave={f=>{updN("offline","elevator",[...data.offline.elevator,{...f,id:Date.now(),units:+f.units||0,cost:+f.cost||0,totalCost:+f.totalCost||0}]);setModal(null);}}/></Modal>}
                </div>
              )}
              {offlineTab==="subway"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontWeight:700,fontSize:15}}>역사 광고</div><Btn onClick={()=>setModal("addSub")}>+ 추가</Btn>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr><Th c="역명"/><Th c="위치"/><Th c="시작"/><Th c="종료"/><Th c="비용"/><Th c="상태"/><Th c=""/></tr></thead>
                    <tbody>{data.offline.subway.map((s,ri)=>(
                      <tr key={s.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{fontWeight:700}}>{s.station}</span></Td><Td>{s.location}</Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{s.startDate}</span></Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{s.endDate}</span></Td>
                        <Td><span style={{color:"#f59e0b",fontWeight:700}}>{fmtW(s.cost)}</span></Td>
                        <Td><span style={{background:s.status==="집행중"?"#10b981":"#475569",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{s.status}</span></Td>
                        <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editSub",item:s})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("offline","subway",data.offline.subway.filter(x=>x.id!==s.id))}/></div></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {modal?.type==="editSub"&&<Modal title="역사 광고 편집" onClose={()=>setModal(null)}><OfflineForm fields={["station:역명","location:위치","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} initial={modal.item} onSave={f=>{updN("offline","subway",data.offline.subway.map(x=>x.id===modal.item.id?{...x,...f,cost:+f.cost||0,totalCost:+f.totalCost||0}:x));setModal(null);}}/></Modal>}
                  {modal==="addSub"&&<Modal title="역사 광고 추가" onClose={()=>setModal(null)}><OfflineForm fields={["station:역명","location:위치","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} onSave={f=>{updN("offline","subway",[...data.offline.subway,{...f,id:Date.now(),cost:+f.cost||0,totalCost:+f.totalCost||0}]);setModal(null);}}/></Modal>}
                </div>
              )}
              {offlineTab==="other"&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontWeight:700,fontSize:15}}>기타 거점</div><Btn onClick={()=>setModal("addOth")}>+ 추가</Btn>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr><Th c="유형"/><Th c="위치"/><Th c="시작"/><Th c="종료"/><Th c="비용"/><Th c="상태"/><Th c=""/></tr></thead>
                    <tbody>{data.offline.other.map((o,ri)=>(
                      <tr key={o.id} style={{borderBottom:"1px solid #1e293b",background:ri%2===0?"#0f172a":"#111827"}}>
                        <Td><span style={{background:"#334155",borderRadius:6,padding:"2px 7px",fontSize:12}}>{o.type}</span></Td>
                        <Td><span style={{fontWeight:700}}>{o.location}</span></Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{o.startDate}</span></Td>
                        <Td><span style={{color:"#94a3b8",fontSize:12}}>{o.endDate}</span></Td>
                        <Td><span style={{color:"#f59e0b",fontWeight:700}}>{fmtW(o.cost)}</span></Td>
                        <Td><span style={{background:o.status==="집행중"?"#10b981":"#475569",color:"#fff",borderRadius:99,padding:"2px 9px",fontSize:12,fontWeight:700}}>{o.status}</span></Td>
                        <Td><div style={{display:"flex",gap:4}}><button onClick={()=>setModal({type:"editOth",item:o})} style={{background:"#334155",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>편집</button><DelBtn onClick={()=>updN("offline","other",data.offline.other.filter(x=>x.id!==o.id))}/></div></Td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {modal?.type==="editOth"&&<Modal title="기타 편집" onClose={()=>setModal(null)}><OfflineForm fields={["type:유형|버스정류장 / 현수막 등","location:위치","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} initial={modal.item} onSave={f=>{updN("offline","other",data.offline.other.map(x=>x.id===modal.item.id?{...x,...f,cost:+f.cost||0,totalCost:+f.totalCost||0}:x));setModal(null);}}/></Modal>}
                  {modal==="addOth"&&<Modal title="기타 추가" onClose={()=>setModal(null)}><OfflineForm fields={["type:유형|버스정류장 / 현수막 등","location:위치","startDate:시작일","endDate:종료일","status:상태|집행중 / 예정 / 종료"]} onSave={f=>{updN("offline","other",[...data.offline.other,{...f,id:Date.now(),cost:+f.cost||0,totalCost:+f.totalCost||0}]);setModal(null);}}/></Modal>}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
