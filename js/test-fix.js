/* test-fix.js v9 — test.html uchun (js/ papkasida turadi)
   • Kartalar sahifa chizilishi bilan DARROV chiqadi (avtorizatsiyani kutmaydi)
   • Bazadagi toifalar parallel yuklanadi, savollar toifa tanlanganda olinadi
   • 1000 qator chegarasi yo'q, "Har toifada N ta savol" yozuvi olib tashlangan */
(function () {
  window.__testFix = 'v9';
  var T = function (m) { try { console.log('[test-fix v9] ' + m + ' — ' + Math.round(performance.now()) + ' ms'); } catch (e) {} };

  var BASE = {}, DBCAT = {}, BEST = null;     // BEST === null: natijalar hali kelmagan
  Object.keys(QUESTIONS).forEach(function (k) { BASE[k] = QUESTIONS[k].length; });
  function cnt(id) { return (BASE[id] || 0) + ((DBCAT[id] && DBCAT[id].total) || 0); }

  function withTimeout(p, label) {
    var ms = window.__testFixTimeout || 15000;
    return Promise.race([p, new Promise(function (_, rej) {
      setTimeout(function () { rej(new Error((label || 'so\'rov') + ' vaqti tugadi')); }, ms);
    })]);
  }

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

  // Yuqori o'ngdagi tarif yozuvi (sahifada qattiq "Bepul" yozilgan edi)
  function paintPlan() {
    try {
      var pill = document.querySelector('.plan-pill');
      if (!pill || typeof isPro !== 'function') return;
      var corp = (typeof isCorporate === 'function') && !!isCorporate();
      var prof = !!isPro();
      var pro = prof || corp;
      pill.style.background = pro ? 'var(--pro-soft)' : '';
      pill.style.color = pro ? 'var(--pro)' : '';
      pill.innerHTML = pro ? '<i class="ti ti-crown"></i> ' + (corp ? 'Korporativ' : 'PRO')
                           : '<i class="ti ti-free-rights"></i> Bepul';
      pill.title = 'isPro=' + prof + ', korporativ=' + corp + ' \u00b7 test-fix v9';
      T('tarif: ' + (pro ? (corp ? 'Korporativ' : 'PRO') : 'Bepul') + ' (isPro=' + prof + ', korporativ=' + corp + ')');
    } catch (e) {}
  }

  // Avtorizatsiya tugashini kutib, tarifni bir marta yangilaydi (16 soniyagacha)
  (function watchPlan() {
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (typeof _currentUser !== 'undefined' && _currentUser && typeof isPro === 'function') { paintPlan(); clearInterval(iv); }
      else if (tries > 40) clearInterval(iv);
    }, 400);
  })();

  // Kartalarni chizish (tarmoqsiz — darrov)
  function draw() {
    var el = document.getElementById('test-grid'); if (!el) return;
    el.innerHTML = TEST_CATS.map(function (c) {
      var b = BEST ? BEST[c.title] : undefined;
      var status = BEST === null ? ''
        : b === undefined ? 'Hali ishlanmagan'
        : (b >= 90 ? 'Alo (3 yulduz)' : b >= 70 ? 'Yaxshi (2 yulduz)' : b >= 50 ? 'Qoniqarli (1 yulduz)' : 'Qayta ishlang') + ' (' + b + '%)';
      var bar = (BEST && b !== undefined) ? '<div class="tc-pbar"><div class="tc-pfill" style="width:' + b + '%"></div></div>' : '';
      var n = c.hasSub ? ADAB_SUBS.reduce(function (a, s) { return a + cnt(s.id); }, 0) : cnt(c.id);
      var click = c.hasSub ? 'showAdabiyotlarView()' : ('startTest(\'' + jsq(c.id) + '\',\'' + jsq(c.title) + '\')');
      return '<div class="tc-card" onclick="' + click + '">' +
        '<div class="tc-count">' + n + ' savol</div>' +
        '<div class="tc-icon"><i class="ti ' + c.icon + '"></i></div>' +
        '<h3>' + c.title + '</h3><p>' + c.desc + '</p>' + bar +
        '<div class="tc-status">' + status + '</div></div>';
    }).join('');
  }

  // Bazadagi toifalar va ularning soni
  async function loadCats() {
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
    T('toifalar yuklandi: ' + rows.length + ' (' + how + ')');
  }

  // To'g'ri javob belgisini tekshirish: raqam yoki matn ("2"), harf (A, B...) va 1 dan boshlanganini tanib oladi
  function normAns(q, oneBased) {
    var a = q.ans;
    if (typeof a === 'string') {
      a = a.trim();
      if (/^\d+$/.test(a)) a = Number(a);
      else if (/^[A-Za-z]$/.test(a)) { var k = a.toUpperCase().charCodeAt(0) - 65; return k < q.opts.length ? k : -1; }
      else return -1;
    }
    if (typeof a !== 'number' || !isFinite(a) || a % 1 !== 0) return -1;
    if (oneBased) a -= 1;
    return (a >= 0 && a < q.opts.length) ? a : -1;
  }

  // Savollar test boshlanganda yuklanadi
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
        var items = [];
        rows.forEach(function (r) { var q = r.data; if (q && q.q && Array.isArray(q.opts) && q.opts.length > 1) items.push(q); });
        // Hech birida 0 yo'q, ba'zisi variantlar soniga teng — bu 0 dan boshlangan tizimda bo'lishi mumkin emas (1 dan boshlangan)
        var oneBased = items.length > 0 &&
          !items.some(function (q) { return Number(q.ans) === 0; }) &&
          items.some(function (q) { return Number(q.ans) === q.opts.length; });
        var bad = 0;
        items.forEach(function (q) {
          var a = normAns(q, oneBased);
          if (a < 0) { bad++; return; }
          QUESTIONS[id].push({ q: q.q, opts: q.opts, ans: a, exp: q.exp || '' });
        });
        d.loaded = true;
        d.total = QUESTIONS[id].length - (BASE[id] || 0);
        if (oneBased) T('"' + id + '": javob belgilari 1 dan boshlangan deb o\'qildi');
        if (bad) {
          console.warn('[test-fix] "' + id + '": ' + bad + ' ta savolda to\'g\'ri javob belgisi noto\'g\'ri, o\'tkazib yuborildi');
          showToast(bad + " ta savolda to'g'ri javob belgisi noto'g'ri \u2014 o'tkazib yuborildi", 'err');
        }
        draw();
        T('"' + id + '" savollari yuklandi: ' + QUESTIONS[id].length + ' (noto\'g\'ri: ' + bad + ')');
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
    return startFlow(catId, catTitle);
  };

  /* ═══ YANGI: savollar sonini tanlash, variantlarni aralashtirish, xatolar tahlili ═══ */
  function shuf(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // "Yuqoridagilarning hammasi", "A va B" kabi tartibga bog'liq variantlar aralashtirilmaydi
  function canShuffle(opts) {
    return !opts.some(function (o) {
      return /yuqoridagi|barcha|hammasi|hech biri|ikkalasi|\b[A-Da-d]\s*(va|,|\/)\s*[A-Da-d]\b/i.test(String(o));
    });
  }
  function prep(q) {
    var opts = q.opts.slice(), ans = q.ans;
    if (canShuffle(opts)) {
      var idx = shuf(opts.map(function (_, i) { return i; }));
      opts = idx.map(function (i) { return q.opts[i]; });
      ans = idx.indexOf(q.ans);
    }
    return { q: q.q, opts: opts, ans: ans, exp: q.exp || '' };
  }

  (function css() {
    var st = document.createElement('style');
    st.textContent =
      '.tf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:8px;margin:14px 0}' +
      '.tf-chip{background:var(--bg);border:2px solid var(--border);border-radius:10px;padding:12px 8px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text);font-family:inherit;transition:all .15s}' +
      '.tf-chip:hover{border-color:var(--accent-mid);background:var(--accent-soft)}' +
      '.tf-chip.sel{border-color:var(--accent);background:var(--accent-soft);color:var(--accent)}' +
      '.tf-note{font-size:11.5px;color:var(--muted);line-height:1.6}' +
      '.tf-rq{border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:10px;text-align:left}' +
      '.tf-qt{font-size:13px;font-weight:700;margin-bottom:8px;line-height:1.5}' +
      '.tf-a{font-size:12px;padding:6px 10px;border-radius:7px;margin-bottom:5px;line-height:1.5}' +
      '.tf-a.bad{background:var(--red-soft);color:var(--red)}.tf-a.good{background:var(--green-soft);color:var(--green)}' +
      '.tf-ex{font-size:11.5px;color:var(--muted);margin-top:6px;line-height:1.6}';
    document.head.appendChild(st);
  })();

  // Nechta savol ishlashni so'rash (bir bosish; oxirgi tanlov eslab qolinadi)
  function pickCount(total) {
    if (total <= 10) return Promise.resolve(total);
    return new Promise(function (resolve) {
      var saved = null; try { saved = localStorage.getItem('tf_count'); } catch (e) {}
      var opts = [10, 20, 30, 50, 100].filter(function (x) { return x < total; });
      var sel = saved === 'all' ? 'all' : (opts.indexOf(Number(saved)) >= 0 ? Number(saved) : (opts.indexOf(20) >= 0 ? 20 : opts[0]));
      window.__tfPick = function (v) {
        try { localStorage.setItem('tf_count', String(v)); } catch (e) {}
        window.__tfPick = null;
        resolve(v === 'all' ? total : v);
      };
      var chips = opts.map(function (n) {
        return '<button class="tf-chip' + (sel === n ? ' sel' : '') + '" onclick="__tfPick(' + n + ')">' + n + ' ta</button>';
      }).join('') + '<button class="tf-chip' + (sel === 'all' ? ' sel' : '') + '" onclick="__tfPick(\'all\')">Hammasi (' + total + ')</button>';
      document.getElementById('test-body').innerHTML =
        '<div class="tf-note">Bu toifada <b>' + total + '</b> ta savol bor</div>' +
        '<div class="tq" style="margin:6px 0 0">Nechta savol ishlaysiz?</div>' +
        '<div class="tf-grid">' + chips + '</div>' +
        '<div class="tf-note">Savollar har safar tasodifiy tanlanadi va variantlari aralashtiriladi.</div>';
    });
  }

  function beginTest(catId, catTitle, pool, retry) {
    var qs = shuf(pool.slice()).map(prep);
    testState = { catId: catId, catTitle: catTitle, qs: qs, cur: 0, answers: [], picks: [], answered: false, retry: !!retry };
    document.getElementById('test-modal-title').textContent = retry ? catTitle + ' \u2014 xatolar ustida' : catTitle;
    document.getElementById('test-modal').classList.add('show');
    renderQ();
  }

  async function startFlow(catId, catTitle) {
    var sub = ADAB_SUBS.find(function (x) { return x.id === catId; });
    if (sub && sub.pro && !isPro()) { showToast('Bu bolim faqat Premium foydalanuvchilar uchun!', 'err'); return; }
    if (!isPro()) {
      var limit = await checkTestLimit();
      if (!limit.allowed) { showToast('Oylik test limitiga yetdingiz! Premium oling.', 'err'); return; }
    }
    var pool = QUESTIONS[catId];
    document.getElementById('test-modal-title').textContent = catTitle;
    document.getElementById('test-modal').classList.add('show');
    var n = await pickCount(pool.length);
    if (!n) return;
    beginTest(catId, catTitle, shuf(pool.slice()).slice(0, n), false);
  }

  // Foydalanuvchi tanlagan variantni eslab qolish (xatolar tahlili uchun)
  var _sel = window.selectOpt;
  window.selectOpt = function (i) {
    if (testState.answered) return;
    if (!testState.picks) testState.picks = [];
    testState.picks[testState.cur] = i;
    return _sel(i);
  };

  window.retryMistakes = function () {
    var s = testState, wrong = [];
    s.qs.forEach(function (q, i) { if (s.answers[i] === false) wrong.push(q); });
    if (wrong.length) beginTest(s.catId, s.catTitle, wrong, true);
  };
  window.tfToggleReview = function () {
    var el = document.getElementById('tf-review');
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  window.showResult = async function () {
    var s = testState, total = s.qs.length;
    var correct = s.answers.filter(Boolean).length;
    var pct = total ? Math.round(correct / total * 100) : 0;
    var xp = s.retry ? 0 : correct * 5;

    var grade, gc, stars, advice;
    if (pct >= 90) { grade = 'ALO'; gc = 'rc-gold'; stars = 'Mukammal!'; advice = 'Ajoyib! Bu mavzuni yaxshi bilasiz.'; }
    else if (pct >= 70) { grade = 'YAXSHI'; gc = 'rc-green'; stars = 'Yaxshi!'; advice = 'Yaxshi natija.'; }
    else if (pct >= 50) { grade = 'QONIQARLI'; gc = 'rc-blue'; stars = 'Qoniqarli'; advice = 'Mavzuni chuqurroq organish kerak.'; }
    else { grade = 'PAST'; gc = 'rc-red'; stars = 'Qayta ishlang'; advice = 'Mavzuni qayta oqib, testni takrorlang.'; }

    if (!s.retry) {
      try {
        await _sb.from('test_results').insert({ user_id: _currentUser.id, category: s.catTitle, score: correct, total: total, percentage: pct, xp_earned: xp });
        await addXP(xp);
      } catch (e) { console.warn('[test-fix] natijani saqlashda xato:', e); }
    }

    var wrong = [];
    s.qs.forEach(function (q, i) { if (s.answers[i] === false) wrong.push({ n: i + 1, q: q, pick: (s.picks || [])[i] }); });
    var review = wrong.map(function (w) {
      return '<div class="tf-rq"><div class="tf-qt">' + w.n + '. ' + w.q.q + '</div>' +
        (w.pick !== undefined ? '<div class="tf-a bad">Sizning javobingiz: ' + w.q.opts[w.pick] + '</div>' : '') +
        '<div class="tf-a good">To\'g\'ri javob: ' + w.q.opts[w.q.ans] + '</div>' +
        (w.q.exp ? '<div class="tf-ex">' + w.q.exp + '</div>' : '') + '</div>';
    }).join('');

    document.getElementById('test-body').innerHTML =
      '<div class="res-wrap">' +
        '<div class="res-circle ' + gc + '">' + pct + '%<div style="font-size:10px;margin-top:2px">' + grade + '</div></div>' +
        '<div class="res-grade">' + stars + '</div>' +
        '<div class="res-advice">' + advice + (s.retry ? '<br>Xatolar ustida ishlash natijasi saqlanmaydi.' : '') + '</div>' +
        '<div class="res-bd">' +
          '<div class="rb-row"><span>Togri javoblar</span><b style="color:var(--green)">' + correct + ' ta</b></div>' +
          '<div class="rb-row"><span>Notogri javoblar</span><b style="color:var(--red)">' + (total - correct) + ' ta</b></div>' +
          '<div class="rb-row"><span>Jami savollar</span><b>' + total + ' ta</b></div>' +
          (s.retry ? '' : '<div class="rb-row"><span>XP qoshildi</span><b style="color:var(--amber)">+' + xp + ' XP</b></div>') +
        '</div>' +
        (wrong.length ? '<div id="tf-review" style="display:none;margin-bottom:16px">' + review + '</div>' : '') +
        '<div class="res-actions">' +
          (wrong.length ? '<button class="btn-next" onclick="retryMistakes()">Xatolarni qayta ishlash (' + wrong.length + ')</button>' +
                          '<button class="btn-secondary" onclick="tfToggleReview()">Xatolarni ko\'rish</button>' : '') +
          '<button class="btn-secondary" onclick="startTest(\'' + jsq(s.catId) + '\',\'' + jsq(s.catTitle) + '\')">Yangi test</button>' +
          '<button class="btn-secondary" onclick="closeTest()">Yopish</button>' +
        '</div>' +
      '</div>';
    if (!s.retry) renderTestGrid();
  };

  // Sahifaning o'z chaqiruvlari: toifalar allaqachon yo'lda, kutmaymiz
  window.loadDBQuestions = function () { return Promise.resolve(); };
  window.renderTestGrid = async function () {
    paintPlan();
    draw();
    try {
      var res = await withTimeout(_sb.from('test_results').select('category, percentage').eq('user_id', _currentUser.id), 'natijalar');
      var best = {};
      (res.data || []).forEach(function (t) {
        if (best[t.category] === undefined || t.percentage > best[t.category]) best[t.category] = t.percentage;
      });
      BEST = best;
    } catch (e) { console.warn('[test-fix] natijalar yuklanmadi:', e); if (BEST === null) BEST = {}; }
    draw();
    T('natijalar chizildi');
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

  var ib = document.querySelector('.info-box');
  if (ib) ib.innerHTML = '<i class="ti ti-info-circle"></i> <b>80%</b> va yuqori \u2014 A\'lo toifa!';

  // ISHGA TUSHIRISH: kartalar darrov, toifalar parallel
  draw();
  T('kartalar ko\'rindi');
  loadCats().then(draw).catch(function (e) {
    console.warn('[test-fix] toifalarni yuklashda xato:', e);
    try { showToast("Ba'zi toifalarni yuklab bo'lmadi", 'err'); } catch (x) {}
  });
})();
