/* ===================== PLACAS DE PUBLICIDADE (nuvem) ===================== */
let ADS=load('stars_ads',{list:[],sec:5}),adIx=0,adT=null,adT2=null;
ADS.list=ADS.list||[];ADS.del=ADS.del||{};
const AD_TXT=['STARS SIMULATOR','⚽ FUTEBOL & TÁTICA','SEU ANÚNCIO AQUI','STARS CUP'];
const adTxt=()=>'<div class="adt">'+[...AD_TXT,...AD_TXT].map(t=>'<span>'+t+'</span>').join('')+'</div>';
function adBgCss(a){
  const base=`background-image:url('${a.src}');background-position:center;`;
  if(a.fit==='cover')return base+'background-repeat:no-repeat;background-size:cover;';
  if(a.fit==='fill')return base+'background-repeat:no-repeat;background-size:100% 100%;';
  return base+`background-repeat:repeat-x;background-size:auto ${a.zoom||100}%;`;
}
const aStr=a=>JSON.stringify({...a,_m:0});
let ASNAP={},ASEC=ADS.sec;
ADS.list.forEach(a=>{if(!a.id)a.id=uid();if(!a._m)a._m=Date.now();ASNAP[a.id]=aStr(a)});
(function(){
  const p=$('pitch');
  const mk=c=>{const d=document.createElement('div');d.className='adb '+c;return d};
  ['t','l','r'].forEach(c=>p.insertBefore(mk(c),p.firstChild));
})();
function fitSide(){
  document.querySelectorAll('.adb.l,.adb.r').forEach(b=>{
    const H=b.offsetHeight||400,ang=b.classList.contains('l')?-90:90;
    b.querySelectorAll('.adi').forEach(e=>{
      e.style.width=H+'px';e.style.height='26px';
      e.style.left='50%';e.style.top='50%';e.style.right='auto';e.style.bottom='auto';
      e.style.transform='translate(-50%,-50%) rotate('+ang+'deg)';
    });
  });
}
let AD_OVR=null;   /* placas próprias de um modo do StarsTeam (null = usa as padrão) */
function adUse(o){AD_OVR=o&&o.list&&o.list.length?o:null;adIx=0;renderAds()}
function renderAds(){
  const A=AD_OVR||ADS,L=A.list;
  document.querySelectorAll('.adb').forEach(b=>{
    if(!L.length){b.innerHTML=adTxt();return}
    b.innerHTML=L.map((a,i)=>`<div class="adi ${i===adIx%L.length?'on':''}" style="${adBgCss(a)}"></div>`).join('');
  });
  fitSide();clearInterval(adT);
  if(L.length>1)adT=setInterval(()=>{adIx++;document.querySelectorAll('.adb').forEach(b=>b.querySelectorAll('.adi').forEach((e,i,a)=>e.classList.toggle('on',i===adIx%a.length)))},(A.sec||5)*1000);
}
function adStamp(){
  ADS.del=ADS.del||{};ADS.list=ADS.list||[];
  const now=Date.now(),cur={};
  ADS.list.forEach(a=>{
    if(!a.id){a.id=uid();a._m=now}
    else if(!(a.id in ASNAP)){if(!a._m)a._m=now}
    else if(ASNAP[a.id]!==aStr(a))a._m=now;
    cur[a.id]=aStr(a);
  });
  Object.keys(ASNAP).forEach(id=>{if(!(id in cur))ADS.del[id]=now});
  if(ADS.sec!==ASEC){ADS.secT=now;ASEC=ADS.sec}
  ASNAP=cur;
}
function persistAds(){
  adStamp();
  try{localStorage.setItem('stars_ads',JSON.stringify(ADS));localStorage.setItem('stars_ts',Date.now());cloudDirty()}
  catch(e){toast('Armazenamento cheio: use imagens menores ou menos placas.')}
  clearTimeout(adT2);adT2=setTimeout(adSync,1500);
}
async function adSync(){
  if(!cloudOn())return;
  try{
    const u=cloudUrl().replace(/\.json$/,'/ads_v2.json');
    const r=await fetch(u);if(!r.ok)throw new Error('HTTP '+r.status);
    const c=(await r.json())||{};
    const cList=Array.isArray(c.list)?c.list:Object.values(c.list||{});
    const cDel=c.del||{};
    adStamp();
    const del={...cDel};Object.entries(ADS.del).forEach(([i,t])=>{del[i]=Math.max(del[i]||0,t)});
    const loc=new Map(ADS.list.map(a=>[a.id,a])),cl=new Map(cList.map(a=>[a.id,a])),out=[];
    ADS.list.forEach(a=>{const o=cl.get(a.id);out.push(o&&(o._m||0)>(a._m||0)?o:a)});
    cList.forEach(a=>{if(!loc.has(a.id))out.push(a)});
    const list=out.filter(a=>a&&a.src&&!(del[a.id]&&del[a.id]>(a._m||0))).slice(0,10);
    const secT=Math.max(c.secT||0,ADS.secT||0),sec=((c.secT||0)>(ADS.secT||0)?c.sec:ADS.sec)||5;
    const sig=(l,s)=>l.map(a=>a.id+':'+(a._m||0)).sort().join(',')+'|'+s;
    if(sig(list,sec)!==sig(ADS.list,ADS.sec)){
      ADS.list=list;ADS.sec=sec;ADS.secT=secT;ADS.del=del;ASEC=sec;
      ASNAP={};list.forEach(a=>{ASNAP[a.id]=aStr(a)});
      try{localStorage.setItem('stars_ads',JSON.stringify(ADS))}catch(e){toast('Armazenamento cheio: não deu para guardar todas as placas neste aparelho.')}
      adIx=0;renderAds();if($('m-ads').classList.contains('on'))drawAdList();
    }else ADS.del=del;
    if(sig(list,sec)!==sig(cList,c.sec||5)||JSON.stringify(del)!==JSON.stringify(cDel)||secT!==(c.secT||0)){
      const w=await fetch(u,{method:'PUT',body:JSON.stringify({list,del,sec,secT})});
      if(!w.ok)throw new Error('HTTP '+w.status);
    }
  }catch(e){cloudStatus('⚠️ Placas: '+e.message)}
}
function drawAdList(){
  const L=ADS.list;
  $('ad-count').textContent=`${L.length}/10 placas`;
  $('ad-list').innerHTML=L.length?L.map((a,i)=>`<div class="adrow"><div class="adprev"><i id="adp${i}" style="${adBgCss(a)}"></i></div>
  <div><div class="row"><select class="fc" style="flex:1;padding:.3rem" onchange="adSet(${i},'fit',this.value)"><option value="contain" ${a.fit==='contain'?'selected':''}>Repetir na proporção</option><option value="cover" ${a.fit==='cover'?'selected':''}>Preencher (corta)</option><option value="fill" ${a.fit==='fill'?'selected':''}>Esticar</option></select><button class="btn dng sm" onclick="adDel(${i})">🗑️</button></div>
  <div class="row" style="margin-top:.3rem"><small>Zoom ${a.zoom}%</small><input type="range" min="40" max="220" value="${a.zoom}" style="flex:1" oninput="adSet(${i},'zoom',+this.value,this)"></div></div></div>`).join(''):'<p style="color:var(--muted);font-size:.85rem">Nenhuma imagem. Sem imagens, as placas mostram o texto padrão.</p>';
  $('ad-sec').value=ADS.sec;
}
function adSet(i,k,v,el){
  if(!isAdmin())return toast(MSG_ADM);
  ADS.list[i][k]=v;persistAds();renderAds();
  $('adp'+i).style.cssText=adBgCss(ADS.list[i]);
  if(k==='zoom'&&el)el.previousElementSibling.textContent='Zoom '+v+'%';
}
function adDel(i){if(!isAdmin())return toast(MSG_ADM);ADS.list.splice(i,1);persistAds();renderAds();drawAdList()}
function addAd(src){
  if(!isAdmin())return toast(MSG_ADM);
  if(!src)return;if(ADS.list.length>=10)return toast('Limite de 10 placas atingido.');
  ADS.list.push({src,fit:'contain',zoom:100});persistAds();renderAds();drawAdList();
}
function adUrl(){const v=$('ad-url').value.trim();if(!v)return;addAd(v);$('ad-url').value=''}
function adFile(ev){
  if(!isAdmin())return toast(MSG_ADM);
  const f=ev.target.files[0];if(!f)return;
  if(ADS.list.length>=10){ev.target.value='';return toast('Limite de 10 placas atingido.')}
  const r=new FileReader();
  r.onload=e=>shrinkImg(e.target.result,700,d=>addAd(d),f.type==='image/png'?undefined:'jpeg');
  r.readAsDataURL(f);ev.target.value='';
}
function openAds(){if(!isAdmin())return toast(MSG_ADM);drawAdList();$('m-ads').classList.add('on')}
renderAds();window.addEventListener('resize',fitSide);
setInterval(adSync,25000);setTimeout(adSync,1500);
