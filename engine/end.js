/* ───────── 結算卡 ─────────
   最後一件事做完（beats 裡 end:true 的那一件）就出現。內容是 STORY.ending() 回傳的
     {title, sub, lines:[一段一段的字], stats:[[名稱, 數字], …]}
   必須照玩家實際選的寫（ST.d 裡記的），不要寫成固定的結果。
   結算畫面先給一張 9:16 的分享圖卡（engine/share.js 畫的），「看結案報告」才是上面那些字。圖卡上的東西也可以自己給：
     who   名字那一行（預設是玩家的名字）        more  稱號下面一行小字的清單
     led   燈條上遊戲名後面的幾個字              tl    最多三個時間點 [[時刻, 說明], …]（預設：開始與結束）
     share 「複製結算」與「分享連結」帶的那段字（預設：標題＋sub）
     rows  圖卡上的數字 [[名稱, 數字], …]（預設：stats）
   圖卡最多放 rows 的前六個。遊戲名、網址、標語、小字從 SHARE 來；沒填就用 HOME 的標題、副標、小字。
   按鈕：分享連結（手機叫系統的分享選單，電腦複製連結）、看結案報告／看圖卡、再玩一次、複製結算、回主頁。
   下面的連結跟主頁一樣：遊戲作者的贊助（HOME.support），與框架的出處那一行（engine/home.js；授權的條件，一定顯示）。 */
const endEl=$('#end');
function ending(){
  ST.on=false;busy=true;guideEl.hidden=true;if(W){W.marker(null);W.free(false)}clearSave();
  const E=(STORY.ending&&STORY.ending())||{},esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
  if(!SHARE.name)SHARE.name=HOME.title||document.title;if(!SHARE.tagline)SHARE.tagline=HOME.sub||'';if(!SHARE.fine)SHARE.fine=HOME.fine||'';
  const b0=STORY.beats[0],t0=b0&&STORY.segs[b0.seg]&&STORY.segs[b0.seg].t||0,start=clockOf(t0),end=clockOf(ST.clock),title=E.title||'結束了';
  endText=(E.share||[title,E.sub].filter(Boolean).join('\n'))+(SHARE.tail?'\n'+SHARE.tail:'');
  prepareCard({name:E.who!=null?E.who:ST.name||'',title,more:E.more||[],led:E.led||'',span:start+' → '+end,
    tl:E.tl||[[start,'開始'],[end,'結束']],rows:(E.rows||E.stats||[]).slice(0,6).map(r=>[String(r[0]),String(r[1])])});
  $('#endBody').innerHTML=endWrap('<p class="end-k mono">'+end+'</p><h2>'+title+'</h2>'+(E.sub?'<p class="end-sub">'+E.sub+'</p>':'')
    +(E.stats&&E.stats.length?'<dl class="kv end-stats">'+E.stats.map(r=>'<dt>'+r[0]+'</dt><dd'+(typeof r[1]==='number'?' class="mono"':'')+'>'+r[1]+'</dd>').join('')+'</dl>':'')
    +(E.lines||[]).map(l=>'<p>'+l+'</p>').join('')
    +(ST.name?'<p class="fine">'+esc(ST.name)+'</p>':''));
  const sp=$('#endSupport');if(HOME.support&&HOME.support.url){sp.href=HOME.support.url;sp.textContent=HOME.support.label||'支持作者';sp.hidden=false}else sp.hidden=true;
  $('#endCredit').href=CREDIT_URL;$('#endCoffee').href=COFFEE_URL;
  $('#endCopy').textContent='複製結算';$('#endLink').textContent='分享連結';
  SFX.ok();endEl.hidden=false;endShow();$('#endLink').focus({preventScroll:true});
}
$('#endAgain').onclick=()=>{endEl.hidden=true;startStory(ST.name)};
$('#endHome').onclick=()=>{endEl.hidden=true;goHome()};
