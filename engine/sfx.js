/* ───────── 聲音：全部用 Web Audio 現場合成，沒有外部音檔。開關由遊戲畫面呼叫 set() ───────── */
const SFX=(()=>{
  let ctx=null,master=null,on=true,ringT=0,humG=null,wasRing=false;
  try{on=localStorage.getItem(GAME.key+'s')!=='0'}catch(e){}
  function ac(){
    if(!on||document.hidden)return null;   // 分頁在背景時不出聲（字卡到時間、來電都會自己往下走）
    try{
      if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;ctx=new C();master=ctx.createGain();master.gain.value=.5;master.connect(ctx.destination)}
      if(ctx.state!=='running'){const p=ctx.resume();if(p&&p.catch)p.catch(()=>{})}   // 有些手機瀏覽器被來電或語音助理打斷後是 'interrupted'，不是 'suspended'
      return ctx;
    }catch(e){return null}
  }
  function tone(f,t0,d,type,vol,f2){
    const c=ac();if(!c)return;
    try{
      const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+t0;
      o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
      g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol||.2,t+.012);g.gain.exponentialRampToValueAtTime(.0008,t+d);
      o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.03);
    }catch(e){}
  }
  function noise(c,sec){const b=c.createBuffer(1,Math.floor(c.sampleRate*sec),c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b}
  const api={
    isOn:()=>on,
    /* 一直都在的環境底噪（空調、風扇那種低沉的聲音）。level 0 到 1，0 是關掉 */
    hum(level){
      if(!ctx&&!level)return;const c=ac();if(!c)return;
      try{
        if(!humG){const src=c.createBufferSource();src.buffer=noise(c,2);src.loop=true;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=210;humG=c.createGain();humG.gain.value=0;src.connect(lp);lp.connect(humG);humG.connect(master);src.start()}
        humG.gain.setTargetAtTime(level*.085,c.currentTime,.5);
      }catch(e){}
    },
    /* 一陣風聲（開門、換場景） */
    air(){
      const c=ac();if(!c)return;
      try{const t=c.currentTime,src=c.createBufferSource(),bp=c.createBiquadFilter(),g=c.createGain();src.buffer=noise(c,1);bp.type='bandpass';bp.frequency.setValueAtTime(500,t);bp.frequency.exponentialRampToValueAtTime(2600,t+.8);
        g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.11,t+.15);g.gain.exponentialRampToValueAtTime(.001,t+.9);src.connect(bp);bp.connect(g);g.connect(master);src.start(t);src.stop(t+1)}catch(e){}
    },
    vib(p){if(!on)return;try{if(navigator.vibrate)navigator.vibrate(p)}catch(e){}},
    /* 分頁切到背景就安靜，回來再接上 */
    pause(){wasRing=!!ringT;api.stopRing();try{if(ctx&&ctx.state==='running')ctx.suspend()}catch(e){}},
    resume(){if(!on||!ctx)return;try{ctx.resume()}catch(e){}if(wasRing){wasRing=false;api.ring()}},
    set(v){on=!!v;try{localStorage.setItem(GAME.key+'s',on?'1':'0')}catch(e){}if(on)ac();else{api.stopRing();if(ctx&&ctx.state==='running')try{ctx.suspend()}catch(e){}}},
    unlock(){ac()},
    blip(){tone(540,0,.05,'triangle',.05)},                                              // 對話換句
    ping(){tone(880,0,.12,'sine',.15);tone(1320,.09,.22,'sine',.12)},                    // 群組訊息
    ok(){tone(660,0,.12,'triangle',.13);tone(880,.1,.14,'triangle',.13);tone(1320,.2,.28,'triangle',.11)},  // 成功、完成、拿到東西
    card(){tone(196,0,.55,'sine',.16,98)},                                               // 換時段
    alarm(){[0,.22,.44].forEach(t=>tone(1040,t,.14,'square',.06))},                      // 警示
    bad(){tone(300,0,.25,'sawtooth',.08,150);tone(220,.22,.42,'sawtooth',.07,110)},     // 出事了
    thud(){tone(110,0,.22,'sine',.28,48);tone(70,.02,.3,'triangle',.18,40)},                // 重物落地
    /* 易碎的東西碎掉：一聲脆響（高頻雜訊），接著碎片散在地上的細碎聲 */
    crack(){
      const c=ac();if(!c)return;
      try{const t=c.currentTime,src=c.createBufferSource(),hp=c.createBiquadFilter(),g=c.createGain();src.buffer=noise(c,.4);hp.type='highpass';hp.frequency.value=1800;
        g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.34,t+.004);g.gain.exponentialRampToValueAtTime(.002,t+.22);src.connect(hp);hp.connect(g);g.connect(master);src.start(t);src.stop(t+.4)}catch(e){}
      for(let i=0;i<9;i++)tone(2600+Math.random()*3400,.06+i*.035+Math.random()*.03,.05+Math.random()*.05,'sine',.03+Math.random()*.03);
    },
    ring(){api.stopRing();const one=()=>{for(let i=0;i<8;i++)tone(i%2?1180:940,i*.07,.07,'square',.055)};one();ringT=setInterval(one,1500)},
    stopRing(){clearInterval(ringT);ringT=0}
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden)api.pause();else api.resume()});
  return api;
})();
