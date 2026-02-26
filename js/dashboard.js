// ============================================
// LÓGICA DE DASHBOARD
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('healthCircle')) {
        loadDashboardData();
    }
});

async function loadDashboardData() {
    try {
        await loadDataQualityStats();
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        showAlert('Error al cargar los datos del dashboard', 'error');
    }
}

async function loadDataQualityStats() {
    try {
        // CACHÉ: evitar recalcular frecuentemente en sesiones lentas
        const CACHE_KEY = 'dq_stats_v1';
        const CACHE_TTL = 1000 * 60 * 5; // 5 minutos
        try {
            const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
            if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
                // Aplicar valores cacheados
                updateStatWithProgress('cursosDuplicados', cached.duplicados, cached.duplicadosPct);
                updateStatWithProgress('cursosSinEstado', cached.sinEstado, cached.sinEstadoPct);
                updateStatWithProgress('cursosInactivos', cached.inactivos, cached.inactivosPct);
                updateStatWithProgress('colabSinPuesto', cached.colabSinPuesto, cached.colabSinPuestoPct);
                updateHealthScore(cached.healthScore);
                return;
            }
        } catch (err) {
            console.warn('No se pudo leer cache:', err);
        }

        // 1) Obtener conteos donde sea posible usando head:true (solo devuelve count)
        const [{ count: totalCursos }, { count: totalColabs }] = await Promise.all([
            supabaseClient.from('cursos').select('*', { head: true, count: 'exact' }),
            supabaseClient.from('colaboradores').select('*', { head: true, count: 'exact' }).neq('id_colab', 0)
        ]);

        const totalCursosNum = totalCursos || 0;
        const totalColabsNum = totalColabs || 0;

        // 2) Traer solo las columnas necesarias (nombre y estado) en una sola consulta
        const { data: cursosSmall, error: cursosErr } = await supabaseClient
            .from('cursos')
            .select('nombre_curso, estado');
        if (cursosErr) throw cursosErr;

        // Normalizar nombres y contar apariciones en O(n)
        function normalizeName(s) {
            if (!s) return '';
            // quitar acentos, convertir a minúsculas y colapsar espacios
            try {
                return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
            } catch (e) {
                return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
            }
        }

        const nameCounts = Object.create(null);
        let sinEstado = 0;
        let inactivos = 0;
        (cursosSmall || []).forEach(c => {
            const n = normalizeName(c.nombre_curso);
            if (n) nameCounts[n] = (nameCounts[n] || 0) + 1;

            if (!c.estado || c.estado === null || c.estado === '') sinEstado++;
            if (c.estado === 'inactivo') inactivos++;
        });

        // duplicados: sumar todos los registros que pertenecen a nombres con count>1
        let duplicados = 0;
        Object.values(nameCounts).forEach(cnt => { if (cnt > 1) duplicados += cnt; });

        const duplicadosPct = totalCursosNum > 0 ? (duplicados / totalCursosNum) * 100 : 0;
        const sinEstadoPct = totalCursosNum > 0 ? (sinEstado / totalCursosNum) * 100 : 0;
        const inactivosPct = totalCursosNum > 0 ? (inactivos / totalCursosNum) * 100 : 0;

        // 3) Colaboradores sin puesto (usar conteo por head para evitar traer filas grandes)
        const { count: colabSinPuestoCount } = await supabaseClient
            .from('colaboradores')
            .select('*', { head: true, count: 'exact' })
            .is('puesto_id', null)
            .neq('id_colab', 0);

        const colabSinPuesto = colabSinPuestoCount || 0;
        const sinPuestoPct = totalColabsNum > 0 ? (colabSinPuesto / totalColabsNum) * 100 : 0;

        // Actualizar UI
        updateStatWithProgress('cursosDuplicados', duplicados, duplicadosPct);
        updateStatWithProgress('cursosSinEstado', sinEstado, sinEstadoPct);
        updateStatWithProgress('cursosInactivos', inactivos, inactivosPct);
        updateStatWithProgress('colabSinPuesto', colabSinPuesto, sinPuestoPct);

        const avgProblems = (duplicadosPct + sinEstadoPct + inactivosPct + sinPuestoPct) / 4;
        const healthScore = Math.max(0, 100 - avgProblems);
        updateHealthScore(healthScore);

        // Guardar en cache
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                ts: Date.now(), duplicados, duplicadosPct, sinEstado, sinEstadoPct,
                inactivos, inactivosPct, colabSinPuesto, sinPuestoPct, healthScore
            }));
        } catch (err) {
            console.warn('No se pudo guardar cache:', err);
        }

    } catch (error) {
        console.error('Error cargando estadísticas de calidad:', error);
    }
}
