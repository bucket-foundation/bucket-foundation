const H3=(a,b,c)=>`linear-gradient(${a} 0 33.3%,${b} 0 66.6%,${c} 0)`;
const V3=(a,b,c)=>`linear-gradient(90deg,${a} 0 33.3%,${b} 0 66.6%,${c} 0)`;
const POOL=[
{c:"fr",n:"French",w:"cent",ipa:"sɑ̃",lang:"fr-FR",f:"Nunito",bg:V3("#002654","#fff","#CE1126")},
{c:"il",n:"Hebrew",w:"מאה",ipa:"me'a",lang:"he-IL",f:"Noto Sans Hebrew",bg:"linear-gradient(#fff 0 14%,#0038B8 0 26%,#fff 0 74%,#0038B8 0 86%,#fff 0)",e:"✡",ec:"#0038B8",es:70},
{c:"gr",n:"Greek",w:"εκατό",ipa:"e.ka'to",lang:"el-GR",f:"Noto Sans",bg:"linear-gradient(90deg,#0D5EAF 0 0) 0 0/40% 55.5% no-repeat,repeating-linear-gradient(#0D5EAF 0 11.1%,#fff 0 22.2%)",e:"✚",ec:"#fff",es:64,ex:"20%",ey:"28%"},
{c:"eg",n:"Arabic",w:"مئة",ipa:"miʔa",lang:"ar-EG",f:"Noto Sans Arabic",bg:H3("#CE1126","#fff","#000"),e:"🦅",ec:"#C09300",es:40},
{c:"in",n:"Hindi",w:"सौ",ipa:"sɔː",lang:"hi-IN",f:"Noto Sans Devanagari",bg:H3("#FF9933","#fff","#138808"),e:"☸",ec:"#000080",es:62},
{c:"cn",n:"Chinese",w:"百",ipa:"bǎi",lang:"zh-CN",f:"Noto Sans SC",bg:"#EE1C25",e:"★",ec:"#FFDE00",es:58,ex:"24%",ey:"26%"},
{c:"es",n:"Spanish",w:"cien",ipa:"θjen",lang:"es-ES",f:"Nunito",bg:"linear-gradient(#AA151B 0 25%,#F1BF00 0 75%,#AA151B 0)"},
{c:"de",n:"German",w:"hundert",ipa:"ˈhʊndɐt",lang:"de-DE",f:"Nunito",bg:H3("#000","#DD0000","#FFCE00")},
{c:"it",n:"Italian",w:"cento",ipa:"ˈtʃɛnto",lang:"it-IT",f:"Nunito",bg:V3("#008C45","#F4F5F0","#CD212A")},
{c:"ru",n:"Russian",w:"сто",ipa:"sto",lang:"ru-RU",f:"Noto Sans",bg:H3("#fff","#0039A6","#D52B1E")},
{c:"jp",n:"Japanese",w:"百",ipa:"hʲakɯ",lang:"ja-JP",f:"Noto Sans SC",bg:"#fff",e:"●",ec:"#BC002D",es:110},
{c:"kr",n:"Korean",w:"백",ipa:"pɛk̚",lang:"ko-KR",f:"Noto Sans",bg:"#fff",e:"☯",ec:"#CD2E3A",es:90},
{c:"br",n:"Portuguese",w:"cem",ipa:"sẽj̃",lang:"pt-BR",f:"Nunito",bg:"#009C3B",e:"◆",ec:"#FFDF00",es:170},
{c:"tr",n:"Turkish",w:"yüz",ipa:"jyz",lang:"tr-TR",f:"Nunito",bg:"#E30A17",e:"☾",ec:"#fff",es:90},
{c:"ir",n:"Persian",w:"صد",ipa:"sæd",lang:"fa-IR",f:"Noto Sans Arabic",bg:H3("#239F40","#fff","#DA0000")},
{c:"ke",n:"Swahili",w:"mia",ipa:"ˈmi.a",lang:"sw-KE",f:"Nunito",bg:"linear-gradient(#000 0 30%,#fff 0 35%,#BB0000 0 65%,#fff 0 70%,#006600 0)"},
{c:"vn",n:"Vietnamese",w:"trăm",ipa:"ʈam",lang:"vi-VN",f:"Noto Sans",bg:"#DA251D",e:"★",ec:"#FFFF00",es:110},
{c:"th",n:"Thai",w:"ร้อย",ipa:"rɔ́ːj",lang:"th-TH",f:"Noto Sans",bg:"linear-gradient(#A51931 0 16%,#F4F5F8 0 33%,#2D2A4A 0 66%,#F4F5F8 0 83%,#A51931 0)"}];
const shuffled=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
const PALE=new Set(["jp","kr","il"]);
const TILES=shuffled(POOL.filter(t=>!PALE.has(t.c))).slice(0,6);
const SPK='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M16 8a5 5 0 0 1 0 8M18.5 5.5a8.5 8.5 0 0 1 0 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const byC=c=>POOL.find(t=>t.c===c);
function say(el,t){
 document.querySelectorAll('.tt.playing').forEach(x=>x.classList.remove('playing'));
 el.classList.add('playing');const done=()=>el.classList.remove('playing');
 const a=new Audio(`audio/${t.c}.m4a`);a.onended=done;
 a.play().catch(()=>{
  if(!('speechSynthesis' in window)){done();return}
  speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t.w);u.lang=t.lang;u.rate=.85;
  const v=speechSynthesis.getVoices().find(v=>v.lang.replace('_','-').startsWith(t.lang.slice(0,2)));if(v)u.voice=v;
  u.onend=done;u.onerror=done;speechSynthesis.speak(u)});
}
function style(t){return `--flag:${t.bg};--ec:${t.ec||'#000'};--es:${t.es||0}px${t.ex?`;--ex:${t.ex};--ey:${t.ey}`:';--ex:50%;--ey:50%'}`}
function inner(t,mode){
 const face="";
 if(mode==='bare')return `${face}<span class="em">${t.e||''}</span>`;
 return `${face}<span class="cc">${t.n}</span><div class="wd"><b class="${[...t.w].length>3?'long':''}" lang="${t.lang}" style="font-family:'${t.f}'">${t.w}</b><button class="snd" aria-label="Play ${t.n} ${t.w}">${SPK}</button></div><i>/${t.ipa}/</i>`;
}
function paint(el,t,mode){el.dataset.c=t.c;el.setAttribute('style',style(t)+(el.style.animationDelay?`;animation-delay:${el.style.animationDelay}`:''));el.innerHTML=inner(t,mode);}
function renderTiles(root,mode){
 const text=mode!=='bare';
 root.innerHTML=TILES.map(()=>`<div class="t${text?' tt':''}"></div>`).join('');
 const els=[...root.children];els.forEach((el,i)=>paint(el,TILES[i],text?'text':'bare'));
 if(text)els.forEach(el=>{el.onclick=()=>say(el,byC(el.dataset.c))});
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)els.forEach((el,i)=>{el.style.animationDelay=`${i*110}ms`;el.classList.add('deal');el.addEventListener('animationend',()=>{el.classList.remove('deal');el.style.animationDelay=''},{once:true})});
 if(root.dataset.cycle!==undefined)cycle(els,text?'text':'bare',+root.dataset.cycle||2200);
}
function cycle(els,mode,ms){
 const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let last=-1;
 setInterval(()=>{
  if(document.hidden)return;
  const shown=new Set(els.map(e=>e.dataset.c));
  const free=POOL.filter(t=>!shown.has(t.c));
  let i=Math.floor(Math.random()*els.length);
  if(i===last&&els.length>1)i=(i+1)%els.length;
  last=i;
  const el=els[i];
  if(el.matches(':hover')||el.classList.contains('playing')||!free.length)return;
  const t=free[Math.floor(Math.random()*free.length)];
  if(calm){paint(el,t,mode);return}
  el.classList.add('flip');
  setTimeout(()=>{paint(el,t,mode);el.classList.remove('flip');el.classList.add('flipin');setTimeout(()=>el.classList.remove('flipin'),320)},260);
 },calm?ms*2:ms);
}
if('speechSynthesis' in window)speechSynthesis.getVoices();
document.querySelectorAll('[data-tiles]').forEach(r=>renderTiles(r,r.dataset.tiles));
