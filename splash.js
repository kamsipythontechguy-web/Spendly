(() => {
  const style=document.createElement("style");
  style.textContent=`
    #spendlySplash{position:fixed;inset:0;z-index:9999;background:#061016;display:grid;place-items:center;transition:opacity .55s ease,visibility .55s ease}
    #spendlySplash.hide{opacity:0;visibility:hidden}
    .sp-splash{text-align:center;color:#fff}
    .sp-logo{width:84px;height:84px;border-radius:27px;background:#00dca0;color:#061016;display:grid;place-items:center;margin:auto;font:800 42px Manrope, sans-serif;box-shadow:0 18px 50px rgba(0,220,160,.25);animation:spPulse 1.1s ease infinite alternate}
    .sp-name{font:800 31px Manrope,sans-serif;margin-top:22px}.sp-tag{color:#7d8b94;letter-spacing:1.4px;font-size:12px;margin-top:5px}
    .sp-load{width:160px;height:4px;background:#152229;border-radius:99px;overflow:hidden;margin:28px auto 0}.sp-load i{display:block;height:100%;width:0;background:#00dca0;animation:spLoad 1.45s ease forwards}
    @keyframes spLoad{to{width:100%}}@keyframes spPulse{to{transform:translateY(-4px)}}
  `;
  document.head.appendChild(style);
  const splash=document.createElement("div");splash.id="spendlySplash";splash.innerHTML=`<div class="sp-splash"><div class="sp-logo">₦</div><div class="sp-name">Spendly</div><div class="sp-tag">Track • Save • Reach More</div><div class="sp-load"><i></i></div></div>`;
  document.body.appendChild(splash);
  setTimeout(()=>splash.classList.add("hide"),1700);setTimeout(()=>splash.remove(),2350);
})();
