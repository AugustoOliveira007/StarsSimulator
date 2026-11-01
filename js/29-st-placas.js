/* ===================== STARSTEAM — PLACAS DE PUBLICIDADE POR MODO =====================
   Cada modo (Rivals, Champions, Draft, Squad Battles, Amistoso, Online) pode ter as suas placas,
   editadas no StarsTeam Admin. Sem placas próprias, o modo usa as placas padrão (⚙️).
   Nuvem: /stars_st/<código>/ads/<modo> = {list:[{src,fit,zoom}], sec} */
const ST_AD_MODES=[['rivals','StarsRivals'],['champ','StarsChampions'],['draft','StarsDraft'],['sb','Squad Battles'],['friend','Amistoso'],['online','Online']];
const stAdMode=m=>m==='champ_po'?'champ':m;
ST.adsC=(()=>{try{return JSON.parse(localStorage.getItem('stars_st_ads_v1'))||{}}catch(e){return{}}})();
ST.adsT={};ST.adMode=null;
const stAdsNorm=d=>{
  if(!d)return null;
  const list=(Array.isArray(d.list)?d.list:Object.values(d.list||{})).filter(a=>a&&a.src).slice(0,10).map(a=>({src:a.src,fit:a.fit||'contain',zoom:+a.zoom||100}));
  return{list,sec:+d.sec||5};
};
const stAdsSaveLocal=()=>{try{localStorage.setItem('stars_st_ads_v1',JSON.stringify(ST.adsC))}catch(e){}};
async function stAdsFetch(mode,force){
  mode=stAdMode(mode);
  if(!force&&Date.now()-(ST.adsT[mode]||0)<120000)return ST.adsC[mode]||null;
  const r=await stGet('/ads/'+mode);
  if(r.ok){ST.adsT[mode]=Date.now();ST.adsC[mode]=stAdsNorm(r.data)||{list:[],sec:5};stAdsSaveLocal()}
  return ST.adsC[mode]||null;
}
function stAdsApply(mode){
  mode=stAdMode(mode);ST.adMode=mode;
  const c=ST.adsC[mode];adUse(c&&c.list.length?c:null);
  stAdsFetch(mode).then(d=>{if(ST.adMode===mode&&d)adUse(d.list.length?d:null)}).catch(()=>{});
}
/* ---------- Admin ---------- */
ST_ADM.adMode='rivals';ST_ADM.ads={};
async function stAdmAdsLoad(){
  const r=await stAdsFetch(ST_ADM.adMode,true);
  ST_ADM.ads[ST_ADM.adMode]=JSON.parse(JSON.stringify(r||{list:[],sec:5}));
  stAdmPane();
}
function stAdmAds(){
  const m=ST_ADM.adMode,d=ST_ADM.ads[m];
  if(!d){stAdmAdsLoad();return '<div class="st-load"><div class="st-spin"></div></div>'}
  const rows=d.list.map((a,i)=>`<div class="adrow"><div class="adprev"><i style="${adBgCss(a)}"></i></div><div style="flex:1">
    <div class="row"><select class="fc" style="flex:1;padding:.3rem" data-ch="adm-adfit" data-i="${i}"><option value="contain" ${a.fit==='contain'?'selected':''}>Repetir na proporção</option><option value="cover" ${a.fit==='cover'?'selected':''}>Preencher (corta)</option><option value="fill" ${a.fit==='fill'?'selected':''}>Esticar</option></select>${stAdmBtn('adm-addel',i,'🗑','dng')}</div>
    <div class="row" style="margin-top:.3rem"><small>Zoom ${a.zoom}%</small><input type="range" min="40" max="220" value="${a.zoom}" style="flex:1" data-ch="adm-adzoom" data-i="${i}"></div></div></div>`).join('');
  return `<div class="st-card"><h3 class="t">Placas de publicidade por modo</h3>
  <p class="st-fine">Cada modo pode ter até 10 placas próprias. Sem placas, o modo usa as padrão (botão ⚙️ do jogo).</p>
  <div class="st-tabs">${ST_AD_MODES.map(([k,n])=>`<button class="${m===k?'on':''}" data-act="adm-admode" data-v="${k}">${n}</button>`).join('')}</div>
  <div class="row" style="justify-content:space-between;margin:.6rem 0"><b>${d.list.length}/10 placas — ${ST_AD_MODES.find(x=>x[0]===m)[1]}</b>
   <label class="st-fine">Troca a cada <select class="fc" style="width:auto;display:inline;padding:.2rem" data-ch="adm-adsec">${[3,5,8,12].map(v=>`<option value="${v}" ${d.sec===v?'selected':''}>${v}s</option>`).join('')}</select></label></div>
  <div class="row" style="gap:.4rem"><input id="adm-adurl" class="fc" style="flex:1" placeholder="https://… (URL da imagem)"><button class="btn sm" data-act="adm-adurlgo">Adicionar</button></div>
  <label class="upl st-upl" style="margin:.4rem 0">📁 Enviar imagem<input type="file" accept="image/*" hidden data-ch="adm-adfile"></label>
  ${rows||'<p class="st-fine">Nenhuma placa neste modo: ele usa as placas padrão.</p>'}</div>`;
}
async function stAdmAdsSave(){
  const m=ST_ADM.adMode,d=ST_ADM.ads[m];
  const r=d.list.length?await stPut('/ads/'+m,{list:d.list,sec:d.sec,ts:Date.now()}):await stDel('/ads/'+m);
  if(!r.ok)return toast('Erro ao salvar as placas: '+r.err+' (imagens muito grandes?)');
  ST.adsC[m]=JSON.parse(JSON.stringify(d));ST.adsT[m]=Date.now();stAdsSaveLocal();toast('Placas do modo salvas.');
}
const stAdmAdsSoon=()=>{clearTimeout(ST_ADM.adT);ST_ADM.adT=setTimeout(stAdmAdsSave,700)};
STA['adm-admode']=el=>{ST_ADM.adMode=el.dataset.v;stAdmPane()};
STA['adm-adsec']=el=>{ST_ADM.ads[ST_ADM.adMode].sec=+el.value;stAdmAdsSave()};
STA['adm-adfit']=el=>{ST_ADM.ads[ST_ADM.adMode].list[+el.dataset.i].fit=el.value;stAdmPane();stAdmAdsSoon()};
STA['adm-adzoom']=el=>{ST_ADM.ads[ST_ADM.adMode].list[+el.dataset.i].zoom=+el.value;stAdmPane();stAdmAdsSoon()};
STA['adm-addel']=el=>{ST_ADM.ads[ST_ADM.adMode].list.splice(+el.dataset.k,1);stAdmPane();stAdmAdsSave()};
function stAdmAdAdd(src){
  const d=ST_ADM.ads[ST_ADM.adMode];if(!src)return;
  if(d.list.length>=10)return toast('Limite de 10 placas neste modo.');
  d.list.push({src,fit:'contain',zoom:100});stAdmPane();stAdmAdsSave();
}
STA['adm-adurlgo']=()=>{const v=$('adm-adurl').value.trim();if(v)stAdmAdAdd(v)};
STA['adm-adfile']=el=>{const f=el.files[0];if(!f)return;stFileData(f,700,d=>stAdmAdAdd(d),f.type==='image/png'?undefined:'jpeg');el.value=''};
