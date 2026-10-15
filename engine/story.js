/* ───────── 故事：一天是一串「時刻」，每個時刻裡有幾件事 ─────────
   遊戲登記（設定 STORY 上的東西，內容的檔一載入就可以設）：
     STORY.segs={id:{name,sub,t,mood,scene,note}}
        時刻：字卡上的名字與副標、開始的時間（從午夜算起的分鐘）、光線（'day'、'eve'、'night'）、
        scene() 進到這個時刻時擺場景（例如 W.put、W.screen）、note 這個時刻結束時記下的一句話（可以是函式）。
        時刻的順序就是 beats 裡第一次出現的順序。
     STORY.beats=[{seg,to,guide,lines,mini,post,after,when,ring,t,end},…]  一件一件照順序做：
        to     要去找的人（WORLD.cast 的 id）或地方（STORY.places 的 id）
        guide  畫面上方「下一步」那一行
        lines()  走到了之後的對話 [[說話的人, 文字], …]（說話的人是 'sys' 是旁白）
        mini(done)  對話後的小遊戲（做完呼叫 done）；post() 小遊戲之後的對話；after() 這件事做完時
        when()  回傳 false 就跳過這件事；ring [標題, 副標, 按鈕字] 開始前先響一通電話或跳一則訊息（按鈕是「接聽」的才是電話）
        t      這件事開始時，時鐘至少走到幾分；end:true 最後一件，做完就結算
     STORY.places={id:{name,at:[x,z],mark:[x,y,z],go}}  地方：名字、走到哪裡才算到了、「！」掛在哪、還在遠處時按鈕上的字
     STORY.cast={id:{name,role,tag,color}}  對話框上的名字、職稱、色塊裡的字與顏色（'me' 的名字是玩家填的）
     STORY.talk(id)  跟現在不是要找的人講話（沒有設定就說一句「在忙」）
     STORY.ending()  結算卡的內容 {title, sub, lines:[…], stats:[[字, 數字], …]}，圖卡用的 who、led、tl、more、share 可以省略（engine/end.js）
   ST 是進度（每做完一件事存一次）：q 第幾件事、seg 現在的時刻、clock 遊戲裡幾點（分鐘）、name 玩家名字、
   d 遊戲自己要記的東西（選了什麼、拿到什麼；只放得進 JSON 的值）。 */
const STORY={segs:{},beats:[],places:{},cast:{},talk:null,ending:null};
const ST={on:false,q:0,seg:'',clock:0,rung:-1,name:'',d:{},talks:0,tip:0};
const clockOf=m=>{m=((Math.round(m)%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
function hud(){const c=$('#clock');if(c)c.textContent=clockOf(ST.clock);const n=$('#clockNote'),G=STORY.segs[ST.seg];if(n)n.textContent=G?G.name:''}
const curBeat=()=>ST.on?STORY.beats[ST.q]:null;
const nextIndex=i=>{const B=STORY.beats;for(let j=i;j<B.length;j++)if(!B[j].when||B[j].when())return j;return B.length};
const isPerson=id=>!!STORY.cast[id]||!!(W&&W.has(id));
const nameOf=id=>id==='me'?(ST.name||'你'):STORY.cast[id]?STORY.cast[id].name:STORY.places[id]?STORY.places[id].name:id;
const standOf=id=>{const p=STORY.places[id];return p?p.at:[0,0]};

/* ── 存檔：存「哪個時刻的第幾件事」，beats 中間插了新的事，舊存檔也不會接到別的時刻去 ── */
function saveAt(){const B=STORY.beats,i=Math.min(ST.q,B.length-1),b=B[i];return [b.seg,i-B.findIndex(x=>x.seg===b.seg)]}
function save(){try{localStorage.setItem(GAME.key,JSON.stringify({at:saveAt(),name:ST.name,clock:ST.clock,d:ST.d,talks:ST.talks}))}catch(e){}}
function readSave(){try{const o=JSON.parse(localStorage.getItem(GAME.key)||'null');if(!o||!Array.isArray(o.at))return null;const q=qOf(o);return q>0&&q<STORY.beats.length?o:null}catch(e){return null}}
function qOf(o){const B=STORY.beats,f=B.findIndex(b=>b.seg===o.at[0]);if(f<0)return 0;let n=0;while(B[f+n]&&B[f+n].seg===o.at[0])n++;return f+Math.min(Math.max(o.at[1]|0,0),n-1)}
function clearSave(){try{localStorage.removeItem(GAME.key)}catch(e){}}

/* ── 時間字卡：換時刻時蓋一張，時鐘跟著轉過去；點一下或 3.6 秒後收起來 ── */
let tcTok=0;
function titleCard(seg,cb){
  const G=STORY.segs[seg],my=++tcTok;let fin=false;
  SFX.card();
  tcard.classList.remove('out');tcard.hidden=false;tcard.innerHTML='<div class="tc"><p class="tc-t mono" id="tcT">'+clockOf(ST.clock)+'</p><h2>'+G.name+'</h2><p>'+(typeof G.sub==='function'?G.sub():G.sub||'')+'</p><button class="btn btn-ghost" id="tcGo" type="button">繼續</button></div>';
  const from=ST.clock,to=G.t==null?from:G.t,t0=performance.now(),dur=reduceMotion||to<=from?1:1200;
  const step=()=>{if(fin||my!==tcTok)return;const k=Math.min(1,(performance.now()-t0)/dur);ST.clock=Math.round(from+(to-from)*k);const e=$('#tcT');if(e)e.textContent=clockOf(ST.clock);hud();if(k<1)requestAnimationFrame(step)};
  if(dur===1){ST.clock=Math.max(to,from);$('#tcT').textContent=clockOf(ST.clock);hud()}else step();
  const end=()=>{if(fin||my!==tcTok)return;fin=true;ST.clock=Math.max(to,from);hud();tcard.onclick=null;
    if(reduceMotion)tcard.hidden=true;else{tcard.classList.add('out');setTimeout(()=>{if(my===tcTok)tcard.hidden=true;tcard.classList.remove('out')},240)}
    cb()};
  tcard.onclick=end;$('#tcGo').focus({preventScroll:true});setTimeout(end,3600);
}

/* ── 下一步：只有一行字，加一顆「帶我去」。要找的人或地方頭上有一顆「！」 ── */
function showGuide(){
  const b=curBeat(),live=!!b&&!busy&&(!b.ring||ST.rung===ST.q),on=live&&panelEl.hidden&&!!b.guide;
  guideEl.hidden=!on;
  if(W){if(live&&b.to){if(isPerson(b.to))W.markOn(b.to);else{const p=STORY.places[b.to];W.marker(p&&p.mark?p.mark:null)}}else W.marker(null)}
  if(!on)return;
  const first=!!W&&!ST.tip;
  guideEl.className='guide'+(first?' first':'');
  guideEl.innerHTML='<span class="g-k">下一步</span><span class="g-t">'+b.guide+'</span>'+(b.to?'<button class="btn" id="gGo" type="button">'+(W?'帶我去':'去做')+'<kbd>G</kbd></button>':'')
    +(first&&b.to?'<span class="g-h">按「帶我去」會自己走過去。想自己走：'+(matchMedia('(pointer:coarse)').matches?'用左下的方向鍵，或點地板':'方向鍵、WASD，或點地板')+'。頭上有「！」的就是要找的對象。</span>':'');
  if($('#gGo'))$('#gGo').onclick=()=>goTo(b.to);
}

/* ── 一件一件做 ── */
function enterSeg(seg,cb,noCard){
  const G=STORY.segs[seg];ST.seg=seg;busy=true;showGuide();
  if(W){W.mood(G.mood||'day');if(G.scene)G.scene()}
  document.body.classList.toggle('night',G.mood==='night');
  if(noCard){ST.clock=Math.max(G.t==null?ST.clock:G.t,ST.clock);hud();cb()}else titleCard(seg,cb);
}
function beginBeat(){
  const b=curBeat();if(!b)return;
  if(b.t!=null&&b.t>ST.clock){ST.clock=b.t;hud()}
  if(b.ring&&ST.rung!==ST.q){busy=true;showGuide();const R=typeof b.ring==='function'?b.ring():b.ring;
    ring(R[0],R[1],R[2],()=>{ST.rung=ST.q;if(b.to){busy=false;showGuide();if(W&&R[2]!==ANSWER)goTo(b.to)}else runBeat(b)});return}   /* 訊息叫你去找誰：按掉就直接走過去 */
  busy=false;showGuide();
  if(!b.to){runBeat(b);return}   /* 不用走去哪裡的事（例如旁白）：直接開始 */
}
function runBeat(b){
  busy=true;showGuide();
  if(b.end){const e=()=>{if(b.after)b.after();ending()};const L=b.lines&&b.lines();if(L&&L.length)say(L,e);else e();return}
  if(b.to&&isPerson(b.to))ST.talks++;
  const s4=()=>{hidePanel();if(b.after)b.after();advance()};
  const s3=()=>{const L=b.post&&b.post();if(L&&L.length){hidePanel();say(L,s4)}else s4()};
  const s2=()=>{if(b.mini)b.mini(s3);else s3()};
  const L=b.lines&&b.lines();if(L&&L.length)say(L,s2);else s2();
}
function advance(){
  const B=STORY.beats,prev=B[ST.q],ni=nextIndex(ST.q+1),nb=B[ni],segEnd=!nb||nb.seg!==prev.seg,G=STORY.segs[prev.seg];
  const go=()=>{ST.q=ni;save();if(!nb){ending();return}if(segEnd)enterSeg(nb.seg,beginBeat);else beginBeat()};
  if(segEnd&&G.note)say([['note',typeof G.note==='function'?G.note():G.note]],go,{end:'記下來'});else go();
}
/* 走過去，到了再開口 */
let lastGo=null;
function goTo(id){
  if(busy||!ST.on||!id)return;
  if(!W){interact(id);return}
  const s=W.snap(),me=s.me;let x,z;
  if(isPerson(id)){if(!s.vis[id])return;const p=W.dest(id)||s[id],dx=me[0]-p[0],dz=me[1]-p[1],L=Math.hypot(dx,dz)||1;if(L<2.6){interact(id);return}   /* 還在走的人：走到他要去的地方 */
    /* 站在他旁邊 1.4 的地方：先試朝著你的那一側，被櫃台、桌子擋住就換一側（八個方向裡離你最近、沒被擋住的） */
    const a0=Math.atan2(dz,dx),C=[0,1,-1,2,-2,3,-3,4].map(k=>a0+k*Math.PI/4).map(a=>[p[0]+Math.cos(a)*1.4,p[1]+Math.sin(a)*1.4]).filter(q=>!W.blocked(q[0],q[1])).sort((u,v)=>Math.hypot(u[0]-me[0],u[1]-me[1])-Math.hypot(v[0]-me[0],v[1]-me[1]));
    [x,z]=C[0]||[p[0]+dx/L*1.4,p[1]+dz/L*1.4]}
  else{const q=standOf(id);x=q[0];z=q[1];if(Math.hypot(me[0]-x,me[1]-z)<1.2){interact(id);return}}
  if(!ST.tip){ST.tip=1;showGuide()}
  const q0=ST.q;lastGo=id;W.walkXZ('me',x,z,()=>{lastGo=null;if(ST.on&&ST.q===q0&&!busy)interact(id)});
}
function interact(id){
  if(busy||!ST.on)return;
  if(W&&W.going()){const p=W.snap().me;W.walkXZ('me',p[0],p[1]);lastGo=null}   /* 還在自動走就先停下來：不然邊講話邊走遠 */
  const b=curBeat();
  if(b&&b.to===id&&(!b.ring||ST.rung===ST.q)){runBeat(b);return}
  if(STORY.talk&&STORY.talk(id))return;
  if(isPerson(id)){busy=true;showGuide();say([['sys',`${nameOf(id)}在忙，朝你點了一下頭。`]],()=>{busy=false;showGuide()},{end:'離開'})}
}

/* ── 開始、接著玩 ── */
function boot0(name){
  ST.on=true;ST.name=cleanName(name);ST.rung=-1;ST.tip=ST.tip||0;
  if(W){W.reset();W.free(true);W.setName(ST.name||nameOf('me'))}
  hidePanel();dlg.hidden=true;toastEl.hidden=true;endEl.hidden=true;lastGo=null;
}
function startStory(name){
  Object.assign(ST,{q:nextIndex(0),clock:0,d:{},talks:0});boot0(name);
  const seg=STORY.beats[ST.q].seg;ST.clock=STORY.segs[seg].t||0;save();
  enterSeg(seg,beginBeat);
}
function resumeStory(o){
  Object.assign(ST,{q:qOf(o),clock:o.clock||0,d:o.d||{},talks:o.talks||0});boot0(o.name);
  ST.q=Math.min(nextIndex(ST.q),STORY.beats.length-1);
  enterSeg(STORY.beats[ST.q].seg,beginBeat);
}

/* ── 對話框與走動介面的預設（遊戲可以再改） ── */
DLG.who=id=>{
  if(id==='sys'||id==='note')return '';
  const c=STORY.cast[id]||{},nm=id==='me'?(ST.name||c.name||'你'):c.name||id;
  return '<div class="who"><span class="sw" style="background:'+(c.color||'var(--accent)')+'">'+(c.tag||nm.slice(0,1))+'</span><div><b>'+nm+'</b>'+(c.role?'<small>'+c.role+'</small>':'')+'</div></div>'};
DLG.present=id=>id!=='me'&&!!W&&W.has(id);
DLG.line=id=>{if(!W||!DLG.present(id))return;const s=W.snap(),me=s.me,o=s[id],far=Math.hypot(o[0]-me[0],o[1]-me[1]),d=matchMedia('(min-width:860px)').matches?15:17;
  if(far>9)W.focus([me[0],1.2,me[1]],d);else W.focus([(me[0]+o[0])/2,1.2,(me[1]+o[1])/2],d+far*.6)};   /* 鏡頭靠近：對準你和說話的人中間 */
DLG.end=()=>{if(W)W.focus(null)};
MOVE.can=()=>ST.on&&!busy&&panelEl.hidden&&sysEl.hidden&&tcard.hidden&&dlg.hidden&&endEl.hidden&&!MOVE.cover()&&!MOVE.page();
MOVE.near=()=>{
  const s=W.snap(),b=curBeat(),tgt=b&&b.to&&(!b.ring||ST.rung===ST.q)?b.to:null;let near=null,best=2.6;
  for(const id in STORY.cast){if(id==='me'||!s.vis[id])continue;const d=Math.hypot(s[id][0]-s.me[0],s[id][1]-s.me[1]);if(d<best){best=d;near=id}}
  if(tgt&&isPerson(tgt)&&s.vis[tgt]&&Math.hypot(s[tgt][0]-s.me[0],s[tgt][1]-s.me[1])<3.4)near=tgt;   /* 要找的人就在旁邊：按鈕寫他 */
  if(near)return [near,`找${nameOf(near)}`];
  if(tgt&&!isPerson(tgt)){const q=standOf(tgt);if(Math.hypot(q[0]-s.me[0],q[1]-s.me[1])<1.9)return [tgt,STORY.places[tgt].name]}
  /* 要找的人或地方還在遠處：按鈕照樣在，按了就走過去（手機玩家的拇指在下面，按鈕不見了會以為卡住） */
  if(tgt&&(!isPerson(tgt)||s.vis[tgt]))return [tgt,isPerson(tgt)?`找${nameOf(tgt)}`:STORY.places[tgt].go||STORY.places[tgt].name];
  return null};
MOVE.target=()=>{const b=curBeat();if(!(b&&b.to&&(!b.ring||ST.rung===ST.q)))return null;const s=W.snap();return isPerson(b.to)?s[b.to]:standOf(b.to)};
MOVE.act=id=>{const b=curBeat();if(b&&b.to===id&&(!b.ring||ST.rung===ST.q))goTo(id);else interact(id)};
MOVE.esc=()=>{if(sysEl.hidden&&!panelEl.hidden&&panelClose){const f=panelClose;f()}};
/* 點到 3D 裡的人、地方、「！」：要找的就走過去 */
function onPick(ids){
  if(!ST.on||busy)return false;
  const b=curBeat();let id=ids[0];
  if(id==='marker'&&b&&b.to)id=b.to;
  if(b&&ids.indexOf(b.to)>=0)id=b.to;
  if(id==='marker')return false;
  if(isPerson(id)||STORY.places[id]){if(b&&b.to===id)goTo(id);else interact(id);return true}
  return false;
}
