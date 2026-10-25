// ============================================================
//  SINTROPÍA SOCIAL — sesion.js
//  ÚNICA fuente de verdad de la sesión en TODO el sitio.
//
//  Se carga en el <head> de cada página, justo antes de </head>:
//    <script src="sesion.js"></script>
//  (Así la sesión ya está sincronizada cuando cada página la lee.)
//
//  Qué hace:
//   1. Unifica la sesión: cada página guardaba el login en llaves
//      distintas (ss_user, ss_user_v2, ss_admin, ss_admin_v2,
//      sintropia_usuario_actual) y cada página leía sólo algunas.
//      Por eso "se perdía" la sesión al cambiar de página.
//      Aquí se leen todas, se elige la más reciente y se copian a
//      todas las llaves, así cualquier página la reconoce.
//      La sesión se cierra tras 8 h SIN actividad (se renueva al navegar).
//   2. Botón de la barra homologado en todas las páginas: "David · Salir".
//   3. Si es admin: "Herramientas" → "Cursos" (con sus opciones) y
//      "Servicios" → "Salud y crecimiento".
//   4. Pie de página: "Panel interno" (admin) o "Mi perfil" (usuario).
//   5. Modo "dormir el sitio": si el admin lo activó, los visitantes
//      ven una pantalla de mantenimiento (requiere la acción
//      getEstadoSitio en Apps Script; si no existe, el sitio sigue normal).
// ============================================================
(function(){
  'use strict';

  var TTL = 8 * 60 * 60 * 1000;               // 8 h de inactividad
  var API_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_URL) ||
    'https://script.google.com/macros/s/AKfycby0B5nxI1nNybyp7UqtCB4ld8MC_NFg9tvEgamV3lTFVUxzLoDjyEIwh4l_leGYNQ_FiQ/exec';

  var LEGACY = ['ss_user','ss_user_v2','ss_admin','ss_admin_v2','sintropia_usuario_actual'];
  var META = 'ss_session';
  var ADMIN_NOMBRE = 'David Salgado López';
  var ADMIN_EMAILS = ['d.salgado.lpz@gmail.com','sintropiassociales@gmail.com','dsalgado@sintropiasocial.com'];

  // ── localStorage seguro ──
  function rd(k){ try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } }
  function wr(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function rm(k){ try{ localStorage.removeItem(k); }catch(e){} }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function unwrap(o){ return (o && o.data && typeof o.data === 'object') ? o.data : o; }
  function fp(o){ return o ? JSON.stringify([o.email||'', o.token||'', o.nombre||'']) : ''; }

  // ── 1. SINCRONIZAR SESIÓN ──
  function sync(){
    var now = Date.now();
    var meta = rd(META) || {};
    var cands = [unwrap(rd('ss_user')), unwrap(rd('ss_user_v2')), unwrap(rd('sintropia_usuario_actual'))]
      .filter(function(u){ return u && (u.email || u.nombre || u.token); });
    var admCands = [unwrap(rd('ss_admin')), unwrap(rd('ss_admin_v2'))]
      .filter(function(a){ return a && a.token; });

    // Sin nada guardado → sin sesión
    if(!cands.length && !admCands.length){ rm(META); return null; }

    // Expirada por inactividad → cerrar todo
    if(meta.expires && now > meta.expires){ clearAll(); return null; }

    // Elegir el más reciente: el que NO coincide con lo último que escribimos
    var user = cands.filter(function(u){ return fp(u) !== meta.u; })[0] || cands[0] || null;
    var admin = admCands.filter(function(a){ return fp(a) !== meta.a; })[0] || admCands[0] || null;

    // Si el admin entró por admin.html sólo hay token admin → crear perfil
    if(!user && admin){
      user = { nombre: admin.nombre || '', email: admin.email || '', token: admin.token, isAdmin: true };
    }
    // Usuario marcado como admin por el backend → asegurar token admin
    if(user && !admin && (user.isAdmin === true || String(user.token||'').indexOf('admin_') === 0)){
      admin = { token: user.token, email: user.email };
    }
    // Si admin y usuario son de correos distintos, gana el más reciente
    if(user && admin && user.email && admin.email &&
       user.email.toLowerCase() !== admin.email.toLowerCase()){
      if(fp(admin) !== meta.a) user = { nombre: admin.nombre||'', email: admin.email, token: admin.token, isAdmin:true };
      else admin = null;
    }
    if(user && admin){
      user.isAdmin = true;
      // El servidor no devuelve nombre para el admin (o devuelve "Admin")
      if(!user.nombre || /^admin$/i.test(String(user.nombre).trim())) user.nombre = ADMIN_NOMBRE;
    }

    // Escribir en TODAS las llaves para que cualquier página la lea
    var exp = now + TTL;
    wr('ss_user', user);
    wr('ss_user_v2', { data: user, expires: exp });
    if(rd('sintropia_usuario_actual')) wr('sintropia_usuario_actual', user);
    if(admin){
      wr('ss_admin', admin);
      wr('ss_admin_v2', { data: admin, expires: exp });
    } else { rm('ss_admin'); rm('ss_admin_v2'); }
    wr(META, { expires: exp, u: fp(user), a: fp(admin) });
    return { user: user, admin: admin };
  }

  function clearAll(){ LEGACY.concat([META]).forEach(rm); }

  function logout(){
    clearAll();
    try{ sessionStorage.removeItem('ss_estado_sitio'); sessionStorage.removeItem('ss_elevar_intento'); }catch(e){}
    window.location.href = 'index.html';
  }

  var S = sync();
  var USER = S && S.user;
  var IS_ADMIN = !!(S && S.admin && S.admin.token);

  function label(){
    if(!USER) return '';
    var n = (USER.nombre || '').trim();
    if(n) return n.split(/\s+/)[0];
    return USER.email ? USER.email.split('@')[0] : (IS_ADMIN ? 'Admin' : 'Usuario');
  }

  // Todas las funciones de "salir" que existían en el sitio ahora hacen lo mismo
  window.SSX = {
    logout: logout,
    user: function(){ return USER; },
    isAdmin: function(){ return IS_ADMIN; },
    adminToken: function(){ return S && S.admin ? S.admin.token : null; },
    dd: function(btn){
      var dd = btn.closest('.ss-dd'); if(!dd) return;
      var was = dd.classList.contains('open');
      document.querySelectorAll('.ss-dd.open').forEach(function(d){ d.classList.remove('open'); });
      if(!was) dd.classList.add('open');
    }
  };
  // Se re-aplica en boot() porque las páginas declaran sus propias funciones después
  function bindLogout(){
    ['cerrarSesion','ssLogout','_herrLogout','logout','logoutUser'].forEach(function(n){ window[n] = logout; });
    try{ if(typeof Auth !== 'undefined'){ Auth.logout = logout; Auth.logoutAdmin = logout; } }catch(e){}
    try{ if(typeof SS_AUTH !== 'undefined'){ SS_AUTH.logout = logout; } }catch(e){}
  }
  bindLogout();

  // ── 2. BOTÓN DE LA BARRA: "David · Salir" ──
  var BTN_STYLE = 'background:#631EEB;color:#fff;padding:.42rem .95rem;border-radius:999px;border:none;cursor:pointer;font-family:inherit;font-size:.82rem;font-weight:600;white-space:nowrap;';
  function renderNavUser(){
    if(!USER) return;                       // sin sesión: cada página conserva su botón "Entrar"
    var el = document.getElementById('ss-nav-user');
    if(!el) return;
    if(el.getAttribute('data-ssx') === '1' && el.querySelector('[data-ssx-btn]')) return;
    el.setAttribute('data-ssx','1');
    el.innerHTML = '<button data-ssx-btn type="button" onclick="SSX.logout()" style="'+BTN_STYLE+'">'+esc(label())+' · Salir</button>';
  }

  // ── 3. NAV DE ADMIN ──
  var CURSOS_LINKS = [
    ['admin.html?tab=cursos#inscritos',   'Usuarios inscritos',          'Quién está inscrito en cada curso'],
    ['admin.html?tab=cursos#acceso',      'Enviar liga de acceso',       'Habilita el curso y manda el correo'],
    ['admin.html?tab=cursos#completados', 'Quién ya terminó',            'Seguimiento de avance'],
    ['admin.html?tab=cursos#contenido',   'Elementos del curso',         'Módulos, recursos y evaluación'],
    ['admin.html?tab=cursos#constancias', 'Constancias automáticas',     'Al terminar el curso']
  ];
  var CHEV = '<svg viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  function adminNav(){
    if(!IS_ADMIN) return;
    // admin.html usa nav.js, que ya trae su propia versión admin
    if(document.getElementById('ss-nav-admin-cursos-li')) return;
    var nav = document.querySelector('nav.ss-nav') || document.querySelector('nav');
    if(!nav || nav.getAttribute('data-ssx-admin') === '1') return;
    nav.setAttribute('data-ssx-admin','1');

    // Herramientas → Cursos
    var herr = nav.querySelector('#dd-herr');
    if(herr){
      herr.innerHTML =
        '<button class="ss-dd-btn" type="button" onclick="event.stopPropagation();SSX.dd(this)">Cursos '+CHEV+'</button>'+
        '<div class="ss-dd-panel herr">'+
          CURSOS_LINKS.map(function(l){ return '<a href="'+l[0]+'"><span class="t">'+l[1]+'</span><span class="s">'+l[2]+'</span></a>'; }).join('')+
        '</div>';
    } else {
      // Páginas con nav sencillo (sin desplegables): un solo enlace
      nav.querySelectorAll('a[href="herramientas.html"]').forEach(function(a){
        a.textContent = 'Cursos'; a.href = 'admin.html?tab=cursos';
      });
      nav.querySelectorAll('a[href="cursos.html"]').forEach(function(a){
        var li = a.closest('li'); (li || a).style.display = 'none';
      });
    }

    // Servicios → Salud y crecimiento
    var serv = nav.querySelector('#dd-serv');
    var salud = document.createElement('a');
    salud.href = 'admin.html?tab=salud';
    salud.textContent = 'Salud y crecimiento';
    if(serv){ serv.parentNode.replaceChild(salud, serv); }
    else {
      nav.querySelectorAll('a[href="servicios.html"]').forEach(function(a){
        a.textContent = 'Salud y crecimiento'; a.href = 'admin.html?tab=salud';
      });
    }
  }

  // ── 4. PIE DE PÁGINA: "Panel interno" / "Mi perfil" ──
  function footerLink(){
    if(!USER && !IS_ADMIN) return;
    var old = document.getElementById('ss-footer-panel-link');
    if(old) old.remove();                    // reemplaza el que ponía nav.js
    var footers = document.querySelectorAll('footer');
    var footer = footers[footers.length - 1];
    var wrap = document.createElement('div');
    wrap.id = 'ss-footer-panel-link';
    wrap.style.cssText = 'width:100%;max-width:1280px;margin:1rem auto 0;padding:.9rem 16px 0;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:flex-end;align-items:center;gap:.6rem;font-size:.78rem;color:rgba(240,238,248,.45);box-sizing:border-box;flex-basis:100%;';
    wrap.innerHTML = '<span>Hecho en México</span><span>·</span>'+
      '<a href="usuario.html" style="color:rgba(240,238,248,.65);text-decoration:none;font-weight:600;">'+(IS_ADMIN ? 'Panel interno' : 'Mi perfil')+'</a>';
    if(footer){ footer.appendChild(wrap); }
    else {
      wrap.style.background = '#0e0c18';
      wrap.style.maxWidth = 'none';
      wrap.style.padding = '1rem 16px';
      wrap.style.margin = '0';
      document.body.appendChild(wrap);
    }
  }

  // ── 5. MODO DORMIR ──
  function jsonp(action, params){
    return new Promise(function(resolve){
      var cb = 'ssx_cb_' + Date.now() + '_' + Math.floor(Math.random()*1e5);
      var q = '?action=' + encodeURIComponent(action) + '&callback=' + cb;
      Object.keys(params||{}).forEach(function(k){ if(params[k] != null) q += '&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]); });
      var s = document.createElement('script'), done = false;
      function end(v){ if(done) return; done = true; try{ delete window[cb]; }catch(e){ window[cb] = undefined; } if(s.parentNode) s.parentNode.removeChild(s); resolve(v); }
      window[cb] = function(d){ end(d); };
      s.onerror = function(){ end(null); };
      setTimeout(function(){ end(null); }, 10000);
      s.src = API_URL + q;
      (document.body || document.head).appendChild(s);
    });
  }
  window.SSX.api = jsonp;

  function pagina(){
    var f = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/i,'');
    return f || 'index';
  }
  // Una sola llamada por página: cuenta la visita (Salud y crecimiento)
  // y responde si el sitio está dormido. El admin no cuenta ni se bloquea.
  function sleepCheck(){
    if(IS_ADMIN) return;
    if(/admin\.html$/i.test(location.pathname)) return;   // para poder entrar
    var cached = null;
    try{ cached = JSON.parse(sessionStorage.getItem('ss_estado_sitio') || 'null'); }catch(e){}
    if(cached && cached.dormido && Date.now() - cached.t < 120000) showSleep();
    jsonp('visita', { pagina: pagina() }).then(function(r){
      if(!r || !r.ok) return;
      try{ sessionStorage.setItem('ss_estado_sitio', JSON.stringify({ dormido: !!r.dormido, t: Date.now() })); }catch(e){}
      if(r.dormido) showSleep(); else hideSleep();
    });
  }
  function hideSleep(){ var d=document.getElementById('ssx-sleep'); if(d){ d.remove(); document.documentElement.style.overflow=''; } }

  // Reporte de errores de JavaScript → pestaña Salud (máx. 3 por página)
  var _errN = 0;
  window.addEventListener('error', function(ev){
    try{
      if(_errN >= 3) return;
      var src = ev.filename || '';
      if(src && src.indexOf(location.origin) !== 0) return;  // ignora extensiones y terceros
      if(!ev.message || /Script error/i.test(ev.message)) return;
      _errN++;
      var line = ev.lineno ? ' (línea ' + ev.lineno + ')' : '';
      jsonp('registrarError', { pagina: pagina(), mensaje: ev.message + line, ua: navigator.userAgent.slice(0,120) });
    }catch(e){}
  });

  function showSleep(){
    if(document.getElementById('ssx-sleep')) return;
    var d = document.createElement('div');
    d.id = 'ssx-sleep';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0e0c18;color:#f0eef8;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:inherit;';
    d.innerHTML = '<div style="max-width:440px;"><div style="font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:#FF7929;font-weight:700;margin-bottom:.8rem;">Sintropía Social</div>'+
      '<h1 style="font-size:1.8rem;margin:0 0 .8rem;">La plataforma está en reposo</h1>'+
      '<p style="color:rgba(240,238,248,.6);line-height:1.6;margin:0;">Regresa mañana desde temprano: ya estará abierta. Gracias por tu paciencia.</p></div>';
    document.body.appendChild(d);
    document.documentElement.style.overflow = 'hidden';
  }

  // ── 6. SESIÓN DE USUARIO ABIERTA CON CORREO DE ADMIN ──
  // Si la sesión se abrió antes de que el servidor reconociera al admin, se
  // pide al servidor que la convierta en sesión de admin (una vez por pestaña).
  function elevar(){
    if(IS_ADMIN || !USER || !USER.email) return;
    if(ADMIN_EMAILS.indexOf(String(USER.email).toLowerCase()) === -1) return;
    try{ if(sessionStorage.getItem('ss_elevar_intento')) return; sessionStorage.setItem('ss_elevar_intento','1'); }catch(e){}
    jsonp('elevarSesion', { token: USER.token || '' }).then(function(r){
      if(r && r.ok && r.isAdmin){
        USER.isAdmin = true;
        wr('ss_user', USER);
        wr('ss_admin', { token: USER.token, email: USER.email });
        location.reload();
      } else {
        avisoReentrar();
      }
    });
  }
  function avisoReentrar(){
    if(document.getElementById('ssx-reentrar')) return;
    var d = document.createElement('div');
    d.id = 'ssx-reentrar';
    d.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:520px;margin:0 auto;background:#1a1530;color:#f0eef8;border:1px solid #631EEB;border-radius:14px;padding:14px 16px;font-size:.88rem;line-height:1.5;box-shadow:0 10px 30px rgba(0,0,0,.4);font-family:inherit;';
    d.innerHTML = 'Tu correo es de administrador, pero esta sesión es anterior al cambio. '+
      '<button type="button" onclick="SSX.logout()" style="margin-left:.4rem;background:#FF7929;color:#fff;border:none;border-radius:999px;padding:.35rem .9rem;font-weight:700;cursor:pointer;font-family:inherit;">Salir y volver a entrar</button>';
    document.body.appendChild(d);
  }

  // ── Arranque: después de los scripts propios de cada página ──
  function apply(){ renderNavUser(); adminNav(); }
  function boot(){
    bindLogout();
    apply();
    footerLink();
    sleepCheck();
    elevar();
    // Si algún script de la página vuelve a pintar el botón, lo re-homologamos
    var el = document.getElementById('ss-nav-user');
    if(el && USER && window.MutationObserver){
      new MutationObserver(function(){ if(!el.querySelector('[data-ssx-btn]')){ el.removeAttribute('data-ssx'); renderNavUser(); } })
        .observe(el, { childList: true, subtree: true });
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 0); });
  else setTimeout(boot, 0);
  window.addEventListener('load', function(){ bindLogout(); apply(); });
})();
