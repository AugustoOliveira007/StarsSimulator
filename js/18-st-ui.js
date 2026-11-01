/* ===================== STARSTEAM — INTERFACE BASE ===================== */
/* Cartas, roteador de telas, abertura 3D, acesso beta, criação do clube e hub.
   As telas são funções em STV (retornam HTML). Os botões usam data-act="nome" e são tratados em STA. */
const stClubById={};ST_DB.clubs.forEach(c=>{stClubById[c.id]=c});
const STA={},STV={},STP={};
const stRoot=()=>$('st-root');
const stAttr=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');

/* ---------- Delegação de eventos (tudo que está dentro de .st-scope) ---------- */
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el||!el.closest('.st-scope'))return;
  const fn=STA[el.dataset.act];if(!fn)return;
  e.preventDefault();
  try{const r=fn(el,e);if(r&&r.catch)r.catch(err=>{console.error('[StarsTeam]',el.dataset.act,err);toast('Erro: '+(err&&err.message||err))})}
  catch(err){console.error('[StarsTeam]',el.dataset.act,err);toast('Erro: '+(err&&err.message||err))}
});
document.addEventListener('input',e=>{const el=e.target.closest('[data-in]');if(el&&el.closest('.st-scope')&&STA[el.dataset.in]){try{STA[el.dataset.in](el,e)}catch(err){console.error(err)}}});
document.addEventListener('change',e=>{const el=e.target.closest('[data-ch]');if(el&&el.closest('.st-scope')&&STA[el.dataset.ch]){try{STA[el.dataset.ch](el,e)}catch(err){console.error(err)}}});

/* ---------- Inclinação 3D ao passar o mouse (cartas, blocos, pacotes) ---------- */
(function(){
  let cur=null;
  const reset=el=>{if(!el)return;el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg');el.classList.remove('hot')};
  document.addEventListener('pointermove',e=>{
    const t=e.target.closest&&e.target.closest('.tilt');
    if(cur&&cur!==t)reset(cur);
    if(!t){cur=null;return}
    cur=t;const r=t.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    t.style.setProperty('--ry',((x-.5)*26).toFixed(1)+'deg');t.style.setProperty('--rx',((.5-y)*22).toFixed(1)+'deg');
    t.style.setProperty('--mx',(x*100).toFixed(0)+'%');t.style.setProperty('--my',(y*100).toFixed(0)+'%');t.classList.add('hot');
  },{passive:true});
  document.addEventListener('pointerleave',()=>{reset(cur);cur=null},true);
})();

/* ---------- Cartas ---------- */
function stFrameFor(c){
  const dd=c&&c.src==='c'&&ST.cat&&ST.cat.custom[c.pid];if(dd&&dd.frame)return dd.frame;
  const F=ST_ART.cardFrames,k=c.rar==='totw'?'totw':c.rar==='heroi'?'heroi':c.rar==='idolo'?'idolo':c.rar==='raro'?'raro':stTier(c.ovr);
  return F[k]||'';
}
function stCardCrest(c){
  if(c.rar==='idolo')return '<span class="stc-star">★</span>';
  if(c.src==='c'){const d=ST.cat&&ST.cat.custom[c.pid];if(d&&d.crestImg)return `<img src="${stAttr(d.crestImg)}" alt="">`}
  if(c.clubId&&String(c.clubId).startsWith('rt:')){const t=teamOf(String(c.clubId).slice(3));if(t&&t.logo&&t.logo!==PH)return `<img src="${esc(t.logo)}" alt="" onerror="this.style.display='none'">`}
  const cl=stClubById[c.clubId];return cl?stCrest(cl.crest,40):'';
}
const ST_RAR_TAG={totw:'TOTW',heroi:'HERÓI',idolo:'ÍDOLO',especial:'ESPECIAL'};
function stCardHTML(c,o){
  o=o||{};
  const size=o.size?' '+o.size:'',attrs=(o.id?` data-act="${o.act||'card'}" data-id="${stAttr(o.id===true?c&&c.id:o.id)}"`:'')+(o.extra||'');
  if(!c)return `<div class="stc empty${size}${o.cls?' '+o.cls:''}"${attrs}><span>${o.empty||'+'}</span></div>`;
  if(c.kind==='manager')return stStaffHTML(c,o);
  if(c.kind==='stadium')return stStadiumHTML(c,o);
  const key=stCardThemeKey(c),gk=c.pos==='GK',lb=gk?ST_STAT_LBL_GK:ST_STAT_LBL,s=c.stats||[0,0,0,0,0,0],fr=stFrameFor(c);
  const ovr=o.eff!=null?o.eff:c.ovr,diff=o.eff!=null&&o.eff!==c.ovr?(o.eff>c.ovr?' up':' down'):'';
  const chem=o.chem!=null?`<div class="stc-chem chm${o.chem}">${[0,1,2].map(i=>`<i class="${i<o.chem?'on':''}"></i>`).join('')}</div>`:'';
  const tag=ST_RAR_TAG[c.rar]?`<div class="stc-tag">${ST_RAR_TAG[c.rar]}</div>`:c.rar==='raro'?'<div class="stc-tag">RARO</div>':'';
  return `<div class="stc th-${key}${size}${o.tilt===false?'':' tilt'}${o.sel?' sel':''}${o.cls?' '+o.cls:''}"${attrs}${fr?` style="--frame:url('${stAttr(fr)}')"`:''}>
  <div class="stc-in">
    <div class="stc-top"><div class="stc-ovr${diff}">${ovr}</div><div class="stc-pos">${esc(c.pos)}</div><div class="stc-fl">${c.nat?stFlag(c.nat,26):''}</div><div class="stc-cr">${stCardCrest(c)}</div></div>
    <img class="stc-ph" src="${stAttr(stCardPhoto(c))}" alt="">
    ${tag}
    <div class="stc-nm">${esc(c.name)}</div>
    <div class="stc-st">${s.map((v,i)=>`<div><b>${v}</b><span>${lb[i]}</span></div>`).join('')}</div>
    ${c.alt&&c.alt.length?`<div class="stc-alt">${c.alt.map(esc).join(' · ')}</div>`:''}
  </div>${chem}${o.badge?`<div class="stc-badge">${o.badge}</div>`:''}<div class="stc-shine"></div></div>`;
}
function stStaffHTML(c,o){
  const size=o.size?' '+o.size:'',attrs=(o.id?` data-act="${o.act||'card'}" data-id="${stAttr(c.id)}"`:'')+(o.extra||'');
  const d=stCatDef(c),sp=c.rar==='especial'||(d&&d.special),th=sp?'th-tecesp-'+((d&&d.theme)||'ouro'):'th-tec',fr=d&&d.frame;
  const img=d&&d.img?d.img:stAvatarURL(c.face,c.hue),lg=c.league&&c.league.startsWith('x:')?c.leagueN:(c.leagueN||ST_LEAGUE_NAME(c.league));
  return `<div class="stc ${th} staff${size}${o.tilt===false?'':' tilt'}${o.sel?' sel':''}${o.cls?' '+o.cls:''}"${attrs}${fr?` style="--frame:url('${stAttr(fr)}')"`:''}><div class="stc-in">
    <div class="stc-top"><div class="stc-ovr tec">TEC</div><div class="stc-fl">${c.nat?stFlag(c.nat,26):''}</div></div>
    <img class="stc-ph" src="${stAttr(img)}" alt=""><div class="stc-nm">${esc(c.name)}</div>
    <div class="stc-sub">${esc(lg||'')}</div><div class="stc-alt">${sp?'★ TÉCNICO ESPECIAL':'+1 liga · +1 nação'}</div></div>${o.badge?`<div class="stc-badge">${o.badge}</div>`:''}<div class="stc-shine"></div></div>`;
}
function stStadiumHTML(c,o){
  const size=o.size?' '+o.size:'',attrs=(o.id?` data-act="${o.act||'card'}" data-id="${stAttr(c.id)}"`:'')+(o.extra||'');
  return `<div class="stc th-ouro staff stad${size}${o.tilt===false?'':' tilt'}${o.sel?' sel':''}${o.cls?' '+o.cls:''}"${attrs}>
    <img class="stc-full" src="${stAttr(stStadiumImg(c))}" alt=""><div class="stc-stbar"><b>${esc(c.name)}</b><small>🏟️ ${stFmt(c.cap)} lugares${String(c.pid||'').startsWith('rt:')?' • estádio real':''}</small></div>${o.badge?`<div class="stc-badge">${o.badge}</div>`:''}<div class="stc-shine"></div></div>`;
}
const stRarLabel=c=>c.kind==='manager'?(c.special||(ST.cat&&ST.cat.mgrs[c.pid]&&ST.cat.mgrs[c.pid].special)?'Treinador especial':'Treinador'):c.kind==='stadium'?'Estádio':({especial:'Especial',totw:'Time da Semana',heroi:'Herói',idolo:'Ídolo',raro:'Raro',comum:'Comum'})[c.rar]||'';
const stTierName=c=>({bronze:'Bronze',prata:'Prata',ouro:'Ouro'})[stCardTier(c)]||'';

/* ---------- Modal (em cima de tudo) ---------- */
function stModal(html,cls){
  stModalClose();
  const ov=document.createElement('div');ov.className='st-ov st-scope st-modal '+(cls||'');ov.id='st-modal';
  ov.innerHTML=`<div class="st-modal-bg" data-act="mclose"></div><div class="st-modal-box">${html}</div>`;
  document.body.appendChild(ov);requestAnimationFrame(()=>ov.classList.add('in'));return ov;
}
function stModalClose(){const m=$('st-modal');if(m)m.remove()}
STA.mclose=()=>stModalClose();
function stPrompt(title,val,cb,opts){
  opts=opts||{};
  const m=stModal(`<h3 class="t">${esc(title)}</h3><input id="st-prompt" class="fc" value="${stAttr(val||'')}" ${opts.max?`maxlength="${opts.max}"`:''} ${opts.type?`type="${opts.type}"`:''}><div class="row" style="margin-top:.8rem"><button class="btn" data-act="pok">OK</button><button class="btn sec" data-act="mclose">Cancelar</button></div>`);
  STA.pok=()=>{const v=$('st-prompt').value;stModalClose();cb(v)};
  const i=m.querySelector('input');i.focus();i.select();i.addEventListener('keydown',e=>{if(e.key==='Enter')STA.pok()});
}
function stConfirm(msg,cb,yes){
  stModal(`<p style="margin:.3rem 0 1rem">${msg}</p><div class="row"><button class="btn" data-act="cok">${yes||'Confirmar'}</button><button class="btn sec" data-act="mclose">Cancelar</button></div>`);
  STA.cok=()=>{stModalClose();cb()};
}

/* ---------- Roteador de telas (com virada 3D) ---------- */
ST.arg=null;
function stDetachGrid(){const g=document.querySelector('#st-root .match-grid');if(g&&$('tab-match'))$('tab-match').appendChild(g)}
function stRestoreGrid(){const g=document.querySelector('#st-root .match-grid');if(g&&$('tab-match'))$('tab-match').appendChild(g)}
function stGo(view,arg,instant){
  ST.view=view;ST.arg=arg;
  const root=stRoot();if(!root)return;
  if(instant||!root.firstChild||ST.reduceMotion){stRender();return}
  root.classList.remove('st-in');root.classList.add('st-out');
  setTimeout(()=>{root.classList.remove('st-out');stRender();root.classList.add('st-in');setTimeout(()=>root.classList.remove('st-in'),560)},190);
}
function stRender(){
  const root=stRoot();if(!root)return;
  stDetachGrid();
  const fn=STV[ST.view]||STV.hub;let html='';
  try{html=fn()}catch(err){console.error('[StarsTeam] tela '+ST.view,err);html=`<div class="st-card"><h3 class="t">Algo deu errado</h3><p>${esc(err.message||err)}</p><button class="btn" data-act="go" data-v="hub">Voltar ao hub</button></div>`}
  const bare=['gate','create','load'].includes(ST.view);
  const live=(!bare&&ST.view!=='match'&&typeof stMatchActive==='function'&&stMatchActive())?'<div class="st-strip" data-act="go" data-v="match">⚽ Partida em andamento<span>Voltar à partida ›</span></div>':'';
  root.innerHTML=(bare?'':stTopBar())+live+`<div class="st-view v-${ST.view}">${html}</div>`;
  if(STP[ST.view])try{STP[ST.view]()}catch(err){console.error('[StarsTeam] pós-render '+ST.view,err)}
  window.scrollTo({top:Math.min(window.scrollY,140),behavior:'instant'});
}
STA.go=el=>stGo(el.dataset.v,el.dataset.a||null);
const stView=v=>ST.view===v&&$('tab-st')&&$('tab-st').classList.contains('active');

/* ---------- Barra superior ---------- */
function stUnread(){const c=ST.club;return c?c.msgs.filter(m=>m.t>(c.msgSeen||0)).length:0}
function stClaimable(){
  const c=ST.club;if(!c)return 0;stObjState();let n=0;
  [[ST_OBJ_DAILY,'d'],[ST_OBJ_WEEKLY,'w'],[ST_OBJ_FOUND,'f']].forEach(([defs,k])=>defs.forEach(d=>{const r=c.obj[k][d.id];if(r&&!r.c&&r.p>=d.goal)n++}));
  return n;
}
function stActiveInfo(){
  const c=ST.club,sq=c.squads[c.sq],cards=sq.slots.map(id=>c.cards[id]);
  return{sq,cards,ovr:stTeamOvr(cards),chem:stChem(cards,sq.formation,c.cards[c.mgr]).total,full:cards.every(Boolean)};
}
function stTopBar(){
  const c=ST.club;if(!c)return '';
  const a=stActiveInfo(),un=stUnread();
  return `<div class="st-bar">
    <button class="st-crestbtn tilt" data-act="go" data-v="hub" title="Hub">${stCrest(c.crest,46)}</button>
    <div class="st-bar-n"><b>${esc(c.name)}</b><small>${esc(c.code)} • ${ST_DIV_NAME(c.rv.div)} <span class="st-beta">BETA</span></small></div>
    <div class="st-bar-s"><span title="Overall do time titular">OVR <b>${a.full?a.ovr:'–'}</b></span><span title="Entrosamento total (máx. 33)">ENT <b>${a.chem}</b>/33</span></div>
    <div class="st-coins" id="st-coins" title="StarsCoins">🪙 <b>${stFmt(c.coins)}</b></div>
    <button class="st-ico" data-act="go" data-v="inbox" title="Mensagens">🔔${un?`<em>${un}</em>`:''}</button>
    <button class="st-ico" data-act="go" data-v="hub" title="Hub">🏠</button>
    <span class="st-dot ${ST.cloudOk?'ok':'off'}" title="${ST.cloudOk?'Nuvem conectada':'Sem conexão com a nuvem: seu progresso fica salvo só neste aparelho'}"></span>
  </div>`;
}
function stTopRefresh(){
  const c=ST.club;if(!c)return;
  const co=$('st-coins');if(co)co.innerHTML=`🪙 <b>${stFmt(c.coins)}</b>`;
  const bar=document.querySelector('#st-root .st-bar');
  if(bar){const t=document.createElement('div');t.innerHTML=stTopBar();const nb=t.firstElementChild;if(nb)bar.replaceWith(nb)}
}

/* ---------- Abertura 3D do modo ---------- */
function stIntro(done){
  if(ST.reduceMotion){done&&done();return}
  const ov=document.createElement('div');ov.className='st-ov st-scope st-intro';
  const cards=Array.from({length:26},(_,i)=>{
    const a=i/26*Math.PI*2,r=180+(i%5)*90,x=Math.cos(a)*r,y=Math.sin(a)*r*.62,th=['bronze','prata','ouro','raro-ouro','totw','heroi','idolo'][i%7];
    return `<i class="sti-c th-${th}" style="--x:${x.toFixed(0)}px;--y:${y.toFixed(0)}px;--d:${(i*.07).toFixed(2)}s;--r:${(i*37)%360}deg"></i>`;
  }).join('');
  ov.innerHTML=`<div class="sti-scene"><div class="sti-tunnel">${cards}</div><div class="sti-ring"></div><div class="sti-ring r2"></div>
    <div class="sti-core">${ST_ART.entryLogo?`<img src="${stAttr(ST_ART.entryLogo)}" alt="">`:'<div class="sti-star">★</div>'}
    <div class="sti-t">${'STARSTEAM'.split('').map((ch,i)=>`<span style="--i:${i}">${ch}</span>`).join('')}</div><div class="sti-s">MONTE • EVOLUA • DOMINE</div></div></div><div class="sti-flash"></div><div class="sti-skip">Toque para pular</div>`;
  document.body.appendChild(ov);
  let ended=false;const end=()=>{if(ended)return;ended=true;ov.classList.add('out');setTimeout(()=>{ov.remove();done&&done()},520)};
  ov.addEventListener('click',end);setTimeout(end,3300);
}

/* ---------- Acesso beta ---------- */
STV.load=()=>`<div class="st-load"><div class="st-spin"></div><p>${esc(ST.loadMsg||'Conectando ao StarsTeam…')}</p></div>`;
STV.gate=()=>{
  const s=stStatus(),notice=ST.cfg.notice?`<div class="st-notice">📢 ${esc(ST.cfg.notice)}</div>`:'';
  let body='';
  if(!currentUser)body=`<p>Entre com o seu nome de técnico para acessar o StarsTeam.</p>`;
  else if(s==='offline')body=`<div class="st-big">📡</div><h3 class="t">Sem conexão com a nuvem</h3><p>O acesso ao beta é validado online. ${esc(ST.accErr||'')}</p><button class="btn" data-act="retry">Tentar de novo</button>`;
  else if(s==='pending')body=`<div class="st-big pulse">⏳</div><h3 class="t">Pedido enviado!</h3><p>Aguarde o <b>MingauCoach</b> aprovar o seu acesso ao beta. Você pode fechar a página: o pedido fica guardado.</p><button class="btn" data-act="retry">Verificar aprovação</button>`;
  else if(s==='rejected'||s==='revoked')body=`<div class="st-big">🚫</div><h3 class="t">Acesso ${s==='revoked'?'revogado':'recusado'}</h3><p>O MingauCoach não liberou o seu acesso ao beta por enquanto.</p><button class="btn sec" data-act="retry">Verificar de novo</button>`;
  else if(s==='approved'&&ST.acc&&!ST.acc.pin)body=`<div class="st-big">🔑</div><h3 class="t">Crie o seu PIN</h3><p>O PIN impede que outra pessoa use o seu nome no StarsTeam. Guarde-o: ele será pedido em outros aparelhos.</p>
    <div class="fg"><label>PIN (4 a 12 caracteres)</label><input id="st-pin" class="fc" type="password" maxlength="12" placeholder="••••"></div><button class="btn" data-act="setpin">Salvar PIN e entrar</button>`;
  else if(s==='approved')body=`<div class="st-big">🔐</div><h3 class="t">Digite o seu PIN</h3><p>Este aparelho ainda não conhece o PIN do técnico <b>${esc(currentUser)}</b>.</p>
    <div class="fg"><label>PIN</label><input id="st-pin" class="fc" type="password" maxlength="12" placeholder="••••" onkeydown="if(event.key==='Enter')STA.checkpin()"></div><button class="btn" data-act="checkpin">Entrar</button>`;
  else body=`<div class="st-big">⭐</div><h3 class="t">StarsTeam <span class="st-beta">BETA</span></h3>
    <p>Monte o seu clube do zero, abra pacotes, negocie no mercado e enfrente os amigos. O modo está em teste e só entra quem o <b>MingauCoach</b> aprovar.</p>
    <div class="fg"><label>Crie um PIN para proteger o seu nome (4 a 12 caracteres)</label><input id="st-pin" class="fc" type="password" maxlength="12" placeholder="••••"></div>
    <button class="btn" data-act="request">Solicitar acesso ao beta</button>`;
  return `<div class="st-gate"><div class="st-gate-card">${notice}${body}<p class="st-fine">Técnico: <b>${esc(currentUser||'—')}</b></p></div></div>`;
};
STA.retry=async()=>{ST.loadMsg='Verificando acesso…';stGo('load',null,true);await stEnter(true)};
STA.request=async()=>{
  const pin=($('st-pin')||{}).value||'';
  if(pin.length<4)return toast('O PIN precisa ter de 4 a 12 caracteres.');
  const r=await stRequestAccess(pin);
  if(!r.ok)return toast('Não foi possível enviar o pedido: '+r.err);
  toast('Pedido enviado ao MingauCoach.');stGo('gate',null,true);
};
STA.setpin=async()=>{
  const pin=($('st-pin')||{}).value||'';
  if(pin.length<4)return toast('O PIN precisa ter de 4 a 12 caracteres.');
  const h=stPinHash(currentUser,pin),r=await stPatch('/access/'+stKey(currentUser),{pin:h});
  if(!r.ok)return toast('Erro: '+r.err);
  ST.acc.pin=h;try{localStorage.setItem('stars_st_pin_'+stKey(currentUser),h);localStorage.setItem(stAccCacheKey(currentUser),JSON.stringify(ST.acc))}catch(e){}
  await stEnter(true);
};
STA.checkpin=async()=>{
  const pin=($('st-pin')||{}).value||'';
  if(!stCheckPin(pin))return toast('PIN incorreto.');
  await stEnter(true);
};

/* ---------- Criação / edição da identidade do clube ---------- */
function stCrDefault(){return{name:'',code:'',crest:{shape:0,c1:'#2f6bff',c2:'#ffffff',sym:0},kits:{home:{pat:'listras',c1:'#1e5bd8',c2:'#ffffff'},away:{pat:'liso',c1:'#ffffff',c2:'#1e5bd8'}},ball:'b1'}}
function stCrFromClub(c){return{name:c.name,code:c.code,crest:{...c.crest},kits:{home:{...c.kits.home},away:{...c.kits.away}},ball:c.ball||'b1'}}
function stCrPreview(){
  const d=ST.cr;if(!d)return '';
  return `<div class="st-cr-prev"><div class="st-cr-big tilt">${stCrest(d.crest,150)}</div><div class="st-cr-name">${esc(d.name||'Nome do clube')}</div><div class="st-cr-code">${esc(d.code||'SIG')}</div>
    <div class="st-cr-kits"><div class="tilt">${stKit(d.kits.home,96)}<small>Mandante</small></div><div class="tilt">${stKit(d.kits.away,96)}<small>Visitante</small></div><div class="tilt">${stBall(d.ball,70)}<small>Bola</small></div></div></div>`;
}
const stSwatches=(key,cur)=>ST_CREST_COLORS.map(c=>`<button type="button" class="st-sw${c.toLowerCase()===String(cur).toLowerCase()?' on':''}" style="background:${c}" data-act="crcolor" data-k="${key}" data-v="${c}"></button>`).join('');
STV.create=()=>{
  if(!ST.cr)ST.cr=stCrDefault();
  const d=ST.cr,edit=!!ST.crEdit;
  return `<div class="st-create"><div class="st-create-h"><h2 class="t">${edit?'Identidade do clube':'Crie o seu clube'}</h2><p class="st-sub">${edit?'Mude o nome, o escudo, os uniformes e a bola.':'Você é o técnico e o diretor esportivo: o clube nasce do zero, com seu nome, escudo e uniformes.'}</p></div>
  <div class="st-create-g"><div class="st-card st-cr-form">
    <div class="row" style="gap:.8rem"><div class="fg" style="flex:2"><label>Nome do clube</label><input class="fc" maxlength="26" value="${stAttr(d.name)}" data-in="crname" placeholder="Ex: Estrela do Norte FC"></div>
    <div class="fg" style="flex:1"><label>Sigla (3 letras)</label><input class="fc" maxlength="3" value="${stAttr(d.code)}" data-in="crcode" placeholder="EDN" style="text-transform:uppercase"></div></div>
    <h4 class="st-h4">Escudo</h4>
    <div class="st-opts">${[0,1,2,3,4,5].map(i=>`<button type="button" class="st-opt${(d.crest.shape||0)===i&&!d.crest.img?' on':''}" data-act="crshape" data-v="${i}">${stCrest({...d.crest,shape:i,img:''},44)}</button>`).join('')}</div>
    <div class="st-opts">${ST_SYMBOLS.map((_,i)=>`<button type="button" class="st-opt${(d.crest.sym||0)===i&&!d.crest.img?' on':''}" data-act="crsym" data-v="${i}">${stCrest({...d.crest,sym:i,img:''},38)}</button>`).join('')}</div>
    <div class="row" style="gap:1rem;align-items:flex-start"><div><label class="st-lbl">Cor principal</label><div class="st-sws">${stSwatches('c1',d.crest.c1)}<input type="color" value="${/^#[0-9a-f]{6}$/i.test(d.crest.c1)?d.crest.c1:'#2f6bff'}" data-in="crcol" data-k="c1"></div></div>
    <div><label class="st-lbl">Cor secundária</label><div class="st-sws">${stSwatches('c2',d.crest.c2)}<input type="color" value="${/^#[0-9a-f]{6}$/i.test(d.crest.c2)?d.crest.c2:'#ffffff'}" data-in="crcol" data-k="c2"></div></div></div>
    <label class="upl st-upl">📁 Usar uma imagem como escudo<input type="file" accept="image/*" hidden data-ch="crimg"></label>${d.crest.img?`<button class="btn sec sm" data-act="crnoimg">Voltar ao escudo desenhado</button>`:''}
    <h4 class="st-h4">Uniformes</h4>
    ${['home','away'].map(k=>`<div class="st-kitrow"><b>${k==='home'?'Mandante':'Visitante'}</b>
      <select class="fc" data-ch="crpat" data-k="${k}">${ST_KIT_PATTERNS.map(([v,n])=>`<option value="${v}" ${d.kits[k].pat===v?'selected':''}>${n}</option>`).join('')}</select>
      <input type="color" value="${d.kits[k].c1}" data-in="crkit" data-k="${k}" data-f="c1" title="Cor base"><input type="color" value="${d.kits[k].c2}" data-in="crkit" data-k="${k}" data-f="c2" title="Cor do detalhe"></div>`).join('')}
    <h4 class="st-h4">Bola oficial</h4>
    <div class="st-opts">${ST_BALLS.map(b=>`<button type="button" class="st-opt${d.ball===b.id?' on':''}" data-act="crball" data-v="${b.id}" title="${b.n}">${stBall(b.id,40)}</button>`).join('')}</div>
    <div class="row" style="margin-top:1rem"><button class="btn" data-act="crsave">${edit?'Salvar identidade':'Criar clube e receber os pacotes iniciais'}</button>${edit?'<button class="btn sec" data-act="crcancel">Cancelar</button>':''}</div>
  </div><div class="st-card st-cr-side" id="st-cr-prev">${stCrPreview()}</div></div></div>`;
};
const stCrRefresh=()=>{const p=$('st-cr-prev');if(p)p.innerHTML=stCrPreview()};
STA.crname=el=>{ST.cr.name=el.value;stCrRefresh()};
STA.crcode=el=>{el.value=el.value.replace(/[^a-zA-Z]/g,'').toUpperCase();ST.cr.code=el.value;stCrRefresh()};
STA.crshape=el=>{ST.cr.crest.shape=+el.dataset.v;ST.cr.crest.img='';stGoSoft()};
STA.crsym=el=>{ST.cr.crest.sym=+el.dataset.v;ST.cr.crest.img='';stGoSoft()};
STA.crcolor=el=>{ST.cr.crest[el.dataset.k]=el.dataset.v;stGoSoft()};
STA.crcol=el=>{ST.cr.crest[el.dataset.k]=el.value;stCrRefresh()};
STA.crkit=el=>{ST.cr.kits[el.dataset.k][el.dataset.f]=el.value;stCrRefresh()};
STA.crpat=el=>{ST.cr.kits[el.dataset.k].pat=el.value;stCrRefresh()};
STA.crball=el=>{ST.cr.ball=el.dataset.v;stGoSoft()};
STA.crnoimg=()=>{ST.cr.crest.img='';stGoSoft()};
STA.crimg=el=>{
  const f=el.files[0];if(!f)return;const r=new FileReader();
  r.onload=e=>shrinkImg(e.target.result,160,d=>{ST.cr.crest.img=d;stGoSoft()});r.readAsDataURL(f);el.value='';
};
function stGoSoft(){ /* redesenha a tela mantendo o que foi digitado */
  const keep=document.activeElement&&document.activeElement.dataset?document.activeElement.dataset.in:null;
  stRender();if(keep){const e=document.querySelector(`[data-in="${keep}"]`);if(e){e.focus();try{e.setSelectionRange(e.value.length,e.value.length)}catch(x){}}}
}
STA.crcancel=()=>{ST.crEdit=false;ST.cr=null;stGo('club',null)};
STA.crsave=async()=>{
  const d=ST.cr,name=d.name.trim().replace(/\s+/g,' '),code=d.code.trim().toUpperCase();
  if(name.length<3)return toast('Dê um nome ao clube (mínimo de 3 letras).');
  if(typeof isProfane==='function'&&isProfane(name))return toast('🚨 Nome ofensivo não permitido!');
  if(!/^[A-Z]{3}$/.test(code))return toast('A sigla precisa ter exatamente 3 letras.');
  if(ST.crEdit&&ST.club){
    const c=ST.club;c.name=name;c.code=code;c.crest={...d.crest};c.kits={home:{...d.kits.home},away:{...d.kits.away}};c.ball=d.ball;
    stSave({pub:true});ST.crEdit=false;ST.cr=null;toast('Identidade atualizada.');stGo('club',null);return;
  }
  const c=stNewClub({name,code,crest:{...d.crest},kits:{home:{...d.kits.home},away:{...d.kits.away}},ball:d.ball});
  ST.club=c;ST.cr=null;
  stAddPack('inicial','boas-vindas');stAddPack('bronze','boas-vindas');stAddPack('bronze','boas-vindas');stAddPack('prata','boas-vindas');
  stSave();
  stNote('🎉 Bem-vindo ao StarsTeam! Abra o Pacote Inicial na Loja para montar o seu primeiro elenco.');
  stGo('hub',null);ST.startPoll&&ST.startPoll();setTimeout(stAnnPopup,1500);
};

/* ---------- Entrada no modo ---------- */
async function stEnter(force){
  if(ST.entering&&!force)return;
  ST.entering=true;
  try{
    if(!currentUser){stGo('gate',null,true);return}
    if(!ST.introShown&&!force){ST.introShown=true;stIntro()}
    ST.loadMsg='Conectando ao StarsTeam…';if(!ST.club)stGo('load',null,true);
    await Promise.all([stLoadAccess(),stLoadCfg(true)]);
    const s=stStatus();
    if(s!=='approved'||!stPinOk()||(s==='approved'&&!isAdmin()&&ST.acc&&!ST.acc.pin)){ST.club=null;stGo('gate',null,true);return}
    if(!ST.club||ST.club.user!==currentUser){ST.loadMsg='Carregando o seu clube…';await stLoadClub()}
    if(!ST.club){ST.cr=ST.cr||stCrDefault();stGo('create',null,true);return}
    ST.cloudOk=ST.cloudOk!==false;
    stWeekRoll();
    await stResolvePending();
    await stInboxPoll();
    await stMarketProcess().catch(()=>{});
    stFetchPubs(true).catch(()=>{});
    if(ST_LIVE&&M&&M.stx&&!M.stx.done)stGo('match',null,true);
    else if(ST.view==='load'||ST.view==='gate'||ST.view==='create'||!STV[ST.view])stGo('hub',null,true);
    else stGo(ST.view,ST.arg,true);
    stCatEnforce();setTimeout(stAnnPopup,900);
    stStartPoll();
  }catch(err){console.error('[StarsTeam] entrar',err);stGo('gate',null,true);toast('Erro ao entrar no StarsTeam: '+(err&&err.message||err))}
  finally{ST.entering=false}
}
function stStartPoll(){
  if(ST.pollT)return;
  ST.startPoll=stStartPoll;
  ST.pollT=setInterval(async()=>{
    if(document.hidden||!ST.club||!stView||!$('tab-st').classList.contains('active'))return;
    try{
      await stLoadCfg();
      const before=ST.club.coins+'|'+ST.club.msgs.length+'|'+Object.keys(ST.club.cards).length;
      await stInboxPoll();
      if(ST.pollN%2===0)await stMarketProcess();
      ST.pollN++;
      const after=ST.club.coins+'|'+ST.club.msgs.length+'|'+Object.keys(ST.club.cards).length;
      if(before!==after)stTopRefresh();
    }catch(e){}
  },9000);
  ST.pollN=0;
}
async function stResolvePending(){
  const c=ST.club;if(!c||!c.pend||(ST_LIVE&&M&&M.stx))return;
  const p=c.pend;c.pend=null;
  stNote('⚠️ A partida anterior ('+(p.title||p.mode)+') foi abandonada e contou como derrota por 0 x 3.');
  stApplyResult(p,'L',0,3,{forfeit:true});
  stSave({pub:true});
}

/* ---------- Hub ---------- */
const ST_TILES=[
  {k:'play',ic:'⚔️',n:'Jogar',d:'Rivals, Champions, Draft, Squad Duels e amistosos'},
  {k:'squad',ic:'🧩',n:'Elenco',d:'Formação, tática e entrosamento'},
  {k:'store',ic:'🎁',n:'Loja',d:'Pacotes e probabilidades'},
  {k:'market',ic:'💱',n:'Mercado',d:'Leilões entre amigos'},
  {k:'sbc',ic:'🛠️',n:'Desafios (DME)',d:'Troque cartas por prêmios'},
  {k:'obj',ic:'🎯',n:'Objetivos',d:'Diários, semanais e de início'},
  {k:'club',ic:'🛡️',n:'Clube',d:'Coleção, identidade, estádio e treinador'},
  {k:'comm',ic:'👥',n:'Comunidade',d:'Amigos, ranking e desafios'}
];
function stBadge(k){
  const c=ST.club;
  if(k==='store'){const n=c.packs.length;return n?`<em>${n}</em>`:''}
  if(k==='obj'){const n=stClaimable();return n?`<em>${n}</em>`:''}
  if(k==='play'&&(c.chPending.length||(c.ch.active&&c.ch.played>=ST_CH_GAMES&&!c.ch.claimed)))return '<em>!</em>';
  return '';
}
function stMiniPitch(sq,cards,eff){
  const F=FORMS[sq.formation]||FORMS['4-3-3'];
  return `<div class="st-mini3d"><div class="st-mini">${F.map(([lb,x,y],i)=>`<i class="${cards[i]?'on':''}" style="left:${x}%;top:${y}%" title="${esc(cards[i]?cards[i].name:lb)}"><b>${cards[i]?cards[i].ovr:lb}</b></i>`).join('')}</div></div>`;
}
STV.hub=()=>{
  const c=ST.club,a=stActiveInfo(),daily=Date.now()-(c.daily||0)>=ST_DAILY_PACK.cd,left=Math.max(0,ST_DAILY_PACK.cd-(Date.now()-(c.daily||0)));
  const tiles=ST_TILES.map((t,i)=>{
    const art=ST_ART.tiles[{play:'jogar',squad:'elenco',store:'loja',market:'mercado',sbc:'dme',obj:'objetivos',club:'clube',comm:'comunidade'}[t.k]];
    return `<button class="st-tile tilt" data-act="go" data-v="${t.k}" style="--i:${i}${art?`;background-image:url('${stAttr(art)}')`:''}"><span class="st-tile-ic">${t.ic}</span><b>${t.n}</b><small>${t.d}</small>${stBadge(t.k)}</button>`;
  }).join('');
  const fresh=c.packs.length?`<div class="st-strip" data-act="go" data-v="store">🎁 Você tem <b>${c.packs.length}</b> pacote(s) para abrir!<span>Abrir agora ›</span></div>`:'';
  const notes=c.msgs.slice(0,4).map(m=>`<div class="st-feed"><span>${new Date(m.t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>${esc(m.x)}</div>`).join('')||'<div class="st-feed">Nada novo por aqui.</div>';
  const ann=ST.ann.slice(0,2).map(stAnnHTML).join('');
  return `${ST.cfg.notice?`<div class="st-notice">📢 ${esc(ST.cfg.notice)}</div>`:''}${ann?`<div class="st-card"><h3 class="t">📢 Novidades</h3>${ann}</div>`:''}${fresh}
  <div class="st-hub"><div class="st-hero"><div class="st-hero-cr tilt">${stCrest(c.crest,128)}</div>
    <div class="st-hero-i"><h2 class="t">${esc(c.name)}</h2><div class="st-hero-s"><span>${ST_DIV_NAME(c.rv.div)}</span><span>${c.st.p} J • ${c.st.w} V • ${c.st.d} E • ${c.st.l} D</span><span>Rating ${Math.round(c.rv.rating)}</span></div>
    <div class="row" style="margin-top:.7rem;gap:.5rem">${daily?`<button class="btn" data-act="daily">🎁 Resgatar pacote diário</button>`:`<button class="btn sec" disabled>Próximo pacote diário em ${Math.ceil(left/3600e3)}h</button>`}<button class="btn sec" data-act="go" data-v="squad">Editar elenco</button></div></div>
    <div class="st-hero-sq"><div class="st-hero-lbl">${esc(a.sq.name)} • ${esc(a.sq.formation)}</div>${stMiniPitch(a.sq,a.cards)}<div class="st-hero-nums"><span>OVR <b>${a.full?a.ovr:'–'}</b></span><span>Entrosamento <b>${a.chem}</b>/33</span></div></div></div>
    <div class="st-tiles">${tiles}</div>
    <div class="st-card"><h3 class="t">Atividade</h3>${notes}<button class="btn sec sm" data-act="go" data-v="inbox">Ver tudo</button></div></div>`;
};
STA.daily=()=>{
  const c=ST.club;if(Date.now()-(c.daily||0)<ST_DAILY_PACK.cd)return;
  c.daily=Date.now();stAddPack(ST_DAILY_PACK.pack,'diário');stSave();toast('🎁 Pacote diário adicionado à Loja!');stGo('hub',null,true);
};
STV.inbox=()=>{
  const c=ST.club;c.msgSeen=Date.now();stSave();
  const msgs=c.msgs.map(m=>`<div class="st-feed"><span>${new Date(m.t).toLocaleString('pt-BR')}</span>${esc(m.x)}</div>`).join('')||'<div class="st-feed">Nenhuma mensagem.</div>';
  const log=c.log.map(m=>`<div class="st-feed"><span>${new Date(m.t).toLocaleString('pt-BR')}</span>${esc(m.x)}</div>`).join('')||'<div class="st-feed">Nenhuma atividade ainda.</div>';
  return `<h2 class="t">Mensagens e atividade</h2><div class="st-two"><div class="st-card"><h3 class="t">Avisos</h3>${msgs}</div><div class="st-card"><h3 class="t">Histórico do clube</h3>${log}</div></div>`;
};
