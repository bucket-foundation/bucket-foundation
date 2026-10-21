(()=>{const K="bkt-d7-sound";let on=false,c=null;try{on=localStorage.getItem(K)==="1"}catch(e){}
const r=document.documentElement;r.classList.add("made-js");
const b=document.createElement("button");b.type="button";b.className="made-snd";
const set=()=>{b.setAttribute("aria-pressed",String(on));b.textContent=on?"Sound on":"Sound off"};set();
b.addEventListener("click",()=>{on=!on;try{localStorage.setItem(K,on?"1":"0")}catch(e){}set();if(on)play()});
const host=document.querySelector("header.bar,header.site,header.top,.apphead,.auth .art,nav[aria-label=Main]");if(host){host.appendChild(b)}else{const m=document.querySelector("main")||document.body;m.insertBefore(b,m.firstChild)};
function play(){try{c=c||new (window.AudioContext||window.webkitAudioContext)();const t=c.currentTime,sr=c.sampleRate,f=196,N=Math.round(sr/f),L=Math.round(sr*1.2),buf=c.createBuffer(1,L,sr),d=buf.getChannelData(0);for(let i=0;i<N;i++)d[i]=Math.random()*2-1;for(let i=N;i<L;i++)d[i]=.996*.5*(d[i-N]+d[i-N+1]);const s=c.createBufferSource(),g=c.createGain();g.gain.value=.25;s.buffer=buf;s.connect(g).connect(c.destination);s.start(t)}catch(e){}}
document.addEventListener("pointerdown",e=>{const t=e.target.closest(".btn,button,[role=tab],.chip,.opt");if(!t||t===b)return;t.classList.remove("made-press");void t.offsetWidth;t.classList.add("made-press");if(on)play()});
document.addEventListener("animationend",e=>e.target.classList&&e.target.classList.remove("made-press"));
const cards=document.querySelectorAll(".card,article,.res,.r");cards.forEach((el,i)=>el.style.setProperty("--mi",Math.min(i,12)));
r.classList.add("made-in")})();
