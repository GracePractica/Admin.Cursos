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
        // 1. Obtener todos los cursos (solo IDs) para calcular totales
        const { data: allCursos } = await supabaseClient.from('cursos').select('id_curso');
        const totalCursos = allCursos?.length || 0;

        // 2. Buscar posibles duplicados 
        //    Comparamos nombres y contamos IDs únicos que parecen duplicados
        const { data: cursosForDuplicates } = await supabaseClient.from('cursos').select('id_curso, nombre_curso');
        let duplicados = 0;
        if (cursosForDuplicates) {
            const duplicateIds = new Set();
            for (let i = 0; i < cursosForDuplicates.length; i++) {
                for (let j = i + 1; j < cursosForDuplicates.length; j++) {
                    const similarity = 1 - (levenshteinDistance(cursosForDuplicates[i].nombre_curso || '', cursosForDuplicates[j].nombre_curso || '') / Math.max(cursosForDuplicates[i].nombre_curso?.length || 0, cursosForDuplicates[j].nombre_curso?.length || 0));
                    if (similarity > 0.8) {
                        duplicateIds.add(cursosForDuplicates[i].id_curso);
                        duplicateIds.add(cursosForDuplicates[j].id_curso);
                    }
                }
            }
            duplicados = duplicateIds.size;
        }
        const duplicadosPct = totalCursos > 0 ? (duplicados / totalCursos) * 100 : 0;
        updateStatWithProgress('cursosDuplicados', duplicados, duplicadosPct);

        // 3. Cursos sin estado definido
        const { data: cursosWithState } = await supabaseClient.from('cursos').select('id_curso, estado');
        const cursosSinEstado = cursosWithState?.filter(c => !c.estado || c.estado === null || c.estado === '').length || 0;
        const sinEstadoPct = totalCursos > 0 ? (cursosSinEstado / totalCursos) * 100 : 0;
        updateStatWithProgress('cursosSinEstado', cursosSinEstado, sinEstadoPct);

        // 4. Cursos marcados como inactivos
        const cursosInactivos = cursosWithState?.filter(c => c.estado === 'inactivo').length || 0;
        const inactivosPct = totalCursos > 0 ? (cursosInactivos / totalCursos) * 100 : 0;
        updateStatWithProgress('cursosInactivos', cursosInactivos, inactivosPct);

        // Calcular puntuación de salud general:
        // 100% menos el promedio de los porcentajes de problemas detectados
        const avgProblems = (duplicadosPct + sinEstadoPct + inactivosPct) / 3;
        const healthScore = Math.max(0, 100 - avgProblems);

        // Actualizar indicador visual de salud en el dashboard
        updateHealthScore(healthScore);

    } catch (error) {
        console.error('Error cargando estadísticas de calidad:', error);
    }
}
