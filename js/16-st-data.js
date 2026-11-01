/* ===================== STARSTEAM — DADOS, CARTAS E TABELAS ===================== */
/* Tudo aqui é determinístico (mesma semente = mesmas cartas em todos os aparelhos).
   Para trocar números de economia, odds de pacotes, DMEs ou recompensas, edite as tabelas deste arquivo. */

/* ---------- Utilidades: hash e gerador pseudoaleatório com semente ---------- */
function stHash(str){
  let h1=0xdeadbeef,h2=0x41c6ce57;
  for(let i=0;i<str.length;i++){const c=str.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return (4294967296*(2097151&h2)+(h1>>>0));
}
function stRng(seed){
  let a=(typeof seed==='string'?stHash(seed):seed)>>>0;
  const f=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  f.int=(lo,hi)=>Math.floor(f()*(hi-lo+1))+lo;
  f.pick=arr=>arr[Math.floor(f()*arr.length)];
  f.gauss=()=>{let u=0,v=0;while(!u)u=f();while(!v)v=f();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  return f;
}
const stClamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const stFmt=n=>Math.round(n).toLocaleString('pt-BR');

/* ---------- Pontos de design: quando você tiver as artes, coloque as URLs aqui ----------
   Deixe '' para usar o visual provisório. Aceita caminho relativo (assets/...) ou data URL. */
const ST_ART={
  hubBg:'',            // fundo do hub
  entryLogo:'',        // logo do portal de entrada
  pitchBg:'',          // gramado da tela de elenco
  matchIntroBg:'',     // fundo da tela "versus"
  packs:{ bronze:{front:'',back:''}, prata:{front:'',back:''}, ouro:{front:'',back:''}, ouroPremium:{front:'',back:''}, ouroRaro:{front:'',back:''}, elite:{front:'',back:''}, treinador:{front:'',back:''}, estadio:{front:'',back:''}, promo10:{front:'',back:''}, inicial:{front:'',back:''} },
  cardFrames:{ bronze:'', prata:'', ouro:'', raro:'', totw:'', heroi:'', idolo:'' },   // moldura de cada tipo de carta
  tiles:{ elenco:'', clube:'', loja:'', mercado:'', dme:'', jogar:'', objetivos:'', identidade:'', comunidade:'' }
};

/* ---------- Posições ---------- */
const ST_POS_ALT={GK:[],CB:['CDM'],LB:['LWB','LM'],RB:['RWB','RM'],LWB:['LB','LM'],RWB:['RB','RM'],CDM:['CM','CB'],CM:['CDM','CAM'],CAM:['CM','CF'],LM:['LW','CM'],RM:['RW','CM'],LW:['LM','ST'],RW:['RM','ST'],CF:['ST','CAM'],ST:['CF']};
const ST_SECTOR=p=>['ST','CF','LW','RW'].includes(p)?'fwd':['CM','CAM','CDM','LM','RM'].includes(p)?'mid':p==='GK'?'gk':'def';
/* deslocamento dos 6 atributos em relação ao OVR, por posição: [RIT, FIN, PAS, DRI, DEF, FIS] */
const ST_PROFILE={ST:[1,6,-8,-1,-36,4],CF:[0,4,-3,3,-34,0],LW:[6,1,-2,7,-35,-8],RW:[6,1,-2,7,-35,-8],LM:[4,-3,1,4,-22,-5],RM:[4,-3,1,4,-22,-5],CAM:[-1,0,6,5,-28,-9],CM:[-4,-8,5,1,-10,-1],CDM:[-6,-16,1,-5,4,4],LB:[3,-24,-4,-1,1,0],RB:[3,-24,-4,-1,1,0],LWB:[5,-18,-1,2,-4,-3],RWB:[5,-18,-1,2,-4,-3],CB:[-8,-34,-10,-14,6,7],GK:[0,0,0,0,0,0]};
const ST_STAT_LBL=['RIT','FIN','PAS','DRI','DEF','FIS'],ST_STAT_LBL_GK=['MER','MAN','CHU','REF','VEL','POS'];

/* ---------- Nações (bandeiras desenhadas em SVG simples) ---------- */
const ST_NATIONS={
  BRA:{n:'Brasil',f:['Rafael','Thiago','Gustavo','Matheus','Lucas','Bruno','Felipe','Caio','Diego','Vinícius','Gabriel','Renan','Leandro','Danilo','Henrique','Murilo'],l:['Almeida','Barros','Cardoso','Duarte','Esteves','Ferraz','Gouveia','Henriques','Lacerda','Macedo','Nogueira','Paiva','Queiroz','Rangel','Siqueira','Tavares','Veloso','Xavier','Moraes','Pimentel']},
  ARG:{n:'Argentina',f:['Matías','Nicolás','Facundo','Agustín','Santiago','Ezequiel','Joaquín','Maximiliano','Tomás','Franco','Emiliano','Gonzalo','Ramiro','Bautista'],l:['Acosta','Benítez','Cabrera','Domínguez','Echeverría','Figueroa','Giménez','Herrera','Ibarra','Juárez','Luna','Medina','Navarro','Ocampo','Peralta','Quiroga','Rojas','Sosa','Toledo','Vera']},
  FRA:{n:'França',f:['Antoine','Théo','Hugo','Mathis','Julien','Baptiste','Clément','Maxime','Étienne','Lucien','Romain','Quentin','Axel','Damien'],l:['Armand','Bastide','Chevalier','Delmas','Fabre','Gaillard','Hamel','Jourdan','Lacombe','Marchand','Noël','Perrin','Roussel','Sauvage','Texier','Vidal','Blanchard','Fontaine','Mercier','Colin']},
  ESP:{n:'Espanha',f:['Álvaro','Sergio','Adrián','Pablo','Rubén','Jorge','Iván','Marcos','Aitor','Héctor','Raúl','Dani','Unai','Carlos'],l:['Aguirre','Bravo','Castaño','Delgado','Escudero','Ferrer','Garrido','Hidalgo','Ibáñez','Jaramillo','Lorenzo','Montero','Núñez','Olmedo','Prieto','Quintana','Salinas','Trujillo','Vallejo','Cortés']},
  ITA:{n:'Itália',f:['Matteo','Lorenzo','Federico','Alessio','Riccardo','Davide','Nicolò','Tommaso','Giacomo','Emanuele','Filippo','Stefano','Marco','Luca'],l:['Albertini','Bellini','Caruso','De Luca','Esposito','Ferrara','Gentile','Lombardi','Moretti','Neri','Orsini','Pellegrini','Rinaldi','Santoro','Tedesco','Vitale','Greco','Fiore','Marino','Rossetti']},
  GER:{n:'Alemanha',f:['Jonas','Lukas','Felix','Maximilian','Tobias','Niklas','Fabian','Leon','Moritz','Sven','Jannik','Florian','Kilian','Dominik'],l:['Ackermann','Brandt','Dietrich','Engel','Fischer','Graf','Hartmann','Jung','Keller','Lange','Maurer','Neumann','Otto','Pfeiffer','Richter','Schuster','Vogel','Weber','Zimmer','Krüger']},
  ENG:{n:'Inglaterra',f:['Oliver','Callum','Jack','Mason','Tyler','Connor','Reece','Jordan','Liam','Ethan','Noah','Archie','Finley','Rhys'],l:['Ashworth','Bennett','Carlisle','Dawson','Ellison','Fletcher','Gallagher','Hargrove','Ingram','Kendrick','Lawton','Mercer','Norwood','Osborne','Pemberton','Radcliffe','Stanton','Thornton','Whitaker','Yardley']},
  POR:{n:'Portugal',f:['João','Tiago','Rui','Nuno','Diogo','Ricardo','Hélder','Fábio','Tomás','Gonçalo','Rodrigo','André','Miguel','Duarte'],l:['Abrantes','Barbosa','Caldeira','Dantas','Estrela','Fontes','Guedes','Lobo','Magalhães','Neves','Ornelas','Pacheco','Rebelo','Sampaio','Teixeira','Valente','Maia','Cortez','Seabra','Rocha']},
  NED:{n:'Holanda',f:['Daan','Sem','Joris','Bram','Thijs','Ruben','Stijn','Niels','Gijs','Jelle','Koen','Lars','Mees','Tim'],l:['Bakker','Dekker','Evers','Hoekstra','Janssen','Kuipers','Maas','Nijhuis','Peters','Roelofs','Smits','Timmer','Veldman','Wouters','Zwart','de Groot','van Loon','de Wit','Koster','Brouwer']},
  URU:{n:'Uruguai',f:['Santiago','Matías','Federico','Maximiliano','Nahuel','Mauro','Rodrigo','Facundo','Brian','Gastón','Emiliano','Nicolás','Joaquín','Diego'],l:['Aguilar','Bentancor','Cáceres','Díaz','Estévez','Fernández','Gómez','Hernández','Laborde','Machado','Núñez','Olivera','Pereira','Quintero','Rodríguez','Sánchez','Techera','Umpiérrez','Vázquez','Zabala']},
  COL:{n:'Colômbia',f:['Juan','Andrés','Camilo','Sebastián','Santiago','Duván','Johan','Brayan','Wilmar','Éder','Cristian','Jhon','Kevin','Yeison'],l:['Arboleda','Bedoya','Caicedo','Echeverri','Fonseca','Guerrero','Henao','Isaza','Jiménez','Lerma','Mosquera','Ospina','Palacios','Restrepo','Salazar','Torres','Uribe','Valencia','Zapata','Cuesta']},
  MEX:{n:'México',f:['Alejandro','Diego','Emiliano','Fernando','Héctor','Ismael','Jesús','Luis','Miguel','Orlando','Rodrigo','Uriel','Víctor','Iván'],l:['Aguirre','Barrera','Castillo','Domínguez','Escobedo','Franco','Guzmán','Huerta','Islas','Jáuregui','Lozano','Márquez','Nava','Ochoa','Pineda','Quezada','Reyes','Soto','Treviño','Vargas']},
  JPN:{n:'Japão',f:['Haruto','Ren','Sōta','Kaito','Yūto','Daiki','Takumi','Riku','Shun','Hayato','Kenji','Naoki','Ryōta','Tatsuya'],l:['Aoki','Fujita','Hayashi','Inoue','Kimura','Matsuda','Nakamura','Ogawa','Saito','Takeda','Ueda','Yamada','Yoshida','Hasegawa','Kondo','Morita','Sasaki','Tanabe','Ishikawa','Mori']},
  NGA:{n:'Nigéria',f:['Chidi','Emeka','Tunde','Obinna','Femi','Ikenna','Segun','Uche','Bayo','Chinedu','Dayo','Ifeanyi','Kunle','Nonso'],l:['Adeyemi','Balogun','Chukwu','Danjuma','Eze','Fashola','Garba','Ibe','Jibril','Kalu','Lawal','Mba','Nwosu','Okafor','Onyeka','Salako','Tella','Udoka','Yakubu','Zubair']},
  SEN:{n:'Senegal',f:['Mamadou','Ibrahima','Cheikh','Moussa','Abdou','Omar','Pape','Souleymane','Lamine','Boubacar','Idrissa','Ousmane','Modou','Saliou'],l:['Ba','Cissé','Diallo','Diop','Fall','Gueye','Kane','Mbaye','Ndiaye','Niang','Sarr','Seck','Sow','Thiam','Faye','Badji','Camara','Dieng','Sy','Touré']},
  CRO:{n:'Croácia',f:['Marko','Josip','Dario','Filip','Tomislav','Mateo','Nikola','Petar','Domagoj','Ante','Karlo','Bruno','Davor','Zoran'],l:['Babić','Cvitanović','Dragić','Horvat','Ilić','Jurić','Kovač','Lončar','Marić','Novak','Perić','Radić','Šimić','Tomić','Vidović','Zorić','Bošnjak','Matić','Petrović','Grgić']}
};
const ST_NAT_CODES=Object.keys(ST_NATIONS);
function stFlag(code,w){
  w=w||24;const h=Math.round(w*2/3);
  if(ST_NATIONS[code]&&ST_NATIONS[code].img)return `<img class="stflag" src="${String(ST_NATIONS[code].img).replace(/"/g,'&quot;')}" width="${w}" height="${h}" style="object-fit:cover;border-radius:2px" alt="">`;
  const R=(x,y,ww,hh,c)=>`<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="${c}"/>`;
  const V=(cs,rs)=>{let x=0,t=rs?rs.reduce((a,b)=>a+b,0):cs.length;return cs.map((c,i)=>{const ww=30*((rs?rs[i]:1)/t);const r=R(x,0,ww+.2,20,c);x+=ww;return r}).join('')};
  const H=(cs,rs)=>{let y=0,t=rs?rs.reduce((a,b)=>a+b,0):cs.length;return cs.map((c,i)=>{const hh=20*((rs?rs[i]:1)/t);const r=R(0,y,30,hh+.2,c);y+=hh;return r}).join('')};
  let b='';
  switch(code){
    case 'BRA':b=R(0,0,30,20,'#1c9b4a')+'<polygon points="15,2.5 27,10 15,17.5 3,10" fill="#f6d33b"/><circle cx="15" cy="10" r="4.6" fill="#1d3f8f"/>';break;
    case 'ARG':b=H(['#7cc4ec','#ffffff','#7cc4ec'])+'<circle cx="15" cy="10" r="2.2" fill="#f2b932"/>';break;
    case 'FRA':b=V(['#1f3f99','#ffffff','#d9283a']);break;
    case 'ESP':b=H(['#c8202f','#f6c230','#c8202f'],[1,2,1]);break;
    case 'ITA':b=V(['#1f9a4b','#ffffff','#d02a37']);break;
    case 'GER':b=H(['#111111','#d52b1e','#f4c500']);break;
    case 'ENG':b=R(0,0,30,20,'#ffffff')+R(13,0,4,20,'#d02a37')+R(0,8,30,4,'#d02a37');break;
    case 'POR':b=V(['#1c8a3e','#d52b1e'],[2,3])+'<circle cx="12" cy="10" r="3.4" fill="#f6d33b"/>';break;
    case 'NED':b=H(['#ae1c28','#ffffff','#21468b']);break;
    case 'URU':b=H(['#ffffff','#5aa5dc','#ffffff','#5aa5dc','#ffffff','#5aa5dc','#ffffff','#5aa5dc','#ffffff'])+R(0,0,11,10.8,'#ffffff')+'<circle cx="5.5" cy="5.4" r="2.6" fill="#f2c230"/>';break;
    case 'COL':b=H(['#f6c928','#1c3f94','#c8202f'],[2,1,1]);break;
    case 'MEX':b=V(['#12804a','#ffffff','#cf2a36'])+'<circle cx="15" cy="10" r="2.6" fill="#8b5a2b"/>';break;
    case 'JPN':b=R(0,0,30,20,'#ffffff')+'<circle cx="15" cy="10" r="5.4" fill="#c8202f"/>';break;
    case 'NGA':b=V(['#1a8a4a','#ffffff','#1a8a4a']);break;
    case 'SEN':b=V(['#1a8a4a','#f6d33b','#d52b1e'])+'<polygon points="15,6.6 16.2,9.3 19,9.4 16.8,11.2 17.6,14 15,12.4 12.4,14 13.2,11.2 11,9.4 13.8,9.3" fill="#1a8a4a"/>';break;
    case 'CRO':b=H(['#d52b1e','#ffffff','#2a4aa8'])+'<rect x="12" y="6" width="6" height="7" fill="#d52b1e" stroke="#2a4aa8" stroke-width=".8"/>';break;
    default:b=R(0,0,30,20,'#556');
  }
  return `<svg class="stflag" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" width="${w}" height="${h}"><g>${b}</g><rect width="30" height="20" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".8"/></svg>`;
}

/* ---------- Ligas e clubes fictícios ---------- */
const ST_LEAGUES=[
  {id:'aur',n:'Liga Aurora',nat:'BRA',hue:140,clubs:['Atlético Brisa Norte','Sporting Vale Verde','Unidos do Cerrado','Real Serra Azul','Leões da Baía','Estrela do Sul FC','Fortaleza Rio Claro','Tigres do Pampa']},
  {id:'mer',n:'Liga Meridiano',nat:'ARG',hue:200,clubs:['Club Atlético Pampero','Deportivo Mar Dulce','Sociedad Cordillera','Juventud del Plata','Unión Estancia','Real Pehuén','Sporting Altavista','Halcones del Valle']},
  {id:'tit',n:'Liga Titã',nat:'ENG',hue:0,clubs:['Northfield Rovers','Eastbridge United','Ashford Wanderers','Harbourside City','Kingsmere Athletic','Redcliffe Town','Westmoor Albion','Stonebrook FC']},
  {id:'pol',n:'Série Polaris',nat:'ITA',hue:215,clubs:['AC Monteverde','Virtus Lagunare','Union Castelbianco','Sporting Valdarno','Atletico Ponteluna','Real Cittadella Nova','Fortitudo Riviera','Associazione Bellaria']},
  {id:'van',n:'Liga Vanguarda',nat:'FRA',hue:235,clubs:['Olympique Vallée','Stade Aiglon','Racing Côte d’Argent','Union Sainte-Aurore','Athletic Mont-Clair','FC Bastion','Étoile Rouge Nova','Sporting Lagune']},
  {id:'ori',n:'Liga Orion',nat:'ESP',hue:35,clubs:['Atlético Ribera','Real Sierra Luna','Deportivo Costa Serena','Unión Alcázar','CF Almenara','Sporting Peñasol','Racing Valle Hondo','Club Estrella Ibérica']},
  {id:'hor',n:'Série Horizonte',nat:'GER',hue:50,clubs:['FC Nordlicht','SV Rheinau','VfB Falkenberg','TSG Eichental','SC Sonnenberg','FSV Havelland','Dynamo Schwarzbach','1. FC Tannenwald']},
  {id:'com',n:'Liga Cometa',nat:'POR',hue:350,clubs:['Sporting Atlântida','FC Foz Norte','União Ribatejana','Vitória Marinha','Académico do Tejo','Leões de Sagres','Desportivo Alvorada','Clube Estrela Lusa']}
];
const ST_SPECIAL_LEAGUES={heroes:'Heróis',icons:'Ícones'};
const ST_SYMBOLS=['star','bolt','ball','crown','tower','wing','sun','anchor','leaf','diamond'];

/* escudo gerado (SVG) — spec: {shape,c1,c2,sym} */
function stSymbolPath(sym){
  switch(sym){
    case 'star':return '<polygon points="50,22 56,41 76,41 60,53 66,72 50,60 34,72 40,53 24,41 44,41"/>';
    case 'bolt':return '<polygon points="54,18 32,54 47,54 42,82 68,44 52,44"/>';
    case 'ball':return '<circle cx="50" cy="50" r="20" fill="none" stroke-width="5"/><polygon points="50,40 59,47 56,58 44,58 41,47"/>';
    case 'crown':return '<polygon points="26,62 30,34 42,48 50,30 58,48 70,34 74,62"/><rect x="26" y="64" width="48" height="8"/>';
    case 'tower':return '<path d="M34 74V36h8v6h6v-6h4v6h6v-6h8v38z"/>';
    case 'wing':return '<path d="M24 62C34 40 54 30 78 32 66 38 58 44 56 50c8-2 14-2 20 0-10 4-16 8-20 14-6-2-12-2-18 2 2-6 0-8-14-4z"/>';
    case 'sun':return '<circle cx="50" cy="50" r="11"/>'+[0,45,90,135,180,225,270,315].map(a=>`<rect x="48" y="22" width="4" height="10" transform="rotate(${a} 50 50)"/>`).join('');
    case 'anchor':return '<path d="M50 24a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM48 36h4v32c10-2 16-8 18-16l-5 2 9-12 9 12-5-2c-2 14-12 24-26 26-14-2-24-12-26-26l-5 2 9-12 9 12-5-2c2 8 8 14 14 16z"/>';
    case 'leaf':return '<path d="M30 70C28 44 44 26 72 26c2 26-12 44-38 46zM34 68l26-30" fill-opacity=".9"/>';
    default:return '<polygon points="50,22 72,50 50,78 28,50"/>';
  }
}
function stCrest(spec,size){
  size=size||64;spec=spec||{};
  if(spec.img)return `<img class="stcrest" src="${String(spec.img).replace(/"/g,'&quot;')}" width="${size}" height="${size}" style="object-fit:contain" alt="">`;
  const s=spec.shape||0,c1=spec.c1||'#2f6bff',c2=spec.c2||'#ffffff',uidc='c'+Math.random().toString(36).slice(2,7);
  const shapes=[
    'M50 6 90 18v34c0 22-18 36-40 44C28 88 10 74 10 52V18z',
    'M12 10h76v46c0 18-18 30-38 36C30 86 12 74 12 56z',
    'M50 6c22 8 40 8 40 8v38c0 24-18 38-40 46C28 90 10 76 10 52V14s18 0 40-8z',
    'M14 8h72l-6 60-30 24-30-24z',
    'M50 4a46 46 0 1 1 0 92 46 46 0 0 1 0-92z',
    'M10 10h80v44c0 24-22 36-40 42C32 90 10 78 10 54z'
  ];
  const d=shapes[s%shapes.length],sym=ST_SYMBOLS[(spec.sym||0)%ST_SYMBOLS.length];
  const band=s%3===0?`<path d="M10 40h80v16H10z" fill="${c2}" opacity=".9"/>`:s%3===1?`<path d="M50 6v90" stroke="${c2}" stroke-width="14" opacity=".85"/>`:`<path d="M10 62 90 30v20L10 82z" fill="${c2}" opacity=".85"/>`;
  return `<svg class="stcrest" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}"><defs><linearGradient id="${uidc}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c1}" stop-opacity=".62"/></linearGradient><clipPath id="${uidc}k"><path d="${d}"/></clipPath></defs><path d="${d}" fill="url(#${uidc})"/><g clip-path="url(#${uidc}k)">${band}</g><g fill="${c1==='#ffffff'?'#222':'#fff'}" stroke="${c2}" stroke-width="1" fill-opacity=".95" transform="translate(0,2)">${stSymbolPath(sym)}</g><path d="${d}" fill="none" stroke="${c2}" stroke-width="4"/><path d="${d}" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="1"/></svg>`;
}
const stCrestURL=(spec,size)=>spec&&spec.img?spec.img:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(stCrest(spec,size||128));

/* camisa (SVG) — kit: {pat:'liso|listras|faixa|metades|aros',c1,c2} */
function stKit(kit,size){
  kit=kit||{};size=size||80;
  const c1=kit.c1||'#1e5bd8',c2=kit.c2||'#ffffff',pat=kit.pat||'liso',id='k'+Math.random().toString(36).slice(2,7);
  const shirt='M30 14 14 26 4 50l14 6 6-12v50h52V44l6 12 14-6-10-24L70 14c-4 8-12 12-20 12s-16-4-20-12z';
  let ov='';
  if(pat==='listras')ov=[0,1,2,3,4].map(i=>`<rect x="${24+i*14}" y="8" width="7" height="100" fill="${c2}"/>`).join('');
  else if(pat==='faixa')ov=`<rect x="0" y="52" width="100" height="14" fill="${c2}"/>`;
  else if(pat==='metades')ov=`<rect x="50" y="8" width="50" height="100" fill="${c2}"/>`;
  else if(pat==='aros')ov=[0,1,2,3].map(i=>`<rect x="0" y="${34+i*20}" width="100" height="9" fill="${c2}"/>`).join('');
  else if(pat==='diagonal')ov=`<polygon points="0,30 100,64 100,84 0,50" fill="${c2}"/>`;
  return `<svg class="stkit" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${size}" height="${size*1.1}"><defs><clipPath id="${id}"><path d="${shirt}"/></clipPath><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs><path d="${shirt}" fill="${c1}"/><g clip-path="url(#${id})">${ov}</g><path d="${shirt}" fill="url(#${id}g)"/><path d="M38 14c4 7 8 10 12 10s8-3 12-10" fill="none" stroke="${c2}" stroke-width="4"/><path d="${shirt}" fill="none" stroke="rgba(0,0,0,.5)" stroke-width="1.5"/></svg>`;
}
/* bolas oficiais provisórias */
const ST_BALLS=[
  {id:'b1',n:'Clássica',a:'#ffffff',b:'#1a1a1a'},{id:'b2',n:'Estelar',a:'#f6f1d4',b:'#2b5fd9'},{id:'b3',n:'Neon',a:'#e9fff2',b:'#00b36b'},
  {id:'b4',n:'Rubi',a:'#fff0f0',b:'#d11f3a'},{id:'b5',n:'Ouro',a:'#fff7dc',b:'#c9971c'},{id:'b6',n:'Noturna',a:'#cdd6e6',b:'#1b2340'}
];
function stBall(id,size){
  const b=ST_BALLS.find(x=>x.id===id)||ST_BALLS[0],g='bl'+Math.random().toString(36).slice(2,6);size=size||48;
  return `<svg class="stball" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}"><defs><radialGradient id="${g}" cx="35%" cy="30%"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="${b.a}"/><stop offset="1" stop-color="#7d8798"/></radialGradient></defs><circle cx="50" cy="50" r="46" fill="url(#${g})" stroke="#222" stroke-width="2"/><polygon points="50,32 63,41 58,57 42,57 37,41" fill="${b.b}"/><g stroke="${b.b}" stroke-width="3" fill="none"><path d="M50 32V10M63 41l22-8M58 57l14 20M42 57 28 77M37 41 15 33"/></g><g fill="${b.b}" opacity=".85"><polygon points="50,8 60,12 56,20 44,20 40,12"/><polygon points="88,34 90,46 82,50 76,42 80,34"/><polygon points="74,80 66,88 58,82 62,72 70,72"/><polygon points="26,80 34,88 42,82 38,72 30,72"/><polygon points="12,34 20,34 24,42 18,50 10,46"/></g></svg>`;
}
/* avatar do jogador (SVG) a partir da semente do rosto */
const ST_SKIN=['#f1c9a5','#e0ac80','#c68a5c','#a86d43','#7a4a2b','#5b341d'],ST_HAIR=['#1b1209','#3a2412','#6a4423','#b88a45','#d8c06a','#9a9a9a','#7a1f12'];
function stAvatar(face,hue){
  face=face||{};const sk=ST_SKIN[(face.sk||0)%6],hr=ST_HAIR[(face.hr||0)%7],st=(face.st||0)%6,bg=`hsl(${hue||210} 38% 26%)`,jc=`hsl(${hue||210} 55% 46%)`;
  const hair=[
    `<path d="M32 36c0-14 8-20 18-20s18 6 18 20c-4-8-10-10-18-10s-14 2-18 10z" fill="${hr}"/>`,
    `<path d="M32 34c2-16 10-20 18-20s16 4 18 20c0-6-8-10-18-10s-16 4-18 10z" fill="${hr}"/><rect x="30" y="34" width="6" height="12" rx="3" fill="${hr}"/><rect x="64" y="34" width="6" height="12" rx="3" fill="${hr}"/>`,
    `<path d="M34 32c2-10 8-14 16-14s14 4 16 14c-6-4-10-5-16-5s-10 1-16 5z" fill="${hr}"/>`,
    `<circle cx="50" cy="26" r="17" fill="${hr}"/>`,
    ``,
    `<path d="M30 40c-2-18 8-26 20-26s22 8 20 26c-3-10-6-16-20-16s-17 6-20 16z" fill="${hr}"/>`
  ][st];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="${bg}"/><circle cx="50" cy="120" r="48" fill="${jc}"/><rect x="44" y="52" width="12" height="14" fill="${sk}"/><ellipse cx="50" cy="40" rx="17" ry="20" fill="${sk}"/>${hair}<circle cx="43.5" cy="42" r="1.8" fill="#222"/><circle cx="56.5" cy="42" r="1.8" fill="#222"/><path d="M45 50q5 3 10 0" stroke="#7a3b2a" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;
}
const stAvatarURL=(face,hue)=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(stAvatar(face,hue));

/* ---------- Geração do banco de cartas ---------- */
const ST_SLOTS_22=['GK','GK','CB','CB','CB','CB','LB','LB','RB','RB','CDM','CDM','CM','CM','CM','CAM','LM','RM','LW','RW','ST','ST'];
const ST_DB={players:[],byId:{},clubs:[],leagues:[],clubByName:{}};
(function buildDB(){
  const nationFor=(rng,lg)=>rng()<.55?lg.nat:rng.pick(ST_NAT_CODES);
  const used=new Set();
  const mkName=(rng,nat)=>{
    const N=ST_NATIONS[nat];
    for(let t=0;t<40;t++){const nm=rng.pick(N.f)+' '+rng.pick(N.l);if(!used.has(nm)){used.add(nm);return nm}}
    const nm=rng.pick(N.f)+' '+rng.pick(N.l)+' '+String.fromCharCode(65+rng.int(0,25))+'.';used.add(nm);return nm;
  };
  ST_LEAGUES.forEach((lg,li)=>{
    const L={id:lg.id,n:lg.n,nat:lg.nat,hue:lg.hue,clubs:[]};ST_DB.leagues.push(L);
    lg.clubs.forEach((cn,ci)=>{
      const rng=stRng('club:'+lg.id+':'+cn);
      const strength=stClamp(.5+rng.gauss()*.28,.02,1);
      const hue=(lg.hue+rng.int(-40,40)+360)%360;
      const club={id:lg.id+'-'+ci,n:cn,lg:lg.id,lgN:lg.n,hue,strength,crest:{shape:rng.int(0,5),c1:`hsl(${hue} 62% 42%)`,c2:rng()<.5?'#ffffff':`hsl(${(hue+rng.int(150,210))%360} 70% 62%)`,sym:rng.int(0,9)},pids:[]};
      ST_DB.clubs.push(club);L.clubs.push(club);ST_DB.clubByName[cn]=club;
      const slots=ST_SLOTS_22.slice();
      slots.forEach((pos0,si)=>{
        const pr=stRng('pl:'+club.id+':'+si);
        let pos=pos0;
        if(pos==='LB'&&pr()<.25)pos='LWB';else if(pos==='RB'&&pr()<.25)pos='RWB';else if(pos==='ST'&&pr()<.35)pos='CF';
        const nat=nationFor(pr,lg),name=mkName(pr,nat);
        let mu=56+strength*22+(si<2?-3:0),ovr=Math.round(mu+pr.gauss()*7.2);
        if(pr()<.012)ovr+=6;
        ovr=stClamp(ovr,41,91);
        const prof=ST_PROFILE[pos];
        const stats=prof.map(o=>stClamp(Math.round(ovr+o+pr.gauss()*3.2),18,99));
        const alts=(ST_POS_ALT[pos]||[]).filter(()=>pr()<.5);
        const rare=pr()<(ovr>=75?.34:ovr>=65?.26:.2);
        const p={id:'g'+club.id+'-'+si,name,pos,alt:alts,ovr,nat,league:lg.id,leagueN:lg.n,club:cn,clubId:club.id,stats,rar:rare?'raro':'comum',face:{sk:pr.int(0,5),hr:pr.int(0,6),st:pr.int(0,5)},hue,src:'g'};
        ST_DB.players.push(p);ST_DB.byId[p.id]=p;club.pids.push(p.id);
      });
    });
  });
  /* Heróis: ovr 83–89, ligados entre si pela liga "Heróis" */
  const hrng=stRng('heroes');
  for(let i=0;i<24;i++){
    const nat=hrng.pick(ST_NAT_CODES),pos=hrng.pick(['ST','CF','LW','RW','CAM','CM','CDM','CB','LB','RB','GK','LM','RM']),ovr=hrng.int(83,89),prof=ST_PROFILE[pos];
    const clubSrc=ST_DB.clubs[hrng.int(0,ST_DB.clubs.length-1)];
    const p={id:'h'+i,name:mkName(hrng,nat),pos,alt:(ST_POS_ALT[pos]||[]).slice(0,1),ovr,nat,league:'heroes',leagueN:ST_SPECIAL_LEAGUES.heroes,club:clubSrc.n,clubId:clubSrc.id,stats:prof.map(o=>stClamp(Math.round(ovr+o+hrng.gauss()*2.5),30,99)),rar:'heroi',face:{sk:hrng.int(0,5),hr:hrng.int(0,6),st:hrng.int(0,5)},hue:270,src:'h'};
    ST_DB.players.push(p);ST_DB.byId[p.id]=p;
  }
  /* Ídolos: ovr 90–96 */
  const irng=stRng('icons'),ipos=['ST','CAM','CM','CB','LW','RW','CDM','GK','LB','RB','CF','LM'];
  for(let i=0;i<12;i++){
    const nat=irng.pick(ST_NAT_CODES),pos=ipos[i],ovr=irng.int(90,96),prof=ST_PROFILE[pos];
    const p={id:'i'+i,name:mkName(irng,nat),pos,alt:(ST_POS_ALT[pos]||[]).slice(0,1),ovr,nat,league:'icons',leagueN:ST_SPECIAL_LEAGUES.icons,club:'Ídolos',clubId:'icons',stats:prof.map(o=>stClamp(Math.round(ovr+o+irng.gauss()*2),40,99)),rar:'idolo',face:{sk:irng.int(0,5),hr:irng.int(0,6),st:irng.int(0,5)},hue:45,src:'i'};
    ST_DB.players.push(p);ST_DB.byId[p.id]=p;
  }
})();
const ST_EXTRA_LG={};
const ST_LEAGUE_NAME=id=>(ST_DB.leagues.find(l=>l.id===id)||{n:ST_SPECIAL_LEAGUES[id]||ST_EXTRA_LG[id]||id}).n;

/* ---------- Semana (segunda a domingo, horário local) e dia ---------- */
function stWeekStart(d){d=new Date(d||Date.now());d.setHours(0,0,0,0);const wd=(d.getDay()+6)%7;d.setDate(d.getDate()-wd);return d}
function stWeekId(d){const s=stWeekStart(d);return s.getFullYear()+'-'+String(s.getMonth()+1).padStart(2,'0')+'-'+String(s.getDate()).padStart(2,'0')}
function stDayId(d){d=new Date(d||Date.now());return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
/* fim de semana de competição: sábado e domingo */
function stIsWeekend(d){const wd=new Date(d||Date.now()).getDay();return wd===6||wd===0}

/* Time da Semana gerado: 12 cartas boas ganham versão especial válida na semana */
const ST_TOTW_CACHE={};
function stTotwOfWeek(wid){
  if(ST_TOTW_CACHE[wid])return ST_TOTW_CACHE[wid];
  const rng=stRng('totw:'+wid),pool=ST_DB.players.filter(p=>(p.src==='g'||p.src==='c')&&p.ovr>=70&&p.ovr<=90);
  const out=[],seen=new Set();
  while(out.length<12&&seen.size<pool.length){
    const p=rng.pick(pool);if(seen.has(p.id))continue;seen.add(p.id);
    const up=rng.int(3,9);
    out.push({...p,id:p.id+'~'+wid,base:p.id,ovr:Math.min(94,p.ovr+up),rar:'totw',stats:p.stats.map(v=>Math.min(99,v+rng.int(2,up+1))),wk:wid});
  }
  return ST_TOTW_CACHE[wid]=out;
}

/* ---------- Valor de mercado e faixas de preço ---------- */
const ST_VAL_PTS=[[40,100],[55,150],[64,300],[69,550],[74,900],[75,1000],[77,1300],[79,1800],[80,2300],[82,3600],[84,7500],[85,12000],[86,20000],[87,32000],[88,50000],[89,80000],[90,130000],[92,320000],[94,800000],[96,1800000],[99,4000000]];
function stBaseValue(ovr){
  const P=ST_VAL_PTS;if(ovr<=P[0][0])return P[0][1];
  for(let i=1;i<P.length;i++)if(ovr<=P[i][0]){const [a,va]=P[i-1],[b,vb]=P[i],t=(ovr-a)/(b-a);return Math.exp(Math.log(va)+(Math.log(vb)-Math.log(va))*t)}
  return P[P.length-1][1];
}
const ST_RAR_MUL={comum:1,raro:1.35,totw:2.3,heroi:2.8,idolo:5,especial:3.5};
function stRound(v){return v<1000?Math.max(50,Math.round(v/50)*50):v<10000?Math.round(v/100)*100:v<100000?Math.round(v/250)*250:Math.round(v/1000)*1000}
const stValue=c=>stRound(stBaseValue(c.ovr)*(ST_RAR_MUL[c.rar]||1));
const stRange=c=>{const v=stValue(c);return{min:stRound(v*.55),max:stRound(v*2.2)}};
const stQuickSell=c=>Math.max(50,Math.round(stValue(c)*.18/10)*10);
const stTier=ovr=>ovr>=75?'ouro':ovr>=65?'prata':'bronze';

/* ---------- Pacotes ---------- */
/* odds = chance de a melhor carta do pacote cair em cada faixa [≥75, ≥82, ≥86, ≥90] (exibido ao jogador) */
const ST_PACKS={
  bronze:{n:'Pacote Bronze',cards:5,price:600,lo:42,hi:64,odds:null,fill:{lo:42,hi:64},info:'5 cartas bronze.'},
  prata:{n:'Pacote Prata',cards:5,price:2500,lo:65,hi:74,odds:null,fill:{lo:55,hi:74},info:'5 cartas, melhor entre 65 e 74.'},
  ouro:{n:'Pacote Ouro Padrão',cards:5,price:8000,lo:75,odds:[1,.25,.035,.002],fill:{lo:60,hi:79},info:'5 cartas com pelo menos 1 jogador 75+.'},
  ouroPremium:{n:'Pacote Ouro Premium',cards:5,price:16000,lo:75,odds:[1,.45,.072,.008],fill:{lo:70,hi:82},info:'5 cartas, mais chances de 82+.'},
  ouroRaro:{n:'Pacote Ouro Raro Único',cards:5,price:32000,lo:82,odds:[1,1,.22,.025],fill:{lo:75,hi:84},rareOnly:true,unique:true,info:'5 cartas raras que você ainda não tem. Pelo menos 1 jogador 82+.'},
  elite:{n:'Pacote Elite',cards:5,price:null,lo:86,odds:[1,1,1,.22],fill:{lo:78,hi:86},rareOnly:true,unique:true,info:'Só por recompensa. Garante um jogador 86+.'},
  promo10:{n:'Pacote 10 Ouro Únicos 83+',cards:10,price:null,lo:83,odds:[1,1,.12,.01],fill:{lo:83,hi:88},rareOnly:false,unique:true,allBest:true,info:'10 jogadores ouro únicos de 83 ou mais.'},
  treinador:{n:'Pacote de Treinador',cards:1,price:3500,kind:'manager',info:'1 carta de treinador (liga e nação para a química).'},
  estadio:{n:'Pacote de Estádio',cards:1,price:4500,kind:'stadium',info:'1 carta de estádio para o seu clube.'},
  inicial:{n:'Pacote Inicial',cards:23,price:null,kind:'starter',info:'O elenco inicial do seu clube.'}
};
const ST_PACK_ORDER=['bronze','prata','ouro','ouroPremium','ouroRaro','treinador','estadio'];

/* ---------- Treinadores e estádios ---------- */
const ST_MANAGERS=(()=>{
  const out=[],rng=stRng('managers'),firsts=['Marcelo','Ottavio','Henri','Gareth','Dieter','Joaquín','Nuno','Cássio','Raimundo','Ilan','Yusuf','Anselmo'];
  ST_LEAGUES.forEach((lg,i)=>{
    const nat=lg.nat,N=ST_NATIONS[nat];
    out.push({id:'m'+i,name:rng.pick(N.f)+' '+rng.pick(N.l),nat,league:lg.id,leagueN:lg.n,rar:i%3===0?'raro':'comum',kind:'manager',hue:lg.hue,face:{sk:rng.int(0,5),hr:5,st:rng.int(0,5)}});
  });
  for(let i=0;i<8;i++){const nat=ST_NAT_CODES[(i*2+1)%ST_NAT_CODES.length],lg=ST_LEAGUES[(i*3)%ST_LEAGUES.length],N=ST_NATIONS[nat];out.push({id:'m'+(8+i),name:rng.pick(N.f)+' '+rng.pick(N.l),nat,league:lg.id,leagueN:lg.n,rar:'comum',kind:'manager',hue:lg.hue,face:{sk:rng.int(0,5),hr:5,st:rng.int(0,5)}})}
  return out;
})();
const ST_STADIUMS=[
  {id:'s0',name:'Arena Estrela',cap:20000,hue:215},{id:'s1',name:'Estádio Aurora',cap:32000,hue:140},{id:'s2',name:'Coliseu Meridiano',cap:45000,hue:200},
  {id:'s3',name:'Titã Park',cap:52000,hue:0},{id:'s4',name:'Gran Polaris',cap:60000,hue:235},{id:'s5',name:'Vanguarda Dome',cap:68000,hue:270},
  {id:'s6',name:'Orion Arena',cap:75000,hue:35},{id:'s7',name:'Cometa Stadium',cap:82000,hue:350}
];
function stStadiumImg(s){
  if(s&&s.pid&&String(s.pid).startsWith('rt:')&&typeof teamOf==='function'){const t=teamOf(String(s.pid).slice(3));if(t&&t.stadiumImg)return t.stadiumImg}
  const h=(s&&s.hue)||(s&&s.name?stHash(s.name)%360:210);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${h} 50% 14%)"/><stop offset="1" stop-color="hsl(${h} 40% 30%)"/></linearGradient></defs><rect width="400" height="160" fill="url(#g)"/>${Array.from({length:14},(_,i)=>`<rect x="${i*30}" y="${30+(i%3)*6}" width="22" height="${60-(i%3)*6}" fill="hsl(${h} 30% ${22+(i%4)*4}%)" opacity=".85"/>`).join('')}<g fill="#fff" opacity=".9">${Array.from({length:60},(_,i)=>`<circle cx="${(i*53)%400}" cy="${24+((i*37)%70)}" r="1.3"/>`).join('')}</g><rect y="108" width="400" height="52" fill="hsl(130 45% 26%)"/></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}

/* ---------- Modos de jogo: tabelas ---------- */
const ST_DIVS=[10,9,8,7,6,5,4,3,2,1,0];                       // 0 = Elite
const ST_DIV_NAME=d=>d===0?'Elite':'Divisão '+d;
const ST_DIV_PTS={10:9,9:9,8:12,7:12,6:15,5:15,4:18,3:21,2:24,1:30,0:0};       // pontos para subir
const ST_DIV_AI={10:60,9:64,8:68,7:72,6:76,5:79,4:82,3:85,2:88,1:90,0:92};      // OVR médio dos rivais gerados
const ST_RIVALS_REWARDS=[   // vitórias na semana → recompensa (multiplicada pela divisão)
  {w:3,coins:500},{w:5,coins:1200},{w:8,coins:2500,pack:'prata'},{w:10,coins:4000},{w:15,coins:7000,pack:'ouro'},{w:20,coins:12000,pack:'ouroPremium'},{w:25,coins:20000},{w:30,coins:35000,pack:'ouroRaro'}
];
const ST_RIVALS_QUALIFY_WINS=10;
const ST_SB_LEVELS=[
  {id:0,n:'Iniciante',ovr:60,pts:10,coins:100},{id:1,n:'Semiprofissional',ovr:68,pts:20,coins:200},{id:2,n:'Profissional',ovr:75,pts:35,coins:350},
  {id:3,n:'Mundial',ovr:81,pts:55,coins:500},{id:4,n:'Lendário',ovr:86,pts:80,coins:800},{id:5,n:'Ultimate',ovr:90,pts:110,coins:1200}
];
const ST_SB_REWARDS=[{p:100,coins:1000},{p:300,coins:2500,pack:'prata'},{p:600,coins:5000,pack:'ouro'},{p:1000,coins:8000,pack:'ouroPremium'},{p:1600,coins:14000},{p:2400,coins:22000,pack:'ouroRaro'}];
const ST_CH_TIERS=[
  {p:0,coins:1500},{p:24,coins:5000,packs:['ouro']},{p:32,coins:10000,packs:['ouroPremium']},{p:40,coins:20000,packs:['ouroPremium','ouroPremium']},
  {p:48,coins:30000,packs:['ouroRaro']},{p:56,coins:45000,packs:['ouroRaro','ouroRaro']},{p:64,coins:70000,packs:['elite']},{p:72,coins:100000,packs:['elite','ouroRaro']},{p:80,coins:150000,packs:['elite','elite']}
];
const ST_CH_GAMES=20;
const ST_DRAFT_FEE=5000;
const ST_DRAFT_REWARDS=[{coins:500},{coins:2000,packs:['prata']},{coins:5000,packs:['ouro']},{coins:10000,packs:['ouroPremium']},{coins:20000,packs:['ouroRaro']}];
const ST_DAILY_PACK={pack:'bronze',cd:24*3600e3};

/* ---------- DME (Desafios de Montagem de Elenco) ---------- */
/* req: {n:nº de cartas, ovr:média mínima, tier:'bronze|prata|ouro', rare:min raras, league:min mesma liga, nat:min mesma nação, club:min mesmo clube, chem:química mínima, sameNat:min, minOvr...}
   mode:'list' (só escolher cartas) | 'squad' (11 posições com química) */
const ST_SBC=[
  {id:'sbc1',n:'Aquecimento',desc:'Troque 2 cartas bronze por um pacote.',mode:'list',max:0,req:{n:2,tier:'bronze'},reward:{packs:['prata']},repeat:99},
  {id:'sbc2',n:'Reforço Prata',desc:'5 cartas prata para um pacote ouro.',mode:'list',req:{n:5,tier:'prata'},reward:{packs:['ouro']},repeat:99},
  {id:'sbc3',n:'Fundamentos',desc:'Monte um time médio de 66, com 3 da mesma liga.',mode:'squad',req:{n:11,ovr:66,league:3},reward:{packs:['ouro','ouro']},repeat:20},
  {id:'sbc4',n:'Time de Ouro',desc:'Média 75, 3 da mesma nação e química 14.',mode:'squad',req:{n:11,ovr:75,nat:3,chem:14},reward:{packs:['ouroPremium']},repeat:10},
  {id:'sbc5',n:'Rareza Pura',desc:'11 cartas, 6 raras, média 72.',mode:'squad',req:{n:11,ovr:72,rare:6},reward:{packs:['ouroPremium','treinador']},repeat:10},
  {id:'sbc6',n:'Elite 82',desc:'Média 82, 3 da mesma liga e química 22.',mode:'squad',req:{n:11,ovr:82,league:3,chem:22},reward:{packs:['ouroRaro'],coins:5000},repeat:5},
  {id:'sbc7',n:'Elite 86',desc:'Média 86 e química 24. O prêmio é um pacote Elite.',mode:'squad',req:{n:11,ovr:86,chem:24},reward:{packs:['elite']},repeat:2},
  {id:'sbc8',n:'Dez de Ouro',desc:'10 cartas ouro, média 80, 4 da mesma liga.',mode:'list',req:{n:10,tier:'ouro',ovr:80,league:4},reward:{packs:['promo10']},repeat:3},
  {id:'sbc9',n:'Casa Nova',desc:'Troque 3 cartas prata por um estádio.',mode:'list',req:{n:3,tier:'prata'},reward:{packs:['estadio']},repeat:99}
];

/* ---------- Objetivos ---------- */
const ST_OBJ_DAILY=[
  {id:'d_win1',n:'Vença 1 partida',ev:'win',goal:1,reward:{coins:500}},
  {id:'d_play3',n:'Jogue 3 partidas',ev:'play',goal:3,reward:{coins:600}},
  {id:'d_goal3',n:'Marque 3 gols',ev:'goal',goal:3,reward:{coins:400,packs:['bronze']}},
  {id:'d_pack1',n:'Abra 1 pacote',ev:'pack',goal:1,reward:{coins:300}}
];
const ST_OBJ_WEEKLY=[
  {id:'w_win10',n:'Vença 10 partidas',ev:'win',goal:10,reward:{coins:5000,packs:['ouro']}},
  {id:'w_goal20',n:'Marque 20 gols',ev:'goal',goal:20,reward:{coins:4000}},
  {id:'w_sbc1',n:'Complete 1 DME',ev:'sbc',goal:1,reward:{coins:3000,packs:['prata']}},
  {id:'w_riv3',n:'Vença 3 partidas no Rivals',ev:'rivalsWin',goal:3,reward:{coins:3500}}
];
const ST_OBJ_FOUND=[
  {id:'f_pack',n:'Abra o pacote inicial',ev:'pack',goal:1,reward:{coins:1000}},
  {id:'f_play',n:'Jogue a primeira partida',ev:'play',goal:1,reward:{coins:1000,packs:['prata']}},
  {id:'f_win',n:'Vença a primeira partida',ev:'win',goal:1,reward:{coins:1500}},
  {id:'f_sbc',n:'Complete seu primeiro DME',ev:'sbc',goal:1,reward:{coins:2000,packs:['ouro']}},
  {id:'f_list',n:'Anuncie um jogador no mercado',ev:'list',goal:1,reward:{coins:1000}},
  {id:'f_div9',n:'Suba para a Divisão 9',ev:'promo',goal:1,reward:{coins:3000,packs:['ouroPremium']}}
];

/* ---------- Opções de identidade ---------- */
const ST_KIT_PATTERNS=[['liso','Liso'],['listras','Listras'],['faixa','Faixa'],['metades','Metades'],['aros','Aros'],['diagonal','Diagonal']];
const ST_CREST_COLORS=['#2f6bff','#d11f3a','#0fa860','#f2b01e','#7a3bff','#10b8c9','#ff6a1f','#e8edf3','#111827','#e0457b'];
const ST_START_COINS=5000;
