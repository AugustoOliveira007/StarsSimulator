/* ===================== STARSTEAM — LIGAÇÃO COM O JOGO ===================== */
ST.reduceMotion=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
(function(){
  const gt=goTab;
  goTab=function(id){
    const r=gt.apply(this,arguments);
    if(id==='st')stEnter();
    if(id==='stadm')stAdmLoad();
    return r;
  };
  const ar=applyRole;
  applyRole=function(){
    ar.apply(this,arguments);
    const n=$('nav-stadm');if(n)n.style.display=isAdmin()?'':'none';
    if(!isAdmin()&&$('tab-stadm')&&$('tab-stadm').classList.contains('active'))goTab('home');
    if(ST.club&&ST.club.user!==currentUser){ST.club=null;ST.acc=null;ST.introShown=false;clearInterval(ST.pollT);ST.pollT=null}
  };
  applyRole();
})();
window.addEventListener('beforeunload',()=>{try{if(ST.club)localStorage.setItem(stLsKey(currentUser),JSON.stringify(ST.club))}catch(e){}});
