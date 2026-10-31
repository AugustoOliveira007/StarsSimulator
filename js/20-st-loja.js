/* ===================== STARSTEAM — LOJA E ABERTURA 3D DE PACOTES ===================== */
function stPackArt(type,cls){
  const P=ST_PACKS[type],art=(ST_ART.packs[type]||{}).front;
  const k={bronze:'bronze',prata:'prata',ouro:'ouro',ouroPremium:'premium',ouroRaro:'raro',elite:'elite',promo10:'promo',treinador:'tec',estadio:'est',inicial:'ini'}[type]||'ouro';
  return `<div class="st-pack pk-${k} ${cls||''}"><div class="st-pack-in"${art?` style="background-image:url('${stAttr(art)}')"`:''}>${art?'':`<div class="st-pack-star">★</div><div class="st-pack-n">${esc(P.n.replace('Pacote ',''))}</div><div class="st-pack-s">STARSTEAM</div>`}</div><i class="st-pack-shine"></i></div>`;
}
function stOddsTable(type){
  const P=ST_PACKS[type];
  if(P.kind==='manager'||P.kind==='stadium'||P.kind==='starter')return `<small class="st-fine">${esc(P.info)}</small>`;
  if(!P.odds)return `<small class="st-fine">${esc(P.info)} Sem chance de jogadores de ouro acima do intervalo.</small>`;
  const [,a,b,c]=P.odds,pct=x=>(x*100<1?(x*100).toFixed(1):Math.round(x*100))+'%';
  const r1=Math.max(0,1-a),r2=Math.max(0,a-b),r3=Math.max(0,b-c);
  return `<table class="st-odds"><caption>Probabilidade da melhor carta</caption><tr><td>${P.lo}–81</td><td>${pct(r1)}</td></tr><tr><td>82–85</td><td>${pct(r2)}</td></tr><tr><td>86–89</td><td>${pct(r3)}</td></tr><tr><td>90+</td><td>${pct(c)}</td></tr></table><small class="st-fine">${esc(P.info)}</small>`;
}
STV.store=()=>{
  const c=ST.club;
  const mine=c.packs.length?`<div class="st-card"><h3 class="t">Meus pacotes (${c.packs.length})</h3><div class="st-packrow">${c.packs.map(p=>`<div class="st-mypack tilt" data-act="openpack" data-id="${p.id}">${stPackArt(p.type)}<b>${esc(ST_PACKS[p.type].n)}</b><small>${esc(p.src||'')}</small></div>`).join('')}</div>${c.packs.length>1?'<button class="btn sec sm" data-act="openall">Abrir todos em sequência</button>':''}</div>`:'';
  const shop=ST_PACK_ORDER.map(t=>{
    const P=ST_PACKS[t];
    return `<div class="st-shopitem"><div class="tilt">${stPackArt(t)}</div><div class="st-shopinfo"><h4>${esc(P.n)}</h4>${stOddsTable(t)}<button class="btn" data-act="buypack" data-t="${t}" ${c.coins<P.price?'disabled':''}>🪙 ${stFmt(P.price)}</button></div></div>`;
  }).join('');
  return `<h2 class="t">Loja</h2><p class="st-sub">Os pacotes custam apenas StarsCoins, ganhas jogando. Não existe compra com dinheiro real. As probabilidades de cada pacote estão visíveis.</p>${mine}<div class="st-shopgrid">${shop}</div>
  <div class="st-card"><h3 class="t">Pacotes por recompensa</h3><p class="st-fine">Só se consegue jogando:</p><div class="st-shopgrid">${['elite','promo10'].map(t=>`<div class="st-shopitem"><div class="tilt">${stPackArt(t)}</div><div class="st-shopinfo"><h4>${esc(ST_PACKS[t].n)}</h4>${stOddsTable(t)}</div></div>`).join('')}</div></div>`;
};
STA.buypack=el=>{
  const t=el.dataset.t,P=ST_PACKS[t];
  stConfirm(`Comprar <b>${esc(P.n)}</b> por ${stFmt(P.price)} 🪙?`,()=>{const r=stBuyPack(t);if(!r.ok)return toast(r.err);stTopRefresh();stPackFlow(r.pack.id)},'Comprar e abrir');
};
STA.openpack=el=>stPackFlow(el.dataset.id);
STA.openall=()=>{ST.queue=ST.club.packs.map(p=>p.id);const n=ST.queue.shift();stPackFlow(n)};

/* ---------- Abertura 3D ---------- */
const stIsBig=c=>c.kind==='player'&&(c.ovr>=86||['heroi','idolo'].includes(c.rar));
function stPackFlow(pid){
  const c=ST.club,pk=c.packs.find(p=>p.id===pid);if(!pk)return;
  const P=ST_PACKS[pk.type],ov=document.createElement('div');
  ov.className='st-ov st-scope st-open';ov.id='st-open';
  ov.innerHTML=`<div class="sto-stage"><div class="sto-glow"></div><div class="sto-pack tilt" data-act="sto-tear">${stPackArt(pk.type)}</div><div class="sto-hint">Toque no pacote para abrir</div></div>`;
  document.body.appendChild(ov);requestAnimationFrame(()=>ov.classList.add('in'));
  ST.openId=pid;
}
function stOpenClose(){const o=$('st-open');if(o)o.remove();ST.openId=null}
STA['sto-tear']=()=>{
  const ov=$('st-open');if(!ov||ov.dataset.busy)return;ov.dataset.busy=1;
  const pk=ST.club.packs.find(p=>p.id===ST.openId);if(!pk)return stOpenClose();
  const ownBefore=new Set(stPlayersOwned().map(x=>x.pid));
  const r=stOpenPackById(ST.openId);if(!r)return stOpenClose();
  r.cards.forEach(x=>{x._dup=ownBefore.has(x.pid)});
  ST.openRes=r;ST.openIdx=0;ST.openType=pk.type;
  stTopRefresh();
  const st=ov.querySelector('.sto-stage');st.classList.add('tear');
  setTimeout(()=>{st.classList.add('burst')},600);
  setTimeout(()=>stRevealNext(),1500);
};
function stRevealNext(){
  const ov=$('st-open');if(!ov)return;
  const r=ST.openRes,i=ST.openIdx;
  if(i>=r.cards.length)return stOpenSummary();
  const card=r.cards[i],big=stIsBig(card);
  ov.innerHTML=`<div class="sto-reveal${big?' big':''}"><div class="sto-count">${i+1} / ${r.cards.length}</div>
    <div class="sto-cardbox" data-act="sto-flip"><div class="sto-card3d"><div class="sto-face sto-back"><span>★</span></div><div class="sto-face sto-front">${stCardHTML(card,{size:'lg',tilt:false})}</div></div></div>
    <div class="sto-hint" id="sto-hint">${big?'':'Toque para virar'}</div><button class="btn sec sm sto-skip" data-act="sto-skip">Pular tudo ›</button></div>`;
  if(big){
    const nat=card.nat&&ST_NATIONS[card.nat],lgN=card.league&&card.league.startsWith('rl:')?card.leagueN:ST_LEAGUE_NAME(card.league);
    const w=document.createElement('div');w.className='sto-walk';
    w.innerHTML=`<div class="sto-walk-i">${card.nat?stFlag(card.nat,120):''}<b>${esc(nat?nat.n:'')}</b></div>`;
    ov.appendChild(w);
    setTimeout(()=>{w.innerHTML=`<div class="sto-walk-i">${stCardCrest(card)}<b>${esc(card.club||lgN||'')}</b></div>`},900);
    setTimeout(()=>{w.innerHTML=`<div class="sto-walk-i"><b class="big">${card.ovr}</b><b>${esc(card.pos)}</b></div>`},1800);
    setTimeout(()=>{w.classList.add('out');setTimeout(()=>w.remove(),500);const b=ov.querySelector('.sto-cardbox');if(b)b.classList.add('flipped');const h=$('sto-hint');if(h)h.textContent='Toque para continuar';ov.dataset.state='shown'},2600);
    ov.dataset.state='walk';
  }else ov.dataset.state='down';
}
STA['sto-flip']=()=>{
  const ov=$('st-open');if(!ov)return;const s=ov.dataset.state,box=ov.querySelector('.sto-cardbox');
  if(s==='down'){box.classList.add('flipped');ov.dataset.state='shown';const h=$('sto-hint');if(h)h.textContent='Toque para continuar';
    const card=ST.openRes.cards[ST.openIdx];if(card&&card.kind==='player'&&card.ovr>=80)box.classList.add('glow')}
  else if(s==='shown'){ST.openIdx++;stRevealNext()}
};
STA['sto-skip']=()=>{ST.openIdx=ST.openRes.cards.length;stRevealNext()};
function stOpenSummary(){
  const ov=$('st-open');if(!ov)return;const r=ST.openRes,sellable=r.cards.filter(x=>x._dup&&x.kind==='player'),tot=sellable.reduce((s,x)=>s+stQuickSell(x),0);
  const starter=ST.openType==='inicial';
  ov.dataset.state='sum';
  ov.innerHTML=`<div class="sto-sum"><h2 class="t">${esc(ST_PACKS[ST.openType].n)}</h2><div class="sto-sumgrid">${r.cards.map((x,i)=>`<div style="--i:${i}">${stCardHTML(x,{size:'sm',id:x.id,act:'cardinfo',badge:x._dup&&x.kind==='player'?'REP':''})}</div>`).join('')}</div>
    <div class="row" style="justify-content:center;gap:.6rem;flex-wrap:wrap">${starter?'':''}${sellable.length?`<button class="btn sec" data-act="sto-sellrep">Vender ${sellable.length} repetida(s) (+${stFmt(tot)} 🪙)</button>`:''}<button class="btn" data-act="sto-done">${ST.queue&&ST.queue.length?'Próximo pacote ›':'Continuar'}</button></div></div>`;
}
STA['sto-sellrep']=el=>{
  const ids=ST.openRes.cards.filter(x=>x._dup&&x.kind==='player'&&ST.club.cards[x.id]).map(x=>x.id);
  const g=stQuickSellCards(ids);toast('+'+stFmt(g)+' moedas');ST.openRes.cards=ST.openRes.cards.filter(x=>!ids.includes(x.id));stTopRefresh();
  if(!ST.openRes.cards.length)return STA['sto-done']();stOpenSummary();
};
STA['sto-done']=()=>{
  const type=ST.openType;stOpenClose();
  if(type==='inicial'){
    const c=ST.club,sq=c.squads[0];
    if(sq.slots.every(x=>!x)){stAutoSquad(sq);stSave({pub:true});toast('⚡ Seu primeiro elenco foi montado! Abra os outros pacotes e ajuste no Elenco.')}
  }
  if(ST.queue&&ST.queue.length){const n=ST.queue.shift();setTimeout(()=>stPackFlow(n),250);return}
  ST.queue=null;
  if(ST.club.packs.length)stGo('store',null,true);else stGo(ST.view==='store'?'store':ST.view,ST.arg,true);
};
