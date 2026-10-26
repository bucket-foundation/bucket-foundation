(()=>{const KEY="pl-ads-consent",ES=document.documentElement.lang==="es";
const get=()=>{try{const v=localStorage.getItem(KEY);return v==="granted"||v==="denied"?v:null}catch(e){return null}};
const set=v=>{try{localStorage.setItem(KEY,v)}catch(e){}};
const add=src=>{const s=document.createElement("script");s.async=true;s.src=src;document.head.appendChild(s)};
let ids={meta:null,tiktok:null};
const load=()=>{const w=window;
if(ids.meta&&!w.fbq){const q=[];const f=function(){f.callMethod?f.callMethod.apply(f,arguments):q.push(arguments)};f.queue=q;f.push=f;f.loaded=true;f.version="2.0";w.fbq=w._fbq=f;add("https://connect.facebook.net/en_US/fbevents.js");f("init",ids.meta);f("track","PageView")}
if(ids.tiktok&&!w.ttq){const c=[];const st=n=>function(){c.push([n].concat([].slice.call(arguments)))};const t=Object.assign(c,{track:st("track"),page:st("page"),load:st("load")});w.TiktokAnalyticsObject="ttq";w.ttq=t;add("https://analytics.tiktok.com/i18n/pixel/events.js?sdkid="+encodeURIComponent(ids.tiktok)+"&lib=ttq");t.page()}};
const cookie=n=>(document.cookie.split("; ").find(c=>c.startsWith(n+"="))||"").slice(n.length+1)||undefined;
window.plAds={extras(){if(get()!=="granted")return{consent:false};const p=new URLSearchParams(location.search),utm={};["utm_source","utm_medium","utm_campaign","utm_content","utm_term"].forEach(k=>{const v=p.get(k);if(v)utm[k]=v});const fb=p.get("fbclid");return{consent:true,event_id:crypto.randomUUID(),utm,fbp:cookie("_fbp"),fbc:cookie("_fbc")||(fb?"fb.1."+Date.now()+"."+fb:undefined),ttclid:p.get("ttclid")||undefined}},
lead(id){if(get()!=="granted"||!id)return;window.fbq&&window.fbq("track","Lead",{},{eventID:id});window.ttq&&window.ttq.track("CompleteRegistration",{},{event_id:id})}};
const T=ES?{q:"¿Podemos usar los píxeles de Meta y TikTok para medir qué anuncios traen visitas?",p:"Privacidad",no:"No, gracias",yes:"Permitir"}:{q:"May we use Meta and TikTok pixels to measure which ads bring people here?",p:"Privacy",no:"No thanks",yes:"Allow"};
const bar=()=>{const d=document.createElement("div");d.setAttribute("role","region");d.setAttribute("aria-label",ES?"Medición de anuncios":"Ad measurement");d.style.cssText="position:fixed;left:16px;right:16px;bottom:16px;max-width:520px;margin:0 auto;background:#fff;color:#231F20;border:2px solid #E3D6B8;border-radius:16px;padding:14px 16px;font:15px/1.4 Nunito,sans-serif;box-shadow:0 6px 20px rgba(35,31,32,.18);z-index:98";
d.innerHTML='<p style="margin:0 0 12px"></p><div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" data-v="denied"></button><button type="button" data-v="granted"></button></div>';
d.querySelector("p").textContent=T.q+" ";const a=document.createElement("a");a.href="/privacy";a.textContent=T.p;a.style.color="#D9381E";d.querySelector("p").appendChild(a);
d.querySelectorAll("button").forEach(b=>{const yes=b.dataset.v==="granted";b.textContent=yes?T.yes:T.no;b.style.cssText="font:800 15px Nunito,sans-serif;padding:9px 16px;border-radius:10px;cursor:pointer;border:2px solid "+(yes?"#5B1A4A;background:#5B1A4A;color:#fff":"#E3D6B8;background:#fff;color:#231F20");b.onclick=()=>{set(b.dataset.v);d.remove();if(yes)load()}});document.body.appendChild(d)};
fetch("/api/ads").then(r=>r.ok?r.json():null).then(j=>{if(!j||!(j.meta||j.tiktok))return;ids=j;const c=get();if(c==="granted")load();else if(c===null)bar()}).catch(()=>{});})();
