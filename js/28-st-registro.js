/* ===================== STARSTEAM — TIMES, ATLETAS E ESTÁDIOS CADASTRADOS NO JOGO =====================
   Tudo o que é criado nas abas Times e Atletas entra automaticamente no StarsTeam:
   • cada atleta vira uma carta base (igual às genéricas: sorteia nos pacotes, mercado do sistema, draft…);
   • cada time (com liga, escudo, cores e estádio) fica disponível para criar cartas e técnicos no StarsTeam Admin;
   • cada estádio cadastrado num time vira uma carta de estádio (ver stStadiumsAll em 25-st-catalogo.js).
   Times privados e os times temporários das partidas do StarsTeam nunca entram. */
const ST_REG={sig:''};
const stRegTeamOk=t=>!!(t&&t.id&&!t.priv&&!t._st&&!String(t.id).startsWith('st:'));
const stRegTeams=()=>(typeof teams!=='undefined'?teams:[]).filter(stRegTeamOk);
const stRegHasLogo=t=>!!(t&&t.logo&&t.logo!==PH);

/* ligas oficiais do jogo (as personalizadas/privadas ficam de fora) */
function stRegLeagueList(){
  return (typeof leagues!=='undefined'?leagues:[]).filter(l=>l&&l.id&&l.name&&!l.custom&&!l.priv).map(l=>({id:'rl:'+l.id,n:l.name,raw:l.id}));
}
function stRegLeagueOfTeam(t){
  const l=t&&t.leagueId&&typeof leagues!=='undefined'?leagues.find(x=>x.id===t.leagueId&&!x.custom&&!x.priv):null;
  return l?{id:'rl:'+l.id,n:l.name}:null;
}
/* times como “clubes” do StarsTeam, para as telas de admin */
function stRegClubList(){
  const cnt={};
  (typeof players!=='undefined'?players:[]).forEach(p=>{cnt[p.teamId]=(cnt[p.teamId]||0)+1});
  return stRegTeams().map(t=>{
    const lg=stRegLeagueOfTeam(t);
    return{id:'rt:'+t.id,tid:t.id,n:t.name,code:t.code,logo:stRegHasLogo(t)?t.logo:'',c1:t.color,c2:t.color2,lg:lg?lg.id:'',lgN:lg?lg.n:'',stadium:t.stadium||'',fans:+t.fans||0,stadiumImg:t.stadiumImg||'',athletes:cnt[t.id]||0};
  }).sort((a,b)=>a.n.localeCompare(b.n,'pt'));
}
/* times como adversários da CPU (mesmo formato de ST_DB.clubs) */
function stRegClubsAsDb(){
  return stRegClubList().map(c=>{
    const h=stHash('st'+c.id)%360;
    return{id:c.id,n:c.n,lg:c.lg,lgN:c.lgN,hue:h,strength:.5,pids:[],c1:c.c1,c2:c.c2,
      crest:{shape:h%6,c1:c.c1||'#2f6bff',c2:c.c2||'#ffffff',sym:h%10,img:c.logo||''}};
  });
}

/* foto do atleta (a carta usa a imagem cadastrada em Atletas; sem foto, avatar gerado) */
const stRegPhotoOf=p=>p&&p.photo&&p.photo!==PH?p.photo:'';
/* acha o atleta de uma carta: pelo id e, se o cadastro foi refeito, pelo nome + time */
function stRegPlayerOf(c){
  if(!c||typeof players==='undefined')return null;
  let p=c.rp?players.find(x=>x.id===c.rp):null;
  if(!p&&c.name){const tn=c.club;p=players.find(x=>x.name===c.name&&!String(x.teamId).startsWith('st:')&&(!tn||(teamOf(x.teamId)||{}).name===tn))}
  return p||null;
}
/* cartas base dos atletas cadastrados */
function stRegCards(){
  const out=[],tm={};
  stRegTeams().forEach(t=>{tm[t.id]=t});
  const useReg=!(typeof ST!=='undefined'&&ST.cfg&&ST.cfg.useReg===false);
  (typeof players!=='undefined'?players:[]).forEach(p=>{
    if(!p||!p.id||!p.name||String(p.teamId||'').startsWith('st:'))return;
    const t=tm[p.teamId];if(!t)return;                       // atleta sem time público não vira carta
    const pr=stRng('reg:'+p.id),ovr=stClamp(Math.round(+p.ovr||60),40,99),pos=ST_PROFILE[p.pos]?p.pos:'CM',prof=ST_PROFILE[pos];
    const lg=stRegLeagueOfTeam(t);
    const alt=(ST_POS_ALT[pos]||[]).filter(()=>pr()<.5);
    const stats=prof.map(o=>stClamp(Math.round(ovr+o+pr.gauss()*3.2),18,99));
    const rare=pr()<(ovr>=75?.34:ovr>=65?.26:.2);
    out.push({id:'r'+p.id,rp:p.id,name:p.name,pos,alt,ovr,nat:ST_NATIONS[p.nat]?p.nat:'',league:lg?lg.id:'',leagueN:lg?lg.n:'',club:t.name,clubId:'rt:'+t.id,
      stats,img:stRegPhotoOf(p),rar:rare?'raro':'comum',face:{sk:pr.int(0,5),hr:pr.int(0,6),st:pr.int(0,5)},hue:stHash('st'+t.id)%360,src:'r',noPack:!useReg});
  });
  return out;
}

/* assinatura do que importa: se mudou, o catálogo do StarsTeam é reconstruído */
function stRegSig(){
  const useReg=!(typeof ST!=='undefined'&&ST.cfg&&ST.cfg.useReg===false);
  const t=stRegTeams().map(x=>[x.id,x.name,x.code,x.leagueId||'',x.color,x.color2,x.stadium||'',x.fans||0,stHash(x.logo||''),stHash(x.stadiumImg||'')].join('~')).join('|');
  const p=(typeof players!=='undefined'?players:[]).map(x=>[x.id,x.name,x.teamId,x.ovr,x.pos,stHash(x.photo||'')].join('~')).join('|');
  const l=stRegLeagueList().map(x=>x.id+'~'+x.n).join('|');
  return String(stHash(t+'#'+p+'#'+l+'#'+useReg))+':'+(typeof players!=='undefined'?players.length:0)+':'+stRegTeams().length;
}
function stRegRefresh(force){
  const sig=stRegSig();
  if(!force&&sig===ST_REG.sig)return false;
  ST_REG.sig=sig;
  if(typeof stCatApply==='function'&&typeof ST!=='undefined'&&ST.cat){stCatApply();return true}
  return false;
}
/* qualquer mudança nas abas Times/Atletas/Ligas passa por refreshAll(): aproveita para atualizar as cartas */
(function(){
  const ra=refreshAll;
  refreshAll=function(){
    const r=ra.apply(this,arguments);
    try{stRegRefresh()}catch(e){console.error('[StarsTeam] cartas cadastradas:',e)}
    return r;
  };
})();
