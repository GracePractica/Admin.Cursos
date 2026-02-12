// === GESTIÓN DE CURSOS ===
const PAGINATION_GESTION = {
    cursosAsignados: { page: 1, limit: 10 }
};

async function loadGestionCursos() {
    setupTabNavigation();
    await initGestionPorPuesto();
    await initGestionPorPuesto();
    // await loadConsolidarCursos(); // Element removed from HTML
}

// === TAB NAVIGATION ===
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Remove active class from all buttons and contents
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Add active class to clicked button
            e.target.classList.add('active');

            // Show corresponding tab content
            const tabName = e.target.dataset.tab;
            document.getElementById(`${tabName}Tab`).classList.add('active');
        });
    });
}

// === GESTIÓN POR PUESTO ===
async function initGestionPorPuesto() {
    const searchInput = document.getElementById('puestoSearchInput');
    const hiddenIdInput = document.getElementById('selectedPuestoId');
    const resultsContainer = document.getElementById('puestoSearchResults');
    const clearBtn = document.getElementById('clearPuestoSearch');
    const courseSearchInput = document.getElementById('searchCursoAsignacion'); // Input de búsqueda de cursos

    let allPuestos = [];

    // Check for URL filter parameter
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

        // Handle URL Filter Logic (e.g. from Dashboard)
        if (filter === 'puestos_sin_cursos' && allPuestos.length > 0) {
            const { data: puestoCursos } = await supabaseClient.from('puesto_curso').select('puesto_id');
            const puestosConCursos = new Set(puestoCursos?.map(pc => pc.puesto_id) || []);
            const puestosSinCursos = allPuestos.filter(p => !puestosConCursos.has(p.id_puesto));

            if (puestosSinCursos.length > 0) {
                selectPuesto(puestosSinCursos[0]);
                // Optional: Show alert about filtering
                showAlert(`Filtrando: Puestos sin cursos (${puestosSinCursos.length})`, 'info');
            }
        }

    } catch (error) {
        console.error('Error cargando puestos:', error);
        showAlert('Error al cargar la lista de puestos', 'error');
    }

    // Funciones Helper
    function filterPuestos(term) {
        if (!term) return [];
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
        document.getElementById('btnAddCursoAsignacion').onclick = () => openAddAsignacionModal(puesto.id_puesto);
    }

    function clearSelection() {
        searchInput.value = '';
        hiddenIdInput.value = '';
        resultsContainer.style.display = 'none';
        clearBtn.style.display = 'none';
        document.getElementById('cursosListContainer').style.display = 'none';
        searchInput.focus();
    }

    // Event Listeners
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value;
        if (term.length > 0) {
            const results = filterPuestos(term);
            renderResults(results);
            clearBtn.style.display = 'block';
        } else {
            resultsContainer.style.display = 'none';
            clearBtn.style.display = 'none';
        }
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.length > 0) {
            resultsContainer.style.display = 'block';
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });

    clearBtn.addEventListener('click', clearSelection);

    // Existing search logic for courses
    courseSearchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#cursosAsignacionBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    });
}

async function loadCursosPorPuesto(puestoId, page = 1) {
    PAGINATION_GESTION.cursosAsignados.page = page;
    const container = document.getElementById('cursosListContainer');
    const tbody = document.getElementById('cursosAsignacionBody');
    const loading = document.getElementById('gestionLoading');

    container.style.display = 'none';
    loading.style.display = 'block';
    tbody.innerHTML = '';

    try {
        // 1. Obtener asignaciones de cursos para este puesto
        const { data: asignaciones, error: errorAsign } = await supabaseClient
            .from('puesto_curso')
            .select('*')
            .eq('puesto_id', puestoId);

        if (errorAsign) throw errorAsign;

        if (!asignaciones || asignaciones.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Este puesto no tiene cursos asignados</td></tr>';
            loading.style.display = 'none';
            container.style.display = 'block';
            renderPaginationControls(0, 1, PAGINATION_GESTION.cursosAsignados.limit, 'paginationCursosGestion', `loadCursosPorPuesto('${puestoId}')`);
            return;
        }

        // 2. Obtener detalles de los cursos
        const cursoIds = asignaciones.map(a => a.curso_id);
        const { data: cursos, error: errorCursos } = await supabaseClient
            .from('cursos')
            .select('*')
            .in('id_curso', cursoIds);

        if (errorCursos) throw errorCursos;

        // Crear mapa de cursos
        const cursoMap = {};
        cursos?.forEach(c => {
            cursoMap[c.id_curso] = c;
        });

        // Paginación
        const startIndex = (page - 1) * PAGINATION_GESTION.cursosAsignados.limit;
        const endIndex = startIndex + PAGINATION_GESTION.cursosAsignados.limit;
        const paginatedAsignaciones = asignaciones.slice(startIndex, endIndex);

        // 3. Renderizar tabla con solo los cursos asignados
        tbody.innerHTML = paginatedAsignaciones.map(asignacion => {
            const curso = cursoMap[asignacion.curso_id];
            if (!curso) return ''; // Skip si no se encuentra el curso

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
                            Editar Asignación
                        </button>
                        <button class="btn btn-small btn-danger" onclick="deleteCursoAsignacion(${asignacion.id_puesto_curso})">
                            Eliminar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        renderPaginationControls(asignaciones.length, page, PAGINATION_GESTION.cursosAsignados.limit, 'paginationCursosGestion', `loadCursosPorPuesto('${puestoId}')`);

        loading.style.display = 'none';
        container.style.display = 'block';

    } catch (error) {
        console.error('Error cargando cursos del puesto:', error);
        loading.style.display = 'none';
        showAlert('Error al cargar cursos', 'error');
    }
}

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

// === PLACEHOLDER FUNCTIONS (Por implementar) ===
async function openAddAsignacionModal(puestoId) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('confirmModal');

    modalTitle.textContent = 'Asignar Curso a Puesto';

    // Fetch all courses to populate the list, maybe filter out already assigned ones if needed, 
    // but for now let's just show them and maybe disable or handle duplicates validation on save.
    // Better: Fetch courses NOT assigned to this puesto.

    try {
        const { data: allCursos, error } = await supabaseClient
            .from('cursos')
            .select('*')
            .order('nombre_curso');

        if (error) throw error;

        // Get current assignments to filter
        const { data: existingAssignments } = await supabaseClient
            .from('puesto_curso')
            .select('curso_id')
            .eq('puesto_id', puestoId);

        const assignedIds = new Set(existingAssignments?.map(a => a.curso_id));
        const availableCursos = allCursos.filter(c => !assignedIds.has(c.id_curso));

        modalBody.innerHTML = `
            <form id="addAsignacionForm">
                <input type="hidden" name="puesto_id" value="${puestoId}">
                
                <div class="form-group">
                    <label class="form-label">Buscar y Seleccionar Curso *</label>
                    <input type="text" id="searchCursoModal" class="form-input" placeholder="Escribe para buscar..." style="margin-bottom: 0.5rem;" autocomplete="off">
                    <select class="form-select" name="curso_id" id="cursoSelectModal" size="5" required>
                        ${availableCursos.map(c => `<option value="${c.id_curso}">${c.nombre_curso}</option>`).join('')}
                    </select>
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

        // Add search functionality in modal
        const searchInput = document.getElementById('searchCursoModal');
        const select = document.getElementById('cursoSelectModal');

        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            select.innerHTML = '';

            const filtered = availableCursos.filter(c => c.nombre_curso.toLowerCase().includes(term));

            filtered.forEach(c => {
                const option = document.createElement('option');
                option.value = c.id_curso;
                option.textContent = c.nombre_curso;
                select.appendChild(option);
            });

            if (filtered.length === 0) {
                const option = document.createElement('option');
                option.disabled = true;
                option.textContent = 'No se encontraron cursos';
                select.appendChild(option);
            }
        });

        confirmBtn.onclick = async () => {
            // Validate that a course is selected
            if (!select.value) {
                showAlert('Por favor selecciona un curso de la lista', 'warning');
                return;
            }
            await saveAsignacion();
        };

        openModal();

    } catch (error) {
        console.error('Error opening add modal:', error);
        showAlert('Error al cargar cursos disponibles', 'error');
    }
}

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
        return Date.now(); // Fallback to timestamp if query fails
    }
}

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

async function editCursoAsignacion(assignmentId) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('confirmModal');

    modalTitle.textContent = 'Editar Asignación de Curso';

    try {
        // Get assignment details
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
                    <label class="form-label">Vigencia (años) (Opcional, 0 = Indefinida)</label>
                    <input type="number" class="form-input" name="vigencia_anio" value="${assignment.vigencia_anio || 0}" min="0">
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

async function deleteCursoAsignacion(assignmentId) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('confirmModal');

    try {
        // Get assignment details first
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

async function confirmDeleteCursoAsignacion(assignmentId) {
    try {
        const { error } = await supabaseClient
            .from('puesto_curso')
            .delete()
            .eq('id_puesto_curso', assignmentId);

        if (error) throw error;

        showAlert('Asignación eliminada exitosamente', 'success');
        closeModal();

        // Reload the current position's courses
        const puestoId = document.getElementById('selectedPuestoId').value;
        if (puestoId) {
            await loadCursosPorPuesto(puestoId);
        }

        // Reset confirm button to default state
        const confirmBtn = document.getElementById('confirmModal');
        confirmBtn.textContent = 'Guardar';
        confirmBtn.className = 'btn btn-primary';

    } catch (error) {
        console.error('Error deleting assignment:', error);
        showAlert('Error al eliminar la asignación: ' + error.message, 'error');
    }
}


// === CONSOLIDAR CURSOS ===
async function loadConsolidarCursos() {
    const tbody = document.getElementById('consolidarTableBody');

    try {
        // Check for URL filter parameter
        const urlParams = new URLSearchParams(window.location.search);
        const filter = urlParams.get('filter');

        const { data: cursos } = await supabaseClient.from('cursos').select('*').order('nombre_curso');
        const { data: puestoCursos } = await supabaseClient.from('puesto_curso').select('curso_id, puesto_id');
        const { data: puestos } = await supabaseClient.from('puestos').select('*');

        if (!cursos) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Error al cargar cursos</td></tr>';
            return;
        }

        // Create puesto map
        const puestoMap = {};
        puestos?.forEach(p => puestoMap[p.id_puesto] = p.nombre_puesto);

        // Calculate courses without classification
        let displayCursos = cursos;
        let filterMessage = '';

        if (filter === 'sin_clasificacion') {
            // Filter courses that have no assignments
            displayCursos = cursos.filter(curso => {
                const assignedPuestos = puestoCursos?.filter(pc => pc.curso_id === curso.id_curso) || [];
                return assignedPuestos.length === 0;
            });
            filterMessage = `Mostrando ${displayCursos.length} cursos sin asignar a ningún puesto`;
        }

        // Display filter message if active
        if (filterMessage) {
            // Remove any existing filter alerts first
            const existingAlerts = tbody.parentElement.parentElement.querySelectorAll('.filter-alert');
            existingAlerts.forEach(alert => alert.remove());

            const filterAlert = document.createElement('div');
            filterAlert.className = 'alert alert-warning filter-alert';
            filterAlert.style.marginBottom = '1rem';
            filterAlert.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z"/>
                </svg>
                <div style="flex: 1;">
                    <strong>${filterMessage}</strong>
                    <div style="font-size: 0.875rem; margin-top: 0.25rem;">
                        Usa la pestaña "Gestión por Puesto" para asignarlos →
                        <a href="gestion.html" style="color: inherit; text-decoration: underline; margin-left: 0.5rem;">Ver todos los cursos</a>
                    </div>
                </div>
            `;
            tbody.parentElement.parentElement.insertBefore(filterAlert, tbody.parentElement);
        }

        tbody.innerHTML = displayCursos.map(curso => {
            // Count assigned positions
            const assignedPuestos = puestoCursos?.filter(pc => pc.curso_id === curso.id_curso) || [];
            const puestosNames = assignedPuestos.map(pc => puestoMap[pc.puesto_id]).filter(Boolean);
            const isUnassigned = assignedPuestos.length === 0;

            return `
                <tr ${(filter && isUnassigned) ? 'style="background-color: #fef3c7;"' : ''}>
                    <td>
                        <input type="checkbox" class="curso-checkbox" data-curso-id="${curso.id_curso}">
                    </td>
                    <td><strong>${curso.nombre_curso}</strong></td>
                    <td>${curso.grupo_curso || 'N/A'}</td>
                    <td>
                        <span class="badge badge-${curso.estado === 'activo' ? 'success' : 'warning'}">
                            ${curso.estado || 'N/A'}
                        </span>
                    </td>
                    <td>${(curso.vigencia_anio !== null && curso.vigencia_anio !== undefined) ? curso.vigencia_anio : 'N/A'}</td>
                    <td>${puestosNames.length > 0 ? puestosNames.join(', ') : '<span style="color: #dc2626; font-weight: 600;">Ninguno</span>'}</td>
                    <td>
                        <button class="btn btn-small btn-outline" onclick="editCursoDetails(${curso.id_curso})">
                            Editar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        //Setup event listeners
        setupConsolidarEventListeners();

    } catch (error) {
        console.error('Error cargando cursos:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Error al cargar cursos</td></tr>';
    }
}

async function setupConsolidarEventListeners() {
    // Select all checkbox
    document.getElementById('selectAllCursos')?.addEventListener('change', (e) => {
        document.querySelectorAll('.curso-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
        });
        updateMergeButton();
    });

    // Individual checkboxes
    document.querySelectorAll('.curso-checkbox').forEach(cb => {
        cb.addEventListener('change', updateMergeButton);
    });

    // Search functionality
    const searchTerm = document.getElementById('searchCursos').value.toLowerCase();
    const { data } = await supabase
        .from('cursos')
        .select('*')
        .ilike('nombre', `%${searchTerm}%`);
    // Merge button
    document.getElementById('mergeSelectedCursos')?.addEventListener('click', openMergeCursosModal);
}

function updateMergeButton() {
    const selectedCount = document.querySelectorAll('.curso-checkbox:checked').length;
    const mergeButton = document.getElementById('mergeSelectedCursos');
    if (mergeButton) {
        mergeButton.disabled = selectedCount < 2;
        mergeButton.textContent = selectedCount >= 2
            ? `Fusionar ${selectedCount} Cursos Seleccionados`
            : 'Fusionar Cursos Seleccionados';
    }
}

async function openMergeCursosModal() {
    const selectedCheckboxes = document.querySelectorAll('.curso-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.cursoId));

    if (selectedIds.length < 2) {
        showAlert('Selecciona al menos 2 cursos para fusionar', 'warning');
        return;
    }

    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.textContent = 'Fusionar Cursos';

    // Get curso details
    const { data: cursos } = await supabaseClient
        .from('cursos')
        .select('*')
        .in('id_curso', selectedIds);

    modalBody.innerHTML = `
        <div class="form-group">
            <p><strong>Cursos seleccionados para fusionar:</strong></p>
            <ul>
                ${cursos.map(c => `<li>${c.nombre_curso} (${c.grupo_curso || 'Sin grupo'})</li>`).join('')}
            </ul>
        </div>
        
        <div class="form-group">
            <label class="form-label">Selecciona el curso principal (los demás se fusionarán en este):</label>
            <select class="form-select" id="targetCursoId" required>
                ${cursos.map(c => `<option value="${c.id_curso}">${c.nombre_curso}</option>`).join('')}
            </select>
        </div>
        
        <div class="alert alert-warning">
            <strong>Advertencia:</strong> Esta acción actualizará todos los registros del historial para apuntar al curso principal y eliminará los cursos duplicados. Esta acción no se puede deshacer.
        </div>
    `;

    document.getElementById('confirmModal').onclick = async () => {
        await mergeCursos(selectedIds);
    };

    openModal();
}

async function mergeCursos(cursoIds) {
    const targetCursoId = parseInt(document.getElementById('targetCursoId').value);
    const cursosToDelete = cursoIds.filter(id => id !== targetCursoId);

    try {
        // Update historial_cursos to point to target curso
        for (const cursoId of cursosToDelete) {
            await supabaseClient
                .from('historial_cursos')
                .update({ curso_id: targetCursoId })
                .eq('curso_id', cursoId);
        }

        // Update puesto_curso assignments
        for (const cursoId of cursosToDelete) {
            // Get existing assignments for this curso
            const { data: existingAssignments } = await supabaseClient
                .from('puesto_curso')
                .select('*')
                .eq('curso_id', cursoId);

            if (existingAssignments) {
                for (const assignment of existingAssignments) {
                    // Check if target curso already has this puesto assignment
                    const { data: targetAssignment } = await supabaseClient
                        .from('puesto_curso')
                        .select('*')
                        .eq('curso_id', targetCursoId)
                        .eq('puesto_id', assignment.puesto_id)
                        .single();

                    if (!targetAssignment) {
                        // Create new assignment for target curso
                        await supabaseClient
                            .from('puesto_curso')
                            .insert([{
                                curso_id: targetCursoId,
                                puesto_id: assignment.puesto_id,
                                clasificacion_estrategica: assignment.clasificacion_estrategica,
                                vigencia_anio: assignment.vigencia_anio,
                                estado: assignment.estado
                            }]);
                    }
                }
            }

            // Delete old puesto_curso assignments
            await supabaseClient
                .from('puesto_curso')
                .delete()
                .eq('curso_id', cursoId);
        }

        // Delete the merged cursos
        const { error } = await supabaseClient
            .from('cursos')
            .delete()
            .in('id_curso', cursosToDelete);

        if (error) throw error;

        showAlert('Cursos fusionados exitosamente', 'success');
        closeModal();
        await loadConsolidarCursos();
        await loadMatrizCursoPuesto();

    } catch (error) {
        console.error('Error merging cursos:', error);
        showAlert('Error al fusionar cursos: ' + error.message, 'error');
    }
}

async function editCursoDetails(cursoId) {
    console.log('editCursoDetails called with ID:', cursoId);

    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('confirmModal');

    // Check if modal elements exist
    if (!modalBody) {
        console.error('modalBody element not found!');
        alert('Error: No se encontró el elemento modal. Por favor recarga la página.');
        return;
    }
    if (!modalTitle) {
        console.error('modalTitle element not found!');
        return;
    }
    if (!confirmBtn) {
        console.error('confirmModal button not found!');
        return;
    }

    modalTitle.textContent = 'Editar Detalles del Curso';

    try {
        console.log('Fetching course data for ID:', cursoId);
        console.log('ID type:', typeof cursoId);
        const { data: curso, error } = await supabaseClient
            .from('cursos')
            .select('*')
            .eq('id_curso', cursoId)
            .single();

        if (error) {
            console.error('Error fetching course:', error);
            throw error;
        }

        if (!curso) {
            console.error('Course not found');
            showAlert('Curso no encontrado', 'error');
            return;
        }

        console.log('Course data loaded:', curso);

        const primeraFecha = curso.primera_fecha ? curso.primera_fecha.split('T')[0] : '';
        const ultimaFecha = curso.ultima_fecha ? curso.ultima_fecha.split('T')[0] : '';

        modalBody.innerHTML = `
            <form id="editCursoDetailsForm">
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

        confirmBtn.onclick = async () => {
            await updateCursoDetails();
        };

        console.log('Opening modal...');

        // Check if openModal function exists
        if (typeof openModal === 'function') {
            openModal();
            console.log('Modal opened successfully');
        } else {
            console.error('openModal function not found!');
            // Fallback: manually open modal
            const modal = document.getElementById('mainModal');
            if (modal) {
                modal.classList.add('active');
                confirmBtn.style.display = 'inline-flex';
                console.log('Modal opened using fallback method');
            } else {
                console.error('mainModal element not found!');
                alert('Error: No se pudo abrir el modal. Por favor recarga la página.');
            }
        }

    } catch (error) {
        console.error('Error in editCursoDetails:', error);
        showAlert('Error al cargar el curso: ' + error.message, 'error');
    }
}

async function updateCursoDetails() {
    const form = document.getElementById('editCursoDetailsForm');
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
        await loadConsolidarCursos();

    } catch (error) {
        console.error('Error updating curso:', error);
        showAlert('Error al actualizar el curso', 'error');
    }
}

// === EXPORT TO EXCEL ===
async function exportHistorial() {
    try {
        showAlert('Generando archivo Excel...', 'info');

        // Fetch all historial data
        const { data: historial } = await supabaseClient
            .from('historial_cursos')
            .select('*')
            .order('fecha_inicio', { ascending: false });

        if (!historial || historial.length === 0) {
            showAlert('No hay datos para exportar', 'warning');
            return;
        }

        // Fetch related data
        const colaboradorIds = [...new Set(historial.map(h => h.colaborador_id).filter(Boolean))];
        const cursoIds = [...new Set(historial.map(h => h.curso_id).filter(Boolean))];

        const { data: colaboradores } = await supabaseClient.from('colaboradores').select('*').in('id_colab', colaboradorIds);
        const { data: cursos } = await supabaseClient.from('cursos').select('*').in('id_curso', cursoIds);
        const { data: departamentos } = await supabaseClient.from('departamento').select('*');
        const { data: puestos } = await supabaseClient.from('puestos').select('*');

        // Create maps
        const colabMap = {};
        colaboradores?.forEach(c => colabMap[c.id_colab] = c);

        const cursoMap = {};
        cursos?.forEach(c => cursoMap[c.id_curso] = c.nombre_curso);

        const depMap = {};
        departamentos?.forEach(d => depMap[d.id_dep] = d.nombre_dep);

        const puestoMap = {};
        puestos?.forEach(p => puestoMap[p.id_puesto] = p.nombre_puesto);

        // Format data for Excel
        const excelData = historial.map(item => {
            const colab = colabMap[item.colaborador_id] || {};
            return {
                'Colaborador': colab.nombre_colab || 'N/A',
                'Asignación': colab.asignacion_act || 'N/A',
                'Departamento': depMap[colab.dep_id] || 'N/A',
                'Puesto': puestoMap[colab.puesto_id] || 'N/A',
                'Curso': cursoMap[item.curso_id] || 'N/A',
                'Fecha Inicio': item.fecha_inicio || 'N/A',
                'Fecha Final': item.fecha_final || 'En curso',
                'Duración (hrs)': item.duracion_horas || 'N/A',
                'Estado': item.estado || 'N/A'
            };
        });

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        ws['!cols'] = [
            { wch: 30 }, // Colaborador
            { wch: 20 }, // Asignación
            { wch: 25 }, // Departamento
            { wch: 25 }, // Puesto
            { wch: 40 }, // Curso
            { wch: 12 }, // Fecha Inicio
            { wch: 12 }, // Fecha Final
            { wch: 12 }, // Duración
            { wch: 15 }  // Estado
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Historial');

        // Generate filename with current date
        const today = new Date().toISOString().split('T')[0];
        const filename = `historial_capacitaciones_${today}.xlsx`;

        // Download file
        XLSX.writeFile(wb, filename);

        showAlert('Archivo Excel generado exitosamente', 'success');

    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showAlert('Error al exportar a Excel: ' + error.message, 'error');
    }
}

// Setup export button listener
document.getElementById('exportHistorialButton')?.addEventListener('click', exportHistorial);

