/* ───────── 關卡檔 ─────────
   一個地方的 3D 是一個檔（例如 levels/<名字>.js），裡面 levelAdd('<名字>',build)。
   3D 世界第一次要用到那個地方才呼叫 build(K)，K 是世界借給它的工具：T（three.js）、G（要蓋進去的群組）、M（共用材質）、TX（貼圖）、
   px、P、rnd（畫像素貼圖）、lam、basic（材質）、box（蓋方塊）、canvasTex、FONT、pal()（現在的配色）、plate（立牌）、pickBox（可以點的範圍）。
   正式網站上關卡檔不在第一次下載裡：進入點用 setLevelLoader 告訴這裡怎麼載，levelReady 等它載好；載不到就 cb(false)，那個地方是空的但遊戲照常。
   打包成單一檔的版本（測試頁、離線版）一開始就登記好了（沒有 loader）。這個檔不能用到別的檔（一載入就會被關卡檔用到）。 */
const LEVELS={};
function levelAdd(id,build){LEVELS[id]=build}
const levelLoad={},levelP={};
function setLevelLoader(id,f){levelLoad[id]=f}
function levelReady(id,cb){
  if(LEVELS[id]||!levelLoad[id]){cb(!!LEVELS[id]);return}
  if(!levelP[id])levelP[id]=levelLoad[id]().catch(e=>{if(window.console)console.warn('level',id,e)});
  levelP[id].then(()=>cb(!!LEVELS[id]));
}
