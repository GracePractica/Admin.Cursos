// ============================================
// LÓGICA DE HISTORIAL
// ============================================

let currentColaboradorId = null;
let currentHistorialData = [];
let historialMetadata = {
    colaborador: null,
    cursoMap: {}, // Mapa para busqueda rapida de nombres de curso por ID
    depMap: {},   // Mapa para departamentos
    puestoMap: {} // Mapa para puestos
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('historialTableBody')) {
        initHistorial();
    }
});

// Inicializa los componentes de la página de historial
async function initHistorial() {
    const searchInput = document.getElementById('colaboradorSearchInput');
    const hiddenIdInput = document.getElementById('selectedColaboradorId');
    const resultsContainer = document.getElementById('colaboradorSearchResults');
    const clearBtn = document.getElementById('clearColaboradorSearch');
    const resultsSearchInput = document.getElementById('searchHistorial');
    const filterEstadoInput = document.getElementById('filterEstadoHistorial');
    const addHistorialButton = document.getElementById('addHistorialButton');

    // Listener para el botón de agregar
    addHistorialButton?.addEventListener('click', () => {
        const colabId = hiddenIdInput.value;
        if (colabId) {
            openAddHistorialModal(colabId);
        } else {
            showAlert('Por favor seleccione un colaborador primero', 'warning');
        }
    });

    let allColaboradores = [];

    // Cargar lista de colaboradores
    try {
        const { data: colaboradores, error } = await supabaseClient
            .from('colaboradores')
            .select('id_colab, nombre_colab')
            .order('nombre_colab');

        if (error) throw error;
        allColaboradores = colaboradores || [];
    } catch (error) {
        console.error('Error cargando colaboradores:', error);
        showAlert('Error al cargar lista de colaboradores', 'error');
    }

    // Funciones Auxiliares
    function filterColaboradores(term) {
        if (!term) return allColaboradores;
        return allColaboradores.filter(c =>
            c.nombre_colab.toLowerCase().includes(term.toLowerCase())
        );
    }

    // Renderiza los resultados de la búsqueda de colaboradores
    function renderResults(results) {
        resultsContainer.innerHTML = '';
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="dropdown-item no-results">No se encontraron colaboradores</div>';
            resultsContainer.style.display = 'block';
            return;
        }

        results.forEach(colab => {
            const div = document.createElement('div');
            div.className = 'dropdown-item';
            div.textContent = colab.nombre_colab;
            div.onclick = () => selectColaborador(colab);
            resultsContainer.appendChild(div);
        });
        resultsContainer.style.display = 'block';
    }

    // Maneja la selección de un colaborador de la lista de búsqueda
    function selectColaborador(colab) {
        currentColaboradorId = colab.id_colab;
        searchInput.value = colab.nombre_colab;
        hiddenIdInput.value = colab.id_colab;
        resultsContainer.style.display = 'none';
        clearBtn.style.display = 'block';

        // Mostrar botón de agregar
        if (addHistorialButton) addHistorialButton.style.display = 'flex';

        loadHistorialPorColaborador(1);
    }

    // Limpia la selección actual y reinicia la búsqueda
    function clearSelection() {
        currentColaboradorId = null;
        searchInput.value = '';
        hiddenIdInput.value = '';
        resultsContainer.style.display = 'none';
        clearBtn.style.display = 'none';

        // Ocultar botón de agregar
        if (addHistorialButton) addHistorialButton.style.display = 'none';

        document.getElementById('historialListContainer').style.display = 'none';
        searchInput.focus();
    }

    // Escuchas de eventos
    const showAllColaboradores = () => {
        const results = filterColaboradores('');
        renderResults(results);
        if (searchInput.value) {
            clearBtn.style.display = 'block';
        }
    };

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value;
        const results = filterColaboradores(term);
        renderResults(results);

        if (term.length > 0) {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
        }
    });

    searchInput.addEventListener('focus', showAllColaboradores);
    searchInput.addEventListener('click', showAllColaboradores);

    document.addEventListener('click', (e) => {
        // Búsqueda de colaborador
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }

        // Búsqueda de curso (en modal)
        const cursoInput = document.getElementById('cursoSearchInput');
        const cursoResults = document.getElementById('cursoSearchResults');
        if (cursoInput && cursoResults) {
            if (!cursoInput.contains(e.target) && !cursoResults.contains(e.target)) {
                cursoResults.style.display = 'none';
            }
        }
    });

    clearBtn.addEventListener('click', clearSelection);

    // Búsqueda local en resultados
    resultsSearchInput?.addEventListener('input', (e) => {
        renderHistorialTable(1);
    });

    // Filtro por estado
    filterEstadoInput?.addEventListener('change', (e) => {
        renderHistorialTable(1);
    });
}

// Carga el historial de capacitaciones para un colaborador específico
async function loadHistorialPorColaborador(page = 1, forceRefresh = false) {
    if (!currentColaboradorId) return;

    const container = document.getElementById('historialListContainer');
    const tbody = document.getElementById('historialTableBody');
    const loading = document.getElementById('historialLoading');

    container.style.display = 'none';
    loading.style.display = 'block';
    tbody.innerHTML = '';

    try {
        // 1. Obtener historial del colaborador
        const { data: historialRes, error } = await supabaseClient
            .from('historial_cursos')
            .select('*')
            .eq('colaborador_id', currentColaboradorId)
            .order('fecha_inicio', { ascending: false });

        if (error) throw error;
        currentHistorialData = historialRes || [];

        // 2. Obtener datos relacionados (Información del colaborado, Cursos, Puestos)
        const { data: colaborador } = await supabaseClient
            .from('colaboradores')
            .select('*')
            .eq('id_colab', currentColaboradorId)
            .single();

        const { data: departamentos } = await supabaseClient.from('departamento').select('*');
        const { data: puestos } = await supabaseClient.from('puestos').select('*');

        // Obtener nombres de los cursos en el historial
        const cursoIds = [...new Set(currentHistorialData.map(h => h.curso_id))];
        let cursos = [];
        if (cursoIds.length > 0) {
            const { data: cursosRes } = await supabaseClient
                .from('cursos')
                .select('id_curso, nombre_curso')
                .in('id_curso', cursoIds);
            cursos = cursosRes || [];
        }

        // Actualizar Metadatos
        historialMetadata.colaborador = colaborador;

        historialMetadata.depMap = {};
        departamentos?.forEach(d => historialMetadata.depMap[d.id_dep] = d.id_dep);

        historialMetadata.puestoMap = {};
        puestos?.forEach(p => historialMetadata.puestoMap[p.id_puesto] = p.nombre_puesto);

        historialMetadata.cursoMap = {};
        cursos?.forEach(c => historialMetadata.cursoMap[c.id_curso] = c.nombre_curso);

        loading.style.display = 'none';
        container.style.display = 'block';

        renderHistorialTable(page);

    } catch (error) {
        console.error('Error cargando historial:', error);
        loading.style.display = 'none';
        showAlert('Error al cargar el historial', 'error');
    }
}

// Renderiza la tabla de historial con los datos cargados
function renderHistorialTable(page = 1) {
    const tbody = document.getElementById('historialTableBody');
    const pagination = document.getElementById('paginationHistorial');
    const searchTerm = document.getElementById('searchHistorial')?.value.toLowerCase();

    tbody.innerHTML = '';
    pagination.innerHTML = '';

    let filteredHistorial = currentHistorialData;

    // Filtrar
    if (searchTerm) {
        filteredHistorial = filteredHistorial.filter(item => {
            const cursoNombre = historialMetadata.cursoMap[item.curso_id]?.toLowerCase() || '';
            const cursoId = item.curso_id?.toLowerCase() || '';
            return cursoNombre.includes(searchTerm) || cursoId.includes(searchTerm);
        });
    }

    const estadoFilter = document.getElementById('filterEstadoHistorial')?.value;
    if (estadoFilter) {
        filteredHistorial = filteredHistorial.filter(item => item.estado === estadoFilter);
    }

    if (filteredHistorial.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No se encontraron registros</td></tr>';
        return;
    }

    // Paginación
    const limit = PAGINATION.historial.limit;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedHistorial = filteredHistorial.slice(startIndex, endIndex);

    // Renderizar Filas
    tbody.innerHTML = paginatedHistorial.map(item => {
        return `
        <tr>
            <td>
                <div class="d-flex flex-column">
                    <strong>${historialMetadata.cursoMap[item.curso_id] || 'N/A'}</strong>
                    <span class="text-muted" style="font-size: 0.75rem;">ID: ${item.curso_id}</span>
                </div>
            </td>
            <td>${formatDate(item.fecha_inicio)}</td>
            <td>${item.fecha_final ? formatDate(item.fecha_final) : '<span class="text-muted">En curso</span>'}</td>
            <td>${item.duracion_horas || '-'}</td>
            <td>
                <span class="badge ${item.estado === 'Completado' ? 'badge-success' : 'badge-warning'}">
                    ${item.estado || 'En Proceso'}
                </span>
            </td>
            <td>
                ${item.is_active === false ? (
                    (CURRENT_USER_ROLE === 'ADMIN')
                    ? '<button class="btn btn-small btn-success" onclick="restoreHistorial(' + item.id_historial + ')">♻️ Restaurar</button>'
                    : '<span style="color:#6b7280; font-style:italic;">Eliminado</span>'
                ) : (
                    '<button class="btn btn-small btn-outline" onclick="editHistorial(' + item.id_historial + ')">Editar</button>' +
                    '<button class="btn btn-small btn-danger" onclick="deleteHistorial(' + item.id_historial + ')">Eliminar</button>'
                )}
            </td>
        </tr>
    `}).join('');

    renderPaginationControls(filteredHistorial.length, page, limit, 'paginationHistorial', 'renderHistorialTable'); // Callback cambiado a renderHistorialTable
}

// === Operaciones CRUD ===

// Abre el modal para registrar una nueva capacitación
async function openAddHistorialModal(colaboradorId) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('confirmModal');

    modalTitle.textContent = 'Registrar Nueva Capacitación';

    try {
        const { data: cursos } = await supabaseClient
            .from('cursos')
            .select('id_curso, nombre_curso')
            .order('nombre_curso');

        const { data: colab } = await supabaseClient
            .from('colaboradores')
            .select('nombre_colab')
            .eq('id_colab', colaboradorId)
            .single();

        modalBody.innerHTML = `
            <form id="addHistorialForm">
                <input type="hidden" name="colaborador_id" value="${colaboradorId}">
                <p class="mb-4"><strong>Colaborador:</strong> ${colab?.nombre_colab}</p>

                <div id="modalValidationError" class="alert alert-warning" style="margin-bottom: 1rem; display: none;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    <div style="flex: 1;">
                        <strong id="modalValidationErrorText"></strong>
                    </div>
                </div>

                <div class="form-group" style="position: relative;">
                    <label class="form-label">Buscar Curso *</label>
                    <input type="text" class="form-input" id="cursoSearchInput" placeholder="Escribe el nombre del curso..." autocomplete="off" required>
                    <input type="hidden" name="curso_id" id="selectedCursoId">
                    <div id="cursoSearchResults" class="dropdown-results" style="display: none;"></div>
                </div>

                <div class="form-group-row">
                    <div class="form-group">
                        <label class="form-label">Fecha Inicio *</label>
                        <input type="date" class="form-input" name="fecha_inicio" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Fecha Final *</label>
                        <input type="date" class="form-input" name="fecha_final" required>
                    </div>
                </div>

                <div class="form-group-row">
                    <div class="form-group">
                        <label class="form-label">Duración (Horas)</label>
                        <input type="number" class="form-input" name="duracion_horas" step="0.5" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estado</label>
                        <select class="form-select" name="estado">
                            <option value="Completado">Completado</option>
                            <option value="En Proceso">En Proceso</option>
                            <option value="Pendiente">Pendiente</option>
                        </select>
                    </div>
                </div>
            </form>
        `;

        // Configurar búsqueda de cursos
        setupCursoSearch(cursos || []);

        confirmBtn.textContent = 'Guardar';
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.disabled = false;
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
            await saveHistorial();
        };

        openModal();

    } catch (error) {
        console.error('Error loading modal data:', error);
        showAlert('Error al cargar datos para el formulario', 'error');
    }
}

// Configura la lógica de búsqueda de cursos dentro del modal
function setupCursoSearch(cursos) {
    const searchInput = document.getElementById('cursoSearchInput');
    const hiddenInput = document.getElementById('selectedCursoId');
    const resultsContainer = document.getElementById('cursoSearchResults');

    const doSearch = (term) => {
        const filtered = term ? cursos.filter(c =>
            c.nombre_curso.toLowerCase().includes(term)
        ) : cursos; // Mostrar todos si está vacío
        renderCursoResults(filtered, searchInput, hiddenInput, resultsContainer);
    };

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        doSearch(term);
    });

    searchInput.addEventListener('focus', () => {
        doSearch(searchInput.value.toLowerCase());
    });

    // También activar al hacer clic en caso de que ya tenga el foco pero esté cerrado
    searchInput.addEventListener('click', () => {
        if (resultsContainer.style.display === 'none') {
            doSearch(searchInput.value.toLowerCase());
        }
    });
}

// Renderiza los resultados de la búsqueda de cursos
function renderCursoResults(results, searchInput, hiddenInput, resultsContainer) {
    resultsContainer.innerHTML = '';
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="dropdown-item no-results">No se encontraron cursos</div>';
        resultsContainer.style.display = 'block';
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
    resultsContainer.style.display = 'block';
}

// Guarda el registro de historial en la base de datos
async function saveHistorial() {
    const form = document.getElementById('addHistorialForm');
    const formData = new FormData(form);

    const historialData = {
        colaborador_id: formData.get('colaborador_id'),
        curso_id: formData.get('curso_id'),
        fecha_inicio: formData.get('fecha_inicio'),
        fecha_final: formData.get('fecha_final') || null,
        duracion_horas: formData.get('duracion_horas') ? parseFloat(formData.get('duracion_horas')) : null,
        estado: formData.get('estado')
    };

    try {
        const { error } = await supabaseClient
            .from('historial_cursos')
            .insert([historialData]);

        if (error) throw error;

        showAlert('Capacitación registrada exitosamente', 'success');
        closeModal();
        await loadHistorialPorColaborador(PAGINATION.historial.page);

    } catch (error) {
        console.error('Error saving historial:', error);
        const errorDiv = document.getElementById('modalValidationError');
        const errorText = document.getElementById('modalValidationErrorText');

        if (errorDiv && errorText) {
            errorText.textContent = 'Error al registrar la capacitación: ' + (error.message || 'Error desconocido');
            errorDiv.style.display = 'flex';
        } else {
            showAlert('Error al registrar la capacitación: ' + (error.message || 'Error desconocido'), 'error');
        }
    }
}

// Abre el modal para editar un registro existente
async function editHistorial(historialId) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('confirmModal');

    modalTitle.textContent = 'Editar Capacitación';

    try {
        const { data: historial, error } = await supabaseClient
            .from('historial_cursos')
            .select('*')
            .eq('id_historial', historialId)
            .single();

        if (error) throw error;

        const { data: cursos } = await supabaseClient
            .from('cursos')
            .select('id_curso, nombre_curso')
            .order('nombre_curso');

        const { data: colab } = await supabaseClient
            .from('colaboradores')
            .select('nombre_colab')
            .eq('id_colab', historial.colaborador_id)
            .single();

        const cursoActual = cursos?.find(c => c.id_curso == historial.curso_id);

        modalBody.innerHTML = `
            <form id="editHistorialForm">
                <input type="hidden" name="id" value="${historial.id_historial}">
                <input type="hidden" name="colaborador_id" value="${historial.colaborador_id}">
                <input type="hidden" name="curso_id" id="selectedCursoId" value="${historial.curso_id}">

                <p class="mb-4"><strong>Colaborador:</strong> ${colab?.nombre_colab}</p>

                <div class="form-group" style="position: relative;">
                    <label class="form-label">Curso</label>
                    <input type="text" class="form-input" value="${cursoActual?.nombre_curso || ''}" readonly>
                </div>

                <div class="form-group-row">
                    <div class="form-group">
                        <label class="form-label">Fecha Inicio *</label>
                        <input type="date" class="form-input" name="fecha_inicio" value="${historial.fecha_inicio || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Fecha Final *</label>
                        <input type="date" class="form-input" name="fecha_final" value="${historial.fecha_final || ''}" required>
                    </div>
                </div>

                <div class="form-group-row">
                    <div class="form-group">
                        <label class="form-label">Duración (Horas)</label>
                        <input type="number" class="form-input" name="duracion_horas" step="0.5" min="0" value="${historial.duracion_horas || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estado</label>
                        <select class="form-select" name="estado">
                            <option value="Completado" ${historial.estado === 'Completado' ? 'selected' : ''}>Completado</option>
                            <option value="En Proceso" ${historial.estado === 'En Proceso' ? 'selected' : ''}>En Proceso</option>
                            <option value="Pendiente" ${historial.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                        </select>
                    </div>
                </div>
            </form>
        `;

        confirmBtn.textContent = 'Guardar';
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.onclick = async () => {
            await updateHistorial();
        };

        openModal();

    } catch (error) {
        console.error('Error loading historial for edit:', error);
        showAlert('Error al cargar la capacitación', 'error');
    }
}

// Actualiza el registro de historial en la base de datos
async function updateHistorial() {
    const form = document.getElementById('editHistorialForm');
    const formData = new FormData(form);
    const id = formData.get('id');
    const colaboradorId = formData.get('colaborador_id');

    const updates = {
        curso_id: formData.get('curso_id'),
        fecha_inicio: formData.get('fecha_inicio'),
        fecha_final: formData.get('fecha_final') || null,
        duracion_horas: formData.get('duracion_horas') ? parseFloat(formData.get('duracion_horas')) : null,
        estado: formData.get('estado')
    };

    try {
        const { error } = await supabaseClient
            .from('historial_cursos')
            .update(updates)
            .eq('id_historial', id);

        if (error) throw error;

        showAlert('Capacitación actualizada correctamente', 'success');
        closeModal();
        await loadHistorialPorColaborador(PAGINATION.historial.page);

    } catch (error) {
        console.error('Error updating historial:', error);
        showAlert('Error al actualizar la capacitación: ' + (error.message || 'Error desconocido'), 'error');
    }
}

// Inicia el proceso de eliminación mostrando confirmación
async function deleteHistorial(historialId) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('confirmModal');

    modalTitle.textContent = 'Confirmar Eliminación';

    try {
        // Obtener detalles del registro para mostrar
        const { data: record } = await supabaseClient
            .from('historial_cursos')
            .select('*, cursos(nombre_curso)')
            .eq('id_historial', historialId)
            .single();

        modalBody.innerHTML = `
            <div class="alert alert-warning">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                <div style="flex: 1;">
                    <strong>¿Estás seguro de que deseas eliminar este registro de capacitación?</strong>
                    <div style="margin-top: 0.5rem;">
                        <strong>Curso:</strong> ${record.cursos?.nombre_curso || 'N/A'}<br>
                        <strong>Fecha:</strong> ${formatDate(record.fecha_inicio)}
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
            await confirmDeleteHistorial(historialId);
        };

        openModal();

    } catch (error) {
        console.error('Error loading record for delete:', error);
        showAlert('Error al cargar el registro', 'error');
    }
}

// Confirma y ejecuta la eliminación del registro
async function confirmDeleteHistorial(historialId) {
    try {
        const { error } = await supabaseClient
            .from('historial_cursos')
            .update({is_active: false})
            .eq('id_historial', historialId);

        if (error) throw error;

        showAlert('Registro eliminado exitosamente', 'success');
        closeModal();
        await loadHistorialPorColaborador(PAGINATION.historial.page);

        // Restablecer el botón de confirmación al estado predeterminado
        const confirmBtn = document.getElementById('confirmModal');
        confirmBtn.textContent = 'Guardar';
        confirmBtn.className = 'btn btn-primary';

    } catch (error) {
        console.error('Error deleting historial:', error);
        showAlert('Error al eliminar el registro', 'error');
    }
}

// Restaura un registro de historial eliminado (solo ADMIN)
async function restoreHistorial(historialId) {
    if (CURRENT_USER_ROLE !== 'ADMIN') {
        showAlert('No tiene permisos para restaurar registros', 'error');
        return;
    }

    try {
        const confirmRestore = confirm('¿Desea restaurar este registro de capacitación?');
        if (!confirmRestore) return;

        const { error } = await supabaseClient
            .from('historial_cursos')
            .update({ is_active: true })
            .eq('id_historial', historialId);

        if (error) throw error;

        showAlert('Registro restaurado correctamente', 'success');
        await loadHistorialPorColaborador(PAGINATION.historial.page);
    } catch (error) {
        console.error('Error restaurando historial:', error);
        showAlert('Error al restaurar el registro: ' + (error.message || error), 'error');
    }
}

