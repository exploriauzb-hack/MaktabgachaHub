// ═══════════════════════════════════════
// js/supabase.js — Supabase ulanish
// Barcha sahifalarda shu fayl birinchi yuklanadi
// ═══════════════════════════════════════

const SUPABASE_URL = 'https://oxpbltvnbjzxqwsxrpvg.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGJsdHZuYmp6eHF3c3hycHZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDIxNzAsImV4cCI6MjA5NTgxODE3MH0.a_-0iKSBa8l2mr4bte6ay3g5tcgSukFA4i72YX6naQQ'

// Global Supabase client — barcha fayllar _sb orqali ishlatadi
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
