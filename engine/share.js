/* ───────── 結算圖卡與分享 ─────────
   結算畫面預設像限時動態：只放一張 9:16 的圖卡，長按就能存到相簿；「看結案報告」才打開文字的那張卡。
   圖卡做不出來（沒有 WebGL、畫不出來）就直接給結案報告。圖卡一到結算就先畫好：按鈕按下去的那一刻才能直接交給系統的分享選單
   （有的手機系統規定分享要在點按的當下發生，不能等圖畫完）。
   遊戲在自己的檔載入時填 SHARE：
     name     圖卡左上角燈條上的遊戲名        url   網址（https://…）：圖卡右下角寫它（不寫 https://），分享連結也用它；沒填就分享目前這一頁
     tagline  圖卡下面網址旁邊的一行          fine  圖卡最下面的小字（例如「內容全部虛構」）
     file     存圖的檔名                      fonts 畫圖卡前先要的字型：[[document.fonts.load 的字型, 要的字（省略＝圖卡上的字）], …]
     inApp    是不是在社群 App 的內建瀏覽器裡（存圖的說明不一樣）
     tail     endText 的最後一行（貼文的出處那一行；分享連結時拿掉它，換成連結）
     fit()    結案報告出現時、版面要重排的時候呼叫      share()  玩家分享了一次（長按或右鍵存圖、按分享連結）      rep()  按了「看結案報告／看圖卡」
   結算時遊戲做的事：endText＝「複製結算」要複製的字（最後一行是 SHARE.tail）；prepareCard({name,title,more,led,span,tl,rows}) 開始畫圖卡；
   #endBody 放 endWrap(結案報告的 HTML)；endShow()。
   openImg(網址, 標題, 說明, 關掉之後回到哪個按鈕)：同一個看圖的視窗，遊戲別的圖（例如收藏）也可以用。 */
const SHARE={name:'',url:'',tagline:'',fine:'',file:'card.jpg',fonts:[],inApp:false,tail:'',fit(){},share(){},rep(){}};
let endText='';
let cardFile=null,cardBlob=null,cardUrl='',cardCan=false,cardJob=0,cardFail=false,cardBack=null;
const COARSE=(()=>{try{return matchMedia('(pointer:coarse)').matches}catch(e){return false}})();
function shareLabel(){   /* 圖卡好了：放進結算畫面；做不出來：改成直接看結案報告。長按（或右鍵）存圖算一次分享 */
  const i=$('#endImg'),w=$('#endWait');if(!i)return;
  if(cardFail){setEndView('rep');return}
  if(cardUrl){if(i.src!==cardUrl)i.src=cardUrl;i.hidden=false;w.hidden=true;const d=$('#endDl');if(d)d.href=cardUrl}else{i.hidden=true;w.hidden=false}
  if(!i.dataset.on){i.dataset.on=1;let lp=0;const got=()=>{if(i.dataset.s)return;i.dataset.s=1;SHARE.share()};
    i.addEventListener('contextmenu',got);i.addEventListener('touchstart',()=>{clearTimeout(lp);lp=setTimeout(got,600)},{passive:true});['touchend','touchmove','touchcancel'].forEach(t=>i.addEventListener(t,()=>clearTimeout(lp),{passive:true}))}
}
function drawCard(d,shotCv){
  const cv=document.createElement('canvas');cv.width=1080;cv.height=1920;const g=cv.getContext('2d'),cs=getComputedStyle(document.documentElement);
  const FD=cs.getPropertyValue('--font-display')||'sans-serif',FM=cs.getPropertyValue('--font-data')||'monospace';
  const BG='#0c151a',INK='#eef4f6',MUT='#93a7b1',LINE='#2b3d46',AMB='#f2b01e',RED='#f0796d';
  const fit=(t,font,max,size,min)=>{let s=size;g.font=font.replace('%',s);while(g.measureText(t).width>max&&s>min){s-=2;g.font=font.replace('%',s)}return s};
  g.fillStyle=BG;g.fillRect(0,0,1080,1920);
  /* 上半：這一刻的 3D 畫面（W.grab），往下淡進底色；沒有 3D 就畫格線 */
  let drew=false;
  if(shotCv&&shotCv.width&&shotCv.height){try{const sw=shotCv.width,sh=shotCv.height,k=Math.max(1080/sw,800/sh),w=1080/k,h=800/k;g.drawImage(shotCv,(sw-w)/2,Math.max(0,(sh-h)*.42),w,h,0,0,1080,800);drew=true}catch(e){}}
  if(!drew){g.strokeStyle='#16262e';g.lineWidth=2;for(let x=0;x<=1080;x+=72){g.beginPath();g.moveTo(x,0);g.lineTo(x,800);g.stroke()}for(let y=0;y<=800;y+=72){g.beginPath();g.moveTo(0,y);g.lineTo(1080,y);g.stroke()}}
  let gr=g.createLinearGradient(0,0,0,800);gr.addColorStop(0,'rgba(12,21,26,.55)');gr.addColorStop(.3,'rgba(12,21,26,.05)');gr.addColorStop(.6,'rgba(12,21,26,.18)');gr.addColorStop(1,BG);g.fillStyle=gr;g.fillRect(0,0,1080,802);
  /* 燈條 */
  g.fillStyle='#05090b';g.beginPath();g.rect(72,276,936,84);g.fill();
  g.fillStyle=RED;g.beginPath();g.arc(118,318,13,0,Math.PI*2);g.fill();
  g.fillStyle=AMB;g.textBaseline='middle';g.textAlign='left';g.font='500 36px '+FM;g.fillText(SHARE.name,150,320);const w0=g.measureText(SHARE.name).width;
  fit(d.led,'500 %px '+FD,976-g.measureText(d.span).width*1.08-(150+w0+24)-28,34,22);g.fillText(d.led,150+w0+24,320);
  g.textAlign='right';g.font='500 36px '+FM;g.fillText(d.span,976,320);
  /* 誰的一天、稱號 */
  /* 還拿到的其他稱號（d.more）：有的話，名字和稱號往上挪一點，下面多一行 */
  const mo=d.more&&d.more.length?d.more:null,up=mo?40:0;
  g.textAlign='left';g.textBaseline='alphabetic';g.fillStyle=MUT;g.font='500 44px '+FD;g.fillText(d.name,72,812-up);
  g.fillStyle=INK;fit(d.title,'900 %px '+FD,936,mo?112:124,60);g.fillText(d.title,72,948-up);
  if(mo){const t=mo.join('・');g.fillStyle=AMB;fit(t,'600 %px '+FD,936,36,22);g.fillText(t,72,972)}
  /* 三個時間點 */
  d.tl.forEach((t,i)=>{const x=72+i*320;g.fillStyle=[RED,LINE,AMB][i];g.fillRect(x,1010,296,7);
    g.fillStyle=INK;g.font='600 68px '+FM;g.fillText(t[0],x,1100);g.fillStyle=MUT;fit(t[1],'500 %px '+FD,296,34,22);g.fillText(t[1],x,1152)});
  /* 數字 */
  d.rows.forEach((r,i)=>{const x=72+(i%2)*480,y=1212+Math.floor(i/2)*112;g.fillStyle='#13212a';g.fillRect(x,y,456,96);g.strokeStyle=LINE;g.lineWidth=2;g.strokeRect(x+1,y+1,454,94);
    g.fillStyle=MUT;g.font='500 28px '+FD;g.fillText(r[0],x+22,y+38);g.fillStyle=INK;fit(r[1],'700 %px '+FD,412,38,24);g.fillText(r[1],x+22,y+80)});
  /* 名稱與網址（放在限動上下工具列蓋不到的範圍裡） */
  const fy=1212+Math.ceil(d.rows.length/2)*112+74;
  const host=SHARE.url.replace(/^https?:\/\//,'');
  g.fillStyle=MUT;{const sub=SHARE.tagline;g.font='700 54px '+FM;const uw=g.measureText(host).width;fit(sub,'700 %px '+FD,936-uw-36,38,22);g.fillText(sub,72,fy)}
  g.textAlign='right';g.fillStyle=AMB;g.font='700 54px '+FM;g.fillText(host,1008,fy+2);
  g.textAlign='center';g.fillStyle='#5f727c';fit(SHARE.fine,'500 %px '+FD,936,26,16);g.fillText(SHARE.fine,540,1760);   /* 放不下就縮小（最小 16） */
  return cv;
}
function prepareCard(d){
  const job=++cardJob;cardFile=cardBlob=null;cardCan=false;cardFail=false;if(cardUrl){try{URL.revokeObjectURL(cardUrl)}catch(e){}cardUrl=''}shareLabel();
  (async()=>{
    /* 字型：圖卡上會用到的字先要一次（等不到就用系統字型畫） */
    try{if(document.fonts&&document.fonts.load){const t=d.name+d.title+(d.more||[]).join('')+d.led+d.rows.concat(d.tl).map(r=>r.join('')).join('')+SHARE.tagline+SHARE.fine;
      await Promise.race([Promise.all(SHARE.fonts.map(f=>document.fonts.load(f[0],f[1]||t))),new Promise(r=>setTimeout(r,1800))])}}catch(e){}
    await new Promise(r=>setTimeout(r,500));if(job!==cardJob)return;
    let cv;const fail=()=>{cardFail=true;shareLabel()};   // 做不出來：把按鈕收掉，不要永遠停在「圖卡製作中」
    try{cv=drawCard(d,W&&W.grab?W.grab():null)}catch(e){try{cv=drawCard(d,null)}catch(e2){fail();return}}
    const b=await new Promise(res=>{try{cv.toBlob(res,'image/jpeg',.9)}catch(e){res(null)}});if(job!==cardJob)return;if(!b){fail();return}
    cardBlob=b;try{cardUrl=URL.createObjectURL(b)}catch(e){}
    try{cardFile=new File([b],SHARE.file,{type:'image/jpeg'});cardCan=!!(navigator.canShare&&navigator.share&&navigator.canShare({files:[cardFile]}))}catch(e){cardFile=null;cardCan=false}
    shareLabel();
  })();
}
function openImg(url,title,msg,back){cardBack=back||null;$('#cardvT').textContent=title;$('#cardImg').src=url;$('#cardImg').alt=title;$('#cardDl').href=url;$('#cardTip').textContent=msg;$('#cardv').hidden=false;$('#cardvClose').focus({preventScroll:true})}
$('#cardvClose').onclick=()=>{$('#cardv').hidden=true;const b=$('#end').hidden?cardBack:$('#endRep');if(b)b.focus({preventScroll:true})};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#cardv').hidden){e.stopPropagation();$('#cardvClose').click()}},true);
$('#cardDl').onclick=()=>{$('#cardTip').textContent=COARSE?'存好之後，打開社群 App 的限時動態，選這張圖就能發。如果沒有反應，長按上面的圖也可以存。':'存好了。貼到哪裡都可以。'};
$('#endRep').onclick=()=>{SHARE.rep();setEndView($('#endRpt')&&$('#endRpt').hidden?'rep':'pic');};
/* 分享連結：貼在聊天群組、社群貼文裡的，要的是「一句話＋一個連結」（圖卡是限時動態的尺寸）。
   連結帶 utm_source=share，後台看得出一個玩完的人帶來幾個新玩家。手機叫系統的分享選單（有的手機系統規定要在點按的當下叫，前面不能等任何東西）；
   電腦、叫不出選單的內建瀏覽器：把那句話和連結一起複製。按了算一次分享（SHARE.share()，跟存圖卡同一種） */
const shareUrl=()=>{if(!SHARE.url)return location.href.split(/[?#]/)[0];const o=LANGS.find(l=>l[0]===LANG),p=o&&o[2].charAt(0)==='/'?o[2]:'/';return SHARE.url+p+'?utm_source=share'};   /* 沒填網址：分享這一頁 */
$('#endLink').onclick=()=>{
  const b=$('#endLink'),url=shareUrl(),text=endText.split('\n'+SHARE.tail)[0];
  SHARE.share();
  const copy=()=>{const all=text+'\n'+url,ok=()=>{b.textContent='已複製連結'},no=()=>{b.textContent='請複製網址列'};
    const old=()=>{try{const t=document.createElement('textarea');t.value=all;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();const r=document.execCommand('copy');t.remove();r?ok():no()}catch(e){no()}};
    try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(all).then(ok,old);else old()}catch(e){old()}};
  if(COARSE&&!SHARE.inApp&&navigator.share){try{navigator.share({text,url}).then(()=>{},e=>{if(!e||e.name!=='AbortError')copy()})}catch(e){copy()}return}
  copy();
};
$('#endCopy').onclick=()=>{
  const b=$('#endCopy'),ok=()=>{b.textContent='已複製'},no=()=>{b.textContent='請直接截圖'};
  const old=()=>{try{const t=document.createElement('textarea');t.value=endText;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();const r=document.execCommand('copy');t.remove();r?ok():no()}catch(e){no()}};
  try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(endText).then(ok,old);else old()}catch(e){old()}
};
const endWrap=rep=>'<div class="endpic" id="endPic"><img id="endImg" alt="今天的結算圖卡（9:16，限時動態尺寸）" hidden><p class="endpic-wait" id="endWait">圖卡製作中</p>'
  +'<p class="endpic-tip" id="endTip">'+(SHARE.inApp?'長按圖片，選「儲存」或「分享」，再到限時動態選它。':COARSE?'長按圖片存到相簿，就能發限時動態。':'在圖上按右鍵可以另存，或按這裡')+(!COARSE&&!SHARE.inApp?` <a class="lnk" id="endDl" download="${SHARE.file}">存圖</a>`:'')+'</p></div>'
  +'<div class="endrep" id="endRpt" hidden>'+rep+'</div>';
function setEndView(v){
  const pic=v==='pic'&&!cardFail,P=$('#endPic'),R=$('#endRpt'),b=$('#endRep');if(!P||!R)return;
  P.hidden=!pic;R.hidden=pic;$('#end').classList.toggle('pic',pic);b.hidden=!!cardFail;b.textContent=pic?'看結案報告':'看圖卡';
  $('#endBody').scrollTop=0;if(!pic)SHARE.fit();
}
function endShow(){setEndView('pic');shareLabel()}
