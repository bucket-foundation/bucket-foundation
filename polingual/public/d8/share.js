(()=>{const U="https://www.polingual.com/",T="Polingual: language learning for multilingual learners";
document.querySelectorAll('[data-slot="share"]').forEach(b=>b.addEventListener('click',async e=>{e.preventDefault();
if(navigator.share){try{await navigator.share({title:T,text:T,url:U})}catch(x){}return}
try{await navigator.clipboard.writeText(U);const o=b.textContent;b.textContent='Link copied';setTimeout(()=>b.textContent=o,1800)}catch(x){location.href='mailto:?subject='+encodeURIComponent(T)+'&body='+encodeURIComponent(U)}}))})();
