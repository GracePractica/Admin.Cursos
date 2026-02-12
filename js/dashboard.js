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
        // 1. Get all courses
        const { data: allCursos } = await supabaseClient.from('cursos').select('id_curso');
        const totalCursos = allCursos?.length || 0;

        // 2. Potential duplicates using Levenshtein distance
        const { data: cursosForDuplicates } = await supabaseClient.from('cursos').select('id_curso, nombre_curso');
        let duplicados = 0;
        if (cursosForDuplicates) {
            const checkedPairs = new Set();
            for (let i = 0; i < cursosForDuplicates.length; i++) {
                for (let j = i + 1; j < cursosForDuplicates.length; j++) {
                    const pairKey = `${cursosForDuplicates[i].id_curso}-${cursosForDuplicates[j].id_curso}`;
                    if (!checkedPairs.has(pairKey)) {
                        const similarity = 1 - (levenshteinDistance(cursosForDuplicates[i].nombre_curso || '', cursosForDuplicates[j].nombre_curso || '') / Math.max(cursosForDuplicates[i].nombre_curso?.length || 0, cursosForDuplicates[j].nombre_curso?.length || 0));
                        if (similarity > 0.8) {
                            duplicados++;
                            checkedPairs.add(pairKey);
                            checkedPairs.add(`${cursosForDuplicates[j].id_curso}-${cursosForDuplicates[i].id_curso}`);
                        }
                    }
                }
            }
        }
        const duplicadosPct = totalCursos > 0 ? (duplicados / totalCursos) * 100 : 0;
        updateStatWithProgress('cursosDuplicados', duplicados, duplicadosPct);

        // 3. Inactive courses
        const { data: inactiveCursos } = await supabaseClient.from('cursos').select('id_curso').eq('estado', 'inactivo');
        const cursosInactivos = inactiveCursos?.length || 0;
        const inactivosPct = totalCursos > 0 ? (cursosInactivos / totalCursos) * 100 : 0;
        updateStatWithProgress('cursosInactivos', cursosInactivos, inactivosPct);

        // 4. Courses without state
        const { data: cursosWithState } = await supabaseClient.from('cursos').select('id_curso, estado');
        const cursosSinEstado = cursosWithState?.filter(c => !c.estado || c.estado === null || c.estado === '').length || 0;
        const sinEstadoPct = totalCursos > 0 ? (cursosSinEstado / totalCursos) * 100 : 0;
        updateStatWithProgress('cursosSinEstado', cursosSinEstado, sinEstadoPct);

        // 5. Collaborators without position
        const { data: allColaboradores } = await supabaseClient.from('colaboradores').select('id_colaborador, puesto_id');
        const totalColaboradores = allColaboradores?.length || 0;
        const colabSinPuesto = allColaboradores?.filter(c => !c.puesto_id || c.puesto_id === null).length || 0;
        const colabSinPuestoPct = totalColaboradores > 0 ? (colabSinPuesto / totalColaboradores) * 100 : 0;
        updateStatWithProgress('colaboradoresSinPuesto', colabSinPuesto, colabSinPuestoPct);

        // Update totals
        const totalColabElement = document.getElementById('totalColaboradores');
        if (totalColabElement) {
            totalColabElement.textContent = totalColaboradores;
        }

        // Calculate overall health score (100% - average of all problem percentages)
        const avgProblems = (duplicadosPct + inactivosPct + sinEstadoPct + colabSinPuestoPct) / 4;
        const healthScore = Math.max(0, 100 - avgProblems);

        // Update health score
        updateHealthScore(healthScore);

    } catch (error) {
        console.error('Error cargando estadísticas de calidad:', error);
    }
}
