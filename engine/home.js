/* ───────── 主頁、上方那一列（時鐘、聲音、主頁、圖鑑）、語言切換 ─────────
   主頁只有：標題、副標、名字（可以不填）、一顆開始。上次玩到一半就變成「接著上次」，旁邊多一顆「從頭開始」。
   遊戲登記（設定 HOME 上的東西）：
     HOME.title、HOME.sub   標題、副標
     HOME.fine              最下面一行小字（例如「人物與事件都是虛構的」）
     HOME.support           遊戲作者自己的贊助連結 {url, label}（沒有就不顯示）
     HOME.shots             主頁背景每 8 秒換一個鏡頭時，要不要同時擺一次場景：function(i)（i 是第幾個鏡頭）
   出處那一行：主頁與結算畫面一定有「Powered by fab24hr」（連到 CREDIT_URL；每種語言都一樣）與「☕ 贊助 fab24hr」（連到 COFFEE_URL；
   跟著遊戲的語言翻譯）。這是框架授權（LICENSE）的條件，所以沒有關掉的設定；建置擋 HOME.credit，npm test 檢查兩個畫面都看得到。
   名字放進畫面前一律經過 cleanName()（拿掉 < > & " ' \ 與空白；中日韓文字最多 6 個字，其他 12 個）。 */
const HOME={title:'',sub:'',fine:'',support:null,shots:null};
const CREDIT_URL='https://fab24hr.com/';
const COFFEE_URL='https://buymeacoffee.com/mclty';
const NAME_MAX=12;
const cleanName=n=>{const a=Array.from(String(n||'').replace(/[<>&"'\\\s]/g,''));return a.slice(0,a.some(c=>c.charCodeAt(0)>0x2e7f)?6:NAME_MAX).join('')};
const homeEl=$('#home');
let hIdx=0,hTimer=0;
function setShot(i){
  if(!W)return;const n=W.shots();hIdx=(i+n)%n;W.shot(hIdx);if(HOME.shots)HOME.shots(hIdx);
  clearTimeout(hTimer);if(!reduceMotion&&!homeEl.hidden&&n>1)hTimer=setTimeout(()=>setShot(hIdx+1),8000);
}
function renderHome(){
  $('#hTitle').textContent=HOME.title;$('#hSub').textContent=HOME.sub;$('#hSub').hidden=!HOME.sub;$('#hFine').textContent=HOME.fine;$('#hFine').hidden=!HOME.fine;
  const sv=readSave();$('#go').textContent=sv?'接著上次':'開始';$('#goNew').hidden=!sv;
  const sp=$('#hSupport');if(HOME.support&&HOME.support.url){sp.href=HOME.support.url;sp.textContent=HOME.support.label||'支持作者';sp.hidden=false}else sp.hidden=true;
  $('#hCredit').href=CREDIT_URL;$('#hCoffee').href=COFFEE_URL;
}
function showHome(){
  document.body.classList.add('at-home');document.body.classList.remove('night');homeEl.hidden=false;ST.on=false;
  renderHome();
  if(W){W.free(false);W.home(true);W.marker(null)}
  setShot(hIdx);
  $('#go').focus({preventScroll:true});
}
function hideHome(){clearTimeout(hTimer);document.body.classList.remove('at-home');homeEl.hidden=true;if(W)W.home(false)}
/* 隨時可以回主頁。進度每做完一件事就存一次，回來可以接著玩 */
function goHome(){
  tcTok++;SFX.stopRing();clearInterval(typeT);typeT=0;closeSys();hidePanel();
  dlg.hidden=true;toastEl.hidden=true;tcard.hidden=true;endEl.hidden=true;guideEl.hidden=true;ptr.hidden=true;bub.hidden=true;bubCh=null;busy=false;
  if(W){W.marker(null);W.focus(null)}
  showHome();
}
function enter(fresh){
  SFX.unlock();   /* 聲音要在按下去的那一刻解鎖（手機瀏覽器的規定） */
  const name=cleanName($('#pname').value),sv=fresh?null:readSave();
  $('#pname').value=name;try{localStorage.setItem(GAME.key+'n',name)}catch(e){}
  hideHome();
  if(sv){sv.name=name;resumeStory(sv)}else{clearSave();startStory(name)}
}
$('#pname').maxLength=NAME_MAX;
try{$('#pname').value=cleanName(localStorage.getItem(GAME.key+'n'))}catch(e){}
$('#go').onclick=()=>enter(false);
$('#goNew').onclick=()=>enter(true);
$('#pname').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&e.keyCode!==229){e.preventDefault();$('#go').click()}});   // 輸入法選字的那一下 Enter 不算
$('#homeBtn').onclick=goHome;
MOVE.page=()=>!homeEl.hidden||!endEl.hidden;
/* 聲音開關：上方一顆、主頁一顆，狀態記在這台裝置上 */
const SND_ON='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const SND_OFF='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function drawSnd(){const on=SFX.isOn();$('#sndBtn').innerHTML=on?SND_ON:SND_OFF;$('#sndBtn').setAttribute('aria-pressed',String(on));$('#sndBtn').setAttribute('aria-label',on?'聲音：開。按一下關掉':'聲音：關。按一下打開');$('#hSnd').textContent=on?'聲音：開':'聲音：關'}
function flipSnd(){SFX.set(!SFX.isOn());drawSnd();if(SFX.isOn())SFX.ping()}
$('#sndBtn').onclick=flipSnd;$('#hSnd').onclick=flipSnd;drawSnd();
/* 語言切換：有兩種以上語言時才出現（主頁標題旁一顆、圖鑑一顆）。按了記住選擇；遊戲進行中按，先存檔，到另一個語言的頁面直接接回同一件事 */
function langSwitch(el){
  if(!el||LANGS.length<2)return;
  el.innerHTML=LANGS.map(o=>o[0]===LANG?'<span lang="'+o[0]+'" aria-current="true">'+o[1]+'</span>':'<a lang="'+o[0]+'" hreflang="'+o[0]+'" data-l="'+o[0]+'" href="'+o[2]+'">'+o[1]+'</a>').join('');
  el.hidden=false;
  $$('a',el).forEach(a=>a.onclick=()=>{const o=LANGS.find(l=>l[0]===a.dataset.l);try{localStorage.setItem(GAME.key+'lang',o[0])}catch(e){}
    if(ST.on&&homeEl.hidden&&endEl.hidden){save();a.href=o[2]+'?resume=1'}});
}
langSwitch($('#hLang'));langSwitch($('#cLang'));
/* 上方那一列的高度：畫面邊緣的箭頭、鏡頭都要避開它 */
{const h=$('#hud'),setH=()=>document.documentElement.style.setProperty('--hud-h',h.getBoundingClientRect().height+'px');setH();new ResizeObserver(setH).observe(h)}
new ResizeObserver(()=>document.documentElement.style.setProperty('--guide-h',(guideEl.hidden?0:guideEl.getBoundingClientRect().height+8)+'px')).observe(guideEl);
