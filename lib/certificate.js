// /lib/certificate.js
// Sertifikat rasmini (PNG) generatsiya qiladi va Telegram'ga yuboradi.
// Bu fayl /api/telegram-webhook.js (buyruq orqali) va
// /api/generate-certificate.js (sayt orqali) tomonidan ishlatiladi.
//
// KERAKLI NPM PAKET: sharp
// package.json'dagi "dependencies" ichiga qo'shing:
//   "sharp": "^0.33.5"

const sharp = require('sharp');

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCertificateSvg({ name, score, testName, dateStr }) {
  const safeName = escapeXml(name || 'Tarbiyachi');
  const safeTest = escapeXml(testName || 'Attestatsiya testi');
  const safeScore = escapeXml(score != null ? String(score) : '—');
  const safeDate = escapeXml(dateStr || '');

  return `
<svg width="1200" height="800" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f3d3e"/>
      <stop offset="100%" stop-color="#1a5c4a"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f4d160"/>
      <stop offset="100%" stop-color="#d4af37"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="800" fill="url(#bg)"/>

  <!-- Ichki ramka -->
  <rect x="40" y="40" width="1120" height="720" fill="none" stroke="url(#gold)" stroke-width="4"/>
  <rect x="55" y="55" width="1090" height="690" fill="none" stroke="#f4d160" stroke-width="1" opacity="0.5"/>

  <!-- Burchak bezaklari -->
  <path d="M 60 60 L 110 60 M 60 60 L 60 110" stroke="#f4d160" stroke-width="4"/>
  <path d="M 1140 60 L 1090 60 M 1140 60 L 1140 110" stroke="#f4d160" stroke-width="4"/>
  <path d="M 60 740 L 110 740 M 60 740 L 60 690" stroke="#f4d160" stroke-width="4"/>
  <path d="M 1140 740 L 1090 740 M 1140 740 L 1140 690" stroke="#f4d160" stroke-width="4"/>

  <!-- Medal / rozetka -->
  <circle cx="600" cy="150" r="55" fill="url(#gold)"/>
  <circle cx="600" cy="150" r="40" fill="none" stroke="#0f3d3e" stroke-width="3"/>
  <path d="M 600 122 L 608 142 L 630 144 L 613 158 L 619 180 L 600 168 L 581 180 L 587 158 L 570 144 L 592 142 Z" fill="#0f3d3e"/>

  <!-- Sarlavha -->
  <text x="600" y="255" font-family="Georgia, serif" font-size="52" font-weight="bold" fill="#f4d160" text-anchor="middle" letter-spacing="4">SERTIFIKAT</text>
  <text x="600" y="295" font-family="Arial, sans-serif" font-size="20" fill="#cfe8df" text-anchor="middle" letter-spacing="2">MUVAFFAQIYATLI YAKUNLANISHI UCHUN</text>

  <!-- Chiziq -->
  <line x1="450" y1="330" x2="750" y2="330" stroke="#f4d160" stroke-width="2"/>

  <!-- Ism -->
  <text x="600" y="410" font-family="Georgia, serif" font-size="46" font-weight="bold" fill="#ffffff" text-anchor="middle">${safeName}</text>

  <!-- Matn -->
  <text x="600" y="470" font-family="Arial, sans-serif" font-size="24" fill="#cfe8df" text-anchor="middle">quyidagi testni muvaffaqiyatli yakunladi:</text>
  <text x="600" y="510" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#f4d160" text-anchor="middle">${safeTest}</text>

  <!-- Ball -->
  <text x="600" y="600" font-family="Georgia, serif" font-size="64" font-weight="bold" fill="#ffffff" text-anchor="middle">${safeScore}</text>
  <text x="600" y="635" font-family="Arial, sans-serif" font-size="20" fill="#cfe8df" text-anchor="middle" letter-spacing="2">NATIJA</text>

  <!-- Sana va brend -->
  <text x="600" y="700" font-family="Arial, sans-serif" font-size="18" fill="#9fc9bb" text-anchor="middle">${safeDate}</text>
  <text x="600" y="735" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="#f4d160" text-anchor="middle" letter-spacing="3">MaktabgachaHub</text>
</svg>`.trim();
}

async function renderCertificatePng(params) {
  const svg = buildCertificateSvg(params);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// Telegram'ga rasm sifatida yuboradi (fayl sifatida, file_id emas —
// chunki rasm har safar yangidan generatsiya qilinadi)
async function sendCertificatePhoto(botToken, chatId, pngBuffer, caption) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (caption) form.append('caption', caption);
  form.append('photo', new Blob([pngBuffer], { type: 'image/png' }), 'sertifikat.png');

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    body: form
  });
  return res.json();
}

function formatDate(date) {
  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

module.exports = { renderCertificatePng, sendCertificatePhoto, formatDate };
