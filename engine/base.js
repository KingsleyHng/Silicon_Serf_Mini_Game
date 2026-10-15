/* 框架的最底層：每個檔一載入就可能用到的工具。不用到任何別的檔（只有建置產生的 GAME 設定）。
   GAME：遊戲自己的設定，建置時產生 engine/config.js（key＝存在瀏覽器的鍵名前綴）。 */
/* 語言：原始碼是繁體中文。建置別的語言時建置工具會改寫這一行；LANGS 有兩個以上，主頁才出現切換鈕 */
const LANG='zh-Hant',LANGS=[];
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const urlArg=k=>{try{return new URLSearchParams(location.search).get(k)}catch(e){return null}};
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;   // 使用者設定「減少動態」
let W=null;            // 3D 世界（沒有 WebGL 時為 null，遊戲照常進行）；boot.js 蓋好之後設定，框架與遊戲都透過 W.* 跟它講話
