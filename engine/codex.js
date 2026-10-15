/* ───────── 圖鑑：今天遇到的人、名詞 ─────────
   人物來自 STORY.cast（'me' 除外；有 about 的才列），名詞來自 termsSet 登記的那一份（TERM.G）。
   遊戲可以加自己的分頁：CODEX.tabs.push({id, name, html:()=>'…'})。 */
const CODEX={tabs:[
  {id:'people',name:'人物',html:()=>'<ul class="people">'+Object.keys(STORY.cast).filter(id=>id!=='me'&&STORY.cast[id].about).map(id=>{const c=STORY.cast[id];return '<li><span class="sw" style="background:'+(c.color||'var(--accent)')+'">'+(c.tag||c.name.slice(0,1))+'</span><div><b>'+c.name+'</b>'+(c.role?'<small>'+c.role+'</small>':'')+'<p>'+c.about+'</p></div></li>'}).join('')+'</ul>'},
  {id:'gloss',name:'名詞',html:()=>'<dl class="gloss">'+TERM.G.map(g=>'<dt>'+g[0]+'</dt><dd>'+g[1]+'</dd>').join('')+'</dl>'}
]};
const codex=$('#codex');let lastFocus=null,codexTab='people';
function renderCodex(tab){
  codexTab=tab||codexTab;const T=CODEX.tabs.find(t=>t.id===codexTab)||CODEX.tabs[0];
  $('#codexTabs').innerHTML=CODEX.tabs.map(t=>'<button class="tab" role="tab" type="button" data-tab="'+t.id+'" aria-selected="'+(t===T)+'">'+t.name+'</button>').join('');
  $$('#codexTabs .tab').forEach(b=>b.onclick=()=>renderCodex(b.dataset.tab));
  $('#codexBody').innerHTML=T.html();$('#codexBody').scrollTop=0;
}
function openCodex(tab){lastFocus=document.activeElement;codex.hidden=false;renderCodex(tab);$('#closeCodex').focus()}
function closeCodex(){codex.hidden=true;if(lastFocus&&lastFocus.focus)lastFocus.focus({preventScroll:true})}
$('#openCodex').onclick=()=>openCodex();$('#closeCodex').onclick=closeCodex;
codex.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeCodex()}});
MOVE.cover=()=>!codex.hidden||!$('#cardv').hidden;   /* 圖鑑、看圖：Enter 留給它們 */
