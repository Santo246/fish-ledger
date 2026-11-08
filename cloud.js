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
