/* test-fix.js v4 — test.html uchun (js/ papkasida turadi)
   1) Sahifa ochilganda faqat toifa nomlari va soni yuklanadi (tez)
   2) Savollar toifa tanlanganda yuklanadi
   3) Bazadagi barcha qatorlar to'liq o'qiladi (1000 chegarasiz)
   4) "Har toifada N ta savol" yozuvi olib tashlanadi
   5) Kartalarda eng yaxshi natija to'g'ri chiqadi */
(function () {
  window.__testFix = 'v4';

  var BASE = {};          // sahifaga qattiq yozilgan savollar soni
  var DBCAT = {};         // bazadagi toifalar: {title,total,loaded}
  Object.keys(QUESTIONS).forEach(function (k) { BASE[k] = QUESTIONS[k].length; });

  function withTimeout(p, label) {
    var ms = window.__testFixTimeout || 15000;
    return Promise.race([p, new Promise(function (_, rej) {
      setTimeout(function () { rej(new Error((label || 'so\'rov') + ' vaqti tugadi')); }, ms);
    })]);
  }

  function cnt(id) { return (BASE[id] || 0) + ((DBCAT[id] && DBCAT[id].total) || 0); }

  // So'rovni 1000 talik bo'laklarda oxirigacha o'qiydi (server kesib qo'ysa ham)
  async function pageAll(make) {
    var all = [], from = 0, total = null;
    while (true) {
      var res = await withTimeout(make(from, from + 999), 'so\'rov');
      if (res.error || !res.data) throw (res.error || new Error('Javob bo\'sh'));
      if (total === null) total = res.count;
      all = all.concat(res.data);
      from += res.data.length;
      if (!res.data.length || (total !== null && from >= total)) break;
    }
    return all;
  }

  // 1) Faqat toifalar va ularning soni
  async function loadCats() {
    try {
      var rows = null, how = 'rpc';
      try {
        var r = await withTimeout(_sb.rpc('test_categories'), 'rpc');
        if (!r.error && Array.isArray(r.data)) {
          rows = r.data.map(function (x) { return { category: x.category, title: x.category_title, total: Number(x.total) }; });
        }
      } catch (e) {}
      if (!rows) {
        how = 'zaxira';
        var list = await pageAll(function (a, b) {
          return _sb.from('content').select('category, category_title', { count: 'exact' })
            .eq('type', 'test').order('created_at', { ascending: true }).order('id', { ascending: true }).range(a, b);
        });
        var map = {}; rows = [];
        list.forEach(function (x) {
          if (!x.category) return;
          if (!map[x.category]) { map[x.category] = { category: x.category, title: x.category_title, total: 0 }; rows.push(map[x.category]); }
          map[x.category].total++;
        });
      }
      var known = {};
      TEST_CATS.forEach(function (c) { known[c.id] = true; });
      ADAB_SUBS.forEach(function (s) { known[s.id] = true; });
      rows.forEach(function (x) {
        if (!x.category) return;
        DBCAT[x.category] = { title: x.title, total: x.total, loaded: false };
        if (!QUESTIONS[x.category]) QUESTIONS[x.category] = [];
        if (!known[x.category]) {
          known[x.category] = true;
          TEST_CATS.push({ id: x.category, icon: 'ti-flask', title: x.title || x.category, desc: 'Test savollari' });
        }
      });
      console.log('[test-fix v4] toifalar: ' + rows.length + ' (' + how + ')');
    } catch (e) { console.warn('[test-fix] toifalarni yuklashda xato:', e); throw e; }
  }

  // Sahifa kutib qolmasligi uchun: kartalar darrov chiqadi, bazadagi toifalar fonda qo'shiladi
  window.loadDBQuestions = function () {
    loadCats().then(function () { return window.renderTestGrid(); })
      .catch(function () { try { showToast("Ba'zi toifalarni yuklab bo'lmadi", 'err'); } catch (e) {} });
    return Promise.resolve();
  };

  // 2) Savollar test boshlanganda yuklanadi
  async function ensureLoaded(id) {
    var d = DBCAT[id];
    if (!d || d.loaded) return true;
    if (d.loading) return d.loading;
    d.loading = (async function () {
      try {
        showToast('Savollar yuklanmoqda…');
        var rows = await pageAll(function (a, b) {
          return _sb.from('content').select('data', { count: 'exact' })
            .eq('type', 'test').eq('category', id)
            .order('created_at', { ascending: true }).order('id', { ascending: true }).range(a, b);
        });
        rows.forEach(function (r) {
          var q = r.data; if (!q) return;
          QUESTIONS[id].push({ q: q.q, opts: q.opts || [], ans: q.ans, exp: q.exp || '' });
        });
        d.loaded = true;
        console.log('[test-fix v4] "' + id + '" yuklandi: ' + rows.length + ' savol');
        return true;
      } catch (e) { console.warn('[test-fix] savollarni yuklashda xato:', e); return false; }
      finally { d.loading = null; }
    })();
    return d.loading;
  }

  var _start = window.startTest;
  window.startTest = async function (catId, catTitle) {
    if (DBCAT[catId] && !DBCAT[catId].loaded) {
      var ok = await ensureLoaded(catId);
      if (!ok) { showToast("Savollarni yuklab bo'lmadi. Qayta urinib ko'ring.", 'err'); return; }
    }
    if (!QUESTIONS[catId] || !QUESTIONS[catId].length) { showToast("Bu toifada savollar yo'q", 'err'); return; }
    return _start(catId, catTitle);
  };

  // Kartalar (savollar soni bazadan, natijalar sarlavha bo'yicha)
  window.renderTestGrid = async function () {
    var best = {};
    var res = await _sb.from('test_results').select('category, percentage').eq('user_id', _currentUser.id);
    (res.data || []).forEach(function (t) {
      if (best[t.category] === undefined || t.percentage > best[t.category]) best[t.category] = t.percentage;
    });
    document.getElementById('test-grid').innerHTML = TEST_CATS.map(function (c) {
      var b = best[c.title];
      var stars = b === undefined ? 'Hali ishlanmagan'
        : b >= 90 ? 'Alo (3 yulduz)' : b >= 70 ? 'Yaxshi (2 yulduz)' : b >= 50 ? 'Qoniqarli (1 yulduz)' : 'Qayta ishlang';
      var bar = b !== undefined ? '<div class="tc-pbar"><div class="tc-pfill" style="width:' + b + '%"></div></div>' : '';
      var n = c.hasSub ? ADAB_SUBS.reduce(function (a, s) { return a + cnt(s.id); }, 0) : cnt(c.id);
      var click = c.hasSub ? 'showAdabiyotlarView()' : ('startTest(\'' + jsq(c.id) + '\',\'' + jsq(c.title) + '\')');
      return '<div class="tc-card" onclick="' + click + '">' +
        '<div class="tc-count">' + n + ' savol</div>' +
        '<div class="tc-icon"><i class="ti ' + c.icon + '"></i></div>' +
        '<h3>' + c.title + '</h3><p>' + c.desc + '</p>' + bar +
        '<div class="tc-status">' + stars + (b !== undefined ? ' (' + b + '%)' : '') + '</div></div>';
    }).join('');
  };

  window.renderAdabSubs = function () {
    document.getElementById('adab-sub-grid').innerHTML = ADAB_SUBS.map(function (s) {
      var badge = (s.pro && !isPro()) ? '<div class="pro-lock"><i class="ti ti-crown"></i> PRO</div>'
        : '<div class="tc-count">' + cnt(s.id) + ' savol</div>';
      return '<div class="sub-card" onclick="startTest(\'' + jsq(s.id) + '\',\'' + jsq(s.title) + '\')">' + badge +
        '<div class="tc-icon" style="margin-bottom:8px"><i class="ti ' + s.icon + '"></i></div>' +
        '<h4>' + s.title + '</h4><p>' + s.desc + '</p></div>';
    }).join('');
  };

  // 4) "Har toifada 20 ta savol" yozuvini olib tashlash
  var ib = document.querySelector('.info-box');
  if (ib) ib.innerHTML = '<i class="ti ti-info-circle"></i> <b>80%</b> va yuqori \u2014 A\'lo toifa!';
})();
