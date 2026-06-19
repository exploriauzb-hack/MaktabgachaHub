// ═══════════════════════════════════════
// js/auth.js — Login / Register / Logout
// Barcha sahifalarda ishlatiladi
// ═══════════════════════════════════════

// ── Joriy foydalanuvchi va profil ──
let _currentUser    = null
let _currentProfile = null

// ── Joriy sahifa qaysi papkada ekanini aniqlash ──
// root (dashboard.html, index.html) yoki pages/ ichida
function _rootPath() {
  return location.pathname.includes('/pages/') ? '../' : ''
}

// PRO modul sahifalari "pages/" papkasida joylashgan.
// Joriy sahifa pages/ ichida bo'lsa — prefiks kerak emas, root'da bo'lsa — 'pages/' qo'shiladi.
function _proHref(file) {
  return location.pathname.includes('/pages/') ? file : 'pages/' + file
}

// Sahifa yuklanganda sessiyani tekshirish
async function initAuth(requireAuth = true) {
  const { data: { session } } = await _sb.auth.getSession()

  if (!session) {
    if (requireAuth) window.location.href = _rootPath() + 'index.html'
    return null
  }

  _currentUser = session.user

  // Profilni olish
  const { data: profile } = await _sb
    .from('profiles')
    .select('*')
    .eq('id', _currentUser.id)
    .single()

  _currentProfile = profile

  // Profil yo'q bo'lsa — yaratish
  if (!profile) {
    const name = _currentUser.user_metadata?.full_name
      || _currentUser.email.split('@')[0]

    await _sb.from('profiles').upsert({
      id: _currentUser.id,
      full_name: name,
      role: 'teacher',
      subscription_tier: 'free',
      xp: 0
    })

    const { data: newProfile } = await _sb
      .from('profiles')
      .select('*')
      .eq('id', _currentUser.id)
      .single()

    _currentProfile = newProfile
  }

  return { user: _currentUser, profile: _currentProfile }
}

// ── Foydalanuvchi ismini olish ──
function getUserName() {
  if (!_currentProfile && !_currentUser) return 'Mehmon'
  return _currentProfile?.full_name
    || _currentUser?.user_metadata?.full_name
    || _currentUser?.email?.split('@')[0]
    || 'Tarbiyachi'
}

// ── Subscription tekshirish ──
function getUserPlan() {
  return _currentProfile?.subscription_tier || 'free'
}

function isPro() {
  const plan = getUserPlan()
  return plan === 'pro' || plan === 'corporate'
}

function isCorporate() {
  return getUserPlan() === 'corporate'
}

// ── Modul ruxsati ──
const MODULE_ACCESS = {
  daily_schedule : ['free', 'pro', 'corporate'],
  weekly_plan    : ['free', 'pro', 'corporate'],
  soha           : ['free', 'pro', 'corporate'],
  tamoyil        : ['free', 'pro', 'corporate'],
  tests          : ['free', 'pro', 'corporate'],  // limitli/cheksiz
  konspekt       : ['free', 'pro', 'corporate'],  // limitli/cheksiz
  games          : ['pro', 'corporate'],
  songs          : ['pro', 'corporate'],
  activities     : ['pro', 'corporate'],
  ai_konspekt    : ['pro', 'corporate'],
  attestation    : ['pro', 'corporate'],
  portfolio      : ['pro', 'corporate'],
  attendance     : ['corporate'],
  parent_portal  : ['corporate'],
  child_monitoring: ['corporate'],
  reports        : ['corporate'],
}

function hasAccess(module) {
  const plan = getUserPlan()
  return MODULE_ACCESS[module]?.includes(plan) ?? false
}

// ── Test limiti (bepul: 5 ta/oy) ──
async function checkTestLimit() {
  if (isPro()) return { allowed: true, count: 0, limit: 999 }

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { count } = await _sb
    .from('test_results')
    .select('id', { count: 'exact' })
    .eq('user_id', _currentUser.id)
    .gte('completed_at', monthStart.toISOString())

  return { allowed: count < 5, count, limit: 5 }
}

// ── Chiqish ──
// Joriy sahifa root'da yoki pages/ ichida bo'lishidan qat'i nazar
// to'g'ri index.html'ga yo'naltiradi.
async function doLogout() {
  await _sb.auth.signOut()
  window.location.href = _rootPath() + 'index.html'
}

// ── XP qo'shish ──
async function addXP(amount) {
  if (!_currentUser) return
  const newXP = (_currentProfile?.xp || 0) + amount

  await _sb
    .from('profiles')
    .update({ xp: newXP })
    .eq('id', _currentUser.id)

  if (_currentProfile) _currentProfile.xp = newXP
  return newXP
}

// ── Daraja aniqlash ──
function getLevel(xp) {
  if (xp >= 800) return { lvl: 5, title: 'Ustoz Tarbiyachi',      next: 9999 }
  if (xp >= 400) return { lvl: 4, title: 'Malakali Tarbiyachi',   next: 800  }
  if (xp >= 200) return { lvl: 3, title: 'Tajribali Tarbiyachi',  next: 400  }
  if (xp >= 80)  return { lvl: 2, title: 'Rivojlanayotgan',       next: 200  }
  return           { lvl: 1, title: 'Yangi Tarbiyachi',      next: 80   }
}

// ── Toast xabar ──
function showToast(msg, type = 'ok') {
  let t = document.getElementById('toast')
  if (!t) {
    t = document.createElement('div')
    t.id = 'toast'
    t.className = 'toast'
    document.body.appendChild(t)
  }
  t.textContent = msg
  t.className = `toast ${type} show`
  setTimeout(() => t.classList.remove('show'), 3000)
}

// ── PRO sidebar elementlarini bog'lash ──
// Ikona klassiga qarab modul nomi va sahifa faylini aniqlaydi.
// HTMLga tegmasdan, har qanday sahifadagi sidebar'da ishlaydi.
const PRO_NAV_MAP = {
  'ti-puzzle'     : { module: 'games',       file: 'oyinlar.html' },
  'ti-music'      : { module: 'songs',       file: 'qoshiqlar.html' },
  'ti-brush'      : { module: 'activities',  file: 'mashgulot.html' },
  'ti-certificate': { module: 'attestation', file: 'attestatsiya.html' },
  'ti-id-badge-2' : { module: 'portfolio',   file: 'portfolio.html' },
}

function bindProNav() {
  document.querySelectorAll('.sidebar .nav-item').forEach(item => {
    const badge = item.querySelector('.badge')
    if (!badge || badge.textContent.trim() !== 'PRO') return

    const iconEl = item.querySelector('i')
    const iconClass = iconEl && [...iconEl.classList].find(c => c.startsWith('ti-'))
    const cfg = iconClass && PRO_NAV_MAP[iconClass]
    if (!cfg) return

    item.style.cursor = 'pointer'
    item.onclick = () => {
      if (isPro()) {
        window.location.href = _proHref(cfg.file)
      } else if (typeof openPremiumModal === 'function') {
        openPremiumModal(cfg.module)
      } else {
        window.location.href = _proHref('premium.html')
      }
    }
  })
}

// ── Nav elementlarini to'ldirish ──
function fillNav() {
  const nameEl = document.getElementById('nav-name')
  const lvlEl  = document.getElementById('nav-lvl')
  const planEl = document.getElementById('nav-plan')

  if (nameEl) {
    const name = getUserName()
    nameEl.textContent = name.length > 14 ? name.slice(0, 14) + '…' : name
  }

  if (lvlEl) {
    const xp  = _currentProfile?.xp || 0
    const lv  = getLevel(xp)
    lvlEl.textContent = lv.lvl + '-daraja'
  }

  if (planEl) {
    const plan = getUserPlan()
    planEl.textContent = plan === 'pro' ? '⭐ Pro'
      : plan === 'corporate' ? '🏢 Korporativ'
      : 'Bepul'
    planEl.style.background = plan === 'pro' ? '#6c47ff'
      : plan === 'corporate' ? '#f59e0b'
      : 'rgba(255,255,255,0.2)'
  }

  // PRO sidebar elementlarini har sahifada avtomatik bog'lash
  bindProNav()
}
