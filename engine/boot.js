/* ───────── 啟動（進入點呼叫 boot()）───────── */
function boot(){
  try{W=initWorld()}catch(e){W=null;if(window.console)console.error(e)}
  if(W){W.onPick=onPick;W.canMove=()=>MOVE.can()}
  else{const n=document.createElement('p');n.className='nogl';n.textContent='這台裝置開不了 3D 場景。遊戲內容照常可以玩。';document.body.appendChild(n)}
  /* 手機：手指在不能捲的地方拖動、或兩根手指捏合，都不要讓整個網頁跟著動或放大。能捲的區塊照常捲 */
  {const SCROLL='.panel-body,.sys-body,.codex-body,.board .scroll,.cardv-body,.dlg,.tabs,textarea,input[type="range"]';
    document.addEventListener('touchmove',e=>{if(e.touches.length>1||!(e.target.closest&&e.target.closest(SCROLL)))e.preventDefault()},{passive:false});
    ['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
    document.addEventListener('touchend',()=>{if(window.scrollY||window.scrollX)window.scrollTo(0,0)},{passive:true})}
  hud();
  /* 遊戲中途切換語言過來的（網址帶 resume=1）：直接接回同一件事 */
  try{const u=new URL(location.href);if(u.searchParams.get('resume')==='1'){u.searchParams.delete('resume');history.replaceState(null,'',u.pathname+u.search+u.hash);const sv=readSave();if(sv){hideHome();resumeStory(sv);return}}}catch(e){}
  showHome();
}
