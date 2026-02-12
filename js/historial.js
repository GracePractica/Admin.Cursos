// ============================================
// LÓGICA DE HISTORIAL
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('historialTableBody')) {
        initHistorial();
    }
});

async function initHistorial() {
    const colaboradorSelect = document.getElementById('colaboradorSelect');
    const searchInput = document.getElementById('searchHistorial');

    // Cargar lista de colaboradores para el selector
    try {
        const { data: colaboradores, error } = await supabaseClient
            .from('colaboradores')
            .select('id_colab, nombre_colab')
            .order('nombre_colab');

        if (error) throw error;

        if (colaboradores) {
            colaboradores.forEach(c => {
                const option = document.createElement('option');
                option.value = c.id_colab;
                option.textContent = c.nombre_colab;
                colaboradorSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando colaboradores:', error);
        showAlert('Error al cargar lista de colaboradores', 'error');
    }

    // Event Listener: Selección de Colaborador
    colaboradorSelect.addEventListener('change', (e) => {
        const colabId = e.target.value;
        if (colabId) {
            loadHistorialPorColaborador(colabId);
        } else {
            document.getElementById('historialListContainer').style.display = 'none';
        }
    });

    // Event Listener: Búsqueda local en resultados
    searchInput?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#historialTableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    });
}

async function loadHistorialPorColaborador(colaboradorId) {
    const container = document.getElementById('historialListContainer');
    const tbody = document.getElementById('historialTableBody');
    const loading = document.getElementById('historialLoading');
    const pagination = document.getElementById('paginationHistorial');

    container.style.display = 'none';
    loading.style.display = 'block';
    tbody.innerHTML = '';
    pagination.innerHTML = ''; // Limpiar paginación anterior

    try {
        // 1. Obtener historial del colaborador
        const { data: historial, error } = await supabaseClient
            .from('historial_cursos')
            .select('*')
            .eq('colaborador_id', colaboradorId)
            .order('fecha_inicio', { ascending: false });

        if (error) throw error;

        if (!historial || historial.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Este colaborador no tiene registros en el historial</td></tr>';
            loading.style.display = 'none';
            container.style.display = 'block';
            return;
        }

        // 2. Obtener datos relacionados (Colaborador info, Cursos, Dept, Puesto)
        // Obtenemos Info del Colaborador para mostrar Dept y Puesto actual
        const { data: colaborador } = await supabaseClient
            .from('colaboradores')
            .select('*')
            .eq('id_colab', colaboradorId)
            .single();

        const { data: departamentos } = await supabaseClient.from('departamento').select('*');
        const { data: puestos } = await supabaseClient.from('puestos').select('*');

        // Obtener nombres de los cursos en el historial
        const cursoIds = [...new Set(historial.map(h => h.curso_id))];
        const { data: cursos } = await supabaseClient
            .from('cursos')
            .select('id_curso, nombre_curso')
            .in('id_curso', cursoIds);

        // Mapas para búsqueda rápida
        const depMap = {};
        departamentos?.forEach(d => depMap[d.id_dep] = d.nombre_dep);

        const puestoMap = {};
        puestos?.forEach(p => puestoMap[p.id_puesto] = p.nombre_puesto);

        const cursoMap = {};
        cursos?.forEach(c => cursoMap[c.id_curso] = c.nombre_curso);

        // 3. Renderizar Tabla
        tbody.innerHTML = historial.map(item => {
            return `
            <tr>
                <td><strong>${cursoMap[item.curso_id] || 'N/A'}</strong></td>
                <td>${depMap[colaborador.dep_id] || 'N/A'}</td>
                <td>${puestoMap[colaborador.puesto_id] || 'N/A'}</td>
                <td>${formatDate(item.fecha_inicio)}</td>
                <td>${item.fecha_final ? formatDate(item.fecha_final) : '<span class="text-muted">En curso</span>'}</td>
                <td>${item.duracion_horas || '-'}</td>
                <td>
                    <span class="badge ${item.estado === 'Completado' ? 'badge-success' : 'badge-warning'}">
                        ${item.estado || 'En Proceso'}
                    </span>
                </td>
            </tr>
        `}).join('');

        loading.style.display = 'none';
        container.style.display = 'block';

    } catch (error) {
        console.error('Error cargando historial:', error);
        loading.style.display = 'none';
        showAlert('Error al cargar el historial', 'error');
    }
}

