// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================

const SUPABASE_URL = 'https://qtozpwzcbifmelqyvvyk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0b3pwd3pjYmlmbWVscXl2dnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mzg2NDIsImV4cCI6MjA4NTExNDY0Mn0.izez0Cc9Ct1VSI3YDVkdmUoEOD3C-FYA0uJVfvO1ytQ';

// Inicializar cliente de Supabase
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
