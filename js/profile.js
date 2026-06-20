// js/profile.js

// ─── Profilni Supabase'dan yuklash ───────────────────────────────────────────
async function loadProfile() {
  const { data: { user } } = await _sb.auth.getUser();
  if (!user) return;

  const { data, error } = await _sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Profil yuklanmadi:', error.message);
    return;
  }

  if (!data) return;

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

  // Viloyat tanlanganda tumanlarni yuklash
  if (data.viloyat) {
    const vilSel = document.getElementById('i-viloyat');
    if (vilSel) {
      vilSel.value = data.viloyat;
      loadTumanlar(data.tuman);
    }
  }

  // Ko'nikmalar
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

  // Yutuqlar
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
          <button class="yutuq-del" onclick="delYutuq(this)"><i class="ti ti-trash"></i></button>`;
        list.appendChild(li);
      });
    }
  }

  // Avatar
  if (data.avatar_url) {
    const img = document.getElementById('avatarImg');
    if (img) {
      img.src = data.avatar_url;
      img.style.display = 'block';
      const avatarEl = document.getElementById('avatarEl');
      if (avatarEl) avatarEl.childNodes[0].textContent = '';
    }
  }

  // Profil kartasini yangilash
  const fam     = data.familiya || '';
  const ism     = data.ism      || '';
  const dmtt    = data.dmtt     || '';
  const tuman   = data.tuman    || '';
  const toifa   = data.toifa    || '';
  const staj    = data.staj     || 0;
  const malumot = data.malumot  || '';
  const lavozim = data.lavozim  || '';

  if (fam || ism)  setEl('dispName',    (fam + ' ' + ism).trim());
  if (lavozim)     setEl('dispRole',    lavozim + (dmtt ? ' — ' + dmtt : '') + (tuman ? ', ' + tuman : ''));
  if (toifa)       setEl('dispToifa',   '🏷️ ' + toifa);
  if (staj)        setEl('dispStaj',    '📅 ' + staj + ' yil staj');
  if (malumot)     setEl('dispMalumot', '🎓 ' + malumot);
  if (staj)        setEl('stat-staj',   staj);

  updateScore();
}

// ─── Profilni Supabase'ga saqlash ────────────────────────────────────────────
async function saveProfileToDB() {
  const { data: { user } } = await _sb.auth.getUser();
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

  const { error } = await _sb
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('Saqlashda xato:', error.message);
    showToast('❌ Saqlashda xato: ' + error.message, 'error');
  } else {
    showToast('✅ Profil saqlandi!', 'success');
  }
}

// ─── Avatar yuklash (Supabase Storage) ───────────────────────────────────────
// Rasm tanlangan zahoti Storage'ga yuklanadi va profiles jadvalida avatar_url
// darhol yangilanadi — "Saqlash" tugmasini bosishni kutmaydi, shuning uchun
// yo'qolib qolmaydi.
async function uploadAvatar(file) {
  const { data: { user } } = await _sb.auth.getUser();
  if (!user) { alert('Iltimos, avval tizimga kiring.'); return null; }

  if (!file.type.startsWith('image/')) {
    showToast('❌ Faqat rasm fayl yuklash mumkin', 'error');
    return null;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('❌ Rasm hajmi 5MB dan oshmasligi kerak', 'error');
    return null;
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const filePath = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await _sb.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true, cacheControl: '3600' });

  if (uploadError) {
    console.error('Avatar yuklashda xato:', uploadError.message);
    showToast('❌ Rasm yuklashda xato: ' + uploadError.message, 'error');
    return null;
  }

  const { data: urlData } = _sb.storage.from('avatars').getPublicUrl(filePath);
  const publicUrl = urlData.publicUrl + '?t=' + Date.now(); // keshni yangilash uchun

  const { error: dbError } = await _sb
    .from('profiles')
    .upsert(
      { id: user.id, avatar_url: publicUrl, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );

  if (dbError) {
    console.error('Avatar URL saqlashda xato:', dbError.message);
    showToast('❌ Avatar saqlanmadi: ' + dbError.message, 'error');
    return null;
  }

  showToast('✅ Avatar saqlandi!', 'success');
  return publicUrl;
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
