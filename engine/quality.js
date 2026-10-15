/* ───────── 畫質自動調整 ─────────
   目的：每一台裝置都用「跑得順的最高畫質」。手機的像素少，幾乎都停在最高一級；大螢幕的電腦像素是手機的三到六倍，內顯撐不住就一級一級往下。
   這一段不碰 three.js，只吃「這一格花了幾秒」，吐出「現在該用幾倍解析度、陰影開到哪」，所以可以用假的裝置模型單獨測它。

   怎麼判斷：
   - 開場的前 2 秒不算（載入、編譯著色器、字型重畫都在這時候）；分頁在背景不算；單格超過 0.25 秒當作偶發（切視窗、垃圾回收）不算，但連續四格都這麼慢就是真的慢（沒有硬體加速的電腦）。
   - 每累積 1 秒算一次平均幀率。連續兩次低於目標才降（一次不算，免得載入時的一陣忙被當成跑不動）；降完等半秒再重新量。
   - 目標 = min(螢幕更新率, 60) × 0.75。螢幕更新率不知道的時候（一開始就慢），停畫 12 格量一次 rAF 本身多快：
     省電模式把畫面鎖在每秒 30 格的手機，量出來是 30，目標就變成 22，不會為了一個救不回來的數字把畫質降光。
   - 離目標很遠（不到七成）就一次跳到估計夠用的那一級，不一級一級磨；差一點點才一次降一級。
   - 降到底了、幀率卻沒有比一開始好 15%：瓶頸不在畫面，退回只降一級並且不再動（至少畫面是清楚的）。
   - 穩了 8 秒之後試著升回一級；升上去又慢就退回來，這一輪不再試。
   級別（由好到差，沒用的會自動略過）：解析度 2 倍 → 1.5 倍 → 陰影貼圖減半 → 1.25 倍 → 關陰影 → 1 倍 → 0.85 → 0.7 → 0.55 → 0.45 倍。
   穩了之後會一級一級試著升回去，所以存下來的級別偏低也會自己修正。

   電腦的「超取樣」：手機螢幕一個 CSS 像素有 2–3 個實體像素，3D 用 2 倍畫，所以細；
   一般的電腦螢幕是 1 倍，同一個場景畫出來就粗，看起來比手機版差。
   所以電腦上在「螢幕原生倍率」之上還有幾級：1.25、1.5、2 倍，畫大張再由瀏覽器縮回來。
   從原生倍率開始，穩了才一級一級往上試；超取樣的級別要求幾乎滿格（更新率的九成），做不到就退回並記住上限，免得每次開頁都試一次、頓一次。 */
function makeQuality(o){
  const dpr=Math.max(.5,o.dpr||1),pr0=Math.min(dpr,2),sh0=o.big?'hi':'lo',area=o.area||(()=>1e6);
  const L=[];if(o.big)[2,1.5,1.25].forEach(p=>{if(p>pr0+.01)L.push({pr:p,sh:sh0,ss:1})});
  const base=L.length;L.push({pr:pr0,sh:sh0});
  {let pr=pr0,sh=sh0;const add=()=>L.push({pr,sh});
    if(pr>1.5){pr=1.5;add()}
    if(sh==='hi'){sh='lo';add()}
    if(pr>1.25){pr=1.25;add()}
    sh='off';add();
    if(pr>1){pr=1;add()}
    [.85,.7,.55,.45].forEach(k=>L.push({pr:Math.min(pr,k),sh,sub:1}))}
  const sig='v2:'+pr0+sh0+base+':'+L.length;
  /* cap：超取樣試過、撐不住的那一級（記 7 天）。之後不再往它上面試 */
  let i=base,cap=0;if(o.saved&&o.saved.sig===sig){i=Math.max(0,Math.min(L.length-1,o.saved.i|0));if(o.saved.cap>0&&(o.now||Date.now())-(o.saved.t||0)<6048e5)cap=Math.min(base,o.saved.cap|0);if(i<cap)i=cap}
  const fixed=o.fixed==='n'||(o.fixed>=0&&o.fixed<99);if(fixed)i=o.fixed==='n'?base:Math.min(L.length-1,o.fixed|0);   // 網址 ?q=數字：固定在那一級（0 最好）；?q=n：固定在螢幕原生倍率。查問題用
  const first=i;let capT=o.saved&&o.saved.t||0;
  let slowRun=0,warm=0,warmN=0,settle=0,settleN=0,acc=0,n=0,fast=0,bad=0,good=0,fps=0,R=0,idle=0,idleAcc=0,idleN=0,f0=0,locked=false,noUp=false,trial=false,changed=0;
  const target=()=>Math.min(R||60,60)*.75;
  const need=()=>L[i].ss?Math.min(R||60,60)*.9:target();   // 超取樣是多出來的：只有幾乎不掉格才留著
  const cost=l=>l.pr*l.pr*(l.sh==='off'?1:l.sh==='lo'?1.35:1.5);
  /* 低於 1 倍：0.85 倍隨時可以用（差一點點，換到順）；再往下要嘛畫面夠大（降完還有約 160 萬像素），要嘛 0.7 倍當最後手段（每秒不到 24 格） */
  const usable=k=>{const l=L[k];if(!l)return false;if(l.ss)return area()*l.pr*l.pr<=9e6;   // 超取樣最多畫到約 900 萬像素（1080p 的 2 倍、1440p 的 1.5 倍）；再大，光是緩衝區就吃掉幾百 MB 顯示記憶體
    if(!l.sub||l.pr>=.85)return true;return area()*l.pr*l.pr>=1.6e6||(l.pr>=.7&&fps<24)};
  const set=k=>{i=k;settle=.5;settleN=4;acc=0;n=0;fast=0;bad=0;good=0;changed++};
  return {
    level:()=>L[i],
    skip:()=>idle>0,
    info:()=>({fixed,i,base,cap,n:L.length,fps:Math.round(fps),hz:Math.round(R),target:Math.round(target()),locked,trial,changed,first}),
    save:()=>fixed?null:{sig,i,cap,t:capT},
    /* 回傳 true：級別變了，呼叫的人要去套用 level() */
    feed(raw,hidden){
      if(fixed)return false;
      if(hidden||raw<=0){slowRun=0;return false}
      if(raw>.25){if(++slowRun<4)return false;raw=.25}else slowRun=0;
      if(warm<2||warmN<10){warm+=raw;warmN++;return false}
      if(idle>0){idle--;if(idle<8){idleAcc+=raw;idleN++}if(idle===0){R=Math.max(20,Math.min(240,idleN/idleAcc));settle=.2;settleN=3;acc=0;n=0;fast=0;bad=0}return false}
      if(settle>0||settleN>0){settle-=raw;settleN--;return false}
      acc+=raw;n++;if(raw<.021)fast++;
      if(acc<1||n<12)return false;
      fps=n/acc;const quick=fast/n;acc=0;n=0;fast=0;
      if(!R&&quick>.2)R=60;                      // 有兩成以上的格子在 21 毫秒內到：螢幕至少每秒 50 格，沒有被鎖 30
      if(!f0)f0=fps;
      if(fps<need()){
        good=0;
        if(!R){idle=12;idleAcc=0;idleN=0;return false}   // 不知道上限：先停畫量一次
        if(locked)return false;
        if(trial||L[i].ss){trial=false;noUp=true;if(L[i].ss){cap=i+1;capT=o.now||Date.now()}set(i+1);return true}   // 剛升上來就慢、或超取樣撐不住：退回去，這一輪不再升
        const far=fps<target()*.7;
        if(++bad<2)return false;
        let k=i+1;while(k<L.length&&!usable(k))k++;
        if(k>=L.length){bad=0;if(i>first+1&&fps<f0*1.15){locked=true;set(first+1);return true}return false}   // 降到底也沒用：退回去
        if(far){const want=cost(L[i])*fps/target()*1.15;while(k+1<L.length&&cost(L[k])>want&&usable(k+1))k++}   // 一次跳到估計夠用的那一級
        set(k);return true;
      }
      bad=0;
      if(trial){if(++good>=2){trial=false;good=0}return false}
      if(i>cap&&usable(i-1)&&!noUp&&!locked&&fps>=Math.min(R||60,60)*.92&&++good>=(i<=base?5:8)){trial=true;set(i-1);return true}
      return false;
    }
  };
}
