// js/profile.js
// dashboard.html ichidagi <script> taglaridan OLDIN qo'shing:
// <script src="../js/profile.js"></script>  (pages/ ichida bo'lsa)
// <script src="js/profile.js"></script>     (root'da bo'lsa)

// ─── Profilni Supabase'dan yuklash ───────────────────────────────────────────
async function loadProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Profil yuklanmadi:', error.message);
    return;
  }

  if (!data) return; // yangi foydalanuvchi — bo'sh profil

  // ─── Maydonlarga qiymat yozish ─────────────────────────────────────────────
  const fields = [
    'familiya','ism','sharif','telefon','tugilgan',
    'jinsi','viloyat','tuman','dmtt',
    'lavozim','toifa','staj','malumot','bio'
  ];

  fields.forEach(f => {
    const inp = document.getElementById('i-' + f);
    const val = document.getElementById('v-' + f);
    if (!inp || data[f] == null) return;
    inp.value = data[f];
    if (val) val.textContent = data[f];
  });

  // ─── Ko'nikmalar ───────────────────────────────────────────────────────────
  if (data.skills && data.skills.length > 0) {
    const wrap = document.getElementById('skillsWrap');
    if (wrap) {
      wrap.innerHTML = '';
      data.skills.forEach(s => {
        const tag = document.createElement('span');
        tag.className = 'skill-tag';
        tag.innerHTML = s + ' <button class="skill-del" onclick="delSkill(this)">×</button>';
        wrap.appendChild(tag);
      });
    }
  }

  // ─── Yutuqlar ──────────────────────────────────────────────────────────────
  if (data.yutuqlar && data.yutuqlar.length > 0) {
    const list = document.getElementById('yutuqList');
    if (list) {
      list.innerHTML = '';
      const icons = ['🏅','📜','🥇','🎖️','⭐'];
      data.yutuqlar.forEach((y, i) => {
        const ic = icons[i % icons.length];
        const li = document.createElement('div');
        li.className = 'yutuq-item';
        li.innerHTML = `<span class="yutuq-icon">${ic}</span>
          <div class="yutuq-text">
            <div class="yutuq-name">${y.nomi}</div>
            <div class="yutuq-year">${y.yil || ''}</div>
          </div>
          <button class="yutuq-del" onclick="delYutuq(this)">🗑</button>`;
        list.appendChild(li);
      });
    }
  }

  // ─── Profil kartasini yangilash ────────────────────────────────────────────
  const ism      = data.ism      || '';
  const fam      = data.familiya || '';
  const dmtt     = data.dmtt     || '';
  const tuman    = data.tuman    || '';
  const toifa    = data.toifa    || '';
  const staj     = data.staj     || 0;
  const malumot  = data.malumot  || '';
  const lavozim  = data.lavozim  || '';

  if (fam || ism)  setEl('dispName',    fam + ' ' + ism);
  if (lavozim)     setEl('dispRole',    lavozim + ' — ' + dmtt + ', ' + tuman);
  if (toifa)       setEl('dispToifa',   '🏷️ ' + toifa);
  if (staj)        setEl('dispStaj',    '📅 ' + staj + ' yil staj');
  if (malumot)     setEl('dispMalumot', '🎓 ' + malumot);
  if (staj)        setEl('stat-staj',   staj);

  updateScore();
}

// ─── Profilni Supabase'ga saqlash ────────────────────────────────────────────
async function saveProfileToDB() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { alert('Iltimos, avval tizimga kiring.'); return; }

  // Ko'nikmalar
  const skills = [...document.querySelectorAll('.skill-tag')]
    .map(el => el.childNodes[0].textContent.trim())
    .filter(Boolean);

  // Yutuqlar
  const yutuqlar = [...document.querySelectorAll('.yutuq-item')].map(el => ({
    nomi: el.querySelector('.yutuq-name')?.textContent || '',
    yil:  el.querySelector('.yutuq-year')?.textContent || ''
  }));

  const payload = {
    id:         user.id,
    familiya:   getVal('i-familiya'),
    ism:        getVal('i-ism'),
    sharif:     getVal('i-sharif'),
    telefon:    getVal('i-telefon'),
    tugilgan:   getVal('i-tugilgan') || null,
    jinsi:      getVal('i-jinsi'),
    viloyat:    getVal('i-viloyat'),
    tuman:      getVal('i-tuman'),
    dmtt:       getVal('i-dmtt'),
    lavozim:    getVal('i-lavozim'),
    toifa:      getVal('i-toifa'),
    staj:       parseInt(getVal('i-staj')) || 0,
    malumot:    getVal('i-malumot'),
    bio:        getVal('i-bio'),
    skills,
    yutuqlar,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('Saqlashda xato:', error.message);
    showToast('❌ Saqlashda xato: ' + error.message, 'error');
  } else {
    showToast('✅ Profil saqlandi!', 'success');
  }
}

// ─── Yordamchi funksiyalar ────────────────────────────────────────────────────
function getVal(id) {
  return document.getElementById(id)?.value?.trim() || '';
}
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function showToast(msg, type) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed', bottom: '24px', right: '24px',
    background: type === 'success' ? '#16a34a' : '#dc2626',
    color: '#fff', padding: '12px 20px', borderRadius: '12px',
    fontSize: '14px', fontWeight: '600', zIndex: 9999,
    boxShadow: '0 4px 16px rgba(0,0,0,.15)',
    transition: 'opacity .4s'
  });
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 2500);
}

// ─── Sahifa yuklanganida profilni o'qish ──────────────────────────────────────
// (dashboard.html ichidagi window.addEventListener('load', ...) ga qo'shing:
//   const auth = await initAuth(true)
//   if (!auth) return
//   fillNav()
//   await loadProfile()   ← shu qatorni qo'shing
// )
