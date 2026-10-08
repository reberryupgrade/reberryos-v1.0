

export const TAB_TYPES = ["블로그","지식인","카페","플레이스","뉴스","파워링크"];

export const COMM_PLATFORMS = ["당근마켓","에브리타임","맘카페","지역카페"];

export const TABS = [
  {id:"overview",label:"전체 현황"},
  {id:"performance",label:"📈 성과 추이"},
  {id:"portal",label:"🔗 클라이언트 포털"},
  {id:"budget",label:"💰 마케팅 비용"},
  {id:"keywords",label:"네이버 키워드"},
  {id:"maps",label:"지도 노출"},
  {id:"experience",label:"체험단"},
  {id:"cafes",label:"카페 바이럴"},
  {id:"youtube",label:"유튜브"},
  {id:"shortform",label:"숏폼"},
  {id:"autocomplete",label:"키워드 자동완성"},
  {id:"seo",label:"🌐 홈페이지 SEO"},
  {id:"calendar",label:"📅 캘린더/할일"},
  {id:"community",label:"당근/커뮤니티"},
  {id:"inhouse",label:"원내 마케팅"},
  {id:"offline",label:"오프라인 광고"},
];

export const CHANNEL_COLORS = {
  keywords:"#6366f1",maps:"#06b6d4",experience:"#10b981",cafes:"#ec4899",
  youtube:"#f97316",shortform:"#8b5cf6",autocomplete:"#14b8a6",seo:"#0ea5e9",
  community_당근마켓:"#f97316",community_에브리타임:"#6366f1",community_맘카페:"#ec4899",community_지역카페:"#10b981",
  inhouse_messages:"#3b82f6",inhouse_reviews:"#06b6d4",inhouse_photos:"#8b5cf6",inhouse_videos:"#f59e0b",
  offline:"#ef4444",
};

export const DEFAULT_BRANCH_DATA = {
  performanceLogs: [
    {id:1,period:"2024-09",youtube_views:8200,shortform_views:14000,blog_visits:3200,place_views:5400,new_reviews:8,cafe_posts:3,notes:"9월 집행 시작"},
    {id:2,period:"2024-10",youtube_views:10400,shortform_views:18500,blog_visits:4100,place_views:6200,new_reviews:12,cafe_posts:5,notes:""},
    {id:3,period:"2024-11",youtube_views:9800,shortform_views:22000,blog_visits:4800,place_views:7100,new_reviews:15,cafe_posts:7,notes:"11월 이벤트 진행"},
    {id:4,period:"2024-12",youtube_views:13200,shortform_views:28000,blog_visits:5600,place_views:8900,new_reviews:21,cafe_posts:9,notes:"연말 프로모션"},
    {id:5,period:"2025-01",youtube_views:11000,shortform_views:24000,blog_visits:5100,place_views:8200,new_reviews:18,cafe_posts:8,notes:""},
    {id:6,period:"2025-02",youtube_views:12400,shortform_views:23000,blog_visits:5400,place_views:9300,new_reviews:20,cafe_posts:10,notes:"2월 체험단 강화"},
  ],
  portalConfig: {clinicName:"",reportMonth:"2025년 2월",managerName:"마케팅팀",logoText:"🏥",showBudget:false,showKeywords:true,showMaps:true,showYoutube:true,showShortform:true,showReviews:true,showCafes:true,memo:""},
  keywords:[{id:1,keyword:"강남 피부과",tabOrder:["플레이스","블로그","파워링크","카페","지식인","뉴스"],myBlogRank:"3위",myPlaceRank:"1위",rankCafe:"-",rankKnowledge:"-",rankNews:"-",rankPowerlink:"2위",rankNaverMap:"1위",rankGoogle:"3위",rankKakao:"2위",status:"good"}],
  keywordCosts:{블로그:0,지식인:0,카페:0,플레이스:0,뉴스:0,파워링크:0},
  rankTargets:{blogName:"",placeName:"",cafeName:""},
  maps:[{id:1,keyword:"강남 피부과",naverPlace:"1위",google:"3위",kakao:"2위",status:"good"}],
  mapsCost:0,
  experience:[{id:1,title:"체험후기",url:"",platform:"네이버블로그",views:1240,comments:32,lastUpdated:"2024-02-20",status:"good"}],
  experienceCost:0, cafesCost:0,
  cafes:[{id:1,name:"강남맘카페",url:"",members:"12만",penetrated:true,posts:[{id:101,title:"다녀왔어요",url:"",views:1240,comments:[]}]},{id:2,name:"서초생활정보",url:"",members:"8만",penetrated:false,posts:[]}],
  youtube:[{id:1,title:"보톡스 솔직후기",url:"",views:12400,likes:320,lastUpdated:"2024-02-20",comments:[]}],
  ytChannels:[],
  youtubeCost:0,
  shortform:[{id:1,platform:"인스타그램",title:"시술 전후 비교",url:"",views:23000,likes:890,lastUpdated:"2024-02-20",comments:[]}],
  shortformCost:0,
  autocomplete:[{id:1,keyword:"강남피부과",naver:["강남피부과 추천","강남피부과 가격"],instagram:["강남피부과일상"]}],
  autocompleteCost:0,
  seoPages:[
    {id:1,targetKeyword:"강남 피부과",pageUrl:"/",pageTitle:"메인 페이지",metaTitle:"강남 피부과 | OO피부과 - 강남역 도보 3분",metaDesc:"강남 피부과 전문의 직접 시술. 보톡스, 필러, 레이저 토닝 등 피부과 전문 진료. 강남역 1번출구 도보 3분.",h1Tag:"강남 피부과 전문 OO피부과",
      seoChecklist:{titleLen:true,descLen:true,h1Has:true,altText:false,internalLink:true,schema:false,mobileOpt:true,pageSpeed:false,ssl:true,sitemap:true},
      currentRank:"5위",targetRank:"1위",status:"수정필요",notes:"alt text, schema 마크업 추가 필요",lastUpdated:"2024-02-20"},
    {id:2,targetKeyword:"강남 보톡스",pageUrl:"/botox",pageTitle:"보톡스 페이지",metaTitle:"강남 보톡스 가격 | OO피부과 - 정품 보톡스 전문",metaDesc:"강남 보톡스 가격 안내. 정품 보톡스만 사용, 전문의 직접 시술. 자연스러운 결과를 약속합니다.",h1Tag:"강남 보톡스 시술 안내",
      seoChecklist:{titleLen:true,descLen:true,h1Has:true,altText:true,internalLink:true,schema:true,mobileOpt:true,pageSpeed:true,ssl:true,sitemap:true},
      currentRank:"3위",targetRank:"1위",status:"설정완료",notes:"",lastUpdated:"2024-02-18"},
    {id:3,targetKeyword:"강남 필러",pageUrl:"/filler",pageTitle:"필러 페이지",metaTitle:"",metaDesc:"",h1Tag:"",
      seoChecklist:{titleLen:false,descLen:false,h1Has:false,altText:false,internalLink:false,schema:false,mobileOpt:true,pageSpeed:false,ssl:true,sitemap:true},
      currentRank:"-",targetRank:"3위",status:"미설정",notes:"페이지 신규 생성 필요",lastUpdated:"2024-02-15"},
  ],
  seoCost:0,
  calendarEvents:[
    {id:1,title:"블로그 포스팅 3건",date:"2025-02-10",type:"content",channel:"키워드",done:true},
    {id:2,title:"체험단 모집 마감",date:"2025-02-15",type:"deadline",channel:"체험단",done:true},
    {id:3,title:"유튜브 영상 촬영",date:"2025-02-20",type:"content",channel:"유튜브",done:false},
    {id:4,title:"카페 바이럴 게시물 5건",date:"2025-02-25",type:"content",channel:"카페",done:false},
    {id:5,title:"래미안 강남 광고 종료",date:"2025-04-30",type:"deadline",channel:"오프라인",done:false},
    {id:6,title:"강남역 광고 종료",date:"2025-03-31",type:"deadline",channel:"오프라인",done:false},
    {id:7,title:"3월 보고서 작성",date:"2025-03-05",type:"report",channel:"전체",done:false},
    {id:8,title:"숏폼 콘텐츠 2건 발행",date:"2025-03-10",type:"content",channel:"숏폼",done:false},
    {id:9,title:"리뷰 답글 작성 20건",date:"2025-03-12",type:"task",channel:"원내",done:false},
  ],
  todos:[
    {id:1,text:"블로그 포스팅 3건 발행",channel:"키워드",priority:"high",done:false,dueDate:"2025-03-07"},
    {id:2,text:"네이버 플레이스 리뷰 답글 10건",channel:"원내",priority:"medium",done:false,dueDate:"2025-03-05"},
    {id:3,text:"체험단 후기 확인 및 공유",channel:"체험단",priority:"medium",done:true,dueDate:"2025-02-28"},
    {id:4,text:"카페 바이럴 게시물 기획",channel:"카페",priority:"low",done:false,dueDate:"2025-03-10"},
    {id:5,text:"유튜브 썸네일 제작",channel:"유튜브",priority:"high",done:false,dueDate:"2025-03-03"},
    {id:6,text:"숏폼 릴스 편집",channel:"숏폼",priority:"medium",done:false,dueDate:"2025-03-08"},
  ],
  community:{당근마켓:{cost:0,items:[{id:1,title:"피부과 이벤트 공지",url:"",views:1240,lastUpdated:"2024-02-20"}]},에브리타임:{cost:0,items:[]},맘카페:{cost:0,items:[]},지역카페:{cost:0,items:[]}},
  inhouse:{messagesCost:0,reviewsCost:0,photosCost:0,videosCost:0,messages:[{id:1,title:"2월 보톡스 이벤트",platform:"카카오",sentDate:"2024-02-01",recipients:1240,openRate:"38%",status:"완료"}],reviews:[{id:1,platform:"네이버 플레이스",count:124,target:200,lastUpdated:"2024-02-20"},{id:2,platform:"구글맵",count:43,target:100,lastUpdated:"2024-02-20"}],photos:[{id:1,title:"쁘띠성형 전후사진",category:"쁘띠성형",lastUpdated:"2024-02-15",images:[]}],videos:[{id:1,title:"원내 시술 소개",location:"대기실 TV",duration:"3분 20초",lastUpdated:"2024-02-01",url:""}]},
  offline:{elevator:[{id:1,complex:"래미안 강남",units:320,startDate:"2024-02-01",endDate:"2024-04-30",cost:1200000,status:"집행중"}],subway:[{id:1,station:"강남역",location:"2번 출구",startDate:"2024-02-01",endDate:"2024-03-31",cost:2500000,status:"집행중"}],other:[{id:1,type:"버스정류장",location:"강남구청 앞",startDate:"2024-02-15",endDate:"2024-03-14",cost:800000,status:"집행중"}]},
  conversions:{keywords:5,maps:12,experience:3,cafes:2,youtube:4,shortform:6,autocomplete:1,seo:3,community:3,inhouse:8,offline:7},
  avgRevenuePerPatient:500000,
};

export const SC={good:"#10b981",warn:"#f59e0b",danger:"#ef4444"};

export const SL={good:"정상",warn:"주의",danger:"점검필요"};

export const EVENT_TYPES=[{v:"content",l:"📝 콘텐츠",c:"#6366f1"},{v:"deadline",l:"⏰ 마감/종료",c:"#ef4444"},{v:"report",l:"📊 보고서",c:"#f59e0b"},{v:"task",l:"✅ 업무",c:"#10b981"},{v:"meeting",l:"🤝 미팅",c:"#8b5cf6"}];

export const EVENT_CHANNELS=["전체","키워드","지도","체험단","카페","유튜브","숏폼","자동완성","SEO","커뮤니티","원내","오프라인"];

export const PRIORITY_OPTS=[{v:"high",l:"🔴 긴급",c:"#ef4444"},{v:"medium",l:"🟡 보통",c:"#f59e0b"},{v:"low",l:"🟢 여유",c:"#10b981"}];

export const RANK_FIELDS=[
  {key:"myBlogRank",label:"블로그",icon:"📝",color:"#6366f1"},
  {key:"myPlaceRank",label:"플레이스",icon:"📍",color:"#06b6d4"},
  {key:"rankCafe",label:"카페",icon:"☕",color:"#ec4899"},
  {key:"rankKnowledge",label:"지식인",icon:"❓",color:"#f59e0b"},
  {key:"rankNews",label:"뉴스",icon:"📰",color:"#94a3b8"},
  {key:"rankPowerlink",label:"파워링크",icon:"💎",color:"#10b981"},
  {key:"rankGoogle",label:"구글맵",icon:"🌐",color:"#f97316"},
  {key:"rankKakao",label:"카카오맵",icon:"🟡",color:"#fbbf24"},
];
