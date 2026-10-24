// ============================================================
//  SINTROPÍA SOCIAL — nav.js
//  Barra de navegación, modal de login y toasts compartidos.
//
//  Depende de config.js (debe cargarse ANTES que este archivo):
//  usa CONFIG, Auth, sha256() y api() de config.js.
//
//  Uso en cada página:
//    <script src="config.js"></script>
//    <script src="nav.js"></script>
//    ...
//    <div id="sintro-nav"></div>
//    <script>SintroNav.render('#sintro-nav', 'inicio');</script>
// ============================================================

// ── AUTH SEGURO — TTL 8h ──
// NOTA: SS_AUTH coexiste con Auth (config.js).
// admin.html usa Auth y escribe en ss_admin / ss_user (sin TTL).
// nav.js usa SS_AUTH (ss_user_v2 / ss_admin_v2, con TTL 8h).
// ssGetUser() y ssIsAdmin() leen AMBOS sistemas.
// NO se migra ni borra ss_admin para no romper admin.html.
var SS_AUTH = (function(){
  var TTL = 8 * 60 * 60 * 1000;
  var USER_KEY = 'ss_user_v2';
  var ADMIN_KEY = 'ss_admin_v2';

  function _set(key, data){
    try{
      localStorage.setItem(key, JSON.stringify({
        data: data,
        expires: Date.now() + TTL
      }));
    }catch(e){}
  }

  function _get(key){
    try{
      var raw = JSON.parse(localStorage.getItem(key)||'null');
      if(!raw) return null;
      if(Date.now() > raw.expires){
        localStorage.removeItem(key);
        return null;
      }
      return raw.data;
    }catch(e){ return null; }
  }

  function _clear(key){ try{ localStorage.removeItem(key); }catch(e){} }

  return {
    setUser:  function(u){ _set(USER_KEY, u); },
    getUser:  function(){ return _get(USER_KEY); },
    setAdmin: function(a){ _set(ADMIN_KEY, a); },
    getAdmin: function(){ return _get(ADMIN_KEY); },
    isAdmin:  function(){ var a=_get(ADMIN_KEY); return !!(a&&a.token); },
    getToken: function(){ var a=_get(ADMIN_KEY); return (a&&a.token)||null; },
    logout:   function(){
      // Borra ambos sistemas para un logout completo
      _clear(USER_KEY); _clear(ADMIN_KEY);
      ['ss_user','ss_admin','sintropia_usuario_actual'].forEach(function(k){
        try{ localStorage.removeItem(k); }catch(e){}
      });
      window.location.href = 'index.html';
    }
  };
})();
// NOTA: migrate() eliminado — causaba que ss_admin se borrara en cada
// navegación de página, destruyendo la sesión de admin.html.

// ── Nav bar markup ──
// Nota: el nav tiene dos versiones de los items según sea admin o usuario normal.
// _sintroRenderUserState() actualiza los items de nav según el rol.
var SINTRO_NAV_HTML = `
<nav class="ss-nav">
  <a href="index.html" class="ss-nav-logo">
    <img src="logo.png" alt="Sintropía Social" onerror="this.style.display='none'"/>
    Sintropía Social
  </a>
  <ul class="ss-nav-links" id="ss-nav-links">
    <li><a href="index.html" data-navkey="inicio">Inicio</a></li>

    <!-- Item para usuarios normales -->
    <li id="ss-nav-herr-li">
      <div class="ss-dd" id="dd-herr">
        <button class="ss-dd-btn" onclick="ssDD('dd-herr')" data-navkey="herramientas">Herramientas
          <svg viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
        <div class="ss-dd-panel">
          <a href="herramientas.html" data-navkey="herramientas">Ver todas las herramientas</a>
          <a href="cursos.html" data-navkey="cursos">Cursos</a>
        </div>
      </div>
    </li>

    <!-- Item "Cursos" para admin (reemplaza Herramientas) -->
    <li id="ss-nav-admin-cursos-li" style="display:none;">
      <div class="ss-dd" id="dd-admin-cursos">
        <button class="ss-dd-btn" onclick="ssDD('dd-admin-cursos')" data-navkey="cursos">Cursos
          <svg viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
        <div class="ss-dd-panel">
          <a href="admin.html?tab=cursos#inscritos" data-navkey="cursos">Usuarios inscritos</a>
          <a href="admin.html?tab=cursos#acceso" data-navkey="cursos">Enviar liga de acceso</a>
          <a href="admin.html?tab=cursos#completados" data-navkey="cursos">Quién ya terminó</a>
          <a href="admin.html?tab=cursos#contenido" data-navkey="cursos">Elementos del curso</a>
          <a href="admin.html?tab=cursos#constancias" data-navkey="cursos">Constancias automáticas</a>
        </div>
      </div>
    </li>

    <!-- Servicios para usuarios normales -->
    <li id="ss-nav-servicios-li"><a href="servicios.html" data-navkey="servicios">Servicios</a></li>

    <!-- "Salud y crecimiento" para admin (reemplaza Servicios) -->
    <li id="ss-nav-admin-salud-li" style="display:none;"><a href="admin.html?tab=salud" data-navkey="salud">Salud y crecimiento</a></li>

    <li><a href="newsletter.html" data-navkey="blog">Newsletter</a></li>
    <li><a href="contribuir.html" data-navkey="contribuir">Contribuir</a></li>
    
  </ul>
  <div class="ss-nav-end">
    <span id="ss-nav-user">
      <a href="#" onclick="ssAbrirLogin();return false;" class="btn btn-ghost btn-sm">Entrar</a>
      <a href="registro.html" class="btn btn-primary btn-sm">Unete gratis</a>
    </span>
    <button class="ss-hamburger" onclick="ssMobileNav()" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>
`;

// ── Login modal + toast markup ──
var SINTRO_MODAL_HTML = `
<div class="ss-modal-bg" id="ss-login-modal" onclick="if(event.target===this)ssCerrarLogin()">
  <div class="ss-modal">
    <button class="ss-modal-close" onclick="ssCerrarLogin()">x</button>
    <h3>Iniciar sesion</h3>
    <p>Accede a tu cuenta para ver el repositorio completo.</p>
    <div id="ss-li-err" style="display:none;background:var(--err-bg);color:var(--err);padding:.6rem .9rem;border-radius:var(--r-sm);margin-bottom:1rem;font-size:.83rem;"></div>
    <div class="campo" style="margin-bottom:.85rem;"><label>Correo</label><input type="email" id="ss-li-email" placeholder="correo@ejemplo.com" onkeydown="if(event.key==='Enter')ssDoLogin()"/></div>
    <div class="campo" style="margin-bottom:1.25rem;"><label>Contrasena</label><input type="password" id="ss-li-pass" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" onkeydown="if(event.key==='Enter')ssDoLogin()"/></div>
    <button id="ss-li-btn" class="btn btn-primary" style="width:100%;" onclick="ssDoLogin()">Entrar</button>
    <p style="text-align:center;font-size:.83rem;margin-top:1rem;color:var(--tx-light);">No tienes cuenta? <a href="registro.html">Registrate gratis</a></p>
  </div>
</div>
<div id="ss-toast" class="ss-toast"></div>
`;

// ── Dropdown + mobile toggle ──
function ssDD(id){
  document.querySelectorAll('.ss-dd').forEach(function(d){ if(d.id!==id) d.classList.remove('open'); });
  document.getElementById(id).classList.toggle('open');
}
function ssMobileNav(){ document.getElementById('ss-nav-links').classList.toggle('open'); }
document.addEventListener('click',function(e){ if(!e.target.closest('.ss-dd')) document.querySelectorAll('.ss-dd').forEach(function(d){d.classList.remove('open');}); });

// ── AUTH ──
// Lee usuario de SS_AUTH (nuevo) o de Auth/ss_user (legado de admin.html / config.js)
function ssGetUser(){
  var u = SS_AUTH.getUser();
  if(u) return u;
  try{
    var legacy = JSON.parse(localStorage.getItem('ss_user')||
                            localStorage.getItem('sintropia_usuario_actual')||'null');
    if(legacy) return legacy;
  }catch(e){}
  try{
    if(typeof Auth !== 'undefined' && Auth.getUser) return Auth.getUser();
  }catch(e){}
  return null;
}
// Verifica si hay sesión admin activa en cualquiera de los dos sistemas
function ssIsAdmin(){
  if(SS_AUTH.isAdmin()) return true;
  try{
    var a = JSON.parse(localStorage.getItem('ss_admin')||'null');
    if(a && a.token) return true;
  }catch(e){}
  try{
    if(typeof Auth !== 'undefined' && Auth.isAdmin) return Auth.isAdmin();
  }catch(e){}
  return false;
}
function ssSetUser(u){ SS_AUTH.setUser(u); }
function ssLogout(){ SS_AUTH.logout(); }

// ── LOGIN MODAL ──
function ssAbrirLogin(){
  var m = document.getElementById('ss-login-modal');
  if(m) m.classList.add('open');
  else window.location.href='registro.html';
}
function ssCerrarLogin(){ var m=document.getElementById('ss-login-modal'); if(m) m.classList.remove('open'); }

var _sintroActivePage = null;

async function ssDoLogin(){
  var email = (document.getElementById('ss-li-email')||{}).value||'';
  var pass  = (document.getElementById('ss-li-pass')||{}).value||'';
  var err   = document.getElementById('ss-li-err');
  if(!email||!pass){ if(err){err.textContent='Completa todos los campos.';err.style.display='block';} return; }
  var btn = document.getElementById('ss-li-btn');
  if(btn){ btn.textContent='Entrando...'; btn.disabled=true; }
  try{
    var h = await sha256(pass);
    var r = await api('loginUsuario',{email:email,passHash:h});
    if(r&&r.ok){
      var _fixEnc=function(s){try{return s?decodeURIComponent(escape(s)):s;}catch(e){return s;}};
      ssSetUser({ token:r.token||('u_'+Date.now()), nombre:_fixEnc(r.nombre||''), email:r.email||email, isAdmin:r.isAdmin||false });
      if(_sintroActivePage === 'admin'){
        ssCerrarLogin();
        if(r.isAdmin) window.location.href='admin.html';
        else location.reload();
      } else {
        if(r.isAdmin || (r.token && r.token.indexOf('admin_')===0)){
          try{
            var ar = await api('loginAdmin',{email:email,passHash:h});
            if(ar&&ar.ok){
              localStorage.setItem('ss_admin', JSON.stringify({token:ar.token,email:ar.email}));
              SS_AUTH.setAdmin({token:ar.token,email:ar.email});
            }
          }catch(e){}
          ssCerrarLogin();
          window.location.href='admin.html';
        } else {
          ssCerrarLogin();
          location.reload();
        }
      }
    } else {
      if(err){ err.textContent=(r&&r.error)||'Correo o contrasena incorrectos.'; err.style.display='block'; }
      if(btn){ btn.textContent='Entrar'; btn.disabled=false; }
    }
  }catch(e){
    if(err){ err.textContent='Error de conexion.'; err.style.display='block'; }
    if(btn){ btn.textContent='Entrar'; btn.disabled=false; }
  }
}

// ── TOAST ──
function ssToast(msg,type){
  var t=document.getElementById('ss-toast');
  if(!t){ t=document.createElement('div'); t.id='ss-toast'; t.className='ss-toast'; document.body.appendChild(t); }
  t.textContent=msg; t.className='ss-toast show'+(type?' '+type:'');
  setTimeout(function(){ t.classList.remove('show'); },3200);
}

// ── Nav user-state rendering ──
// Lee el usuario desde TODOS los sistemas de auth posibles:
// SS_AUTH (nuevo), ss_user legado, Auth de config.js (admin.html)
function _sintroRenderUserState(){
  var u = ssGetUser();
  var isAdmin = ssIsAdmin();

  var el = document.getElementById('ss-nav-user');
  if(el){
    if(u && (u.nombre||u.email)){
      var label = u.nombre || u.email.split('@')[0];
      el.innerHTML = '<button onclick="ssLogout()" style="background:var(--morado,#631EEB);color:#fff;padding:.42rem .95rem;border-radius:999px;border:none;cursor:pointer;font-family:inherit;font-size:.82rem;font-weight:600;">'+label+' · Salir</button>';
    } else {
      // Mostrar botones de entrada si no hay sesión
      el.innerHTML = '<a href="#" onclick="ssAbrirLogin();return false;" class="btn btn-ghost btn-sm">Entrar</a><a href="registro.html" class="btn btn-primary btn-sm">Unete gratis</a>';
    }
  }

  // "Área interna" — visible para admins (usa ssIsAdmin() que lee ambos sistemas)
  var internalLi = document.getElementById('ss-nav-internal-li');
  if(internalLi){
    internalLi.style.display = isAdmin ? '' : 'none';
  }

  // Nav items: admin vs usuario normal
  // Admin: muestra "Cursos" y "Salud y crecimiento" en lugar de "Herramientas" y "Servicios"
  var herrLi = document.getElementById('ss-nav-herr-li');
  var adminCursosLi = document.getElementById('ss-nav-admin-cursos-li');
  var serviciosLi = document.getElementById('ss-nav-servicios-li');
  var adminSaludLi = document.getElementById('ss-nav-admin-salud-li');
  if(herrLi) herrLi.style.display = isAdmin ? 'none' : '';
  if(adminCursosLi) adminCursosLi.style.display = isAdmin ? '' : 'none';
  if(serviciosLi) serviciosLi.style.display = isAdmin ? 'none' : '';
  if(adminSaludLi) adminSaludLi.style.display = isAdmin ? '' : 'none';

  // Footer "Panel interno" — inyectar dinámicamente cuando hay sesión (admin o usuario)
  _sintroInjectFooterLink(u, isAdmin);
}

// Inyecta el link "Panel interno" en el footer de la página cuando hay sesión
function _sintroInjectFooterLink(u, isAdmin){
  // Solo actuar si hay sesión
  if(!u && !isAdmin) return;
  // Buscar footer en la página
  var footer = document.querySelector('footer');
  if(!footer) return;
  // No duplicar
  if(document.getElementById('ss-footer-panel-link')) return;

  var href = isAdmin ? 'admin.html' : 'usuario.html';
  var label = isAdmin ? 'Panel interno' : 'Mi panel';
  var link = document.createElement('a');
  link.id = 'ss-footer-panel-link';
  link.href = href;
  link.textContent = label;
  link.style.cssText = 'font-size:.75rem;color:rgba(255,255,255,.45);text-decoration:none;display:inline-flex;align-items:center;gap:.3rem;padding:4px 12px;border:1px solid rgba(255,255,255,.12);border-radius:999px;transition:all .2s;';
  link.onmouseover = function(){ this.style.color='#fff'; this.style.borderColor='rgba(99,30,235,.5)'; };
  link.onmouseout = function(){ this.style.color='rgba(255,255,255,.45)'; this.style.borderColor='rgba(255,255,255,.12)'; };
  // Prefijar con un ícono
  link.innerHTML = (isAdmin ? '⚙️ ' : '👤 ') + label;
  footer.appendChild(link);
}

// ── Active-link marking ──
function _sintroMarkActive(key){
  if(!key) return;
  var links = document.querySelectorAll('[data-navkey="'+key+'"]');
  links.forEach(function(link){
    link.classList.add('active');
    if(link.tagName === 'BUTTON'){
      var dd = link.closest('.ss-dd');
      if(dd) dd.classList.add('active-parent');
    }
  });
}

// ── Punto de entrada público ──
var SintroNav = {
  render: function(mountSelector, activeKey){
    var mount = document.querySelector(mountSelector);
    if(!mount) return;
    _sintroActivePage = activeKey;
    mount.innerHTML = SINTRO_NAV_HTML;
    document.body.insertAdjacentHTML('beforeend', SINTRO_MODAL_HTML);
    _sintroMarkActive(activeKey);
    _sintroRenderUserState();
  }
};
