/* test-fix.js — test.html uchun tuzatish (js/ papkasiga qo'ying)
   1) Bazadan barcha test savollarini o'qiydi (1000 qator chegarasini aylanib o'tadi)
   2) Toifa kartalarida eng yaxshi natija va progress to'g'ri chiqadi */
window.__testFix = 'v2';
window.loadDBQuestions = async function () {
  try {
    var data = [], from = 0, total = null;
    while (true) {
      var res = await _sb.from('content')
        .select('category, category_title, data', { count: 'exact' })
        .eq('type', 'test')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + 999);
      if (res.error) { console.warn('[test-fix] xato:', res.error.message); break; }
      var got = res.data || [];
      if (total === null) total = res.count;
      data = data.concat(got);
      from += got.length;
      if (!got.length || (total !== null && from >= total)) break;
    }
    console.log('[test-fix v2] yuklandi: ' + data.length + ' / ' + total + ' qator');
    var known = {};
    TEST_CATS.forEach(function (c) { known[c.id] = true; });
    ADAB_SUBS.forEach(function (s) { known[s.id] = true; });
    data.forEach(function (row) {
      var cat = row.category;
      if (!cat || !row.data) return;
      if (!QUESTIONS[cat]) QUESTIONS[cat] = [];
      QUESTIONS[cat].push({ q: row.data.q, opts: row.data.opts || [], ans: row.data.ans, exp: row.data.exp || '' });
      if (!known[cat]) {
        known[cat] = true;
        TEST_CATS.push({ id: cat, icon: 'ti-flask', title: row.category_title || cat, desc: 'Test savollari' });
      }
    });
  } catch (e) { console.warn('DB testlarini yuklashda ogohlantirish:', e); }
};

window.renderTestGrid = async function () {
  var bestScores = {};
  var res = await _sb.from('test_results').select('category, percentage').eq('user_id', _currentUser.id);
  (res.data || []).forEach(function (t) {
    if (bestScores[t.category] === undefined || t.percentage > bestScores[t.category]) bestScores[t.category] = t.percentage;
  });
  document.getElementById('test-grid').innerHTML = TEST_CATS.map(function (c) {
    var best = bestScores[c.title];
    var stars = best === undefined ? 'Hali ishlanmagan'
      : best >= 90 ? 'Alo (3 yulduz)' : best >= 70 ? 'Yaxshi (2 yulduz)' : best >= 50 ? 'Qoniqarli (1 yulduz)' : 'Qayta ishlang';
    var bar = best !== undefined ? '<div class="tc-pbar"><div class="tc-pfill" style="width:' + best + '%"></div></div>' : '';
    var qCount = c.hasSub
      ? ADAB_SUBS.reduce(function (a, s) { return a + (QUESTIONS[s.id] ? QUESTIONS[s.id].length : 0); }, 0)
      : (QUESTIONS[c.id] ? QUESTIONS[c.id].length : 0);
    var clickFn = c.hasSub ? 'showAdabiyotlarView()' : ('startTest(\'' + jsq(c.id) + '\',\'' + jsq(c.title) + '\')');
    return '<div class="tc-card" onclick="' + clickFn + '">' +
      '<div class="tc-count">' + qCount + ' savol</div>' +
      '<div class="tc-icon"><i class="ti ' + c.icon + '"></i></div>' +
      '<h3>' + c.title + '</h3><p>' + c.desc + '</p>' + bar +
      '<div class="tc-status">' + stars + (best !== undefined ? ' (' + best + '%)' : '') + '</div></div>';
  }).join('');
};
