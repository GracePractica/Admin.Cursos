// ============================================
// LÓGICA DE CURSOS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('cursosTableBody')) {
        loadCursos();
        setupCursosListeners();
    }
});

function setupCursosListeners() {
    document.getElementById('addCursoButton')?.addEventListener('click', () => openAddCursoModal());

    document.getElementById('filterPuestoCurso')?.addEventListener('change', (e) => {
        currentFilters.puesto = e.target.value;
        loadCursos();
    });

    document.getElementById('filterClasificacion')?.addEventListener('change', (e) => {
        currentFilters.clasificacion = e.target.value;
        loadCursos();
    });

    document.getElementById('searchCurso')?.addEventListener('input', (e) => {
        loadCursos();
    });
}

// === CURSOS ===
async function loadCursos(page = 1) {
    PAGINATION.cursos.page = page;
    const tbody = document.getElementById('cursosTableBody');
    if (!tbody) return;

    try {
        // Check for URL filter parameter
        const urlParams = new URLSearchParams(window.location.search);
        const filter = urlParams.get('filter');

        let query = supabaseClient
            .from('cursos')
            .select('*')
            .order('id_curso');

        // Get all courses first for filtering
        const { data: allCursos, error } = await query;
        if (error) throw error;

        let cursos = allCursos || [];
        let filterMessage = '';

        // Apply filters based on URL parameter
        if (filter === 'duplicados') {
            // Find duplicate courses using Levenshtein distance
            const duplicates = [];
            for (let i = 0; i < cursos.length; i++) {
                for (let j = i + 1; j < cursos.length; j++) {
                    const similarity = 1 - (levenshteinDistance(cursos[i].nombre_curso || '', cursos[j].nombre_curso || '') / Math.max(cursos[i].nombre_curso?.length || 0, cursos[j].nombre_curso?.length || 0));
                    if (similarity > 0.8) {
                        if (!duplicates.find(d => d.id_curso === cursos[i].id_curso)) {
                            duplicates.push(cursos[i]);
                        }
                        if (!duplicates.find(d => d.id_curso === cursos[j].id_curso)) {
                            duplicates.push(cursos[j]);
                        }
                    }
                }
            }
            cursos = duplicates;
            filterMessage = `Mostrando ${cursos.length} posibles cursos duplicados (similitud > 80%)`;
        } else if (filter === 'inactivos') {
            cursos = cursos.filter(c => c.estado === 'inactivo');
            filterMessage = `Mostrando ${cursos.length} cursos inactivos`;
        } else if (filter === 'sin_estado') {
            cursos = cursos.filter(c => !c.estado || c.estado === null || c.estado === '');
            filterMessage = `Mostrando ${cursos.length} cursos sin estado definido`;
        }

        // Display filter message if filter is active
        if (filterMessage) {
            // Remove any existing filter alerts first
            const existingAlerts = tbody.parentElement.parentElement.querySelectorAll('.filter-alert');
            existingAlerts.forEach(alert => alert.remove());

            const filterAlert = document.createElement('div');
            filterAlert.className = 'alert alert-info filter-alert';
            filterAlert.style.marginBottom = '1rem';
            filterAlert.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z"/>
                </svg>
                <div style="flex: 1;">
                    <strong>${filterMessage}</strong>
                    <div style="font-size: 0.875rem; margin-top: 0.25rem;">
                        <a href="cursos.html" style="color: inherit; text-decoration: underline;">Ver todos los cursos</a>
                    </div>
                </div>
            `;
            tbody.parentElement.parentElement.insertBefore(filterAlert, tbody.parentElement);
        }

        // Aplicar filtros dinámicos (estado y búsqueda)
        const filterEstado = document.getElementById('filterEstadoCurso')?.value;
        const searchTerm = document.getElementById('searchCurso')?.value.toLowerCase();

        if (filterEstado) {
            cursos = cursos.filter(c => c.estado === filterEstado);
        }

        if (searchTerm) {
            cursos = cursos.filter(c =>
                (c.nombre_curso?.toLowerCase().includes(searchTerm)) ||
                (c.id_curso?.toLowerCase().includes(searchTerm))
            );
        }

        if (!cursos || cursos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No se encontraron cursos con este filtro</td></tr>';
            renderPaginationControls(0, 1, PAGINATION.cursos.limit, 'paginationCursos', 'loadCursos');
            return;
        }

        // Paginación
        const startIndex = (page - 1) * PAGINATION.cursos.limit;
        const endIndex = startIndex + PAGINATION.cursos.limit;
        const paginatedCursos = cursos.slice(startIndex, endIndex);

        tbody.innerHTML = paginatedCursos.map(curso => `
            <tr ${filter ? 'style="background-color: #fffbeb;"' : ''}>
                <td>${curso.id_curso}</td>
                <td><strong>${curso.nombre_curso || 'N/A'}</strong></td>
                <td>
                    <span class="badge badge-${curso.estado === 'activo' ? 'success' : 'danger'}">
                        ${curso.estado || 'N/A'}
                    </span>
                </td>
                <td>${curso.primera_fecha ? new Date(curso.primera_fecha).toLocaleDateString() : 'N/A'}</td>
                <td>${curso.ultima_fecha ? new Date(curso.ultima_fecha).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <button class="btn btn-small btn-outline" onclick="editCurso('${curso.id_curso}')">
                        Editar
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteCurso('${curso.id_curso}', '${curso.nombre_curso?.replace(/'/g, "\\'")}')">
                        Eliminar
                    </button>
                </td>
            </tr>
        `).join('');

        renderPaginationControls(cursos.length, page, PAGINATION.cursos.limit, 'paginationCursos', 'loadCursos');

    } catch (error) {
        console.error('Error cargando cursos:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Error al cargar cursos</td></tr>';
    }
}

async function toggleCursoEstado(cursoId, isActive) {
    try {
        const nuevoEstado = isActive ? 'activo' : 'inactivo';

        const { error } = await supabaseClient
            .from('cursos')
            .update({ estado: nuevoEstado })
            .eq('id_curso', cursoId);

        if (error) throw error;

        showAlert(`Curso ${isActive ? 'activado' : 'desactivado'} exitosamente`, 'success');
        // await loadStats(); // loadStats usage needs verification if it works without dashboard

    } catch (error) {
        console.error('Error actualizando estado del curso:', error);
        showAlert('Error al actualizar el estado', 'error');
    }
}

async function openAddCursoModal() {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.textContent = 'Agregar Nuevo Curso';

    modalBody.innerHTML = `
        <form id="addCursoForm">
            <div class="form-group">
                <label class="form-label">Nombre del Curso *</label>
                <input type="text" class="form-input" name="nombre_curso" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Primera Fecha (Opcional)</label>
                <input type="date" class="form-input" name="primera_fecha">
            </div>

            <div class="form-group">
                <label class="form-label">Última Fecha (Opcional)</label>
                <input type="date" class="form-input" name="ultima_fecha">
            </div>

            <div class="form-group">
                <label class="form-label">Estado *</label>
                <select class="form-select" name="estado" required>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                </select>
            </div>
        </form>
    `;

    document.getElementById('confirmModal').onclick = async () => {
        await saveCurso();
    };

    openModal();
}

async function getNextCursoId() {
    try {
        const { data, error } = await supabaseClient
            .from('cursos')
            .select('id_curso')
            .order('id_curso', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) return 'CU_0001';

        const lastId = data[0].id_curso;
        const numberPart = lastId.split('_')[1];
        const nextNumber = parseInt(numberPart) + 1;
        return `CU_${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
        console.error('Error generating next Curso ID:', error);
        return 'CU_' + Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    }
}

async function saveCurso() {
    const form = document.getElementById('addCursoForm');
    const formData = new FormData(form);

    try {
        const nextId = await getNextCursoId();
        const curso = {
            id_curso: nextId,
            nombre_curso: formData.get('nombre_curso'),
            primera_fecha: formData.get('primera_fecha') || null,
            ultima_fecha: formData.get('ultima_fecha') || null,
            estado: formData.get('estado')
        };
        // Solo insertar el curso
        const { error: errorCurso } = await supabaseClient
            .from('cursos')
            .insert([curso]);

        if (errorCurso) throw errorCurso;

        showAlert('Curso agregado exitosamente', 'success');
        closeModal();
        await loadCursos();

    } catch (error) {
        console.error('Error guardando curso:', error);
        showAlert('Error al guardar el curso: ' + error.message, 'error');
    }
}

async function editPuestoCurso(puestoCursoId) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.textContent = 'Editar Asignación de Curso';

    try {
        const { data: puestoCurso } = await supabaseClient
            .from('puesto_curso')
            .select('*')
            .eq('id_puesto_curso', puestoCursoId)
            .single();

        const { data: curso } = await supabaseClient
            .from('cursos')
            .select('nombre_curso')
            .eq('id_curso', puestoCurso.curso_id)
            .single();

        const { data: puesto } = await supabaseClient
            .from('puestos')
            .select('nombre_puesto')
            .eq('id_puesto', puestoCurso.puesto_id)
            .single();

        modalBody.innerHTML = `
            <form id="editPuestoCursoForm">
                <input type="hidden" name="id_puesto_curso" value="${puestoCurso.id_puesto_curso}">
                
                <div class="form-group">
                    <p><strong>Curso:</strong> ${curso?.nombre_curso || 'N/A'}</p>
                    <p><strong>Puesto:</strong> ${puesto?.nombre_puesto || 'N/A'}</p>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Clasificación Estratégica *</label>
                    <select class="form-select" name="clasificacion_estrategica" required>
                        <option value="Necesario" ${puestoCurso.clasificacion_estrategica === 'Necesario' ? 'selected' : ''}>Necesario</option>
                        <option value="Complementa" ${puestoCurso.clasificacion_estrategica === 'Complementa' ? 'selected' : ''}>Complementa</option>
                        <option value="Aporta" ${puestoCurso.clasificacion_estrategica === 'Aporta' ? 'selected' : ''}>Aporta</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Vigencia (años) *</label>
                    <input type="number" class="form-input" name="vigencia_anio" value="${puestoCurso.vigencia_anio || 1}" min="1" required>
                </div>
            </form>
        `;

        document.getElementById('confirmModal').onclick = async () => {
            await updatePuestoCurso();
        };

        openModal();

    } catch (error) {
        console.error('Error cargando asignación:', error);
        showAlert('Error al cargar la asignación', 'error');
    }
}

async function updatePuestoCurso() {
    const form = document.getElementById('editPuestoCursoForm');
    const formData = new FormData(form);

    const puestoCursoId = formData.get('id_puesto_curso');
    const datos = {
        clasificacion_estrategica: formData.get('clasificacion_estrategica'),
        vigencia_anio: parseInt(formData.get('vigencia_anio'))
    };

    try {
        const { error } = await supabaseClient
            .from('puesto_curso')
            .update(datos)
            .eq('id_puesto_curso', puestoCursoId);

        if (error) throw error;

        showAlert('Asignación actualizada exitosamente', 'success');
        closeModal();
        await loadCursos();

    } catch (error) {
        console.error('Error actualizando asignación:', error);
        showAlert('Error al actualizar la asignación', 'error');
    }
}

// === EDITAR CURSO ===
function editCurso(cursoId) {
    console.log('editCurso function called with ID:', cursoId);
    loadCursoData(cursoId);
}

async function loadCursoData(cursoId) {
    try {
        const { data: curso, error } = await supabaseClient
            .from('cursos')
            .select('*')
            .eq('id_curso', cursoId)
            .single();

        if (error) {
            console.error('Database error:', error);
            showAlert('Error al cargar el curso: ' + error.message, 'error');
            return;
        }

        if (!curso) {
            showAlert('Curso no encontrado', 'error');
            return;
        }

        // Populate modal
        displayEditCursoModal(curso);

    } catch (error) {
        console.error('Exception in loadCursoData:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

function displayEditCursoModal(curso) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('confirmModal');

    if (!modalBody || !modalTitle) {
        console.error('Modal elements not found');
        return;
    }

    modalTitle.textContent = 'Editar Curso';

    const primeraFecha = curso.primera_fecha ? curso.primera_fecha.split('T')[0] : '';
    const ultimaFecha = curso.ultima_fecha ? curso.ultima_fecha.split('T')[0] : '';

    modalBody.innerHTML = `
        <form id="editCursoForm">
            <input type="hidden" name="id_curso" value="${curso.id_curso}">
            
            <div class="form-group">
                <label class="form-label">Nombre del Curso *</label>
                <input type="text" class="form-input" name="nombre_curso" value="${curso.nombre_curso || ''}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Primera Fecha</label>
                <input type="date" class="form-input" name="primera_fecha" value="${primeraFecha}">
            </div>
            
            <div class="form-group">
                <label class="form-label">Última Fecha</label>
                <input type="date" class="form-input" name="ultima_fecha" value="${ultimaFecha}">
            </div>
            
            <div class="form-group">
                <label class="form-label">Estado *</label>
                <select class="form-select" name="estado" required>
                    <option value="activo" ${curso.estado === 'activo' ? 'selected' : ''}>Activo</option>
                    <option value="inactivo" ${curso.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                </select>
            </div>
        </form>
    `;

    confirmBtn.onclick = updateCurso;
    openModal();
}

async function updateCurso() {
    const form = document.getElementById('editCursoForm');
    if (!form) return;

    const formData = new FormData(form);
    const cursoId = formData.get('id_curso');

    const curso = {
        nombre_curso: formData.get('nombre_curso'),
        primera_fecha: formData.get('primera_fecha') || null,
        ultima_fecha: formData.get('ultima_fecha') || null,
        estado: formData.get('estado')
    };

    try {
        const { error } = await supabaseClient
            .from('cursos')
            .update(curso)
            .eq('id_curso', cursoId);

        if (error) throw error;

        showAlert('Curso actualizado exitosamente', 'success');
        closeModal();
        await loadCursos();

    } catch (error) {
        console.error('Error updating course:', error);
        showAlert('Error al actualizar el curso: ' + error.message, 'error');
    }
}

async function deleteCurso(cursoId, cursoNombre) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('confirmModal');

    modalTitle.textContent = 'Confirmar Eliminación';

    modalBody.innerHTML = `
        <div class="alert alert-warning">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            <div style="flex: 1;">
                <strong>¿Estás seguro de que deseas eliminar este curso?</strong>
                <div style="margin-top: 0.5rem;">
                    <strong>Curso:</strong> ${cursoNombre}
                </div>
                <div style="font-size: 0.875rem; margin-top: 0.5rem; color: #dc2626;">
                    Esta acción no se puede deshacer. Se eliminarán todas las asignaciones y registros relacionados con este curso.
                </div>
            </div>
        </div>
    `;

    confirmBtn.textContent = 'Eliminar';
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.onclick = async () => {
        await confirmDeleteCurso(cursoId);
    };

    openModal();
}

async function confirmDeleteCurso(cursoId) {
    try {
        // First, delete related records in puesto_curso
        const { error: puestoCursoError } = await supabaseClient
            .from('puesto_curso')
            .delete()
            .eq('curso_id', cursoId);

        if (puestoCursoError) throw puestoCursoError;

        // Then, delete related records in historial_cursos
        const { error: historialError } = await supabaseClient
            .from('historial_cursos')
            .delete()
            .eq('curso_id', cursoId);

        if (historialError) throw historialError;

        // Finally, delete the course itself
        const { error } = await supabaseClient
            .from('cursos')
            .delete()
            .eq('id_curso', cursoId);

        if (error) throw error;

        showAlert('Curso eliminado exitosamente', 'success');
        closeModal();
        await loadCursos();

        // Reset confirm button to default state
        const confirmBtn = document.getElementById('confirmModal');
        confirmBtn.textContent = 'Guardar';
        confirmBtn.className = 'btn btn-primary';

    } catch (error) {
        console.error('Error deleting course:', error);
        showAlert('Error al eliminar el curso: ' + error.message, 'error');
    }
}
