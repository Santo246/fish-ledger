/* Fish Farm Ledger - Supabase add-on: email OTP sign-in + cloud sync.
   If config.js is not filled in, this file does nothing and the app works on the phone only. */
(function () {
  var C = window.FLCONFIG || {};
  var U = C.SUPABASE_URL || '', K = C.SUPABASE_ANON_KEY || '';
  if (!U || !K || /YOUR_/.test(U + K) || !window.supabase) return;
  var sb = window.supabase.createClient(U, K);
  var user = null, Q = {}, tm = null, quiet = false;

  /* ---------- sync ---------- */
  var _save = window.save, _saveBiz = window.saveBiz, _load = window.load, keepU = false;
  window.save = function () { if (S && !keepU) S.__u = Date.now(); _save(); if (!quiet) push('d:' + BIZ.cur, S); };
  /* load() calls save() internally; that must not count as an edit (it would make stale data look "newest") */
  window.load = function () { keepU = true; quiet = true; try { _load(); } finally { keepU = false; quiet = false; } };
  function afterLoad() { if (typeof UNL !== 'undefined' && !UNL) view = 'auth'; }
  function remember() { try { localStorage.setItem('fl-cloud-uid', user.id); } catch (e) {} }
  function wipeLocal() {
    try {
      var ks = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && (k.indexOf(KEY) === 0 || k === BK || k.indexOf('file_') === 0 || k.indexOf('img_') === 0)) ks.push(k);
      }
      ks.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
    Q = {}; BIZ = { list: [{ id: 'b1', name: '' }], cur: 'b1' };
    S = null; load(); afterLoad();
  }
  window.saveBiz = function () { BIZ.u = Date.now(); _saveBiz(); if (!quiet) push('biz', { list: BIZ.list, cur: BIZ.cur, u: BIZ.u }); };

  function push(k, d) { if (!user) return; Q[k] = d; clearTimeout(tm); tm = setTimeout(flush, 1500); }
  function flush() {
    if (!user) return Promise.resolve();
    var keys = Object.keys(Q);
    if (!keys.length) return Promise.resolve();
    var rows = keys.map(function (k) { return { user_id: user.id, key: k, data: Q[k], updated_at: new Date().toISOString() }; });
    var sent = Q; Q = {};
    return sb.from('ledger').upsert(rows, { onConflict: 'user_id,key' }).then(function (r) {
      if (r.error) { Object.keys(sent).forEach(function (k) { if (!Q[k]) Q[k] = sent[k]; }); clearTimeout(tm); tm = setTimeout(flush, 15000); }
    }, function () { Object.keys(sent).forEach(function (k) { if (!Q[k]) Q[k] = sent[k]; }); clearTimeout(tm); tm = setTimeout(flush, 15000); });
  }
  function pull() {
    return sb.from('ledger').select('key,data').then(function (r) {
      if (r.error) { toast('Could not load cloud data'); return; }
      var rem = {}, changed = false;
      (r.data || []).forEach(function (x) { rem[x.key] = x.data; });
      var rb = rem['biz'];
      if (rb && rb.list && rb.list.length && (rb.u || 0) > (BIZ.u || 0)) {
        BIZ.list = rb.list; if (rb.cur) BIZ.cur = rb.cur; BIZ.u = rb.u;
        quiet = true; _saveBiz(); quiet = false; changed = true;
      }
      BIZ.list.forEach(function (b) {
        var k = 'd:' + b.id, rd = rem[k], ld = null;
        try { var raw = localStorage.getItem(dkey(b.id)); ld = raw ? JSON.parse(raw) : null; } catch (e) {}
        if (rd && (!ld || (rd.__u || 0) > (ld.__u || 0))) {
          try { localStorage.setItem(dkey(b.id), JSON.stringify(rd)); } catch (e) {}
          if (b.id === BIZ.cur) changed = true;
        } else if (ld && (!rd || (ld.__u || 0) > (rd.__u || 0))) {
          if (!ld.__u) ld.__u = Date.now();
          Q[k] = ld;
        }
      });
      if (!rb || (BIZ.u || 0) > (rb.u || 0)) Q['biz'] = { list: BIZ.list, cur: BIZ.cur, u: BIZ.u || Date.now() };
      clearTimeout(tm); tm = setTimeout(flush, 300);
      if (changed) { S = null; load(); afterLoad(); render(); }
    });
  }

  /* ---------- email OTP sign-in screen ---------- */
  var IS = 'width:100%;padding:14px;border:0;border-radius:14px;font-size:18px;text-align:center;margin:8px 0;color:#0f172a;background:#fff';
  var BS = 'width:100%;padding:14px;border:0;border-radius:999px;background:#fff;color:#0b1240;font-weight:700;font-size:17px;margin-top:8px';
  var LS = 'border:0;background:none;color:#b9c6f2;text-decoration:underline;font-size:14px;margin-top:14px';
  function screen(h) {
    var old = document.getElementById('cl'); if (old) old.remove();
    var o = document.createElement('div'); o.id = 'cl';
    o.style.cssText = 'position:fixed;inset:0;z-index:300;background:linear-gradient(150deg,#0b1240,#26379f 60%,#0e9bb8);display:flex;align-items:center;justify-content:center;padding:24px;color:#fff;font-family:Inter,system-ui,sans-serif;text-align:center';
    o.innerHTML = '<div style="width:100%;max-width:360px">' + h + '</div>';
    document.body.appendChild(o); return o;
  }
  function err(t) { var e = document.getElementById('cle'); if (e) e.textContent = t || ''; }
  function showLogin(msg) {
    screen('<div style="font-size:26px;font-weight:800">Fish Farm Ledger</div><p style="color:#b9c6f2;margin:8px 0 18px">Sign in with your email. We will send you a code.</p><input id="cl1" type="email" autocomplete="email" placeholder="you@example.com" style="' + IS + '"><div id="cle" style="color:#fda4af;min-height:20px;font-size:14px">' + (msg || '') + '</div><button id="clb" style="' + BS + '">Send code</button>');
    var b = document.getElementById('clb'), i = document.getElementById('cl1');
    function go() {
      var em = i.value.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(em)) { err('Enter a valid email address'); return; }
      b.disabled = true; b.textContent = 'Sending...';
      sb.auth.signInWithOtp({ email: em, options: { shouldCreateUser: true } }).then(function (r) {
        if (r.error) { b.disabled = false; b.textContent = 'Send code'; err(r.error.message); } else showCode(em);
      });
    }
    b.onclick = go; i.onkeydown = function (e) { if (e.key === 'Enter') go(); };
  }
  function showCode(em) {
    screen('<div style="font-size:24px;font-weight:800">Check your email</div><p style="color:#b9c6f2;margin:8px 0 18px">We sent a code to<br><b>' + em.replace(/</g, '&lt;') + '</b></p><input id="cl2" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="Enter code" style="' + IS + ';letter-spacing:6px"><div id="cle" style="color:#fda4af;min-height:20px;font-size:14px"></div><button id="clv" style="' + BS + '">Verify and sign in</button><button id="clr" style="' + LS + '">Use a different email</button>');
    var b = document.getElementById('clv'), i = document.getElementById('cl2');
    i.focus();
    function ok() {
      var t = i.value.replace(/\s/g, '');
      if (t.length < 6) { err('Enter the code from your email'); return; }
      b.disabled = true; b.textContent = 'Checking...';
      sb.auth.verifyOtp({ email: em, token: t, type: 'email' }).then(function (r) {
        if (r.error || !r.data || !r.data.user) { b.disabled = false; b.textContent = 'Verify and sign in'; err('Wrong or expired code. Try again.'); return; }
        user = r.data.user;
        var last = null; try { last = localStorage.getItem('fl-cloud-uid'); } catch (e) {}
        if (last && last !== user.id) wipeLocal();
        remember();
        BIZ.email = em; quiet = true; _saveBiz(); quiet = false;
        var o = document.getElementById('cl'); if (o) o.remove();
        render(); toast('Signed in as ' + em); pull();
      });
    }
    b.onclick = ok; i.onkeydown = function (e) { if (e.key === 'Enter') ok(); };
    document.getElementById('clr').onclick = function () { showLogin(); };
  }

  /* ---------- sign out ---------- */
  var _out = window.mnuOut;
  if (_out) window.mnuOut = function () {
    _out();
    if (BIZ.out) { flush().then(function () { return sb.auth.signOut(); }).catch(function () {}).then(function () { user = null; showLogin(); }); }
  };

  /* ---------- start ---------- */
  function start() {
    sb.auth.getSession().then(function (r) {
      var s = r && r.data && r.data.session;
      if (s) { user = s.user; remember(); pull(); }
      else if ((r && r.error) || navigator.onLine === false) { /* offline: keep working on the phone, sync later */ }
      else showLogin();
    }, function () { /* network problem: keep working offline */ });
  }
  start();
  sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') { user = null; } });
  window.addEventListener('online', function () { if (user) flush(); else if (!document.getElementById('cl')) start(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) flush(); });
})();
