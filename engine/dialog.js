/* ───────── 對話框 ─────────
   say(lines, done, opts)：一句一句講，字一個一個出來（還沒出完就按「繼續」，先顯示整句）。lines 是 [[說話的人, 文字], …]。
   opts：choice [[字, 函式], …] 最後一句的選項；extra [[字, 函式], …] 最後一句多的按鈕；skip 可以跳過；end 最後一顆按鈕的字；pk 選項的統計鍵。
   行話可以點：句子裡出現登記過的名詞就變成按鈕，點了在下面跳出一句白話解釋（一句最多 3 個，同一個詞一句只標一次）。

   遊戲要告訴對話框的事（設定 DLG 上的函式，內容的檔一載入就可以設）：
     DLG.who(id)      說話的人那一列的 HTML（色塊、名字、職稱）；'me' 是玩家自己
     DLG.present(id)  這個人在 3D 場景裡有身體：開口時直接到位、彼此面對面（不在場的人不能講話）
     DLG.line(id)     每一句開始時（例如鏡頭靠近說話的人）；DLG.end() 講完、跳過或選了選項時（例如鏡頭拉回）
     DLG.pick(pk, i)  玩家選了第 i 個選項（統計用）
   名詞：termsSet(gloss, sep, alias, skip)
     gloss [[名詞, 白話解釋, 常見], …]：名詞裡可以用 sep 隔開幾個同義的寫法；第三格是真的，整局只標前兩次。
     alias [[別的寫法, 指到的名詞], …]；skip：剛好含著名詞、但不是那個意思的詞（整段跳過，不然點下去的解釋是另一件事）。 */
const DLG={who:()=>'',present:()=>false,line:()=>{},end:()=>{},pick:null};
const TERM={L:[],re:null,G:[],sep:'\n'};
function termsSet(gloss,sep,alias,skip){
  const L=[];gloss.forEach((g,i)=>g[0].split(sep).forEach(t=>L.push([t,i])));
  alias.forEach(a=>{const i=gloss.findIndex(g=>g[0].split(sep).indexOf(a[1])>=0);if(i>=0)L.push([a[0],i])});
  skip.forEach(w=>L.push([w,-1]));
  L.sort((a,b)=>b[0].length-a[0].length);
  TERM.L=L;TERM.G=gloss;TERM.sep=sep;TERM.re=L.length?new RegExp(L.map(x=>x[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gi'):null;
}
const termN={};
function termify(text){
  if(!TERM.re)return text;
  const used={};let n=0;
  return text.replace(TERM.re,(m,off,str)=>{
    const e=TERM.L.find(x=>x[0].toLowerCase()===m.toLowerCase());if(!e||e[1]<0||used[e[1]]||n>=3)return m;
    if(TERM.G[e[1]][2]&&(termN[e[1]]|0)>=2)return m;
    if(m.length<=2&&m!==e[0])return m;   // 兩個字母以內的詞（MO、PM、Up）大小寫要完全一樣，不然英文裡每個 up 都會變成可點的行話
    if(/^[A-Za-z]/.test(m)&&(/[A-Za-z]/.test(str[off-1]||'')||/[A-Za-z-]/.test(str[off+m.length]||'')))return m;
    used[e[1]]=1;n++;termN[e[1]]=(termN[e[1]]|0)+1;return '<button class="term" type="button" data-t="'+e[1]+'">'+m+'</button>';
  });
}
let typeT=0,termSeen=false;try{termSeen=localStorage.getItem(GAME.key+'t')==='1'}catch(e){}
function say(lines,done,opts){
  let i=0;opts=opts||{};
  const show=()=>{
    const l=lines[i],who=l[0],last=i===lines.length-1;
    if(W&&DLG.present(who)){W.arrive(who);W.up(who,true);W.face(who,'me');W.face('me',who)}   // 還在走過來的人，開口的時候直接到位（不然會變成人不在場卻在講話）
    clearInterval(typeT);typeT=0;SFX.blip();DLG.line(who);
    dlg.hidden=false;dlg.dataset.who=who;
    dlg.innerHTML=DLG.who(who)
      +'<p class="dlg-t'+(who==='sys'||who==='note'?' nar':'')+'" id="dlgT"></p><p class="dlg-g" id="dlgG" hidden></p>'
      +'<div class="row end"><span class="fine mono dlg-n">'+(lines.length>1?(i+1)+' / '+lines.length:'')+'</span>'
      +(last&&opts.choice?opts.choice.map((x,j)=>'<button class="btn choice" type="button" data-c="'+j+'"'+(j===0?' id="dlgNext"':'')+' style="order:'+(1+Math.floor(Math.random()*2))+'">'+x[0]+'</button>').join(''):'')
      +(last&&opts.extra?opts.extra.map((x,j)=>'<button class="btn" type="button" data-x="'+j+'">'+x[0]+'</button>').join(''):'')
      +(opts.skip&&!last?'<button class="btn btn-ghost" id="dlgSkip" type="button">跳過</button>':'')
      +(last&&opts.choice?'':'<button class="btn btn-primary" id="dlgNext" type="button">'+(last?(opts.end||'好'):'繼續')+'</button>')+'</div>';
    /* 字一個一個出來。還沒出完就按「繼續」，會先把整句顯示完 */
    const tEl=$('#dlgT'),full=()=>{clearInterval(typeT);typeT=0;tEl.innerHTML=termify(l[1]);
      const T=$$('.term',tEl),gEl=$('#dlgG');
      if(T.length&&!termSeen){gEl.hidden=false;gEl.className='dlg-g hint';gEl.textContent='有虛線的詞可以點，會跳出白話解釋。'}
      T.forEach(b=>b.onclick=e=>{e.stopPropagation();const g=TERM.G[+b.dataset.t],w=b.textContent,own=g[0].split(TERM.sep).some(x=>x.toLowerCase()===w.toLowerCase());gEl.hidden=false;gEl.className='dlg-g';gEl.innerHTML='<b>'+(own?g[0]:`${w.replace(/^[a-z]/,c=>c.toUpperCase())}（${g[0]}）`)+'</b>　'+g[1];   /* 點的詞借用別的名詞的解釋（別名）：標題寫「點的詞（名詞）」 */
        if(!termSeen){termSeen=true;try{localStorage.setItem(GAME.key+'t','1')}catch(e){}}})};
    if(reduceMotion)full();
    else{
      const chars=Array.from(l[1]);let n=0;
      tEl.innerHTML='<span class="ghost"></span><span class="typed"></span>';tEl.firstChild.textContent=l[1];
      const ty=tEl.lastChild;typeT=setInterval(()=>{n+=2;if(n>=chars.length||!ty.isConnected)full();else ty.textContent=chars.slice(0,n).join('')},34);
    }
    tEl.onclick=()=>{if(typeT)full()};
    $$('[data-x]',dlg).forEach(b=>b.onclick=()=>{clearInterval(typeT);typeT=0;dlg.hidden=true;DLG.end();opts.extra[+b.dataset.x][1]()});
    if($('#dlgSkip'))$('#dlgSkip').onclick=()=>{clearInterval(typeT);typeT=0;dlg.hidden=true;DLG.end();done&&done()};
    $('#dlgNext').onclick=()=>{if(typeT){full();return}i++;if(i<lines.length)show();else{dlg.hidden=true;DLG.end();done&&done()}};
    if(last&&opts.choice){$('.row',dlg).classList.add('ch');$$('[data-c]',dlg).forEach(b=>b.onclick=()=>{if(typeT){full();return}if(dlg.dataset.t&&performance.now()-+dlg.dataset.t<TAP)return;dlg.hidden=true;DLG.end();if(DLG.pick)DLG.pick(opts.pk,+b.dataset.c);opts.choice[+b.dataset.c][1]()});dlg.dataset.t=performance.now()}
    $('#dlgNext').focus({preventScroll:true});
  };
  show();
}
