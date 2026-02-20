// === GESTIÓN DE CURSOS ===
const PAGINATION_GESTION = {
    cursosAsignados: { page: 1, limit: 10 }
};

let currentAsignaciones = [];
let asignacionesMetadata = {};

async function loadGestionCursos() {
    setupTabNavigation();
    await initGestionPorPuesto();
    await initGestionPorPuesto();
    // await loadConsolidarCursos(); // Elemento eliminado del HTML
}

// === NAVEGACIÓN POR PESTAÑAS ===
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Eliminar clase activa de todos los botones y contenidos
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Añadir clase activa al botón clicado
            e.target.classList.add('active');

            // Mostrar contenido de la pestaña correspondiente
            const tabName = e.target.dataset.tab;
            document.getElementById(`${tabName}Tab`).classList.add('active');
        });
    });
}

// === GESTIÓN POR PUESTO ===
// Inicializa la gestión de cursos por puesto
async function initGestionPorPuesto() {
    const searchInput = document.getElementById('puestoSearchInput');
    const hiddenIdInput = document.getElementById('selectedPuestoId');
    const resultsContainer = document.getElementById('puestoSearchResults');
    const clearBtn = document.getElementById('clearPuestoSearch');
    const courseSearchInput = document.getElementById('searchCursoAsignacion'); // Input de búsqueda de cursos

    let allPuestos = [];

    // Comprobar parámetro de filtro en URL
    const urlParams = new URLSearchParams(window.location.search);
    const filter = urlParams.get('filter');

    // Cargar puestos
    try {
        const { data: puestos, error } = await supabaseClient
            .from('puestos')
            .select('*')
            .order('nombre_puesto');

        if (error) throw error;
        allPuestos = puestos || [];

        // Manejar lógica de filtro por URL (ej. desde Dashboard)
        if (filter === 'puestos_sin_cursos' && allPuestos.length > 0) {
            const { data: puestoCursos } = await supabaseClient.from('puesto_curso').select('puesto_id');
            const puestosConCursos = new Set(puestoCursos?.map(pc => pc.puesto_id) || []);
            const puestosSinCursos = allPuestos.filter(p => !puestosConCursos.has(p.id_puesto));

            if (puestosSinCursos.length > 0) {
                selectPuesto(puestosSinCursos[0]);
                // Opcional: Mostrar alerta sobre filtrado
                showAlert(`Filtrando: Puestos sin cursos (${puestosSinCursos.length})`, 'info');
            }
        }

    } catch (error) {
        console.error('Error cargando puestos:', error);
        showAlert('Error al cargar la lista de puestos', 'error');
    }

    // Funciones Auxiliares
    function filterPuestos(term) {
        if (!term) return allPuestos;
        return allPuestos.filter(p =>
            p.nombre_puesto.toLowerCase().includes(term.toLowerCase())
        );
    }

    function renderResults(results) {
        resultsContainer.innerHTML = '';
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="dropdown-item no-results">No se encontraron puestos</div>';
            resultsContainer.style.display = 'block';
            return;
        }

        results.forEach(puesto => {
            const div = document.createElement('div');
            div.className = 'dropdown-item';
            div.textContent = puesto.nombre_puesto;
            div.onclick = () => selectPuesto(puesto);
            resultsContainer.appendChild(div);
        });
        resultsContainer.style.display = 'block';
    }

    function selectPuesto(puesto) {
        searchInput.value = puesto.nombre_puesto;
        hiddenIdInput.value = puesto.id_puesto;
        resultsContainer.style.display = 'none';
        clearBtn.style.display = 'block';

        loadCursosPorPuesto(puesto.id_puesto);
        const btnAdd = document.getElementById('btnAddCursoAsignacion');
        btnAdd.style.display = 'block';
        btnAdd.onclick = () => openAddAsignacionModal(puesto.id_puesto);
    }

    function clearSelection() {
        searchInput.value = '';
        hiddenIdInput.value = '';
        resultsContainer.style.display = 'none';
        clearBtn.style.display = 'none';
        document.getElementById('cursosListContainer').style.display = 'none';
        document.getElementById('btnAddCursoAsignacion').style.display = 'none';
        searchInput.focus();
    }

    // Escuchas de eventos
    const showAllPuestos = () => {
        const results = filterPuestos('');
        renderResults(results);
        if (searchInput.value) {
            clearBtn.style.display = 'block';
        }
    };

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value;
        const results = filterPuestos(term);
        renderResults(results);

        if (term.length > 0) {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
        }
    });

    searchInput.addEventListener('focus', showAllPuestos);
    searchInput.addEventListener('click', showAllPuestos);

    // Cerrar menú desplegable al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });

    clearBtn.addEventListener('click', clearSelection);

    // Listeners para filtros
    const filterClasificacion = document.getElementById('filterClasificacionAsignacion');
    const triggerRender = () => renderAsignacionesTable(1);

    courseSearchInput.addEventListener('input', triggerRender);
    filterClasificacion?.addEventListener('change', triggerRender);
}

// Carga los cursos asignados a un puesto específico
async function loadCursosPorPuesto(puestoId, page = 1) {
    // PAGINATION_GESTION.cursosAsignados.page = page; // Manejado en render ahora
    const container = document.getElementById('cursosListContainer');
    const tbody = document.getElementById('cursosAsignacionBody');
    const loading = document.getElementById('gestionLoading');

    container.style.display = 'none';
    loading.style.display = 'block';
    tbody.innerHTML = '';

    // Reiniciar Globales
    currentAsignaciones = [];
    asignacionesMetadata = {};

    try {
        // 1. Obtener asignaciones de cursos para este puesto
        const { data: asignaciones, error: errorAsign } = await supabaseClient
            .from('puesto_curso')
            .select('*')
            .eq('puesto_id', puestoId);

        if (errorAsign) throw errorAsign;

        currentAsignaciones = asignaciones || [];

        if (currentAsignaciones.length > 0) {
            // 2. Obtener detalles de los cursos (SOLO si hay asignaciones)
            const cursoIds = currentAsignaciones.map(a => a.curso_id);
            const { data: cursos, error: errorCursos } = await supabaseClient
                .from('cursos')
                .select('*')
                .in('id_curso', cursoIds);

            if (errorCursos) throw errorCursos;

            // Crear mapa de cursos y guardarlo en metadata
            cursos?.forEach(c => {
                asignacionesMetadata[c.id_curso] = c;
            });
        }

        renderAsignacionesTable(1);

        loading.style.display = 'none';
        container.style.display = 'block';

    } catch (error) {
        console.error('Error cargando cursos del puesto:', error);
        loading.style.display = 'none';
        showAlert('Error al cargar cursos', 'error');
    }
}

// Renderiza la tabla de asignaciones de cursos
function renderAsignacionesTable(page = 1) {
    PAGINATION_GESTION.cursosAsignados.page = page;
    const tbody = document.getElementById('cursosAsignacionBody');
    const puestoId = document.getElementById('selectedPuestoId').value;

    // 1. Obtener Filtros
    const searchTerm = document.getElementById('searchCursoAsignacion')?.value.toLowerCase() || '';
    const clasificacionFilter = document.getElementById('filterClasificacionAsignacion')?.value || '';

    // 2. Filtrar Datos
    let filteredData = currentAsignaciones;

    if (searchTerm) {
        filteredData = filteredData.filter(item => {
            const curso = asignacionesMetadata[item.curso_id];
            return curso && (
                curso.nombre_curso.toLowerCase().includes(searchTerm) ||
                curso.id_curso.toLowerCase().includes(searchTerm)
            );
        });
    }

    if (clasificacionFilter) {
        filteredData = filteredData.filter(item => item.clasificacion_estrategica === clasificacionFilter);
    }

    // 3. Manejar Estado Vacío
    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No se encontraron cursos asignados</td></tr>';
        renderPaginationControls(0, 1, PAGINATION_GESTION.cursosAsignados.limit, 'paginationCursosGestion', 'renderAsignacionesTable');
        return;
    }

    // 4. Corte de Paginación
    const startIndex = (page - 1) * PAGINATION_GESTION.cursosAsignados.limit;
    const endIndex = startIndex + PAGINATION_GESTION.cursosAsignados.limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    // 5. Renderizar Filas
    tbody.innerHTML = paginatedData.map(asignacion => {
        const curso = asignacionesMetadata[asignacion.curso_id];
        if (!curso) return '';

        return `
            <tr>
                <td>
                    <div class="d-flex flex-column">
                        <strong>${curso.nombre_curso}</strong>
                        <span class="text-muted" style="font-size: 0.75rem;">ID: ${curso.id_curso}</span>
                    </div>
                </td>
                <td>${asignacion.clasificacion_estrategica || 'N/A'}</td>
                <td>${(asignacion.vigencia_anio !== null && asignacion.vigencia_anio !== undefined) ? asignacion.vigencia_anio : 'N/A'}</td>
                <td>
                    <span class="badge badge-${asignacion.estado === 'OK' ? 'success' : 'warning'}">
                        ${asignacion.estado || 'N/A'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-small btn-outline" onclick="editCursoAsignacion(${asignacion.id_puesto_curso})">
                        Editar
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteCursoAsignacion(${asignacion.id_puesto_curso})">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // 6. Renderizar Controles de Paginación
    renderPaginationControls(filteredData.length, page, PAGINATION_GESTION.cursosAsignados.limit, 'paginationCursosGestion', 'renderAsignacionesTable');
}

// Alterna la asignación de un curso (checkbox)
async function toggleAsignacion(checkbox) {
    const cursoId = checkbox.dataset.cursoId;
    const puestoId = checkbox.dataset.puestoId;
    const assignmentId = checkbox.dataset.assignmentId;
    const row = checkbox.closest('tr');
    const inputs = row.querySelectorAll('select, input[type="number"]');

    try {
        if (checkbox.checked) {
            // Obtener valores iniciales de los inputs (que están deshabilitados visualmente pero tienen valores)
            const clasificacion = row.querySelector('select').value;
            const vigencia = row.querySelector('input[type="number"]').value;

            // CREAR asignación
            const { data, error } = await supabaseClient
                .from('puesto_curso')
                .insert([{
                    curso_id: cursoId,
                    puesto_id: puestoId,
                    clasificacion_estrategica: clasificacion,
                    vigencia_anio: parseInt(vigencia) || 0,
                    estado: 'activo'
                }])
                .select()
                .single();

            if (error) throw error;

            checkbox.dataset.assignmentId = data.id_puesto_curso;
            row.classList.add('table-active');
            inputs.forEach(input => input.disabled = false);
            showAlert('Curso asignado', 'success');

        } else {
            // ELIMINAR asignación
            if (assignmentId) {
                const { error } = await supabaseClient
                    .from('puesto_curso')
                    .delete()
                    .eq('id_puesto_curso', assignmentId);

                if (error) throw error;

                checkbox.dataset.assignmentId = '';
                row.classList.remove('table-active');
                inputs.forEach(input => input.disabled = true);
                showAlert('Asignación removida', 'success');
            }
        }
    } catch (error) {
        console.error('Error cambiando asignación:', error);
        checkbox.checked = !checkbox.checked; // Revertir
        showAlert('Error al actualizar asignación', 'error');
    }
}

// Actualiza un detalle específico de una asignación (inline editing)
async function updateAsignacionDetalle(input, field) {
    const assignmentId = input.dataset.assignmentId;

    if (!assignmentId) return;

    try {
        const updateData = {};
        updateData[field] = field === 'vigencia_anio' ? (parseInt(input.value) || 0) : input.value;

        const { error } = await supabaseClient
            .from('puesto_curso')
            .update(updateData)
            .eq('id_puesto_curso', assignmentId);

        if (error) throw error;

        // Feedback visual sutil
        input.style.borderColor = '#10b981';
        setTimeout(() => input.style.borderColor = '', 1000);

    } catch (error) {
        console.error('Error actualizando detalle:', error);
        showAlert('Error al guardar cambio', 'error');
    }
}

// === FUNCIONES UTILITARIAS Y MODALES ===
// Abre el modal para asignar un nuevo curso a un puesto
async function openAddAsignacionModal(puestoId) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('confirmModal');

    modalTitle.textContent = 'Asignar Curso a Puesto';

    try {
        const { data: puesto } = await supabaseClient
            .from('puestos')
            .select('nombre_puesto')
            .eq('id_puesto', puestoId)
            .single();

        const { data: allCursos, error } = await supabaseClient
            .from('cursos')
            .select('*')
            .order('nombre_curso');

        if (error) throw error;

        // Obtener asignaciones actuales para filtrar
        const { data: existingAssignments } = await supabaseClient
            .from('puesto_curso')
            .select('curso_id')
            .eq('puesto_id', puestoId);

        const assignedIds = new Set(existingAssignments?.map(a => a.curso_id));
        const availableCursos = allCursos.filter(c => !assignedIds.has(c.id_curso));

        modalBody.innerHTML = `
            <form id="addAsignacionForm">
                <input type="hidden" name="puesto_id" value="${puestoId}">
                
                <p class="mb-4"><strong>Puesto:</strong> ${puesto?.nombre_puesto}</p>
                
                <div class="alert alert-info" style="margin-bottom: 1rem;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                    </svg>
                    <div style="flex: 1;">
                        <strong>Nota:</strong> Solo se muestran cursos que aún no están asignados a este puesto.
                    </div>
                </div>
                
                <div id="modalValidationError" class="alert alert-warning" style="margin-bottom: 1rem; display: none;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    <div style="flex: 1;">
                        <strong id="modalValidationErrorText"></strong>
                    </div>
                </div>
                
                <div class="form-group" style="position: relative;">
                    <label class="form-label">Buscar y Seleccionar Curso *</label>
                    <input type="text" id="cursoSearchInput" class="form-input" placeholder="Escribe el nombre del curso..." autocomplete="off">
                    <input type="hidden" name="curso_id" id="selectedCursoId">
                    <div id="cursoSearchResults" class="dropdown-results" style="display: none;"></div>
                </div>

                <div class="form-group">
                    <label class="form-label">Clasificación Estratégica *</label>
                    <select class="form-select" name="clasificacion_estrategica" required>
                        <option value="NECESARIO">NECESARIO</option>
                        <option value="APORTA">APORTA</option>
                        <option value="RECOMENDADO">RECOMENDADO</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Vigencia (años) (Opcional, 0 = Indefinida)</label>
                    <input type="number" class="form-input" name="vigencia_anio" value="0" min="0">
                </div>

                <div class="form-group">
                    <label class="form-label">Estado</label>
                    <select class="form-select" name="estado">
                        <option value="OK">OK</option>
                        <option value="PENDIENTE">PENDIENTE</option>
                    </select>
                </div>
            </form>
        `;

        // Configurar búsqueda de cursos
        setupCursoSearch(availableCursos || []);

        confirmBtn.onclick = async () => {
            const selectedId = document.getElementById('selectedCursoId').value;
            const errorDiv = document.getElementById('modalValidationError');
            const errorText = document.getElementById('modalValidationErrorText');

            if (!selectedId) {
                errorText.textContent = 'Por favor selecciona un curso de la lista';
                errorDiv.style.display = 'flex';
                return;
            }

            // Ocultar error si la validación pasa
            errorDiv.style.display = 'none';
            await saveAsignacion();
        };

        openModal();

    } catch (error) {
        console.error('Error opening add modal:', error);
        showAlert('Error al cargar cursos disponibles', 'error');
    }
}

// Configura la búsqueda de cursos en el modal de asignación
function setupCursoSearch(cursos) {
    const searchInput = document.getElementById('cursoSearchInput');
    const hiddenInput = document.getElementById('selectedCursoId');
    const resultsContainer = document.getElementById('cursoSearchResults');

    const showAllCursos = () => {
        renderCursoResults(cursos, searchInput, hiddenInput, resultsContainer);
        resultsContainer.style.display = 'block';
    };

    const filterCursos = (term) => {
        if (!term) return cursos;
        return cursos.filter(c => c.nombre_curso.toLowerCase().includes(term.toLowerCase()));
    };

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value;
        const results = filterCursos(term);
        renderCursoResults(results, searchInput, hiddenInput, resultsContainer);
        resultsContainer.style.display = 'block';
    });

    searchInput.addEventListener('focus', showAllCursos);
    searchInput.addEventListener('click', showAllCursos);

    // Ocultar al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (searchInput && resultsContainer) {
            if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.style.display = 'none';
            }
        }
    });
}

// Renderiza los resultados de búsqueda de cursos
function renderCursoResults(results, searchInput, hiddenInput, resultsContainer) {
    resultsContainer.innerHTML = '';
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="dropdown-item no-results">No se encontraron cursos</div>';
        return;
    }

    results.forEach(curso => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.textContent = curso.nombre_curso;
        div.onclick = () => {
            searchInput.value = curso.nombre_curso;
            hiddenInput.value = curso.id_curso;
            resultsContainer.style.display = 'none';
        };
        resultsContainer.appendChild(div);
    });
}

// Obtiene el siguiente ID disponible para puesto_curso
async function getNextPuestoCursoId() {
    try {
        const { data, error } = await supabaseClient
            .from('puesto_curso')
            .select('id_puesto_curso')
            .order('id_puesto_curso', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) return 1;

        return parseInt(data[0].id_puesto_curso) + 1;
    } catch (error) {
        console.error('Error getting next ID:', error);
        return Date.now(); // Respaldo a timestamp si falla la consulta
    }
}

// Guarda una nueva asignación de curso
async function saveAsignacion() {
    const form = document.getElementById('addAsignacionForm');
    if (!form) return;
    const formData = new FormData(form);

    const nextId = await getNextPuestoCursoId();

    const asignacion = {
        id_puesto_curso: nextId,
        puesto_id: formData.get('puesto_id'),
        curso_id: formData.get('curso_id'),
        clasificacion_estrategica: formData.get('clasificacion_estrategica'),
        vigencia_anio: parseInt(formData.get('vigencia_anio')) || 0,
        estado: formData.get('estado')
    };

    try {
        const { error } = await supabaseClient
            .from('puesto_curso')
            .insert([asignacion]);

        if (error) throw error;

        showAlert('Curso asignado exitosamente', 'success');
        closeModal();
        await loadCursosPorPuesto(asignacion.puesto_id);

    } catch (error) {
        console.error('Error saving assignment:', error);
        showAlert('Error al asignar el curso: ' + (error.message || error.code || JSON.stringify(error)), 'error');
    }
}

// Abre el modal para editar una asignación existente
async function editCursoAsignacion(assignmentId) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('confirmModal');

    modalTitle.textContent = 'Editar Curso';

    try {
        // Obtener detalles de la asignación
        const { data: assignment, error } = await supabaseClient
            .from('puesto_curso')
            .select('*, cursos(nombre_curso), puestos(nombre_puesto)')
            .eq('id_puesto_curso', assignmentId)
            .single();

        if (error) throw error;
        if (!assignment) throw new Error('Asignación no encontrada');

        modalBody.innerHTML = `
            <form id="editAsignacionForm">
                <input type="hidden" name="id_puesto_curso" value="${assignment.id_puesto_curso}">
                <input type="hidden" name="puesto_id" value="${assignment.puesto_id}">
                
                <div class="form-group">
                    <p><strong>Puesto:</strong> ${assignment.puestos?.nombre_puesto}</p>
                    <p><strong>Curso:</strong> ${assignment.cursos?.nombre_curso}</p>
                </div>

                <div class="form-group">
                    <label class="form-label">Clasificación Estratégica *</label>
                    <select class="form-select" name="clasificacion_estrategica" required>
                        <option value="NECESARIO" ${assignment.clasificacion_estrategica === 'NECESARIO' ? 'selected' : ''}>NECESARIO</option>
                        <option value="APORTA" ${assignment.clasificacion_estrategica === 'APORTA' ? 'selected' : ''}>APORTA</option>
                        <option value="RECOMENDADO" ${assignment.clasificacion_estrategica === 'RECOMENDADO' ? 'selected' : ''}>RECOMENDADO</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Vigencia (años)</label>
                    <input type="number" id="editVigencia" class="form-input" value="${assignment.vigencia_anio || 0}" min="0">
                </div>

                <div class="form-group">
                    <label class="form-label">Estado</label>
                    <select class="form-select" name="estado">
                        <option value="OK" ${assignment.estado === 'OK' ? 'selected' : ''}>OK</option>
                        <option value="PENDIENTE" ${assignment.estado === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
                    </select>
                </div>
            </form>
        `;

        confirmBtn.onclick = async () => {
            await updateAsignacion();
        };

        openModal();

    } catch (error) {
        console.error('Error loading assignment:', error);
        showAlert('Error al cargar la asignación', 'error');
    }
}

// Actualiza una asignación existente en la base de datos
async function updateAsignacion() {
    const form = document.getElementById('editAsignacionForm');
    const formData = new FormData(form);
    const id = formData.get('id_puesto_curso');
    const puestoId = formData.get('puesto_id');

    const updates = {
        clasificacion_estrategica: formData.get('clasificacion_estrategica'),
        vigencia_anio: parseInt(formData.get('vigencia_anio')) || 0,
        estado: formData.get('estado')
    };

    try {
        const { error } = await supabaseClient
            .from('puesto_curso')
            .update(updates)
            .eq('id_puesto_curso', id);

        if (error) throw error;

        showAlert('Asignación actualizada', 'success');
        closeModal();
        await loadCursosPorPuesto(puestoId);

    } catch (error) {
        console.error('Error updating assignment:', error);
        showAlert('Error al actualizar asignación', 'error');
    }
}

// Inicia el proceso de eliminación de una asignación
async function deleteCursoAsignacion(assignmentId) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('confirmModal');

    try {
        // Obtener detalles de la asignación primero
        const { data: assignment } = await supabaseClient
            .from('puesto_curso')
            .select('*, cursos(nombre_curso), puestos(nombre_puesto)')
            .eq('id_puesto_curso', assignmentId)
            .single();

        if (!assignment) {
            showAlert('Asignación no encontrada', 'error');
            return;
        }

        modalTitle.textContent = 'Confirmar Eliminación';

        modalBody.innerHTML = `
            <div class="alert alert-warning">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                <div style="flex: 1;">
                    <strong>¿Estás seguro de que deseas eliminar esta asignación?</strong>
                    <div style="margin-top: 0.5rem;">
                        <strong>Curso:</strong> ${assignment.cursos?.nombre_curso || 'N/A'}<br>
                        <strong>Puesto:</strong> ${assignment.puestos?.nombre_puesto || 'N/A'}
                    </div>
                    <div style="font-size: 0.875rem; margin-top: 0.5rem; color: #dc2626;">
                        Esta acción no se puede deshacer.
                    </div>
                </div>
            </div>
        `;

        confirmBtn.textContent = 'Eliminar';
        confirmBtn.className = 'btn btn-danger';
        confirmBtn.onclick = async () => {
            await confirmDeleteCursoAsignacion(assignmentId);
        };

        openModal();

    } catch (error) {
        console.error('Error loading assignment:', error);
        showAlert('Error al cargar la asignación', 'error');
    }
}

// Confirma y ejecuta la eliminación de la asignación
async function confirmDeleteCursoAsignacion(assignmentId) {
    try {
        const { error } = await supabaseClient
            .from('puesto_curso')
            .delete()
            .eq('id_puesto_curso', assignmentId);

        if (error) throw error;

        showAlert('Asignación eliminada exitosamente', 'success');
        closeModal();

        // Recargar los cursos del puesto actual
        const puestoId = document.getElementById('selectedPuestoId').value;
        if (puestoId) {
            await loadCursosPorPuesto(puestoId);
        }

        // Restablecer el botón de confirmación al estado predeterminado
        const confirmBtn = document.getElementById('confirmModal');
        confirmBtn.textContent = 'Guardar';
        confirmBtn.className = 'btn btn-primary';

    } catch (error) {
        console.error('Error deleting assignment:', error);
        showAlert('Error al eliminar la asignación: ' + error.message, 'error');
    }
}
