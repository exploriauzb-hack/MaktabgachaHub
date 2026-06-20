// ═══════════════════════════════════════
// js/premium.js — Obuna va to'lov tizimi
// ═══════════════════════════════════════

const PLANS = {
  pro: {
    id       : 'pro',
    name     : 'Professional ⭐',
    price    : 49000,
    priceText: '49 000',
    color    : '#7c3aed',
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
    color    : '#b45309',
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
  document.body.style.overflow = 'hidden'
}

function closePremiumModal() {
  const modal = document.getElementById('premium-modal')
  if (modal) modal.classList.remove('show')
  document.body.style.overflow = ''
}

// ── Premium modal HTML (yangi dizayn bilan mos) ──
function injectPremiumModal() {
  if (document.getElementById('premium-modal')) return

  if (!document.getElementById('premium-modal-style')) {
    const style = document.createElement('style')
    style.id = 'premium-modal-style'
    style.textContent = `
      #premium-modal {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.5);
        z-index: 9000;
        align-items: center;
        justify-content: center;
        padding: 16px;
        backdrop-filter: blur(4px);
      }
      #premium-modal.show { display: flex; }
      #premium-modal .pm-box {
        background: #fff;
        border-radius: 16px;
        padding: 28px;
        max-width: 460px;
        width: 100%;
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,.2);
      }
      #premium-modal .pm-close {
        position: absolute;
        top: 14px; right: 14px;
        background: #f4f5f7;
        border: none;
        border-radius: 8px;
        width: 30px; height: 30px;
        cursor: pointer;
        color: #6b7280;
        font-size: 16px;
        display: flex; align-items: center; justify-content: center;
      }
      #premium-modal .pm-close:hover { background: #e5e7eb; }
      #premium-modal .pm-icon {
        width: 56px; height: 56px;
        background: #f5f3ff;
        border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 16px;
        color: #7c3aed;
        font-size: 28px;
      }
      #premium-modal h2 { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #111827; }
      #premium-modal .pm-desc { font-size: 13px; color: #6b7280; margin-bottom: 20px; line-height: 1.6; }
      #premium-modal .pm-features { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
      #premium-modal .pm-feat {
        display: flex; align-items: center; gap: 10px;
        font-size: 13px; color: #111827;
      }
      #premium-modal .pm-feat-icon { font-size: 16px; color: #15803d; flex-shrink: 0; }
      #premium-modal .pm-price-box {
        background: #f5f3ff;
        border-radius: 10px;
        padding: 14px 16px;
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 20px;
      }
      #premium-modal .pm-price { font-size: 22px; font-weight: 700; color: #7c3aed; }
      #premium-modal .pm-price span { font-size: 13px; font-weight: 400; color: #6b7280; }
      #premium-modal .pm-old { font-size: 12px; color: #9ca3af; text-decoration: line-through; margin-top: 2px; }
      #premium-modal .pm-discount {
        background: #7c3aed; color: #fff;
        padding: 4px 10px; border-radius: 20px;
        font-size: 11px; font-weight: 700;
      }
      #premium-modal .pm-btn-buy {
        width: 100%; padding: 13px;
        background: linear-gradient(135deg, #7c3aed, #a855f7);
        color: #fff; border: none; border-radius: 10px;
        font-size: 14px; font-weight: 700; cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 8px;
        transition: transform .15s, box-shadow .15s;
        font-family: inherit;
      }
      #premium-modal .pm-btn-buy:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,58,237,.35); }
      #premium-modal .pm-btn-skip {
        width: 100%; padding: 10px; margin-top: 8px;
        background: none; border: none;
        color: #9ca3af; font-size: 13px; cursor: pointer;
        font-family: inherit;
      }
      #premium-modal .pm-btn-skip:hover { color: #6b7280; }
    `
    document.head.appendChild(style)
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div id="premium-modal" onclick="if(event.target===this)closePremiumModal()">
      <div class="pm-box">
        <button class="pm-close" onclick="closePremiumModal()">✕</button>
        <div class="pm-icon"><i class="ti ti-crown"></i></div>
        <h2>Professional tarif</h2>
        <p class="pm-desc">
          "<span id="premium-module-name"></span>" bo'limi faqat Professional obuna uchun mavjud.
          Barcha PRO imkoniyatlarga to'liq kirish oling.
        </p>
        <div class="pm-features">
          ${PLANS.pro.features.map(f => `
            <div class="pm-feat">
              <i class="ti ti-circle-check pm-feat-icon"></i> ${f}
            </div>
          `).join('')}
        </div>
        <div class="pm-price-box">
          <div>
            <div class="pm-price">49 000 so'm <span>/ oy</span></div>
            <div class="pm-old">Avval: 79 000 so'm</div>
          </div>
          <div class="pm-discount">−38%</div>
        </div>
        <button class="pm-btn-buy" onclick="window.location.href='premium.html'">
          <i class="ti ti-credit-card"></i> Hoziroq obuna bo'lish
        </button>
        <button class="pm-btn-skip" onclick="closePremiumModal()">Keyinroq</button>
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

  const msg = encodeURIComponent(
    `Salom! Men MaktabgachaHub ${plan.name} obunasini olmoqchiman.\n` +
    `Email: ${_currentUser.email}\n` +
    `Summa: ${plan.priceText} so'm/oy`
  )

  await _sb.from('payment_logs').insert({
    user_id : _currentUser.id,
    amount  : plan.price,
    currency: 'UZS',
    provider: 'telegram',
    status  : 'pending'
  })

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

  const end      = new Date(data.current_period_end)
  const now      = new Date()
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24))

  if (daysLeft <= 0) {
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

// ── Toast xabarnoma ──
function showToast(msg, type = 'ok') {
  const d = document.createElement('div')
  const bg = type === 'ok' ? '#15803d' : '#b91c1c'
  d.style.cssText = `
    position:fixed;top:20px;right:20px;z-index:99999;
    background:${bg};color:#fff;
    padding:12px 18px;border-radius:10px;
    font-size:13px;font-weight:600;
    box-shadow:0 4px 16px rgba(0,0,0,.2);
    font-family:'Inter',sans-serif;
    max-width:300px;line-height:1.4;
    transition:opacity .3s;
  `
  d.textContent = msg
  document.body.appendChild(d)
  setTimeout(() => {
    d.style.opacity = '0'
    setTimeout(() => d.remove(), 300)
  }, 3500)
}

// Sahifa yuklanganda modalni tayyorla va muddatni tekshir
window.addEventListener('load', () => {
  injectPremiumModal()
  checkSubscriptionExpiry()
})
