/* ───────── 3D 世界（方塊風格）─────────
   initWorld() 回傳 W：遊戲只透過 W.* 動 3D。沒有 WebGL 時回傳 null，遊戲照常（只是沒有畫面）。
   遊戲在呼叫 initWorld() 之前登記（內容的檔一載入就可以設）：
     WORLD.cast[id]={label,fill,ink,cloth,color,hair,long,node,face,speed,hidden}
        場景裡的人。'me' 是玩家。label 是頭上的名牌；fill／ink 名牌底色與字色；cloth 衣服、color 名牌色塊、hair 頭髮（0xRRGGBB）；
        node 一開始站的點；face 面向（弧度）；hidden 一開始不在場（W.show(id,true) 才出現）。
     WORLD.level   一開始就蓋的關卡（levelAdd(名字, build) 登記的那一個）
     WORLD.shots   主頁背景的幾個鏡頭 [{p:[x,y,z],d:距離,yaw,pitch},…]
     WORLD.items[kind]=(g,K)=>{…}   撿得到的東西長什麼樣子（沒有登記的只有一顆閃光）
   關卡檔 build(K) 用 K 蓋場景（見下面 LVK），並登記：
     K.bounds(x0,x1,z0,z1) 可以走的範圍；K.block([[x0,x1,z0,z1],…]) 擋路的長方形（外圍多 .3）；
     K.nodes({名字:[x,z],…}, 'a-b b-c') 人站的點與連線；K.anchor(id,[x,y,z]) 狀態牌可以掛的地方；K.onTheme(f) 換亮暗時呼叫 f(dark)。
   座標：x 往右、z 往鏡頭（畫面下方），y 往上；1 單位大約 1 公尺。 */
const WORLD={cast:{},level:'main',shots:[],items:{}};
function initWorld(){
  if(!window.THREE)return null;
  const T=THREE,canvas=$('#scene');
  /* 測試頁的「不畫圖」版：世界照算、人照走、點得到東西，只是不畫出來（同時跑好幾個測試時不互相搶 CPU） */
  const NODRAW=false;
  let renderer;
  try{renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'})}catch(e){return null}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputEncoding=T.sRGBEncoding;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;   /* 柔邊陰影每個像素要取三十幾次樣；一般的 PCF 九次 */
  const scene=new T.Scene();scene.fog=new T.Fog(0xffffff,40,84);
  const camera=new T.PerspectiveCamera(36,1,.5,200);
  const hemi=new T.HemisphereLight(0xffffff,0x8fa0a8,.68);scene.add(hemi);
  const sun=new T.DirectionalLight(0xffffff,.6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  const sc=sun.shadow.camera;sc.left=-17;sc.right=17;sc.top=17;sc.bottom=-17;sc.near=1;sc.far=60;sun.shadow.bias=-.0008;
  scene.add(sun);scene.add(sun.target);
  /* 一天的光線：白天、半夜、傍晚 */
  const MOODS={day:{h:1,s:1,c:new T.Color(0xffffff),hc:new T.Color(0xffffff),bg:0,bc:new T.Color(0x0a1116)},night:{h:.42,s:.14,c:new T.Color(0x9db7ff),hc:new T.Color(0xa9bcff),bg:.88,bc:new T.Color(0x070d12)},eve:{h:.9,s:.95,c:new T.Color(0xffc48a),hc:new T.Color(0xffe6cc),bg:.3,bc:new T.Color(0x6b4a3a)}};
  let mood=MOODS.day;const bgC=new T.Color();
  const DESK=(()=>{try{return matchMedia('(pointer:fine)').matches}catch(e){return false}})();   // 滑鼠或觸控板：桌機、筆電
  /* 電腦上的瀏覽器開了各向異性過濾，放大像素貼圖時會變成線性內插，16 格的圖被抹成一片：同一張圖先放大畫好（電腦 8 倍、手機 4 倍）。
     寫字的貼圖（螢幕、地板的字、名牌）在電腦上用 2 倍大小畫 */
  const aniso=DESK?Math.min(8,renderer.capabilities.getMaxAnisotropy()):renderer.capabilities.getMaxAnisotropy(),TK=DESK?8:4,CK=DESK?2:1;

  /* 像素貼圖：每 1 單位 16 格，放大時保持硬邊 */
  let seed=7;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff};
  const P=(g,c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(x,y,w||1,h||1)};
  function px(size,draw){const c=document.createElement('canvas');c.width=c.height=size*TK;{const g=c.getContext('2d');g.scale(TK,TK);draw(g,size)}const t=new T.CanvasTexture(c);
    t.magFilter=T.NearestFilter;t.minFilter=T.LinearMipmapLinearFilter;t.wrapS=t.wrapT=T.RepeatWrapping;t.encoding=T.sRGBEncoding;t.anisotropy=aniso;return t}
  function pxc(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'));const t=new T.CanvasTexture(c);
    t.magFilter=T.NearestFilter;t.minFilter=T.NearestFilter;t.generateMipmaps=false;t.encoding=T.sRGBEncoding;return t}
  const TX={
    floor:px(16,(g,s)=>{P(g,'#ffffff',0,0,s,s);P(g,'#aeb9be',0,0,s,1);P(g,'#aeb9be',0,0,1,s);[[4,4],[11,4],[4,11],[11,11]].forEach(p=>P(g,'#c9d2d6',p[0],p[1],2,2))}),
    panel:px(16,(g,s)=>{P(g,'#ffffff',0,0,s,s);P(g,'#c9d1d5',0,s-1,s,1);P(g,'#c9d1d5',s-1,0,1,s);[[2,2],[12,2],[2,12],[12,12]].forEach(p=>P(g,'#a3afb5',p[0],p[1]))}),
    wall:px(16,(g,s)=>{P(g,'#ffffff',0,0,s,s);P(g,'#d0d8dc',0,s-1,s,1);P(g,'#d0d8dc',0,7,s,1);P(g,'#d0d8dc',0,0,1,7);P(g,'#d0d8dc',8,8,1,7)}),
    hazard:px(16,(g,s)=>{P(g,'#f2b01e',0,0,s,s);g.fillStyle='#1b2428';for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(((x+y)>>2)%2===0)g.fillRect(x,y,1,1)}),
    carpet:px(16,(g,s)=>{P(g,'#ffffff',0,0,s,s);for(let i=0;i<80;i++)P(g,rnd()>.5?'#e2dbcd':'#f1ece2',Math.floor(rnd()*16),Math.floor(rnd()*16))}),
    wood:px(16,(g,s)=>{P(g,'#ffffff',0,0,s,s);P(g,'#d6c3a2',0,5,s,1);P(g,'#d6c3a2',0,11,s,1);P(g,'#e8dcc5',3,2,5,1);P(g,'#e8dcc5',9,8,4,1);P(g,'#e8dcc5',2,14,6,1)}),
    tile:px(16,(g,s)=>{P(g,'#ffffff',0,0,s,s);P(g,'#cfd6d9',0,0,s,1);P(g,'#cfd6d9',0,0,1,s);P(g,'#e6ebed',8,0,1,s);P(g,'#e6ebed',0,8,s,1)})
  };
  const lam=(c,o)=>new T.MeshLambertMaterial(Object.assign({color:c},o||{}));
  const basic=(c,o)=>new T.MeshBasicMaterial(Object.assign({color:c},o||{}));
  const M={floor:lam(0xffffff,{map:TX.floor}),office:lam(0xd8cfbd,{map:TX.carpet}),wall:lam(0xf6f9fa,{map:TX.wall}),tool:lam(0xf1f4f5,{map:TX.panel}),tool2:lam(0xdfe6e9,{map:TX.panel}),trim:lam(0x4f636c),
    hazard:lam(0xffffff,{map:TX.hazard}),glass:lam(0x9ecbe0,{transparent:true,opacity:.22,depthWrite:false}),tape:basic(0xe8a400),desk:lam(0xb89a6e,{map:TX.wood}),dark:lam(0x26343b),green:lam(0x3f9a5a),
    hidden:basic(0xffffff,{visible:false})};
  const PAL={light:{bg:0xdde6ea,floor:0xb7c5cb,office:0xc9bda4,wall:0xe6edf0,tool:0xeef2f3,tool2:0xb4c2c8,trim:0x4a5f69,ink:'#12252c',hemi:.68,sun:.6,ground:0x8fa0a8,earth:0xcfd9de},
             dark:{bg:0x0c151a,floor:0x3c505a,office:0x4d463b,wall:0x4a626d,tool:0x9db0b9,tool2:0x6f838d,trim:0x16242b,ink:'#dfeaee',hemi:.4,sun:.38,ground:0x0e171b,earth:0x121d23}};
  let pal=PAL.light;const redraws=[],themeHooks=[];
  /* 方塊：UV 依實際尺寸縮放，貼圖格子大小一致 */
  function box(w,h,d,m,x,y,z,parent,shadow){
    const geo=new T.BoxGeometry(w,h,d);
    if(m.map){const uv=geo.attributes.uv,dm=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let i=0;i<4;i++){const k=f*4+i;uv.setXY(k,uv.getX(k)*dm[f][0],uv.getY(k)*dm[f][1])}}
    const o=new T.Mesh(geo,m);o.position.set(x,y,z);if(shadow!==false){o.castShadow=true;o.receiveShadow=true}(parent||scene).add(o);return o}
  function flat(w,d,m,x,y,z,tile,parent){const geo=new T.PlaneGeometry(w,d);if(m.map){const uv=geo.attributes.uv,t=tile||1;for(let i=0;i<4;i++)uv.setXY(i,uv.getX(i)*w/t,uv.getY(i)*d/t)}
    const o=new T.Mesh(geo,m);o.rotation.x=-Math.PI/2;o.position.set(x,y,z);o.receiveShadow=true;(parent||scene).add(o);return o}
  /* 畫字的貼圖：換亮暗、字型載入後重畫（setTransform 每次重設，不能用 scale 疊上去） */
  function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w*CK;c.height=h*CK;const tex=new T.CanvasTexture(c);tex.encoding=T.sRGBEncoding;tex.anisotropy=aniso;
    const run=()=>{const g=c.getContext('2d');g.setTransform(CK,0,0,CK,0,0);g.clearRect(0,0,w,h);draw(g,w,h);tex.needsUpdate=true};run();redraws.push(run);return tex}
  /* 字型跟著頁面（CSS 的 --font-ui、--font-mono），沒有設定就用系統字型 */
  const cssVar=(k,d)=>{try{return getComputedStyle(document.documentElement).getPropertyValue(k).trim()||d}catch(e){return d}};
  const FONT=cssVar('--font-ui','system-ui,sans-serif'),MONO=cssVar('--font-mono','ui-monospace,monospace');

  /* 外面的地面：沒有它，整層樓看起來像浮在半空 */
  const ground=new T.Mesh(new T.PlaneGeometry(420,420),lam(PAL.light.earth));ground.rotation.x=-Math.PI/2;ground.position.set(0,-.08,0);scene.add(ground);
  function floorLabel(text,x,z,w,par){const tex=canvasTex(512,96,(g,W_,H_)=>{g.font='700 46px '+FONT;g.textAlign='center';g.textBaseline='middle';g.globalAlpha=.5;g.fillStyle=pal.ink;g.fillText(text,W_/2,H_/2)});
    const o=new T.Mesh(new T.PlaneGeometry(w||5,(w||5)*96/512),basic(0xffffff,{map:tex,transparent:true,depthWrite:false}));o.rotation.x=-Math.PI/2;o.position.set(x,.02,z);(par||scene).add(o);return o}

  /* 螢幕與三色燈 */
  const screens={},towers={};
  function makeScreen(id,parent,x,y,z,w,h,lines,color,big){
    const st={lines,color:color||'#7fe3c8'};
    const tex=canvasTex(256,144,(g,W_,H_)=>{g.fillStyle='#08161b';g.fillRect(0,0,W_,H_);g.fillStyle=st.color;g.textBaseline='top';st.lines.forEach((l,i)=>{g.font=(i?'500 26px ':'600 30px ')+MONO+','+FONT;g.fillText(l,14,14+i*(big?40:42))})});
    const o=new T.Mesh(new T.PlaneGeometry(w,h),basic(0xffffff,{map:tex}));o.position.set(x,y,z);(parent||scene).add(o);
    screens[id]={st,redraw:redraws[redraws.length-1]};return o}
  function makeTower(id,parent,x,y,z){const cols=[0xff5a4a,0xf2b01e,0x39d67a],lamps=cols.map((c,i)=>{const m=basic(c);const o=new T.Mesh(new T.BoxGeometry(.14,.13,.14),m);o.position.set(x,y+.07+(2-i)*.14,z);(parent||scene).add(o);return {m,on:c,o}});
    box(.06,.25,.06,M.trim,x,y-.12,z,parent,false);
    const halo=sprite(64,64,(g)=>{const r=g.createRadialGradient(32,32,2,32,32,32);r.addColorStop(0,'rgba(255,255,255,.95)');r.addColorStop(.4,'rgba(255,255,255,.4)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64)},.7,.7);
    halo.material.opacity=0;(parent||scene).add(halo);towers[id]={lamps,halo,state:'green'};setTower(id,'green')}
  function setTower(id,state){const t=towers[id];if(!t)return;t.state=state;const idx={red:0,amber:1,green:2}[state];t.lamps.forEach((l,i)=>l.m.color.setHex(i===idx?l.on:0x39464c));
    if(idx==null){t.halo.material.opacity=0;return}t.halo.position.copy(t.lamps[idx].o.position);t.halo.material.color.setHex(t.lamps[idx].on);t.halo.material.opacity=.8}

  /* 可以點的範圍（看不見的方塊）。點到的 id 交給 W.onPick */
  const pickables=[];
  function pickBox(id,w,h,d,x,y,z,parent){const o=box(w,h,d,M.hidden,x,y,z,parent,false);o.userData.pick=id;pickables.push(o);return o}
  function desk(x,z,w,parent){const g=new T.Group();g.position.set(x,0,z);(parent||scene).add(g);w=w||1.8;
    box(w,.08,.9,M.desk,0,.76,0,g);[[-w/2+.08,-.38],[w/2-.08,-.38],[-w/2+.08,.38],[w/2-.08,.38]].forEach(p=>box(.08,.72,.08,M.trim,p[0],.36,p[1],g));return g}

  /* 標籤 */
  function sprite(w,h,draw,sx,sy){const tex=canvasTex(w,h,draw);const s=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false,transparent:true}));s.scale.set(sx,sy,1);s.renderOrder=10;return s}
  function pill(g,w,h,fill){g.fillStyle=fill;const r=8;g.beginPath();g.moveTo(r,4);g.arcTo(w-4,4,w-4,h-4,r);g.arcTo(w-4,h-4,4,h-4,r);g.arcTo(4,h-4,4,4,r);g.arcTo(4,4,w-4,4,r);g.fill()}
  function plate(text,fill,ink){return sprite(512,128,(g)=>{g.setTransform(2*CK,0,0,2*CK,0,0);pill(g,256,64,fill);g.fillStyle=ink;let fs=30;g.font='700 '+fs+'px '+FONT;while(g.measureText(text).width>218&&fs>16){fs-=2;g.font='700 '+fs+'px '+FONT}g.textAlign='center';g.textBaseline='middle';g.fillText(text,128,34)},1.9,.475)}

  /* ── 走路：人物走的點與連線（關卡登記），自由走動用格子尋路 ── */
  const NODES={},ADJ={},ANCH={};
  function route(a,b){if(a===b)return[];const prev={},q=[a];prev[a]=null;while(q.length){const n=q.shift();if(n===b)break;(ADJ[n]||[]).forEach(m=>{if(!(m in prev)){prev[m]=n;q.push(m)}})}const out=[];let n=b;while(n&&n!==a){out.unshift(n);n=prev[n]}return out}
  const CS=.5;let GX=-20,GZ=-10,NC=80,NR=40,grid=new Uint8Array(NC*NR);
  function bounds(x0,x1,z0,z1){GX=x0;GZ=z0;NC=Math.ceil((x1-x0)/CS);NR=Math.ceil((z1-z0)/CS);grid=new Uint8Array(NC*NR)}
  function block(rs){rs.forEach(q=>{for(let r=0;r<NR;r++)for(let c=0;c<NC;c++){const x=GX+(c+.5)*CS,z=GZ+(r+.5)*CS;if(x>q[0]-.3&&x<q[1]+.3&&z>q[2]-.3&&z<q[3]+.3)grid[r*NC+c]=1}})}
  function nodes(o,edges){Object.assign(NODES,o);(edges||'').split(' ').filter(Boolean).forEach(e=>{const p=e.split('-');(ADJ[p[0]]=ADJ[p[0]]||[]).push(p[1]);(ADJ[p[1]]=ADJ[p[1]]||[]).push(p[0])})}
  const blockedAt=(x,z)=>{const c=Math.floor((x-GX)/CS),r=Math.floor((z-GZ)/CS);return c<0||r<0||c>=NC||r>=NR||grid[r*NC+c]===1};
  function los(x0,z0,x1,z1){const n=Math.ceil(Math.hypot(x1-x0,z1-z0)/.2);for(let i=1;i<n;i++){const t=i/n;if(blockedAt(x0+(x1-x0)*t,z0+(z1-z0)*t))return false}return true}
  function nearFree(c,r){if(!grid[r*NC+c])return [c,r];for(let d=1;d<18;d++)for(let dr=-d;dr<=d;dr++)for(let dc=-d;dc<=d;dc++){if(Math.max(Math.abs(dr),Math.abs(dc))!==d)continue;const cc=c+dc,rr=r+dr;if(cc>=0&&rr>=0&&cc<NC&&rr<NR&&!grid[rr*NC+cc])return [cc,rr]}return null}
  function findPath(ax,az,bx,bz){
    const cl=(v,n)=>Math.max(0,Math.min(n-1,v));
    const s=nearFree(cl(Math.floor((ax-GX)/CS),NC),cl(Math.floor((az-GZ)/CS),NR)),t0=[cl(Math.floor((bx-GX)/CS),NC),cl(Math.floor((bz-GZ)/CS),NR)],t=nearFree(t0[0],t0[1]);
    if(!s||!t)return [];
    const exact=t[0]===t0[0]&&t[1]===t0[1]&&!blockedAt(bx,bz);
    const N=NC*NR,g=new Float32Array(N).fill(1e9),f=new Float32Array(N).fill(1e9),from=new Int32Array(N).fill(-1),closed=new Uint8Array(N),open=[];
    const si=s[1]*NC+s[0],ti=t[1]*NC+t[0],h=i=>{const dc=Math.abs(i%NC-t[0]),dr=Math.abs((i/NC|0)-t[1]);return Math.max(dc,dr)+.414*Math.min(dc,dr)};
    g[si]=0;f[si]=h(si);open.push(si);
    while(open.length){let bi=0;for(let i=1;i<open.length;i++)if(f[open[i]]<f[open[bi]])bi=i;const cur=open[bi];open[bi]=open[open.length-1];open.pop();if(cur===ti)break;if(closed[cur])continue;closed[cur]=1;
      const c=cur%NC,r=cur/NC|0;
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const cc=c+dc,rr=r+dr;if(cc<0||rr<0||cc>=NC||rr>=NR)continue;const ni=rr*NC+cc;if(grid[ni]||closed[ni])continue;if(dr&&dc&&(grid[r*NC+cc]||grid[rr*NC+c]))continue;
        const ng=g[cur]+(dr&&dc?1.414:1);if(ng<g[ni]){g[ni]=ng;f[ni]=ng+h(ni);from[ni]=cur;open.push(ni)}}}
    if(ti!==si&&from[ti]<0)return [];
    const pts=[];let i=ti;while(i>=0&&i!==si){pts.unshift([GX+(i%NC+.5)*CS,GZ+((i/NC|0)+.5)*CS]);i=from[i]}
    if(exact){if(pts.length)pts[pts.length-1]=[bx,bz];else pts.push([bx,bz])}
    const out=[];let px_=ax,pz=az,k=0;while(k<pts.length){let j=pts.length-1;while(j>k&&!los(px_,pz,pts[j][0],pts[j][1]))j--;out.push(pts[j]);px_=pts[j][0];pz=pts[j][1];k=j+1}
    return out}

  /* ── 借給關卡檔的工具（levels.js 有說明）── */
  const LVK={T,M,TX,px,pxc,P,rnd,lam,basic,box,flat,canvasTex,FONT,MONO,pal:()=>pal,plate,sprite,pickBox,desk,
    label:(t,x,z,w,G)=>floorLabel(t,x,z,w,G),screen:(id,G,x,y,z,w,h,lines,color)=>makeScreen(id,G,x,y,z,w,h,lines,color),tower:(id,G,x,y,z)=>makeTower(id,G,x,y,z),
    bounds,block,nodes,anchor:(id,p)=>{ANCH[id]=new T.Vector3(p[0],p[1],p[2])},onTheme:f=>themeHooks.push(f)};
  const lvG={},lvBuilt={};
  function needLv(id,cb){if(lvBuilt[id]){cb&&cb(true);return}levelReady(id,ok=>{if(!ok||lvBuilt[id]){cb&&cb(!!lvBuilt[id]);return}lvBuilt[id]=1;const G=lvG[id]=new T.Group();scene.add(G);LEVELS[id](Object.assign({},LVK,{G}));themeHooks.forEach(f=>f(theme()==='dark'));cb&&cb(true)})}
  needLv(WORLD.level);
  if(!Object.keys(NODES).length)nodes({A:[0,0]});

  /* ── 方塊人物 ── */
  const hex=c=>'#'+c.toString(16).padStart(6,'0'),SKIN='#e9b999';
  function headMats(o){
    const hair=hex(o.hair!=null?o.hair:0x2b2320);
    const face=pxc(8,8,g=>{P(g,SKIN,0,0,8,8);P(g,hair,0,0,8,2);P(g,hair,0,2,1,o.long?4:1);P(g,hair,7,2,1,o.long?4:1);P(g,'#b9785f',3,6,2,1);
      P(g,'#ffffff',1,4,1,1);P(g,'#23313a',2,4,1,1);P(g,'#23313a',5,4,1,1);P(g,'#ffffff',6,4,1,1)});
    const side=pxc(8,8,g=>{P(g,SKIN,0,0,8,8);P(g,hair,0,0,8,o.long?6:3)});
    const back=pxc(8,8,g=>{P(g,SKIN,0,0,8,8);P(g,hair,0,0,8,o.long?8:5)});
    const L=t=>new T.MeshLambertMaterial({map:t});
    return [L(side),L(side),lam(o.hair!=null?o.hair:0x2b2320),lam(0xe9b999),L(face),L(back)]}
  function torsoMats(o){
    const band=hex(o.color!=null?o.color:0xf0a800),cl=hex(o.cloth!=null?o.cloth:0x4a5a63);
    const front=pxc(8,12,g=>{P(g,cl,0,0,8,12);P(g,band,2,0,1,3);P(g,band,5,0,1,3);P(g,band,3,3,2,1);P(g,'#ffffff',3,4,2,2)});
    const f=lam(o.cloth!=null?o.cloth:0x4a5a63);
    return [f,f,f,f,new T.MeshLambertMaterial({map:front}),f]}
  function makeChar(id,o){
    const g=new T.Group(),cloth=lam(o.cloth!=null?o.cloth:0x4a5a63),pants=lam(o.pants!=null?o.pants:0x3b4750);
    function limb(x,y,m){const p=new T.Group();p.position.set(x,y,0);const b=new T.Mesh(new T.BoxGeometry(.24,.72,.24),m);b.position.y=-.3;b.castShadow=true;p.add(b);g.add(p);return p}
    const legL=limb(-.12,.66,pants),legR=limb(.12,.66,pants),armL=limb(-.36,1.38,cloth),armR=limb(.36,1.38,cloth);
    const torso=new T.Mesh(new T.BoxGeometry(.48,.72,.24),torsoMats(o));torso.position.y=1.08;torso.castShadow=true;g.add(torso);
    const head=new T.Mesh(new T.BoxGeometry(.48,.48,.48),headMats(o));head.position.y=1.68;head.castShadow=true;g.add(head);
    const tag=plate(o.label||id,o.fill||'#33454f',o.ink||'#ffffff');tag.position.set(0,2.4,0);g.add(tag);g.userData.tag=tag;
    const pk=box(.9,2.1,.9,M.hidden,0,1.05,0,g,false);pk.userData.pick=id;pickables.push(pk);
    scene.add(g);
    const node=o.node&&NODES[o.node]?o.node:Object.keys(NODES)[0];
    const ch={id,g,legL,legR,armL,armR,head,path:[],node,home:node,face:o.face||0,speed:o.speed||(id==='me'?5:5.6),phase:Math.random()*6,hop:0,cb:null};
    place(ch,node);return ch}
  function place(ch,node){const n=NODES[node]||[0,0];ch.g.position.set(n[0],0,n[1]);ch.node=node;ch.path=[];ch.cb=null;ch.g.rotation.y=ch.face;ch.target=ch.face}
  const chars={},HIDDEN0=[];
  if(!WORLD.cast.me)WORLD.cast.me={label:'You',fill:'#f2b01e',ink:'#231800'};
  for(const id in WORLD.cast){chars[id]=makeChar(id,WORLD.cast[id]);if(WORLD.cast[id].hidden){HIDDEN0.push(id);chars[id].g.visible=false}}
  function walk(id,node,cb){const ch=chars[id];if(!ch||!NODES[node]){cb&&cb();return}const r=route(ch.node,node);ch.node=node;ch.path=r.map(n=>new T.Vector3(NODES[n][0],0,NODES[n][1]));ch.cb=cb||null;if(!ch.path.length&&cb){ch.cb=null;cb()}}
  const v1=new T.Vector3();
  function face(a,b){const A=chars[a],B=chars[b];if(!A||!B||A.path.length)return;v1.copy(B.g.position).sub(A.g.position);A.target=Math.atan2(v1.x,v1.z)}
  function updChar(ch,dt){
    const p=ch.g.position;let moving=!!ch.keyMove;
    if(ch.path.length){moving=true;const t=ch.path[0];v1.copy(t).sub(p);v1.y=0;const L=v1.length(),s=ch.speed*dt;
      if(L<=s){p.x=t.x;p.z=t.z;ch.path.shift();if(!ch.path.length){const cb=ch.cb;ch.cb=null;if(ch.id!=='me'){if(ch.node===ch.home)ch.target=ch.face;else face(ch.id,'me')}cb&&cb()}}
      else{p.x+=v1.x*s/L;p.z+=v1.z*s/L;ch.target=Math.atan2(v1.x,v1.z)}}
    let d=ch.target-ch.g.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));ch.g.rotation.y+=d*Math.min(1,dt*10);
    ch.phase+=dt*(moving?11:2);
    const sw=moving?Math.sin(ch.phase)*.8:0;ch.legL.rotation.x=sw;ch.legR.rotation.x=-sw;ch.armL.rotation.x=-sw;ch.armR.rotation.x=sw;
    /* 站著的時候：手微微晃，偶爾抬手看一下（像在看手上的平板或手錶） */
    if(!moving&&!reduceMotion){const a=Math.sin(ch.phase*.5+ch.g.id)*.05;ch.armL.rotation.x=a;ch.armR.rotation.x=-a;
      ch.gest=(ch.gest===undefined?4+Math.random()*8:ch.gest)-dt;if(ch.gest<0){const k=-ch.gest/1.4;if(k>=1)ch.gest=6+Math.random()*9;else{const u=Math.sin(k*Math.PI);ch.armR.rotation.x=-1.15*u;ch.head.rotation.x=.22*u}}else ch.head.rotation.x=0}
    else{ch.head.rotation.x=0}
    ch.head.rotation.y=(moving||reduceMotion)?0:Math.sin(ch.phase*.5)*.12;
    if(ch.hop>0){ch.hop=Math.max(0,ch.hop-dt*2.2);p.y=Math.sin(ch.hop*Math.PI)*.4}else p.y=0;
  }
  function walkXZ(id,x,z,cb){const ch=chars[id],p=ch.g.position;ch.node=null;ch.path=findPath(p.x,p.z,x,z).map(q=>new T.Vector3(q[0],0,q[1]));ch.cb=cb||null;if(!ch.path.length&&cb){ch.cb=null;cb()}}
  let freeOn=false;const keys={},KEY={ArrowUp:'u',KeyW:'u',ArrowDown:'d',KeyS:'d',ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r'};
  const floorPlane=new T.Plane(new T.Vector3(0,1,0),0),v5=new T.Vector3();
  window.addEventListener('keydown',e=>{const k=KEY[e.code];if(!k||!freeOn||e.metaKey||e.ctrlKey||e.altKey)return;const t=e.target&&e.target.tagName;if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return;if(api.canMove&&!api.canMove())return;keys[k]=true;e.preventDefault()});
  window.addEventListener('keyup',e=>{const k=KEY[e.code];if(k)keys[k]=false});
  window.addEventListener('blur',()=>{keys.u=keys.d=keys.l=keys.r=false});
  function keyWalk(dt){
    const me=chars.me;me.keyMove=false;
    if(!freeOn||!(keys.u||keys.d||keys.l||keys.r)||(api.canMove&&!api.canMove()))return;
    const fx=(keys.r?1:0)-(keys.l?1:0),fz=(keys.d?1:0)-(keys.u?1:0);if(!fx&&!fz)return;
    const cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw);let dx=fx*cy+fz*sy,dz=-fx*sy+fz*cy;const L=Math.hypot(dx,dz);dx/=L;dz/=L;
    const p=me.g.position,st=me.speed*dt,nx=p.x+dx*st,nz=p.z+dz*st;
    if(!blockedAt(nx,nz)){p.x=nx;p.z=nz}else if(!blockedAt(nx,p.z))p.x=nx;else if(!blockedAt(p.x,nz))p.z=nz;
    me.path=[];me.cb=null;me.node=null;me.keyMove=true;me.target=Math.atan2(dx,dz);
  }
  function setChars(o){for(const id in o){const c=o[id],ch=chars[id];if(!ch)continue;if(typeof c==='string')place(ch,c);else{place(ch,c.node||ch.home);ch.g.position.x=c.x;ch.g.position.z=c.z;ch.g.rotation.y=ch.target=c.ry;ch.node=c.node}
    if(id!=='me'&&typeof c==='string'&&c!==ch.home)face(id,'me')}}

  /* ── 頭上的「！」（下一步要找的）與「？」（支線，最多兩個） ── */
  const badge=(fill,ink,ch)=>(c)=>{c.fillStyle='#12252c';c.beginPath();c.arc(48,50,44,0,7);c.fill();c.beginPath();c.moveTo(30,84);c.lineTo(48,124);c.lineTo(66,84);c.fill();c.fillStyle=fill;c.beginPath();c.arc(48,50,37,0,7);c.fill();c.fillStyle=ink;c.font='900 62px '+FONT;c.textAlign='center';c.textBaseline='middle';c.fillText(ch,48,54)};
  const mk=new T.Group(),gem=sprite(96,128,badge('#f2b01e','#231800','!'),.84,1.12);mk.add(gem);
  const mkP=new T.Mesh(new T.BoxGeometry(1.4,1.4,1.4),M.hidden);mkP.userData.pick='marker';mk.add(mkP);pickables.push(mkP);mk.visible=false;scene.add(mk);
  let mkY=0,mkCh=null;
  const sideMk=[0,1].map(i=>{const g=new T.Group(),s=sprite(96,128,badge('#e9f3ff','#1f55b5','?'),.7,.93);g.add(s);
    const p=new T.Mesh(new T.BoxGeometry(1.3,1.3,1.3),M.hidden);p.userData.pick='side'+i;g.add(p);pickables.push(p);g.visible=false;scene.add(g);return {g,ch:null,y:0}});
  function marker(at){mkCh=null;if(!at){mk.visible=false;return}mk.visible=true;mk.position.set(at[0],at[1],at[2]);mkY=at[1]}
  function markOn(id){const c=chars[id];if(!c){marker(null);return}mkCh=c;mk.visible=true;mkY=3.35;mk.position.set(c.g.position.x,mkY,c.g.position.z)}

  /* ── 撿得到的東西：一顆會閃的光，加上遊戲登記的樣子 ── */
  const ITM={};
  function mkItem(id,kind,at){const g=new T.Group();g.position.set(at[0],at[1],at[2]);if(WORLD.items[kind])WORLD.items[kind](g,LVK);
    const s=sprite(64,64,(c,w,h)=>{const r=c.createRadialGradient(32,32,1,32,32,30);r.addColorStop(0,'rgba(255,250,224,1)');r.addColorStop(.3,'rgba(255,209,102,.8)');r.addColorStop(1,'rgba(255,209,102,0)');c.fillStyle=r;c.fillRect(0,0,w,h);
      c.fillStyle='#fffbe8';c.beginPath();c.moveTo(32,3);c.lineTo(36,28);c.lineTo(61,32);c.lineTo(36,36);c.lineTo(32,61);c.lineTo(28,36);c.lineTo(3,32);c.lineTo(28,28);c.closePath();c.fill()},.9,.9);
    s.position.y=.5;g.add(s);const p=new T.Mesh(new T.BoxGeometry(.9,.9,.9),M.hidden);p.position.y=.2;p.userData.pick='item:'+id;g.add(p);pickables.push(p);g.visible=false;scene.add(g);return {g,s,ph:Math.random()*6}}

  /* ── 狀態牌：跟著一個人或掛在關卡登記的地方（K.anchor） ── */
  const tagSt={text:'',fill:'#1f7f45'},tagG=new T.Group();
  const tagS=sprite(448,64,(g,w,h)=>{pill(g,w,h,tagSt.fill);g.fillStyle='#ffffff';g.font='700 28px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText(tagSt.text,w/2,h/2+2)},3.0,.43);
  const tagRedraw=redraws[redraws.length-1];tagG.add(tagS);tagG.visible=false;scene.add(tagG);let tagAt=null;

  /* 補間 */
  const tweens=[];const v2=new T.Vector3();
  function moveAlong(obj,pts,speed,cb){let i=0;tweens.push(dt=>{const t=pts[i];v2.copy(t).sub(obj.position);const L=v2.length(),s=speed*dt;if(L<=s){obj.position.copy(t);i++;if(i>=pts.length){cb&&cb();return true}}else obj.position.addScaledVector(v2,s/L);return false})}

  /* ── 相機 ── */
  const start=chars.me.g.position;
  const cam={yaw:.32,pitch:.84};const tgt=new T.Vector3(start.x,1,start.z),v3=new T.Vector3(),v4=new T.Vector3();let focus=null,dCur=24,dPit=0;
  const panelEl=$('#panel'),hudEl=$('#hud'),boardEl=$('#board');let homeOn=false,hShot=0,hT=0,hYaw=.32,hPitch=.78;
  const SHOTS=WORLD.shots.length?WORLD.shots:[{p:[start.x,1.2,start.z],d:16,yaw:.42,pitch:.66}];
  /* 把視覺中心移到 HUD 與面板之間：虛擬畫面加上面板與 HUD 的高度，視角依比例放大，畫面比例尺不變 */
  function layout(){
    const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;if(!w||!h)return;
    if(Math.abs((window.devicePixelRatio||1)-qDpr)>.04)mkQ();
    {const lv=Q.level(),pr=lv.ss?lv.pr:Math.min(window.devicePixelRatio||1,lv.pr);   /* 超取樣的級別：畫得比螢幕的倍率大，再由瀏覽器縮回來 */
     if(pr!==lastPr){lastPr=pr;renderer.setPixelRatio(pr);if(w!==lastW||h!==lastH){lastW=w;lastH=h;renderer.setSize(w,h,false)}}
     else if(w!==lastW||h!==lastH){lastW=w;lastH=h;renderer.setSize(w,h,false)}}   /* 數字沒變不重設：大螢幕上重配繪圖緩衝區會頓一下 */
    const wide=matchMedia('(min-width:860px)').matches;let ox=0,oy=0,sx=0,top=0;
    if(homeOn){if(wide&&boardEl)ox=Math.min(boardEl.getBoundingClientRect().right,w*.5)}
    else{const pr=panelEl?panelEl.getBoundingClientRect():{width:0,height:0};if(wide){ox=Math.min(pr.width?pr.width+16:0,w*.5);sx=ox}else oy=Math.min(pr.height,h*.6);top=hudEl?hudEl.getBoundingClientRect().height:0}
    const Hv=h+oy+top,base=(wide?36:50)*Math.PI/360;
    camera.fov=2*Math.atan(Math.tan(base)*Hv/h)*180/Math.PI;
    camera.setViewOffset(w+ox,Hv,sx,oy,w,h);
    cam.base=wide?24:21;cam.wide=wide;
  }
  let zoom=1;
  /* 畫質自動調整（判斷寫在 quality.js）：這裡只負責套用，並記住這台裝置上次停在哪一級。devicePixelRatio 變了就重新開一個控制器 */
  let Q=null,qDpr=0,shNow='',lastPr=0,lastW=0,lastH=0,fpsA=0;
  function mkQ(){let sv=null;try{sv=JSON.parse(localStorage.getItem(GAME.key+'q')||'null')}catch(e){}qDpr=window.devicePixelRatio||1;
    let fx=-1;try{const v=new URLSearchParams(location.search).get('q');if(v==='n')fx='n';else if(v!==null&&v!=='')fx=+v}catch(e){}
    Q=makeQuality({dpr:qDpr,big:DESK,area:()=>(canvas.clientWidth||innerWidth)*(canvas.clientHeight||innerHeight),saved:sv,fixed:fx});setShadow()}
  function setShadow(){const sh=Q.level().sh;if(sh===shNow)return;shNow=sh;
    if(sh!=='off'){const n=sh==='hi'?2048:1024;if(sun.shadow.mapSize.x!==n){sun.shadow.mapSize.set(n,n);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}}
    sun.castShadow=sh!=='off'}
  function perf(raw){if(!document.hidden&&raw>0&&raw<.25)fpsA+=((1/raw)-fpsA)*(fpsA?.05:1);if(Q.feed(raw,document.hidden)){setShadow();layout();try{const v=Q.save();if(v)localStorage.setItem(GAME.key+'q',JSON.stringify(v))}catch(e){}}}
  mkQ();
  /* 滑鼠只收左鍵（右鍵選單跳出來時 pointerup 可能收不到，鏡頭會黏在滑鼠上）；拖曳轉鏡頭、雙指縮放、點了走過去 */
  const ptr=new Map();let dragged=false,down=null,pinch=0;
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});try{canvas.setPointerCapture(e.pointerId)}catch(_){}
    if(ptr.size===1){down={x:e.clientX,y:e.clientY};dragged=false}else if(ptr.size===2){const a=[...ptr.values()];pinch=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);dragged=true}});
  canvas.addEventListener('pointermove',e=>{const p=ptr.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
    if(ptr.size===1){if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>7)dragged=true;if(dragged){cam.yaw=Math.max(-1,Math.min(1,cam.yaw-dx*.006));cam.pitch=Math.max(.5,Math.min(1.2,cam.pitch+dy*.004))}}
    else if(ptr.size===2){const a=[...ptr.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinch){zoom=Math.max(.6,Math.min(cam.wide?1.7:1.4,zoom*pinch/d))}pinch=d}});
  const ray=new T.Raycaster(),nd=new T.Vector2();
  function hits(e){const r=canvas.getBoundingClientRect();nd.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(nd,camera);
    const ids=[];ray.intersectObjects(pickables,true).forEach(h=>{const id=h.object.userData.pick;if(id&&ids.indexOf(id)<0&&!(chars[id]&&!chars[id].g.visible)&&h.object.parent.visible!==false)ids.push(id)});return ids}
  function up(e){const had=ptr.has(e.pointerId);ptr.delete(e.pointerId);if(!had)return;
    if(!dragged&&e.type==='pointerup'){const ids=hits(e),done=ids.length&&api.onPick?api.onPick(ids):false;
      if(!done&&freeOn&&(!api.canMove||api.canMove())&&ray.ray.intersectPlane(floorPlane,v5))walkXZ('me',v5.x,v5.z)}
    if(ptr.size<2)pinch=0}
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  /* 滾輪：看滾動量（觸控板一次滑動送幾十個事件）。Ctrl/Cmd＋滾輪（含觸控板捏合）留給瀏覽器縮放 */
  canvas.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey)return;e.preventDefault();const d=(e.deltaMode===1?e.deltaY*16:e.deltaMode===2?e.deltaY*400:e.deltaY);zoom=Math.max(.6,Math.min(cam.wide?1.7:1.4,zoom*Math.exp(Math.max(-90,Math.min(90,d))*.0012)))},{passive:false});
  canvas.addEventListener('pointermove',e=>{if(ptr.size||e.pointerType!=='mouse')return;canvas.style.cursor=hits(e).length?'pointer':'grab'});

  /* ── 亮暗主題 ── */
  function theme(){const a=document.documentElement.getAttribute('data-theme');return a==='dark'||a==='light'?a:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}
  function applyTheme(){const dk=theme()==='dark';pal=PAL[dk?'dark':'light'];ground.material.color.setHex(pal.earth);scene.background=new T.Color(pal.bg);scene.fog.color.setHex(pal.bg);
    M.floor.color.setHex(pal.floor);M.office.color.setHex(pal.office);M.wall.color.setHex(pal.wall);M.tool.color.setHex(pal.tool);M.tool2.color.setHex(pal.tool2);M.trim.color.setHex(pal.trim);
    hemi.intensity=pal.hemi;hemi.groundColor.setHex(pal.ground);sun.intensity=pal.sun;themeHooks.forEach(f=>f(dk));redraws.forEach(f=>f())}
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme);
  new MutationObserver(applyTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>redraws.forEach(f=>f()));

  /* ── 每一格 ── */
  const clock=new T.Clock();let time=0,alarmId=null;
  const SLD=new T.Vector3(8,17,10).normalize(),SLR=new T.Vector3(0,1,0).cross(SLD).normalize(),SLU=SLD.clone().cross(SLR),sv5=new T.Vector3();   // 光的方向固定：右、上兩個軸算一次就好
  function tick(){
    const raw=clock.getDelta(),dt=Math.min(raw,.1);time+=dt;perf(raw);
    keyWalk(dt);
    for(const id in chars)updChar(chars[id],dt);
    /* 窄螢幕上鏡頭一拉遠，名牌就小到看不清楚：名牌跟著鏡頭距離放大 */
    {const ts=cam.wide?1:Math.max(1,Math.min(1.5,dCur/15));for(const id in chars){const t=chars[id].g.userData.tag;t.scale.set(1.9*ts,.475*ts,1);t.position.y=2.4+(ts-1)*.3}tagG.scale.setScalar(ts)}
    for(let i=tweens.length-1;i>=0;i--)if(tweens[i](dt))tweens.splice(i,1);
    const me=chars.me.g.position;
    const sh=homeOn?SHOTS[hShot]:null;if(sh){hT+=dt;v3.set(sh.p[0],sh.p[1],sh.p[2])}else if(focus){if(focus.obj)focus.pos.copy(focus.obj.position);v3.copy(focus.pos)}else v3.set(me.x,1,me.z);tgt.lerp(v3,1-Math.pow(sh?.1:.002,dt));
    const hk=reduceMotion?.5:Math.min(1,hT/8);
    const dWant=sh?sh.d*(cam.wide?1:1.22)*(1.06-.1*hk):focus?focus.dist:(cam.base||24)*zoom;dCur+=(dWant-dCur)*(1-Math.pow(sh?.12:.01,dt));
    if(sh){const k=1-Math.pow(.12,dt);hYaw+=(sh.yaw+(hk-.5)*.24-hYaw)*k;hPitch+=(sh.pitch-hPitch)*k}
    dPit+=((focus&&focus.lift||0)-dPit)*(1-Math.pow(.02,dt));const yw=sh?hYaw:cam.yaw,pt=sh?hPitch:cam.pitch+dPit,cp=Math.cos(pt),sp=Math.sin(pt);
    camera.position.set(tgt.x+Math.sin(yw)*cp*dCur,tgt.y+sp*dCur,tgt.z+Math.cos(yw)*cp*dCur);camera.lookAt(tgt);
    /* 太陽跟著鏡頭的目標點走：目標點在光的座標裡對齊到陰影貼圖的一格，陰影才不會在地上滑、邊緣一直閃 */
    {const st=34/sun.shadow.mapSize.x,a=tgt.x*SLR.x+tgt.y*SLR.y+tgt.z*SLR.z,b=tgt.x*SLU.x+tgt.y*SLU.y+tgt.z*SLU.z,da=Math.round(a/st)*st-a,db=Math.round(b/st)*st-b;
     sv5.set(tgt.x+SLR.x*da+SLU.x*db,tgt.y+SLR.y*da+SLU.y*db,tgt.z+SLR.z*da+SLU.z*db);sun.target.position.copy(sv5);sun.position.set(sv5.x+8,sv5.y+17,sv5.z+10)}
    {const k=reduceMotion?1:1-Math.pow(.04,dt);hemi.intensity+=(pal.hemi*mood.h-hemi.intensity)*k;sun.intensity+=(pal.sun*mood.s-sun.intensity)*k;sun.color.lerp(mood.c,k);hemi.color.lerp(mood.hc,k);bgC.setHex(pal.bg).lerp(mood.bc,mood.bg);scene.background.lerp(bgC,k);scene.fog.color.copy(scene.background)}
    for(const k in ITM){const it=ITM[k];if(!it.g.visible)continue;const t=time*3+it.ph,u=Math.max(0,Math.sin(t)),s=reduceMotion?.8:.6+.34*u;it.s.material.opacity=reduceMotion?.85:.5+.5*u;it.s.scale.set(s,s,1);it.s.material.rotation=reduceMotion?0:t*.35}
    sideMk.forEach((m,i)=>{if(!m.g.visible)return;if(m.ch){m.g.position.x=m.ch.g.position.x;m.g.position.z=m.ch.g.position.z}m.g.position.y=m.y+(reduceMotion?0:Math.sin(time*2.6+i*2)*.1)});
    if(mk.visible){if(mkCh){mk.position.x=mkCh.g.position.x;mk.position.z=mkCh.g.position.z}mk.position.y=mkY+(reduceMotion?0:Math.sin(time*4)*.16);const k=reduceMotion?1:1+Math.max(0,Math.sin(time*4))*.12;gem.scale.set(.84*k,1.12*k,1)}
    if(alarmId&&towers[alarmId]){const on=reduceMotion||Math.sin(time*7)>0,t=towers[alarmId];t.lamps[0].m.color.setHex(on?0xff5a4a:0x5a2a26);t.halo.material.opacity=on?.95:.2}
    if(tagG.visible){if(chars[tagAt]){const c_=chars[tagAt].g.position;v4.set(c_.x,3.0,c_.z)}else if(ANCH[tagAt])v4.copy(ANCH[tagAt]);tagG.position.lerp(v4,1-Math.pow(.02,dt))}
    if(NODRAW){scene.updateMatrixWorld();camera.updateMatrixWorld()}   /* 不畫，但位置照更新：點東西、W.project 要用 */
    else if(!Q.skip())renderer.render(scene,camera);
  }
  layout();
  new ResizeObserver(layout).observe(document.body);if(panelEl)new ResizeObserver(layout).observe(panelEl);
  renderer.setAnimationLoop(tick);

  const api={
    onPick:null,canMove:null,layout,walk,face,marker,markOn,walkXZ,
    mood(n){mood=MOODS[n]||MOODS.day},
    /* 撿得到的東西：L 是現在看得到的 [[id,樣子,x,y,z],…]，其他的藏起來 */
    items(L){const want={};(L||[]).forEach(o=>{let it=ITM[o[0]];if(!it)it=ITM[o[0]]=mkItem(o[0],o[1],o.slice(2));it.g.visible=true;want[o[0]]=1});for(const k in ITM)if(!want[k])ITM[k].g.visible=false},
    speed(id,k){const c=chars[id];if(!c)return;if(!c.base0)c.base0=c.speed;c.speed=c.base0*k},
    lvReady(id){return !!lvBuilt[id]},lvLoad(id,cb){needLv(id,cb)},
    perfLevel(){const f=Q.info();return Math.max(0,f.i-f.base)},
    diag(){const l=Q.level(),f=Q.info();return {fps:Math.round(fpsA),win:f.fps,hz:f.hz,target:f.target,lv:Math.max(0,f.i-f.base),pr:lastPr,sh:l.sh,buf:canvas.width+'x'+canvas.height,css:lastW+'x'+lastH,dpr:window.devicePixelRatio||1}},
    has(id){return !!chars[id]},
    blocked(x,z){return blockedAt(x,z)},
    going(){return !!(chars.me&&chars.me.cb)},
    /* 還在走的人，開口時直接到位 */
    arrive(id){const c=chars[id];if(c&&c.path.length){const f=c.cb;place(c,c.node);if(f)f()}},
    /* 這個人最後會停在哪裡（還在走的話是他要去的地方） */
    dest(id){const c=chars[id];if(!c)return null;if(c.path.length){const t=c.path[c.path.length-1];return [t.x,t.z]}return [c.g.position.x,c.g.position.z]},
    /* 結算圖卡用的截圖 */
    grab(){try{const pr=renderer.getPixelRatio(),k=Math.min(3,Math.max(pr,1080/(canvas.clientWidth||innerWidth)));renderer.setPixelRatio(k);renderer.render(scene,camera);const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;c.getContext('2d').drawImage(canvas,0,0);renderer.setPixelRatio(pr);renderer.render(scene,camera);return c}catch(e){return null}},
    sideMark(i,at){const m=sideMk[i];if(!m)return;if(!at){m.g.visible=false;m.ch=null;return}m.g.visible=true;if(typeof at==='string'){m.ch=chars[at];if(!m.ch){m.g.visible=false;return}m.y=3.3;m.g.position.set(m.ch.g.position.x,m.y,m.ch.g.position.z)}else{m.ch=null;m.y=at[1];m.g.position.set(at[0],at[1],at[2])}},
    setName(text){const g=chars.me.g,old=g.userData.tag,t=plate(text,WORLD.cast.me.fill||'#f2b01e',WORLD.cast.me.ink||'#231800');t.position.copy(old.position);g.remove(old);if(old.material.map)old.material.map.dispose();old.material.dispose();g.add(t);g.userData.tag=t},
    hop(id){if(chars[id]&&!reduceMotion)chars[id].hop=1},
    tag(text,at,fill){tagSt.text=text||'';if(fill)tagSt.fill=fill;tagRedraw();if(at)tagAt=at;tagG.visible=!!text},
    tower(id,state){setTower(id,state)},
    alarm(id){const old=alarmId;alarmId=id||null;if(old&&old!==alarmId&&towers[old])setTower(old,towers[old].state);if(alarmId)setTower(alarmId,'red')},
    show(id,on){if(chars[id])chars[id].g.visible=!!on},
    put(id,node){const ch=chars[id],p=NODES[node];if(!ch||!p)return;ch.path=[];ch.cb=null;ch.node=node;ch.home=node;ch.g.position.set(p[0],0,p[1])},
    screen(id,lines,color){const s=screens[id];if(!s)return;s.st.lines=lines;if(color)s.st.color=color;s.redraw()},
    focus(at,dist){focus=at?{pos:new T.Vector3(at[0],at[1],at[2]),dist:dist||11}:null},
    focusObj(obj,dist){focus={obj,pos:obj.position.clone(),dist:dist||14}},
    key(k,on){if(k==='u'||k==='d'||k==='l'||k==='r')keys[k]=!!on},
    home(on){on=!!on;if(on&&!homeOn){hYaw=cam.yaw;hPitch=cam.pitch;hT=0}homeOn=on;layout()},
    shot(i){hShot=Math.max(0,Math.min(SHOTS.length-1,i|0));hT=0},shots(){return SHOTS.length},
    project(x,y,z){v5.set(x,y,z).project(camera);const r=canvas.getBoundingClientRect();return [r.left+(v5.x+1)/2*r.width,r.top+(1-v5.y)/2*r.height,v5.z]},
    free(on){freeOn=!!on;if(!on){keys.u=keys.d=keys.l=keys.r=false}},
    node(id){const n=NODES[id];return n?n.slice():null},
    settle(){let n=0;while(tweens.length&&n++<4000)for(let i=tweens.length-1;i>=0;i--)if(tweens[i](5))tweens.splice(i,1);
      for(const id in chars){const c=chars[id];if(c.path.length){const t=c.path[c.path.length-1];c.g.position.x=t.x;c.g.position.z=t.z;c.path=[];const cb=c.cb;c.cb=null;cb&&cb()}}},
    state:{
      get(){const cs={};for(const id in chars){const c=chars[id];cs[id]={node:c.node,x:c.g.position.x,z:c.g.position.z,ry:c.target}}
        const sc_={};for(const k in screens)sc_[k]={lines:screens[k].st.lines.slice(),color:screens[k].st.color};
        const tw={},sh={};for(const k in towers)tw[k]=towers[k].state;for(const id in chars)sh[id]=chars[id].g.visible;
        return {chars:cs,show:sh,towers:tw,alarm:alarmId||false,screens:sc_,tag:{text:tagG.visible?tagSt.text:'',at:tagAt,fill:tagSt.fill},mk:mk.visible?[mk.position.x,mkY,mk.position.z]:null}},
      set(o){tweens.length=0;
        if(o.chars)setChars(o.chars);
        if(o.show)for(const id in o.show)api.show(id,o.show[id]);if(o.towers)for(const k in o.towers)setTower(k,o.towers[k]);if('alarm' in o)api.alarm(o.alarm);
        if(o.screens)for(const k in o.screens)api.screen(k,o.screens[k].lines,o.screens[k].color);
        if(o.tag)api.tag(o.tag.text,o.tag.at,o.tag.fill);if('mk' in o)marker(o.mk)}
    },
    snap(){const o={vis:{},mk:mk.visible?[mk.position.x,mk.position.z]:null};for(const id in chars){o[id]=[chars[id].g.position.x,chars[id].g.position.z];o.vis[id]=chars[id].g.visible}return o},
    reset(){for(const id in chars){place(chars[id],chars[id].home);chars[id].g.visible=HIDDEN0.indexOf(id)<0}tweens.length=0;freeOn=false;focus=null;
      api.alarm(null);for(const k in towers)setTower(k,'green');marker(null);sideMk.forEach(m=>{m.g.visible=false;m.ch=null});mood=MOODS.day;api.items(null);api.speed('me',1);api.tag('')}
  };
  return api;
}
