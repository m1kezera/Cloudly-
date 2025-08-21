(function () {
  if (window.__CLOUDLY_LITE__) return; window.__CLOUDLY_LITE__ = true;

  // ===== CONFIG (prioriza window.*, depois data-attrs) =====
  var w = window;
  var script = document.currentScript || (function(){
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();

  var apiAttr  = (script && script.getAttribute('data-api')) || '';
  var keyAttr  = (script && script.getAttribute('data-site-key')) || '';

  var api     = String(w.CLOUDLY_API || apiAttr || '').trim().replace(/\/+$/,''); // sem barra final
  var siteKey = String(w.CLOUDLY_SITE_KEY || keyAttr || '').trim() || 'cloudly123';

  var origin  = api || location.origin.replace(/\/+$/,'');
  var askURL  = origin + '/ask';
  var leadURL = origin + '/leads'; // <- PLURAL

  // ===== Styles =====
  var css = `
  .clw-fab{position:fixed;right:22px;bottom:22px;width:56px;height:56px;border:0;border-radius:999px;
    background:#22c55e;color:#001b09;font-weight:800;box-shadow:0 10px 30px rgba(0,0,0,.35);cursor:pointer;z-index:2147482999}
  .clw-panel{position:fixed;right:22px;bottom:90px;width:420px;max-width:96vw;height:620px;max-height:86vh;
    background:#0b1220;border:1px solid #1f2937;border-radius:16px;box-shadow:0 18px 60px rgba(0,0,0,.55);
    display:none;z-index:2147483000;overflow:hidden}
  .clw-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #111827;background:#0f172a}
  .clw-title{color:#e5e7eb;font-weight:800}
  .clw-close{background:#111827;border:1px solid #1f2937;color:#e5e7eb;border-radius:8px;padding:6px 10px;font-weight:700;cursor:pointer}
  .clw-body{height:calc(100% - 112px);padding:12px;overflow:auto}
  .clw-bubble{max-width:86%;padding:10px 12px;border-radius:12px;margin:8px 0;line-height:1.4;word-break:break-word}
  .clw-user{background:#1e293b;color:#e5e7eb;margin-left:auto}
  .clw-bot{background:#0f172a;color:#cbd5e1;border:1px solid #1f2937}
  .clw-foot{display:flex;gap:8px;padding:12px;border-top:1px solid #111827;background:#0f172a}
  .clw-input{flex:1;background:#0b1220;border:1px solid #1f2937;border-radius:10px;padding:10px;color:#e5e7eb}
  .clw-send{background:#3b82f6;color:#00112a;border:0;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer}
  .clw-typing{display:inline-flex;gap:6px;align-items:center}
  .clw-dot{width:6px;height:6px;border-radius:999px;background:#94a3b8;opacity:.25;animation:clw-blink 1s infinite}
  .clw-dot:nth-child(2){animation-delay:.15s}
  .clw-dot:nth-child(3){animation-delay:.3s}
  @keyframes clw-blink{0%,80%,100%{opacity:.25} 40%{opacity:1}}
  .clw-lead{background:#0f172a;border:1px solid #1f2937;border-radius:12px;padding:12px;margin:8px 0;color:#cbd5e1}
  .clw-lead h4{margin:0 0 8px 0;color:#e5e7eb}
  .clw-inp{width:100%;background:#0b1220;border:1px solid #1f2937;border-radius:8px;color:#e5e7eb;padding:10px;margin:6px 0}
  .clw-lead .clw-send{width:100%;margin-top:8px}
  @media (max-width:560px){.clw-panel{right:10px;bottom:86px;width:calc(100vw - 20px);height:70vh}}
  `;
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  // ===== DOM =====
  var fab = document.createElement('button');
  fab.className = 'clw-fab'; fab.setAttribute('aria-label','Ask Cloudly'); fab.textContent = '💬';

  var panel = document.createElement('div'); panel.className = 'clw-panel';
  panel.innerHTML = `
    <div class="clw-head">
      <div class="clw-title">Assistant</div>
      <button class="clw-close">✕</button>
    </div>
    <div class="clw-body"></div>
    <div class="clw-foot">
      <input class="clw-input" placeholder="Ask something..." />
      <button class="clw-send">Send</button>
    </div>
  `;
  var body  = panel.querySelector('.clw-body');
  var input = panel.querySelector('.clw-input');

  function open() { panel.style.display = 'block'; input.focus(); }
  function close(){ panel.style.display = 'none'; }
  panel.querySelector('.clw-close').onclick = close;
  fab.onclick = open;

  document.addEventListener('DOMContentLoaded', function(){
    document.body.appendChild(panel);
    document.body.appendChild(fab);
  });

  function bubble(text, who){
    var b = document.createElement('div');
    b.className = 'clw-bubble ' + (who==='user'?'clw-user':'clw-bot');
    b.textContent = text;
    body.appendChild(b);
    body.scrollTop = body.scrollHeight;
    return b;
  }

  function showTyping(){
    var b = document.createElement('div');
    b.className = 'clw-bubble clw-bot';
    b.innerHTML = '<span class="clw-typing"><span class="clw-dot"></span><span class="clw-dot"></span><span class="clw-dot"></span></span>';
    body.appendChild(b);
    body.scrollTop = body.scrollHeight;
    return b;
  }
  function hideTyping(node){ if (node && node.parentNode) node.parentNode.removeChild(node); }

  function renderLead(){
    var wrap = document.createElement('div');
    wrap.className = 'clw-lead';
    wrap.innerHTML = `
      <h4>Want us to reach out?</h4>
      <input class="clw-inp" data-k="name"  placeholder="Your name" />
      <input class="clw-inp" data-k="email" placeholder="Your email" />
      <textarea class="clw-inp" data-k="msg" rows="3" placeholder="What do you need?"></textarea>
      <button class="clw-send">Send</button>
    `;
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;

    var btn = wrap.querySelector('.clw-send');
    btn.onclick = async function(){
      var name  = (wrap.querySelector('[data-k="name"]').value||'').trim();
      var email = (wrap.querySelector('[data-k="email"]').value||'').trim();
      var msg   = (wrap.querySelector('[data-k="msg"]').value||'').trim();

      // validação simples
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!emailOk) { alert('Please enter a valid email'); return; }

      btn.disabled = true; btn.textContent = 'Sending…';
      try{
        // tenta /leads
        let res = await fetch(leadURL, {
          method:'POST',
          headers:{'Content-Type':'application/json','X-Site-Key':siteKey},
          body: JSON.stringify({ siteKey, name, email, message: msg, source:'widget-lite' })
        });

        // fallback para /lead se 404
        if (res.status === 404) {
          res = await fetch(origin + '/lead', {
            method:'POST',
            headers:{'Content-Type':'application/json','X-Site-Key':siteKey},
            body: JSON.stringify({ siteKey, name, email, message: msg, source:'widget-lite' })
          });
        }

        if (!res.ok) {
          const txt = await res.text().catch(()=>res.status);
          throw new Error('Lead failed: ' + txt);
        }

        wrap.innerHTML = `<h4>Thanks! 🎉</h4><div class="clw-muted">Our team will contact you soon.</div>`;
      }catch(err){
        console.error(err);
        wrap.innerHTML = `<h4>Sorry</h4><div class="clw-muted">Could not send your request now. Please try again later.</div>`;
      }
    };
  }

  async function ask(q){
    bubble(q,'user');
    input.value='';
    var typing = showTyping();

    try{
      const res = await fetch(askURL, {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'X-Site-Key': siteKey
        },
        body: JSON.stringify({ siteKey, question: q })
      });

      const data = await res.json().catch(()=> ({}));
      hideTyping(typing);

      const text =
        (data && (data.answer || data.response || data.text)) ||
        (res.ok ? 'No answer.' : ('Error '+res.status));
      bubble(text, 'bot');

      if (data && data.needsFollowUp) {
        renderLead();
      }
    }catch(e){
      hideTyping(typing);
      bubble('Error contacting API at '+askURL, 'bot');
      console.error(e);
    }
  }

  function send(){
    var q = (input.value||'').trim();
    if(!q) return;
    ask(q);
  }
  panel.querySelector('.clw-send').onclick = send;
  input.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); send(); }});

  // API pública para o site
  window.CLOUDLY_WIDGET_LITE = { open, close };
})();
