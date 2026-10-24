// ============================================================
//  SINTROPÍA SOCIAL — curso.js (Metodología de Práctica Social)
//  Va en TODAS las páginas del curso:  <script src="../curso.js"></script>
//  (en la portada: <script src="curso.js"></script>)
//
//  1. Acceso: sólo con la liga personal (acceso-curso.html?t=...).
//     El admin entra en modo vista previa (no guarda entregas).
//  2. Barra superior: volver al curso, módulo actual, nombre.
//  3. Portada: agrega a cada módulo sus enlaces (infografía, lectura,
//     actividad) y marca los módulos ya entregados.
//  4. Actividades: botón "Enviar mis respuestas" que guarda la entrega
//     en el servidor (hoja CursoEntregas) y registra el avance. Al
//     entregar los 6 módulos se emite la constancia automáticamente.
// ============================================================
(function(){
  'use strict';
  var CURSO = 'mps';
  var MODULOS = 6;
  var API = 'https://script.google.com/macros/s/AKfycby0B5nxI1nNybyp7UqtCB4ld8MC_NFg9tvEgamV3lTFVUxzLoDjyEIwh4l_leGYNQ_FiQ/exec';
  var SCRIPT = document.currentScript;
  var BASE = SCRIPT ? SCRIPT.src.replace(/curso\.js(\?.*)?$/, '') : '';
  var SITIO = BASE.replace(/cursos\/[^/]+\/$/, '');
  var m = location.pathname.match(/modulo-(\d)/);
  var MOD = m ? parseInt(m[1], 10) : 0;
  var ES_ACTIVIDAD = /_actividad\.html$/i.test(location.pathname);

  function rd(k, store){ try{ return JSON.parse((store||localStorage).getItem(k) || 'null'); }catch(e){ return null; } }
  function wr(k, v, store){ try{ (store||localStorage).setItem(k, JSON.stringify(v)); }catch(e){} }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  // ── Token del participante ──
  var qs = new URLSearchParams(location.search);
  var T = qs.get('t');
  var guardado = rd('ss_curso_acceso');
  if(T){ wr('ss_curso_acceso', { t: T, curso: CURSO }); }
  else if(guardado && guardado.t && (!guardado.curso || guardado.curso === CURSO)){ T = guardado.t; }
  if(T && qs.get('t')){ // quita el token de la barra de direcciones
    qs.delete('t');
    try{ history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '') + location.hash); }catch(e){}
  }
  var adm = rd('ss_admin') || ((rd('ss_admin_v2')||{}).data);
  var ES_ADMIN = !!(adm && adm.token);

  function jsonp(action, params){
    return new Promise(function(resolve){
      var cb = 'curso_cb_' + Date.now() + '_' + Math.floor(Math.random()*1e5);
      var q = '?action=' + action + '&callback=' + cb;
      Object.keys(params||{}).forEach(function(k){ q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); });
      var s = document.createElement('script'), done = false;
      function end(v){ if(done) return; done = true; try{ delete window[cb]; }catch(e){} if(s.parentNode) s.parentNode.removeChild(s); resolve(v); }
      window[cb] = end; s.onerror = function(){ end(null); }; setTimeout(function(){ end(null); }, 15000);
      s.src = API + q; document.head.appendChild(s);
    });
  }
  // POST "simple" (text/plain): no requiere permisos CORS y admite textos largos
  function post(payload){
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
      .then(function(r){ return r.json(); })
      .catch(function(){ return { ok: false, error: 'Sin conexión. Tus respuestas no se perdieron: vuelve a intentar.' }; });
  }

  // ── Estilos de la barra y avisos ──
  var css = '#cx-bar{position:sticky;top:0;z-index:9000;display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 16px;background:#0e0c18;border-bottom:1px solid rgba(99,30,235,.45);font-family:"Open Sauce Sans",Arial,sans-serif;font-size:14px;color:#f0eef8}' +
    '#cx-bar a{color:#f0eef8;text-decoration:none;font-weight:700}#cx-bar .cx-b{color:#FF7929;letter-spacing:.08em;text-transform:uppercase;font-size:12px}' +
    '#cx-bar .cx-sp{flex:1}#cx-bar .cx-u{color:rgba(240,238,248,.6);font-size:13px}#cx-bar .cx-adm{background:#FF7929;color:#fff;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:700}' +
    '#cx-gate{position:fixed;inset:0;z-index:99999;background:#0e0c18;color:#f0eef8;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:"Open Sauce Sans",Arial,sans-serif}' +
    '#cx-gate a{display:inline-block;margin-top:18px;background:#631EEB;color:#fff;padding:11px 22px;border-radius:12px;text-decoration:none;font-weight:700}' +
    '.cx-links{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.cx-links a{background:rgba(99,30,235,.18);border:1px solid rgba(99,30,235,.5);color:#f0eef8;text-decoration:none;padding:9px 16px;border-radius:10px;font-size:14px;font-weight:600}' +
    '.cx-links a.cx-act{background:#FF7929;border-color:#FF7929;color:#fff}.cx-done{display:inline-block;margin-left:8px;background:rgba(0,237,170,.15);color:#00EDAA;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700}' +
    '#cx-send{margin-top:18px;padding:16px;border:1px solid rgba(99,30,235,.5);border-radius:14px;background:rgba(99,30,235,.08);font-family:"Open Sauce Sans",Arial,sans-serif}' +
    '#cx-send button{background:#631EEB;color:#fff;border:none;border-radius:12px;padding:12px 22px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit}#cx-send button[disabled]{opacity:.6;cursor:default}' +
    '#cx-send p{margin:10px 0 0;font-size:14px;line-height:1.5}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function gate(msg){
    var g = document.createElement('div'); g.id = 'cx-gate';
    g.innerHTML = '<div style="max-width:440px"><div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#FF7929;font-weight:700">Metodología de Práctica Social</div>' +
      '<h1 style="font-size:26px;margin:12px 0">Este curso requiere tu liga de acceso</h1><p style="color:rgba(240,238,248,.65);line-height:1.6">' + esc(msg) + '</p>' +
      '<a href="' + SITIO + 'cursos.html">Ver el curso e inscribirme</a></div>';
    document.body.appendChild(g);
    document.documentElement.style.overflow = 'hidden';
  }

  function bar(nombre){
    var b = document.createElement('div'); b.id = 'cx-bar';
    b.innerHTML = '<a class="cx-b" href="' + BASE + 'index.html">← Práctica Social</a>' +
      (MOD ? '<span>Módulo ' + MOD + '</span>' : '<span>Portada del curso</span>') +
      '<span class="cx-sp"></span>' + (ES_ADMIN && !T ? '<span class="cx-adm">Vista de admin</span>' : '') +
      '<span class="cx-u">' + esc(nombre || '') + '</span>';
    document.body.insertBefore(b, document.body.firstChild);
  }

  // ── Portada: enlaces por módulo + avance ──
  function portada(avance){
    var cards = document.querySelectorAll('.module-card');
    cards.forEach(function(card, i){
      var n = i + 1; if(n > MODULOS) return;
      var body = card.querySelector('.module-body') || card;
      var d = document.createElement('div'); d.className = 'cx-links';
      d.innerHTML = '<a href="modulo-' + n + '/M' + n + '_infografia.html">Infografía</a>' +
        '<a href="modulo-' + n + '/M' + n + '_lectura.pdf" target="_blank" rel="noopener">Lectura (PDF)</a>' +
        '<a class="cx-act" href="modulo-' + n + '/M' + n + '_actividad.html">Actividad evaluable</a>';
      d.addEventListener('click', function(e){ e.stopPropagation(); });
      body.appendChild(d);
      if(avance.indexOf(String(n)) !== -1){
        var h = card.querySelector('.module-info h3');
        if(h) h.insertAdjacentHTML('beforeend', '<span class="cx-done">Entregado</span>');
      }
    });
  }

  // ── Actividades: envío real de respuestas ──
  function recolectar(){
    var out = {};
    document.querySelectorAll('input, select, textarea').forEach(function(el, i){
      var k = el.name || el.id || (el.tagName.toLowerCase() + '_' + i);
      if(el.type === 'button' || el.type === 'submit') return;
      if((el.type === 'radio' || el.type === 'checkbox')){ if(el.checked) out[k] = (out[k] ? out[k] + ', ' : '') + el.value; return; }
      if(String(el.value || '').trim()) out[k] = el.value;
    });
    return out;
  }
  function resultadosVisibles(){
    var r = document.getElementById('results') || document.getElementById('res');
    return r && r.offsetParent !== null ? r : null;
  }
  function montarEnvio(panel){
    if(document.getElementById('cx-send')) return;
    // Quita el botón falso "Enviar al LMS" y el aviso de "no se guarda"
    panel.querySelectorAll('button').forEach(function(b){ if(/Enviar al LMS/i.test(b.textContent)) b.style.display = 'none'; });
    panel.querySelectorAll('p').forEach(function(p){ if(/no se guarda autom/i.test(p.textContent)) p.textContent = 'La parte de revisión manual la califica tu facilitador/a después de que envíes tus respuestas.'; });
    var box = document.createElement('div'); box.id = 'cx-send';
    if(ES_ADMIN && !T){
      box.innerHTML = '<p><strong>Vista de admin:</strong> aquí el participante ve el botón "Enviar mis respuestas". En vista previa no se guarda nada.</p>';
      panel.appendChild(box); return;
    }
    box.innerHTML = '<button type="button">Enviar mis respuestas</button><p>Revisa tus respuestas abiertas antes de enviar. Puedes volver a enviar si corriges algo; se guarda la última versión.</p>';
    panel.appendChild(box);
    var btn = box.querySelector('button'), msg = box.querySelector('p');
    btn.onclick = function(){
      btn.disabled = true; btn.textContent = 'Enviando…';
      post({ action: 'enviarActividad', t: T, curso: CURSO, modulo: MOD,
             resultado: (panel.innerText || '').replace(/\s+\n/g, '\n').slice(0, 3000),
             respuestas: JSON.stringify(recolectar()) })
      .then(function(r){
        btn.disabled = false;
        if(r && r.ok){
          try{ sessionStorage.removeItem('cx_val_' + T); }catch(e){}
          btn.textContent = 'Enviado ✓ (volver a enviar)';
          msg.innerHTML = r.completo
            ? '<strong>¡Terminaste el curso!</strong> Te enviamos tu constancia por correo desde contacto@sintropiasocial.com.'
            : 'Listo, tu entrega del Módulo ' + MOD + ' quedó guardada. Llevas ' + (r.avance||[]).length + ' de ' + MODULOS + ' módulos. <a href="' + BASE + 'index.html" style="color:#FF7929">Volver al curso</a>';
        } else {
          btn.textContent = 'Enviar mis respuestas';
          msg.innerHTML = '<span style="color:#fca5a5">' + esc((r && r.error) || 'No se pudo enviar.') + '</span>';
        }
      });
    };
  }
  function vigilarActividad(){
    var check = function(){ var p = resultadosVisibles(); if(p) montarEnvio(p); };
    new MutationObserver(check).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class','style'] });
    check();
  }

  // ── Arranque ──
  function iniciar(){
    if(!T && ES_ADMIN){ bar('Admin'); if(!MOD) portada([]); if(ES_ACTIVIDAD) vigilarActividad(); return; }
    if(!T){ gate('Abre la liga personal que te llegó por correo desde contacto@sintropiasocial.com.'); return; }
    var cache = rd('cx_val_' + T, sessionStorage);
    var p = (cache && Date.now() - cache.at < 600000) ? Promise.resolve(cache.r) : jsonp('validarAccesoCurso', { t: T });
    p.then(function(r){
      if(!r || !r.ok){ gate((r && r.error) || 'No pudimos verificar tu acceso. Revisa tu conexión e intenta de nuevo.'); return; }
      if(r.curso && r.curso !== CURSO){ gate('Tu liga es de otro curso.'); return; }
      wr('cx_val_' + T, { at: Date.now(), r: r }, sessionStorage);
      bar(r.nombre);
      if(!MOD) portada(String(r.avance || '').split(',').filter(String));
      if(ES_ACTIVIDAD) vigilarActividad();
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
