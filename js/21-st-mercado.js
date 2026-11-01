/* ===================== STARSTEAM — MERCADO, DME, OBJETIVOS ===================== */
const stLeft=ms=>{ms=Math.max(0,ms);const h=Math.floor(ms/3600e3),m=Math.floor(ms%3600e3/60e3),s=Math.floor(ms%60e3/1e3);return h?`${h}h ${m}min`:m?`${m}min ${s}s`:`${s}s`};
ST.mk={tab:'buy',q:'',pos:'',min:'',max:'',sort:'end',src:'all'};
STV.market=()=>{
  const f=ST.mk,c=ST.club;
  const tabs=[['buy','Comprar'],['mine','Meus anúncios ('+Object.keys(c.mk).length+')'],['bids','Meus lances ('+Object.keys(c.esc).length+')']];
  return `<h2 class="t">Mercado de transferências</h2><p class="st-sub">Leilões entre os jogadores do beta e o mercado do sistema (renovado a cada hora). Taxa de 5% sobre as vendas. As moedas de um lance ficam reservadas até o fim.</p>
  <div class="st-tabs">${tabs.map(([k,n])=>`<button class="${f.tab===k?'on':''}" data-act="mktab" data-v="${k}">${n}</button>`).join('')}<button data-act="mkrefresh" title="Atualizar">🔄</button></div>
  <div id="st-mkbody">${stMkBody()}</div>`;
};
STP.market=async()=>{
  await stMarketFetch(true);const b=$('st-mkbody');if(b&&ST.view==='market')b.innerHTML=stMkBody();
  clearInterval(ST.mkT);ST.mkT=setInterval(()=>{if(ST.view!=='market'||!$('st-mkbody')){clearInterval(ST.mkT);return}stMkTick()},1000);
};
STA.mktab=el=>{ST.mk.tab=el.dataset.v;stGo('market',null,true)};
STA.mkrefresh=async()=>{await stMarketFetch(true);await stMarketProcess();stTopRefresh();const b=$('st-mkbody');if(b)b.innerHTML=stMkBody()};
function stMkTick(){document.querySelectorAll('[data-exp]').forEach(e=>{const l=+e.dataset.exp-Date.now();e.textContent=l>0?stLeft(l):'Encerrando…'})}
function stMkListings(){
  const f=ST.mk,now=Date.now(),q=f.q.toLowerCase();
  let L=[];
  if(f.src!=='npc')ST.market.forEach(x=>{const S=stListingState(x,now);if(!S.ended)L.push({...x,S})});
  if(f.src!=='user')stNpcListings().forEach(x=>{if(!ST.club.npc[x.id])L.push({...x,S:{exp:x.exp,cur:0,top:null,bids:[]}})});
  L=L.filter(x=>x.card.kind==='player'||!f.pos);
  if(q)L=L.filter(x=>x.card.name.toLowerCase().includes(q)||(x.card.club||'').toLowerCase().includes(q));
  if(f.pos)L=L.filter(x=>x.card.pos===f.pos||(f.pos==='DEF'&&ST_SECTOR(x.card.pos)==='def'&&x.card.pos!=='GK')||(f.pos==='MEI'&&ST_SECTOR(x.card.pos)==='mid')||(f.pos==='ATA'&&ST_SECTOR(x.card.pos)==='fwd'));
  if(f.min!=='')L=L.filter(x=>x.card.ovr>=+f.min);
  if(f.max!=='')L=L.filter(x=>x.card.ovr<=+f.max);
  const sf={end:(a,b)=>a.S.exp-b.S.exp,ovr:(a,b)=>b.card.ovr-a.card.ovr,low:(a,b)=>a.buyNow-b.buyNow,high:(a,b)=>b.buyNow-a.buyNow}[f.sort];
  return L.sort(sf).slice(0,60);
}
function stMkBody(){
  const f=ST.mk,c=ST.club;
  if(f.tab==='mine'){
    const ids=Object.keys(c.mk);
    if(!ids.length)return '<div class="st-card"><p>Você não tem anúncios ativos. Abra uma carta na aba Clube e escolha "Vender no mercado".</p></div>';
    return `<div class="st-mkgrid">${ids.map(id=>{const m=c.mk[id],L=ST.market.find(x=>x.id===id),S=L?stListingState(L):null;
      return `<div class="st-mkitem">${stCardHTML(m.card,{size:'sm',tilt:false})}<div class="st-mki"><b>${esc(m.card.name)}</b><small>Inicial ${stFmt(m.start)} • Compre já ${stFmt(m.buyNow)}</small>
      <div>${S?(S.ended?'Encerrado — processando…':`Lance atual: <b>${S.cur?stFmt(S.cur):'sem lances'}</b>`):'Sincronizando…'}</div><small>${S&&!S.ended?`Termina em <span data-exp="${S.exp}">${stLeft(S.exp-Date.now())}</span>`:''}</small></div></div>`}).join('')}</div>`;
  }
  if(f.tab==='bids'){
    const ids=Object.keys(c.esc);
    if(!ids.length)return '<div class="st-card"><p>Você não tem lances ativos.</p></div>';
    return `<div class="st-mkgrid">${ids.map(id=>{const m=(c.mkb||{})[id],L=ST.market.find(x=>x.id===id),S=L?stListingState(L):null;if(!m)return '';
      const lead=S&&S.top&&S.top.user===currentUser;
      return `<div class="st-mkitem">${stCardHTML(m.card,{size:'sm',tilt:false})}<div class="st-mki"><b>${esc(m.card.name)}</b><small>Seu lance: ${stFmt(c.esc[id])} 🪙</small><div class="${lead?'st-ok':'st-bad'}">${S?(lead?'✔ Você está ganhando':'Superado'):'…'}</div>${S&&!S.ended?`<small>Termina em <span data-exp="${S.exp}">${stLeft(S.exp-Date.now())}</span></small>`:''}</div></div>`}).join('')}</div>`;
  }
  const L=stMkListings();
  const flt=`<div class="st-card st-filters"><input class="fc" placeholder="Buscar jogador ou clube…" value="${stAttr(f.q)}" data-in="mkq" style="max-width:220px">
    <select class="fc" data-ch="mkpos"><option value="">Posição</option>${['GK','DEF','MEI','ATA','CB','LB','RB','CDM','CM','CAM','LW','RW','ST'].map(p=>`<option ${f.pos===p?'selected':''}>${p}</option>`).join('')}</select>
    <input class="fc" type="number" placeholder="OVR mín" value="${f.min}" data-ch="mkmin" style="width:90px"><input class="fc" type="number" placeholder="OVR máx" value="${f.max}" data-ch="mkmax" style="width:90px">
    <select class="fc" data-ch="mkorigin"><option value="all">Todos</option><option value="user" ${f.src==='user'?'selected':''}>Jogadores</option><option value="npc" ${f.src==='npc'?'selected':''}>Sistema</option></select>
    <select class="fc" data-ch="mksort"><option value="end">Termina primeiro</option><option value="ovr" ${f.sort==='ovr'?'selected':''}>Maior OVR</option><option value="low" ${f.sort==='low'?'selected':''}>Menor preço</option><option value="high" ${f.sort==='high'?'selected':''}>Maior preço</option></select></div>
    ${ST.marketOk===false&&stCloudOk()?'<div class="st-notice">Sem conexão com o mercado dos jogadores: mostrando só o mercado do sistema.</div>':''}
    ${!stCloudOk()?'<div class="st-notice">A nuvem está desligada: só o mercado do sistema funciona. Conecte a nuvem (☁️) para negociar com os amigos.</div>':''}`;
  return flt+`<div class="st-mkgrid">${L.length?L.map(stMkItem).join(''):'<div class="st-card"><p>Nenhum anúncio com esses filtros.</p></div>'}</div>`;
}
function stMkItem(x){
  const S=x.S,card=x.card,mine=x.seller===currentUser;
  const next=x.npc?0:(S.cur?S.cur+stBidStep(S.cur):x.start);
  return `<div class="st-mkitem">${stCardHTML(card,{size:'sm',tilt:false,id:card.id,act:'mkinfo',extra:` data-lid="${stAttr(x.id)}"`})}<div class="st-mki">
    <b>${esc(card.name)}</b><small>${x.npc?'🏪 Sistema':'👤 '+esc(x.seller)}${mine?' (você)':''}</small>
    ${x.npc?'':`<div>Lance: <b>${S.cur?stFmt(S.cur):'—'}</b> <small>(mín. ${stFmt(next)})</small></div>`}
    <div>Compre já: <b>${stFmt(x.buyNow)} 🪙</b></div><small>⏱ <span data-exp="${S.exp}">${stLeft(S.exp-Date.now())}</span></small>
    <div class="row" style="gap:.4rem;margin-top:.3rem">${mine?'':`${x.npc?'':`<button class="btn sm sec" data-act="mkbid" data-lid="${stAttr(x.id)}">Dar lance</button>`}<button class="btn sm" data-act="mkbuy" data-lid="${stAttr(x.id)}">Comprar</button>`}</div></div></div>`;
}
STA.mkq=el=>{ST.mk.q=el.value;clearTimeout(ST.mkqT);ST.mkqT=setTimeout(()=>{const b=$('st-mkbody');if(b){b.innerHTML=stMkBody();const i=document.querySelector('[data-in="mkq"]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}}},250)};
['pos','min','max','origin','sort'].forEach(k=>STA['mk'+k]=el=>{ST.mk[k==='origin'?'src':k]=el.value;const b=$('st-mkbody');if(b)b.innerHTML=stMkBody()});
const stFindL=id=>id.startsWith('npc:')?stNpcListings().find(x=>x.id===id):ST.market.find(x=>x.id===id);
STA.mkinfo=el=>{const L=stFindL(el.dataset.lid);if(!L)return;const card=L.card;stModal(`<div class="st-detail"><div class="st-detail-c">${stCardHTML(card,{size:'lg'})}</div><div class="st-detail-i"><h3 class="t">${esc(card.name)}</h3><p>Valor de referência: <b>${stFmt(stValue(card))}</b> 🪙</p><p class="st-fine">Faixa permitida: ${stFmt(stRange(card).min)} a ${stFmt(stRange(card).max)}</p></div></div>`,'wide')};
STA.mkbid=el=>{
  const L=ST.market.find(x=>x.id===el.dataset.lid);if(!L)return;const S=stListingState(L),next=S.cur?S.cur+stBidStep(S.cur):L.start;
  stPrompt(`Seu lance por ${L.card.name} (mín. ${stFmt(next)})`,next,async v=>{
    const a=Math.round(+v);if(!a||a<next)return toast('Lance mínimo: '+stFmt(next));
    const r=await stBid(L,a);if(!r.ok)return toast(r.err);toast('Lance de '+stFmt(a)+' registrado.');await stMarketFetch(true);stTopRefresh();const b=$('st-mkbody');if(b)b.innerHTML=stMkBody();
  },{type:'number'});
};
STA.mkbuy=el=>{
  const L=stFindL(el.dataset.lid);if(!L)return;
  stConfirm(`Comprar <b>${esc(L.card.name)}</b> por ${stFmt(L.buyNow)} 🪙?`,async()=>{
    let r;
    if(L.npc)r=stBuyNpc(L);else r=await stBuyNow(L);
    if(!r.ok)return toast(r.err);
    toast(L.npc?'✅ Comprado! A carta já está no seu clube.':'Compra registrada! Aguarde alguns segundos para a carta chegar.');
    await stMarketFetch(true);if(!L.npc)setTimeout(()=>stMarketProcess().then(()=>{stTopRefresh();if(ST.view==='market')stGo('market',null,true)}),3500);
    stTopRefresh();const b=$('st-mkbody');if(b)b.innerHTML=stMkBody();
  },'Comprar');
};
STA.clist=el=>{
  const c=ST.club.cards[el.dataset.id];if(!c)return;
  if(!stCloudOk())return toast('Conecte a nuvem (☁️) para anunciar no mercado.');
  const rg=c.kind==='player'?stRange(c):{min:500,max:200000},v=c.kind==='player'?stValue(c):2000;
  stModalClose();
  stModal(`<h3 class="t">Anunciar ${esc(c.name)}</h3><div class="st-detail"><div class="st-detail-c">${stCardHTML(c,{size:'md',tilt:false})}</div><div class="st-detail-i">
    <p class="st-fine">Faixa permitida: ${stFmt(rg.min)} a ${stFmt(rg.max)}. Taxa de 5% sobre o valor vendido.</p>
    <label class="st-lbl">Preço inicial (lance mínimo)</label><input class="fc" id="ls-start" type="number" value="${Math.max(rg.min,stRound(v*.8))}">
    <label class="st-lbl">Compre já</label><input class="fc" id="ls-buy" type="number" value="${Math.min(rg.max,stRound(v*1.25))}">
    <label class="st-lbl">Duração</label><select class="fc" id="ls-h">${ST_MARKET_HOURS.map(h=>`<option value="${h}">${h} hora${h>1?'s':''}</option>`).join('')}</select>
    <button class="btn" data-act="clistgo" data-id="${c.id}" style="margin-top:.8rem">Anunciar</button></div></div>`,'wide');
};
STA.clistgo=async el=>{
  const s=Math.round(+$('ls-start').value),b=Math.round(+$('ls-buy').value),h=+$('ls-h').value;
  const r=await stListCard(el.dataset.id,s,b,h);if(!r.ok)return toast(r.err);
  stModalClose();toast('Anúncio publicado!');ST.mk.tab='mine';stGo('market',null,true);
};

/* ---------- DME ---------- */
STV.sbc=()=>{
  const c=ST.club;
  return `<h2 class="t">Desafios de Montagem de Elenco (DME)</h2><p class="st-sub">Entregue cartas que atendam aos requisitos e receba pacotes e moedas. As cartas entregues são consumidas.</p>
  <div class="st-sbcgrid">${ST_SBC.map(d=>{
    const done=c.sbc[d.id]||0,left=d.repeat-done;
    return `<div class="st-card st-sbc tilt"><h3 class="t">${esc(d.n)}</h3><p>${esc(d.desc)}</p><div class="st-reward">🎁 ${esc(stRewardText(d.reward))}</div><small class="st-fine">${left>0?`Restam ${left>90?'∞':left} vez(es)`:'Concluído'}</small>
    <button class="btn" data-act="sbcopen" data-id="${d.id}" ${left>0?'':'disabled'}>Abrir desafio</button></div>`}).join('')}</div>`;
};
STA.sbcopen=el=>{
  const d=ST_SBC.find(x=>x.id===el.dataset.id);ST.sbcw={id:d.id,sel:[],form:'4-3-3',q:'',sort:'low'};stGo('sbcw',d.id);
};
function stSbcCandidates(){
  const w=ST.sbcw,q=w.q.toLowerCase();let L=stPlayersOwned().filter(x=>!q||x.name.toLowerCase().includes(q));
  L.sort(w.sort==='low'?(a,b)=>a.ovr-b.ovr:(a,b)=>b.ovr-a.ovr);return L;
}
function stSbcState(){
  const w=ST.sbcw,d=ST_SBC.find(x=>x.id===w.id),cards=w.sel.map(id=>ST.club.cards[id]).filter(Boolean);
  let arranged=cards,form=w.form;
  if(d.mode==='squad'&&cards.length===11){const tmp={slots:w.sel.slice(0,11),bench:Array(7).fill(''),formation:form};stRearrange(tmp,form);arranged=tmp.slots.map(id=>ST.club.cards[id])}
  const chk=stSbcCheck(d,d.mode==='squad'&&cards.length===11?arranged:cards,form,ST.club.cards[ST.club.mgr]);
  return{d,cards,chk};
}
STV.sbcw=()=>{
  const w=ST.sbcw;if(!w)return STV.sbc();
  const {d,cards,chk}=stSbcState(),L=stSbcCandidates(),inSq=id=>stUsed(id);
  return `<div class="row" style="justify-content:space-between"><h2 class="t">${esc(d.n)}</h2><button class="btn sec sm" data-act="go" data-v="sbc">‹ Voltar</button></div><p class="st-sub">${esc(d.desc)} Prêmio: <b>${esc(stRewardText(d.reward))}</b></p>
  <div class="st-sbcw"><div class="st-card"><h4 class="st-h4">Requisitos</h4>${chk.res.map(r=>`<div class="st-req ${r.ok?'ok':'no'}"><span>${r.ok?'✔':'✖'}</span>${esc(r.txt)}<b>${esc(String(r.val))}</b></div>`).join('')}
    ${d.mode==='squad'?`<label class="st-lbl">Formação (as cartas são encaixadas sozinhas)</label><select class="fc" data-ch="sbcform">${Object.keys(FORMS).map(k=>`<option ${k===w.form?'selected':''}>${k}</option>`).join('')}</select>`:''}
    <button class="btn" data-act="sbcsend" ${chk.ok?'':'disabled'} style="margin-top:.8rem">Entregar e receber</button>
    <h4 class="st-h4" style="margin-top:1rem">Selecionadas (${cards.length}/${d.req.n})</h4><div class="st-selrow">${cards.map(x=>stCardHTML(x,{size:'xs',id:x.id,act:'sbctoggle',tilt:false})).join('')||'<small class="st-fine">Nenhuma ainda.</small>'}</div></div>
  <div class="st-card"><div class="st-filters"><input class="fc" placeholder="Buscar…" value="${stAttr(w.q)}" data-in="sbcq" style="max-width:200px"><select class="fc" data-ch="sbcsort"><option value="low">Menor OVR primeiro</option><option value="high" ${w.sort==='high'?'selected':''}>Maior OVR primeiro</option></select></div>
    <div class="st-colgrid" id="st-sbcgrid">${L.slice(0,80).map(x=>stCardHTML(x,{size:'sm',id:x.id,act:'sbctoggle',tilt:false,sel:w.sel.includes(x.id),badge:inSq(x.id)?'XI':''})).join('')}</div></div></div>`;
};
STA.sbcw=STA.sbcopen;
STA.sbctoggle=el=>{
  const w=ST.sbcw,id=el.dataset.id,i=w.sel.indexOf(id),d=ST_SBC.find(x=>x.id===w.id);
  if(i>=0)w.sel.splice(i,1);else{if(w.sel.length>=d.req.n)return toast('Já selecionou '+d.req.n+' cartas.');w.sel.push(id)}
  const y=window.scrollY;stRender();window.scrollTo(0,y);
};
STA.sbcform=el=>{ST.sbcw.form=el.value;stRender()};
STA.sbcq=el=>{ST.sbcw.q=el.value;const g=$('st-sbcgrid');if(g){const L=stSbcCandidates();g.innerHTML=L.slice(0,80).map(x=>stCardHTML(x,{size:'sm',id:x.id,act:'sbctoggle',tilt:false,sel:ST.sbcw.sel.includes(x.id),badge:stUsed(x.id)?'XI':''})).join('')}};
STA.sbcsort=el=>{ST.sbcw.sort=el.value;stRender()};
STA.sbcsend=()=>{
  const {d,cards,chk}=stSbcState();if(!chk.ok)return;
  const c=ST.club,used=cards.filter(x=>stUsed(x.id)).length;
  stConfirm(`Entregar ${cards.length} carta(s) e receber <b>${esc(stRewardText(d.reward))}</b>?${used?`<br><small>${used} carta(s) estão no seu elenco e serão removidas dele.</small>`:''}`,()=>{
    if((c.sbc[d.id]||0)>=d.repeat)return toast('Desafio já concluído.');
    cards.forEach(x=>stRemoveCard(x.id));
    stGrant(d.reward);c.sbc[d.id]=(c.sbc[d.id]||0)+1;stEvent('sbc');stLog('Concluiu o DME '+d.n);stSave({pub:true});
    ST.sbcw=null;toast('✅ DME concluído! Recompensa entregue.');stTopRefresh();stGo(c.packs.length?'store':'sbc',null);
  },'Entregar');
};

/* ---------- Objetivos ---------- */
STV.obj=()=>{
  const c=ST.club;stObjState();
  const sec=(title,defs,k)=>`<div class="st-card"><h3 class="t">${title}</h3>${defs.map(d=>{const r=c.obj[k][d.id]||{p:0,c:0},ok=r.p>=d.goal;
    return `<div class="st-obj${r.c?' done':''}"><div><b>${esc(d.n)}</b><small>🎁 ${esc(stRewardText(d.reward))}</small><div class="st-prog"><i style="width:${Math.min(100,r.p/d.goal*100)}%"></i></div></div><span>${r.p}/${d.goal}</span>
    ${r.c?'<em>✔</em>':`<button class="btn sm" data-act="claimobj" data-k="${k}" data-id="${d.id}" ${ok?'':'disabled'}>Resgatar</button>`}</div>`}).join('')}</div>`;
  return `<h2 class="t">Objetivos</h2><div class="st-two">${sec('Diários',ST_OBJ_DAILY,'d')}${sec('Semanais',ST_OBJ_WEEKLY,'w')}</div>${sec('Fundação (uma vez só)',ST_OBJ_FOUND,'f')}`;
};
STA.claimobj=el=>{if(stClaimObj(el.dataset.k,el.dataset.id)){toast('🎁 Recompensa resgatada!');stTopRefresh();stGo('obj',null,true)}};

/* ---------- Comunidade e ranking ---------- */
STV.comm=()=>`<h2 class="t">Comunidade</h2><p class="st-sub">Os clubes dos outros técnicos do beta. Desafie um amigo: o time dele joga controlado pela CPU, com o elenco publicado por ele. Ele recebe o resultado nas mensagens.</p><div id="st-commbody" class="st-load"><div class="st-spin"></div></div>`;
STP.comm=async()=>{
  await stFetchPubs(true);
  const b=$('st-commbody');if(!b||ST.view!=='comm')return;
  const L=Object.values(ST.pubs).filter(p=>p.user!==currentUser).sort((a,b)=>(b.rating||0)-(a.rating||0));
  b.className='';
  b.innerHTML=L.length?`<div class="st-card"><table class="st-table"><tr><th>#</th><th>Clube</th><th>Técnico</th><th>Div.</th><th>Rating</th><th>OVR</th><th>ENT</th><th>V</th><th></th></tr>${L.map((p,i)=>`<tr><td>${i+1}</td><td><span class="st-tcrest">${stCrest(p.crest,26)}</span> ${esc(p.name)}</td><td>${esc(p.user)}</td><td>${ST_DIV_NAME(p.div==null?10:p.div)}</td><td>${p.rating||'–'}</td><td>${p.ovr}</td><td>${p.chem}</td><td>${p.w||0}</td><td><button class="btn sm" data-act="challenge" data-u="${stAttr(p.user)}">⚔️ Desafiar</button> <button class="btn sm sec" data-act="oninvite" data-u="${stAttr(p.user)}">🌐 Online</button></td></tr>`).join('')}</table></div>`:'<div class="st-card"><p>Nenhum outro clube publicou um elenco ainda. Convide os amigos (o MingauCoach precisa aprovar o acesso deles).</p></div>';
};
