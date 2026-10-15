/* 框架的介面零件：面板、文件視窗、通知、來電、點擊保護、忙碌旗標。只用框架的名字（$、SFX、W）。
   畫面元素的 id 在 body.html：#panel、#panelBody、#pTitle、#pClose、#sys、#sysBody、#sysLogo、#sysTitle、#sysClose、#dlg、#toast、#tcard、#guide。
   遊戲要在面板打開前做事（例如收起說明卡）：panelHooks.push(f)。 */
const body=$('#panelBody'),panelEl=$('#panel');
const sysEl=$('#sys'),sysBody=$('#sysBody');
const dlg=$('#dlg'),toastEl=$('#toast'),tcard=$('#tcard'),guideEl=$('#guide');
let busy=false;        // 正在對話、操作或過場。這時候點別的東西不會打斷

/* TAP：畫面剛換的那一小段時間不收點擊。主頁的開始鈕連點兩下，第二下會落在下一張卡上 */
const TAP=400;

/* ───────── 面板工具 ───────── */
/* 右側（手機在下方）的視窗平常是收起來的。要動手操作、看說明卡或聊天的時候才打開 */
let panelClose=null;
const panelHooks=[];   /* 遊戲用 panelHooks.push(f) 登記：每次 setPanel 打開新內容之前先跑 */
function setPanel(html,title,onClose){
  panelHooks.forEach(f=>f());   /* 打開之前：遊戲登記的收尾（例如關掉正在看的說明卡） */
  panelEl.hidden=false;panelEl.classList.remove('tall');$('#pTitle').textContent=title||'';panelClose=onClose||null;$('#pClose').hidden=!onClose;
  /* 鍵盤操作：視窗打開時，焦點移到裡面第一個能按的東西 */
  body.innerHTML=html;body.scrollTop=0;const b=$('#next',body),f=b&&!b.disabled?b:$('button:not(:disabled),input,a[href]',body);if(f)f.focus({preventScroll:true});if(W)W.layout();
}
function hidePanel(){panelEl.hidden=true;panelEl.classList.remove('tall');body.innerHTML='';panelClose=null;if(W)W.layout()}
$('#pClose').onclick=()=>{const f=panelClose;if(f)f()};
const ps=t=>(Array.isArray(t)?t:[t]).map(x=>'<p>'+x+'</p>').join('');
const nextBtn=(t)=>'<div class="row end"><button class="btn btn-primary" id="next" type="button">'+(t||'繼續')+'</button></div>';
const kv=rows=>'<dl class="kv">'+rows.map(r=>'<dt>'+r[0]+'</dt><dd>'+r[1]+'</dd>').join('')+'</dl>';

/* ───────── 蓋在畫面上的文件視窗：交接單、檢討報告（示意畫面） ───────── */
function openSys(mission,logo,title){$('#sysLogo').textContent=logo;$('#sysTitle').textContent=title;sysEl.hidden=false;$('#sysClose').hidden=!!mission;sysBody.scrollTop=0}
function closeSys(){sysEl.hidden=true}
$('#sysClose').onclick=closeSys;

/* 突發狀況：電話、群組訊息。要按了才會往下走 */
const ANSWER='接聽';   // 按鈕是「接聽」的才是電話（會響鈴、震動），其他是訊息
function ring(title,sub,btn,cb){
  clearTimeout(toastT);toastEl.hidden=false;toastEl.className='toast ring';
  toastEl.innerHTML='<div><b>'+title+'</b><small>'+sub+'</small></div><button class="btn btn-primary" id="toastGo" type="button">'+btn+'</button>';
  if(btn===ANSWER){SFX.ring();SFX.vib([300,150,300,150,300])}else SFX.ping();
  $('#toastGo').onclick=()=>{SFX.stopRing();toastEl.hidden=true;cb()};$('#toastGo').focus({preventScroll:true});
}
let toastT=0;
function toast(title,sub,cls){
  clearTimeout(toastT);toastEl.hidden=false;toastEl.className='toast'+(cls?' '+cls:'');
  toastEl.innerHTML='<div><b>'+title+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</div>';
  toastT=setTimeout(()=>{if(toastEl.className.indexOf('ring')<0)toastEl.hidden=true},cls==='msg'?6200:4600);
}
