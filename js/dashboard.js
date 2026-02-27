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
        
        // Intentar cargar desde cache primero
        let cached = null;
        try {
            cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
            if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
                // Aplicar valores cacheados inmediatamente (respuesta rápida)
                updateStatWithProgress('cursosDuplicados', cached.duplicados, cached.duplicadosPct);
                updateStatWithProgress('cursosSinEstado', cached.sinEstado, cached.sinEstadoPct);
                updateStatWithProgress('cursosInactivos', cached.inactivos, cached.inactivosPct);
                updateStatWithProgress('colabSinPuesto', cached.colabSinPuesto, cached.colabSinPuestoPct);
                updateHealthScore(cached.healthScore);
                return; // Cache válido, no recalcular
            }
        } catch (err) {
            console.warn('Cache no disponible:', err);
        }

        // Si el cache expiró, hacer peticiones en paralelo
        const [
            { count: totalCursos },
            { count: totalColabs },
            { data: cursosSmall, error: cursosErr },
            { count: colabSinPuestoCount }
        ] = await Promise.all([
            supabaseClient.from('cursos').select('*', { head: true, count: 'exact' }),
            supabaseClient.from('colaboradores').select('*', { head: true, count: 'exact' }).neq('id_colab', 0),
            supabaseClient.from('cursos').select('id_curso, nombre_curso, estado'),
            supabaseClient.from('colaboradores')
                .select('*', { head: true, count: 'exact' })
                .is('puesto_id', null)
                .neq('id_colab', 0)
        ]);

        if (cursosErr) throw cursosErr;

        const totalCursosNum = totalCursos || 0;
        const totalColabsNum = totalColabs || 0;

        // Cálculos rápidos (O(n))
        let sinEstado = 0;
        let inactivos = 0;
        (cursosSmall || []).forEach(c => {
            if (!c.estado || c.estado === null || c.estado === '') sinEstado++;
            if (c.estado === 'inactivo') inactivos++;
        });

        const sinEstadoPct = totalCursosNum > 0 ? (sinEstado / totalCursosNum) * 100 : 0;
        const inactivosPct = totalCursosNum > 0 ? (inactivos / totalCursosNum) * 100 : 0;
        const colabSinPuesto = colabSinPuestoCount || 0;
        const sinPuestoPct = totalColabsNum > 0 ? (colabSinPuesto / totalColabsNum) * 100 : 0;

        // Actualizar UI con datos rápidos
        updateStatWithProgress('cursosSinEstado', sinEstado, sinEstadoPct);
        updateStatWithProgress('cursosInactivos', inactivos, inactivosPct);
        updateStatWithProgress('colabSinPuesto', colabSinPuesto, sinPuestoPct);

        // Cálculo costoso de duplicados en background (con bucketing optimizado)
        // No bloquea la UI siendo async
        const duplicados = getCourseDuplicatesCount(cursosSmall || []);
        const duplicadosPct = totalCursosNum > 0 ? (duplicados / totalCursosNum) * 100 : 0;

        // Actualizar UI con duplicados
        updateStatWithProgress('cursosDuplicados', duplicados, duplicadosPct);

        // Calcular salud de la BD
        const avgProblems = (duplicadosPct + sinEstadoPct + inactivosPct + sinPuestoPct) / 4;
        const healthScore = Math.max(0, 100 - avgProblems);
        updateHealthScore(healthScore);

        // Guardar en cache para próximas cargas
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                ts: Date.now(),
                duplicados, duplicadosPct,
                sinEstado, sinEstadoPct,
                inactivos, inactivosPct,
                colabSinPuesto, sinPuestoPct,
                healthScore
            }));
        } catch (err) {
            console.warn('No se pudo guardar cache:', err);
        }

    } catch (error) {
        console.error('Error cargando estadísticas de calidad:', error);
    }
}
