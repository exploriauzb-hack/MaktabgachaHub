// ═══════════════════════════════════════
// js/premium.js — Obuna va to'lov tizimi
// ═══════════════════════════════════════

const PLANS = {
  pro: {
    id       : 'pro',
    name     : 'Professional ⭐',
    price    : 49000,
    priceText: '49 000',
    color    : '#6c47ff',
    features : [
      'Cheksiz testlar (6 toifa)',
      'Barcha konspektlar (30+)',
      'Oyinlar, qo\'shiqlar, mashg\'ulotlar',
      'AI Konspekt generator',
      'Attestatsiya testlari',
      'Portfolio yaratish',
    ]
  },
  corporate: {
    id       : 'corporate',
    name     : 'MTT Korporativ 🏢',
    price    : 299000,
    priceText: '299 000',
    color    : '#f59e0b',
    features : [
      'Professional + hamma narsa',
      '20+ tarbiyachi uchun',
      'Admin boshqaruv paneli',
      'Davomat tizimi (QR)',
      'Ota-ona portali',
      'Bola rivojlanish monitoringi',
      'Oylik hisobotlar (PDF)',
    ]
  }
}

// ── Premium modal ochish ──
function openPremiumModal(module) {
  const modal = document.getElementById('premium-modal')
  if (!modal) return

  const moduleNames = {
    games           : 'Oyinlar',
    songs           : 'Qo\'shiqlar',
    activities      : 'Mashg\'ulotlar',
    ai_konspekt     : 'AI Konspekt generator',
    attestation     : 'Attestatsiya testlari',
    portfolio       : 'Portfolio',
    attendance      : 'Davomat tizimi',
    parent_portal   : 'Ota-ona portali',
    child_monitoring: 'Bola monitoringi',
    reports         : 'Hisobotlar',
  }

  const name = moduleNames[module] || 'Bu bo\'lim'
  document.getElementById('premium-module-name').textContent = name
  modal.classList.add('show')
}

function closePremiumModal() {
  const modal = document.getElementById('premium-modal')
  if (modal) modal.classList.remove('show')
}

// ── Premium modal HTML ──
function injectPremiumModal() {
  if (document.getElementById('premium-modal')) return

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="premium-modal">
      <div class="modal-box" style="max-width:460px">
        <div class="modal-hdr" style="background:linear-gradient(135deg,#f59e0b,#d97706)">
          <h3>🔒 Premium kerak</h3>
          <button class="modal-cls" onclick="closePremiumModal()">✕</button>
        </div>
        <div class="modal-body" style="text-align:center;padding:28px 24px">
          <div style="font-size:2.5rem;margin-bottom:10px">⭐</div>
          <h3 style="margin-bottom:6px;font-size:1.1rem">
            "<span id="premium-module-name"></span>" bo'limi
          </h3>
          <p style="color:#6b7280;font-size:.88rem;margin-bottom:24px">
            Bu bo'lim faqat Professional obuna uchun mavjud
          </p>

          <div style="background:#f8f6ff;border-radius:14px;padding:16px;margin-bottom:20px;text-align:left">
            <div style="font-weight:700;font-size:.9rem;color:#6c47ff;margin-bottom:10px">
              ⭐ Professional — 49 000 so'm/oy
            </div>
            ${PLANS.pro.features.map(f =>
              `<div style="font-size:.83rem;padding:3px 0">✅ ${f}</div>`
            ).join('')}
          </div>

          <button onclick="window.location.href='premium.html'"
            style="width:100%;padding:13px;background:linear-gradient(135deg,#6c47ff,#9b7cff);
            color:#fff;border:none;border-radius:12px;font-size:.95rem;font-weight:700;cursor:pointer">
            Premium olish — 49 000 so'm/oy
          </button>
          <button onclick="closePremiumModal()"
            style="width:100%;padding:10px;margin-top:10px;background:none;
            border:none;color:#6b7280;font-size:.85rem;cursor:pointer">
            Keyinroq
          </button>
        </div>
      </div>
    </div>
  `)
}

// ── To'lov boshlash ──
async function startPayment(planId) {
  const plan = PLANS[planId]
  if (!plan) return

  if (!_currentUser) {
    window.location.href = 'index.html'
    return
  }

  // Telegram orqali to'lov (hozircha)
  const msg = encodeURIComponent(
    `Salom! Men MaktabgachaHub ${plan.name} obunasini olmoqchiman.\n` +
    `Email: ${_currentUser.email}\n` +
    `Summa: ${plan.priceText} so'm/oy`
  )

  // Pending log yozish
  await _sb.from('payment_logs').insert({
    user_id : _currentUser.id,
    amount  : plan.price,
    currency: 'UZS',
    provider: 'telegram',
    status  : 'pending'
  })

  // Telegram ga yo'naltirish
  window.open(`https://t.me/maktabgachahub_bot?start=payment_${planId}_${_currentUser.id}`, '_blank')

  showToast('Telegram bot orqali to\'lov amalga oshiriladi', 'ok')
}

// ── Obunani faollashtirish (admin tomonidan) ──
async function activateSubscription(userId, planId) {
  const periodEnd = new Date()
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  await _sb.from('subscriptions').upsert({
    user_id             : userId,
    plan                : planId,
    status              : 'active',
    payment_provider    : 'telegram',
    current_period_start: new Date().toISOString(),
    current_period_end  : periodEnd.toISOString()
  })

  await _sb
    .from('profiles')
    .update({ subscription_tier: planId })
    .eq('id', userId)
}

// ── Obuna muddatini tekshirish ──
async function checkSubscriptionExpiry() {
  if (!_currentUser) return

  const plan = getUserPlan()
  if (plan === 'free') return

  const { data } = await _sb
    .from('subscriptions')
    .select('current_period_end')
    .eq('user_id', _currentUser.id)
    .eq('status', 'active')
    .single()

  if (!data) return

  const end     = new Date(data.current_period_end)
  const now     = new Date()
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24))

  if (daysLeft <= 0) {
    // Muddati o'tgan — free ga qaytarish
    await _sb.from('profiles')
      .update({ subscription_tier: 'free' })
      .eq('id', _currentUser.id)
    await _sb.from('subscriptions')
      .update({ status: 'expired' })
      .eq('user_id', _currentUser.id)

    showToast('Obuna muddati tugadi. Yangilang!', 'err')
  } else if (daysLeft <= 3) {
    showToast(`⚠️ Obuna ${daysLeft} kundan keyin tugaydi!`, 'err')
  }
}

// Sahifa yuklanganda modalni tayyorla va muddatni tekshir
window.addEventListener('load', () => {
  injectPremiumModal()
  checkSubscriptionExpiry()
})
