/* ───────── 走動時的介面：方向鍵、對話鍵、畫面邊緣的箭頭、頭上的泡泡、鍵盤 ─────────
   遊戲要告訴它的事（設定 MOVE 上的函式）：
     MOVE.can()     現在可以走動（沒有在對話、視窗、主頁、結算……）
     MOVE.near()    可以走動時每 0.2 秒問一次：旁邊可以互動的 [id, 對話鍵上的字]，沒有就 null；
                    回傳 false 表示這一輪發生了別的事（例如來電），對話鍵先不動
     MOVE.idle()    不能走動時每 0.2 秒呼叫一次；MOVE.after() 每 0.2 秒的最後（例如判斷人走到哪一區）
     MOVE.act(id)   按了對話鍵（或 E）
     MOVE.target()  要找的人或地方 [x, z]：不在畫面裡時，畫面邊緣有一個箭頭指過去；沒有就 null
     MOVE.cover()   蓋在最上層、自己處理 Enter 的東西開著（例如圖鑑、看圖）
     MOVE.page()    整頁的畫面開著（例如主頁、結算）：Enter 不幫忙按對話或來電
     MOVE.esc()     按了 Esc
   bubble(id, 字, 毫秒)：那個人頭上冒一句話（只是氣氛）。G 鍵按「下一步」的帶我去（#gGo）。 */
const MOVE={can:()=>false,near:()=>null,idle:()=>{},after:()=>{},act:()=>{},target:()=>null,cover:()=>false,page:()=>false,esc:()=>{}};
const dpad=$('#dpad'),talkBtn=$('#talkBtn');
$$('button',dpad).forEach(b=>{
  const k=b.dataset.k,on=v=>{b.classList.toggle('on',v);if(W)W.key(k,v)};
  b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(_){}on(true)});
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>b.addEventListener(t,()=>on(false)));
  b.addEventListener('contextmenu',e=>e.preventDefault());
  b.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();on(true)}});
  b.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter')on(false)});
  b.addEventListener('blur',()=>on(false));
});
function tickUi(){
  if(document.hidden)return;
  const can=MOVE.can()&&!!W;
  if(dpad.hidden===can){dpad.hidden=!can;if(!can&&W)['u','d','l','r'].forEach(k=>W.key(k,false))}
  let near=null,label='';
  if(can){const r=MOVE.near();if(r===false)return;if(r){near=r[0];label=r[1]}}else MOVE.idle();
  MOVE.after();
  if(near&&talkBtn.dataset.l!==label){talkBtn.dataset.id=near;talkBtn.dataset.l=label;talkBtn.innerHTML=label+' <kbd>E</kbd>'}
  talkBtn.hidden=!near;
}
/* 要找的人或東西不在畫面裡的時候，畫面邊緣有一個箭頭指過去 */
const ptr=$('#ptr');
function tickPtr(){
  let on=false;const t=W&&MOVE.can()?MOVE.target():null;
  if(t){
    const s=W.snap(),dx=t[0]-s.me[0],dz=t[1]-s.me[1],L=Math.hypot(dx,dz);
    const p=W.project(t[0],2.4,t[1]),w=innerWidth,h=innerHeight,m=30,top=(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hud-h'))||56)+70,bot=h-m;
    if(L>3&&(p[2]>1||p[0]<m||p[0]>w-m||p[1]<top||p[1]>bot)){
      const a=W.project(s.me[0],1,s.me[1]),q=W.project(s.me[0]+dx/L*2,1,s.me[1]+dz/L*2),U=Math.hypot(q[0]-a[0],q[1]-a[1])||1,vx=(q[0]-a[0])/U,vy=(q[1]-a[1])/U;
      let k=1e9;if(vx>0)k=Math.min(k,(w-m-a[0])/vx);else if(vx<0)k=Math.min(k,(m-a[0])/vx);if(vy>0)k=Math.min(k,(bot-a[1])/vy);else if(vy<0)k=Math.min(k,(top-a[1])/vy);
      k=Math.max(70,k);
      ptr.style.transform='translate('+Math.round(a[0]+vx*k-19)+'px,'+Math.round(a[1]+vy*k-19)+'px) rotate('+Math.atan2(vy,vx).toFixed(3)+'rad)';on=true;
    }
  }
  ptr.hidden=!on;
}
setInterval(tickPtr,100);
/* 頭上的泡泡：跟著那個人，時間到、或不能走動了就收起來 */
const bub=$('#bub');let bubCh=null,bubEnd=0;
function bubTick(){
  if(!bubCh)return;
  if(!W||!MOVE.can()||performance.now()>bubEnd){bub.hidden=true;bubCh=null;return}
  const p=W.snap()[bubCh],q=W.project(p[0],2.95,p[1]);
  bub.style.transform='translate('+Math.round(q[0])+'px,'+Math.round(q[1])+'px) translate(-50%,-100%)';
  requestAnimationFrame(bubTick);
}
function bubble(id,text,ms){bub.textContent=text;bub.hidden=false;bubCh=id;bubEnd=performance.now()+ms;bubTick()}
const talkNear=()=>MOVE.act(talkBtn.dataset.id);
talkBtn.onclick=()=>{if(!talkBtn.hidden)talkNear()};
/* 按住 Enter 或空白鍵不放：不要一路按掉對話、來電、字卡和視窗裡的第一顆按鈕 */
document.addEventListener('keydown',e=>{if(e.repeat&&(e.key==='Enter'||e.key===' ')&&e.target&&e.target.closest&&e.target.closest('button'))e.preventDefault()},true);
document.addEventListener('keydown',e=>{
  const t=e.target&&e.target.tagName,typing=t==='INPUT'||t==='TEXTAREA';
  /* 輸入框裡只認 Esc（關掉視窗）；其他鍵留給打字 */
  if(typing&&e.key!=='Escape')return;
  /* Enter／空白鍵：焦點不在按鈕上（滑鼠點過場景或對話文字之後）也能繼續對話、接電話、關字卡 */
  if((e.key==='Enter'||e.key===' ')&&!e.repeat&&!typing&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!MOVE.cover()&&!sysEl.hidden&&$('#sysDone')&&t!=='BUTTON'&&t!=='A'){e.preventDefault();$('#sysDone').click();return}   /* 文件視窗：滑鼠點過內文之後，Enter 一樣能按「看完了」 */
  const onTerm=t==='BUTTON'&&e.target.classList&&e.target.classList.contains('term');   /* 剛點過對話裡的名詞，焦點留在那個詞上：Enter 是「繼續」，不是再開一次解釋 */
  if((e.key==='Enter'||e.key===' ')&&!e.repeat&&!typing&&(t!=='BUTTON'||onTerm)&&t!=='A'&&t!=='SELECT'&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!MOVE.cover()&&sysEl.hidden&&!MOVE.page()){
    const b=!tcard.hidden?$('#tcGo'):!toastEl.hidden&&$('#toastGo')?$('#toastGo'):!dlg.hidden?$('#dlgNext'):null;if(b){e.preventDefault();b.click();return}}
  if(e.code==='KeyE'&&!typing&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!talkBtn.hidden&&MOVE.can()){e.preventDefault();talkNear()}
  else if(e.code==='KeyG'&&!typing&&!guideEl.hidden&&MOVE.can()&&!e.metaKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();$('#gGo').click()}
  else if(e.key==='Escape'&&!e.defaultPrevented)MOVE.esc();
});
setInterval(tickUi,200);
new ResizeObserver(()=>document.documentElement.style.setProperty('--panel-h',panelEl.getBoundingClientRect().height+'px')).observe(panelEl);
