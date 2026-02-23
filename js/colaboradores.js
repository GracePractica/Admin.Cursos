// ============================================
// LÓGICA DE COLABORADORES
// ============================================

// Genera el HTML del componente de búsqueda de supervisor
function buildSearchableSupervisorHTML(fieldName, label, supervisores, selectedId) {
    const selectedSup = supervisores?.find(s => s.id_colab === selectedId);
    const displayValue = (selectedId && selectedId !== 0) ? (selectedSup?.nombre_colab || '') : '';
    return `
        <div class="form-group" style="position: relative;">
            <label class="form-label">${label}</label>
            <input type="hidden" name="${fieldName}" value="${selectedId || 0}">
            <input type="text" class="form-input" id="${fieldName}_search" 
                   placeholder="Escribir para buscar supervisor..." 
                   value="${displayValue}" autocomplete="off">
            <div id="${fieldName}_list" class="sup-search-list" 
                 style="display:none; position: absolute; top: 100%; left: 0; right: 0; z-index: 1000; max-height:180px; overflow-y:auto; border:1px solid var(--border-color); border-radius:6px; margin-top:4px; background:var(--card-bg,#fff); box-shadow: var(--shadow-lg);">
                <div class="sup-search-item" data-id="0" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--border-color); font-style:italic; color:#6b7280;">Sin supervisor</div>
                ${(supervisores || []).map(s => `<div class="sup-search-item" data-id="${s.id_colab}" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--border-color);">${s.nombre_colab}</div>`).join('')}
            </div>
        </div>
    `;
}

// Inicializa el comportamiento de búsqueda para un campo de supervisor
function setupSearchableSupervisor(fieldName) {
    const searchInput = document.getElementById(`${fieldName}_search`);
    const listDiv = document.getElementById(`${fieldName}_list`);
    const hiddenInput = document.querySelector(`input[name="${fieldName}"]`);
    if (!searchInput || !listDiv || !hiddenInput) return;

    const items = listDiv.querySelectorAll('.sup-search-item');

    // Mostrar lista al enfocar
    searchInput.addEventListener('focus', () => {
        listDiv.style.display = 'block';
        filterItems('');
    });

    // Filtrar al escribir
    searchInput.addEventListener('input', () => {
        const term = searchInput.value.toLowerCase();
        filterItems(term);
        // Si borra el texto, volver a Sin supervisor
        if (!searchInput.value.trim()) {
            hiddenInput.value = '0';
        }
    });

    // Cerrar lista al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !listDiv.contains(e.target)) {
            listDiv.style.display = 'none';
        }
    });

    // Click en un item
    items.forEach(item => {
        item.addEventListener('click', () => {
            hiddenInput.value = item.dataset.id;
            searchInput.value = item.dataset.id === '0' ? '' : item.textContent;
            listDiv.style.display = 'none';
        });

        // Hover effect
        item.addEventListener('mouseenter', () => item.style.background = 'var(--bg-hover, #f3f4f6)');
        item.addEventListener('mouseleave', () => item.style.background = '');
    });

    function filterItems(term) {
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? '' : 'none';
        });
    }
}
document.addEventListener('roleLoaded', () => {
    applyRolePermissions();
});
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si estamos en la página de colaboradores
    if (document.getElementById('colaboradoresTableBody')) {
        loadColaboradores();
        setupColaboradoresListeners();
    }
});
function applyRolePermissions() {
    if (CURRENT_USER_ROLE === 'SUPERVISOR') {
        const addButton = document.getElementById('addColaboradorButton');
        if (addButton) {
            addButton.style.display = 'none';
        }
    }
}
// Configura los listeners de la página de colaboradores
// Añade manejadores para agregar, filtrar y buscar colaboradores
function setupColaboradoresListeners() {
    document.getElementById('addColaboradorButton')?.addEventListener('click', () => openAddColaboradorModal());

    document.getElementById('filterAsignacionColab')?.addEventListener('change', (e) => {
        currentFilters.asignacion = e.target.value;
        loadColaboradores();
    });

    document.getElementById('filterDepColab')?.addEventListener('change', (e) => {
        currentFilters.departamento = e.target.value;
        loadColaboradores();
    });

    document.getElementById('searchColab')?.addEventListener('input', (e) => {
        currentFilters.searchTerm = e.target.value;
        loadColaboradores();
    });

    // Poblar el select de Departamento ID con valores únicos
    loadDepIdsFilter();
}

async function loadDepIdsFilter() {
    try {
        const { data } = await supabaseClient
            .from('colaboradores')
            .select('dep_id')
            .not('dep_id', 'is', null)
            .order('dep_id');

        const select = document.getElementById('filterDepColab');
        if (!select || !data) return;

        const uniqueIds = [...new Set(data.map(r => r.dep_id))];
        const options = uniqueIds.map(id => `<option value="${id}">${id}</option>`).join('');
        select.innerHTML = '<option value="">Todos los departamentos</option>' + options;
    } catch (e) {
        console.error('Error cargando dep IDs para filtro:', e);
    }
}

// === COLABORADORES ===
// Carga y muestra la lista de colaboradores, aplica filtros y paginación
async function loadColaboradores(page = 1) {
    PAGINATION.colaboradores.page = page;
    const tbody = document.getElementById('colaboradoresTableBody');
    if (!tbody) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const filter = urlParams.get('filter');

        let query = supabaseClient.from('colaboradores').select('*, puestos(nombre_puesto)').neq('id_colab', 0);

        if (currentFilters.asignacion) {
            query = query.eq('asignacion_act', currentFilters.asignacion);
        }

        if (currentFilters.departamento) {
            query = query.eq('dep_id', currentFilters.departamento);
        }

        if (currentFilters.puesto) {
            query = query.eq('puesto_id', currentFilters.puesto);
        }

        const { data: allColaboradoresRaw, error } = await query.order('nombre_colab');
        if (error) throw error;

        // Búsqueda client-side por nombre de colaborador y nombre del puesto
        let colaboradores = allColaboradoresRaw || [];
        if (currentFilters.searchTerm) {
            const termLower = currentFilters.searchTerm.toLowerCase();
            colaboradores = colaboradores.filter(c => {
                const nombreMatch = (c.nombre_colab || '').toLowerCase().includes(termLower);
                const puestoMatch = (c.puestos?.nombre_puesto || '').toLowerCase().includes(termLower);
                return nombreMatch || puestoMatch;
            });
        }

        let filterMessage = '';

        // Aplicar filtro desde la URL
        if (filter === 'sin_puesto') {
            colaboradores = colaboradores.filter(c => !c.puesto_id || c.puesto_id === null);
            filterMessage = `Mostrando ${colaboradores.length} colaboradores sin puesto asignado`;
        }

        // Display filter message if filter is active
        // Mostrar mensaje de filtro si hay un filtro activo
        if (filterMessage) {
            // Eliminar primero cualquier alerta de filtro existente
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
                        Asigna puestos usando el botón "Editar" →
                        <a href="colaboradores.html" style="color: inherit; text-decoration: underline; margin-left: 0.5rem;">Ver todos los colaboradores</a>
                    </div>
                </div>
            `;
            tbody.parentElement.parentElement.insertBefore(filterAlert, tbody.parentElement);
        }

        if (!colaboradores || colaboradores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No se encontraron colaboradores</td></tr>';
            renderPaginationControls(0, 1, PAGINATION.colaboradores.limit, 'paginationColaboradores', 'loadColaboradores');
            return;
        }

        // Paginación
        const startIndex = (page - 1) * PAGINATION.colaboradores.limit;
        const endIndex = startIndex + PAGINATION.colaboradores.limit;
        const paginatedColaboradores = colaboradores.slice(startIndex, endIndex);

        // Obtener departamentos, puestos y supervisores
        const { data: departamentos } = await supabaseClient.from('departamento').select('*');
        const { data: puestos } = await supabaseClient.from('puestos').select('*');

        // Obtener todos los colaboradores para mapear supervisores
        const { data: todosColaboradores } = await supabaseClient.from('colaboradores').select('id_colab, nombre_colab');

        const depMap = {};
        departamentos?.forEach(d => depMap[d.id_dep] = d.nombre_dep);

        const puestoMap = {};
        puestos?.forEach(p => puestoMap[p.id_puesto] = p.nombre_puesto);

        // Crear mapa de supervisores (ID -> Nombre completo)
        const supervisorMap = {};
        todosColaboradores?.forEach(c => {
            supervisorMap[c.id_colab] = c.nombre_colab;
        });

        tbody.innerHTML = paginatedColaboradores.map(colab => `
            <tr ${filter ? 'style="background-color: #fef3c7;"' : ''}>
                <td style="white-space: nowrap;">${colab.id_colab}</td>
                <td style="white-space: nowrap;"><strong>${colab.nombre_colab}</strong></td>
                <td>${colab.asignacion_act || 'N/A'}</td>
                <td>${colab.dep_id ?? '<span style="color:#6b7280;">-</span>'}</td>
                <td style="white-space: normal; word-break: break-word; min-width: 120px;">${puestoMap[colab.puesto_id] || '<span style="color: #dc2626; font-weight: 600;">Sin Puesto</span>'}</td>
                <td style="white-space: nowrap;">
                    <button class="btn btn-small btn-outline" onclick="viewColaboradorSupervisores(${colab.id_colab})" title="Ver Supervisores">
                        👤 Supervisores
                    </button>
                    <button class="btn btn-small btn-outline" onclick="editColaborador(${colab.id_colab})" title="Editar">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-small" style="background:#dc2626;color:#fff;border-color:#dc2626;" onclick="deleteColaborador(${colab.id_colab}, '${colab.nombre_colab.replace(/'/g, '\\&#39;')}')" title="Eliminar">
                        🗑️ Eliminar
                    </button>
                </td>
            </tr>
        `).join('');

        renderPaginationControls(colaboradores.length, page, PAGINATION.colaboradores.limit, 'paginationColaboradores', 'loadColaboradores');

    } catch (error) {
        console.error('Error cargando colaboradores:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Error al cargar colaboradores</td></tr>';
    }
}

// Abre el modal para agregar un nuevo colaborador y prepara el formulario
async function openAddColaboradorModal() {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.textContent = 'Agregar Nuevo Colaborador';

    const { data: departamentos } = await supabaseClient.from('departamento').select('*').order('nombre_dep');
    const { data: puestos } = await supabaseClient.from('puestos').select('*').order('nombre_puesto');
    const { data: supervisores } = await supabaseClient.from('colaboradores').select('id_colab, nombre_colab').neq('id_colab', 0).order('nombre_colab');

    modalBody.innerHTML = `
        <form id="addColaboradorForm">
            <div id="colabFormError" style="display:none; background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; border-radius:6px; padding:10px 14px; margin-bottom:12px; font-size:0.875rem;"></div>

            <div class="form-group">
                <label class="form-label">ID Colaborador *</label>
                <input type="number" class="form-input" name="id_colab" placeholder="Ej: 10045" min="1" required>
                <small style="color: var(--text-secondary); font-size: 0.8rem;">Este ID debe ser único y no puede modificarse después.</small>
            </div>

            <div class="form-group">
                <label class="form-label">Nombre *</label>
                <input type="text" class="form-input" name="nombre_colab" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Asignación *</label>
                <select class="form-select" name="asignacion_act" required>
                    <option value="">Seleccionar asignación</option>
                    <option value="Asignacion Regular">Asignación Regular</option>
                    <option value="Asignacion Interina">Asignación Interina</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Departamento ID</label>
                <select class="form-select" name="dep_id">
                    <option value="">Sin departamento</option>
                    ${departamentos?.map(dep => `<option value="${dep.id_dep}">${dep.id_dep}</option>`).join('') || ''}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Puesto</label>
                <select class="form-select" name="puesto_id">
                    <option value="">Seleccionar puesto</option>
                    ${puestos?.map(puesto => `<option value="${puesto.id_puesto}">${puesto.nombre_puesto}</option>`).join('') || ''}
                </select>
            </div>
            
            ${buildSearchableSupervisorHTML('supervisor_act_id', 'Supervisor Activo', supervisores, 0)}
            ${buildSearchableSupervisorHTML('supervisor_reg_id', 'Supervisor Regular', supervisores, 0)}
        </form>
    `;

    const confirmBtn = document.getElementById('confirmModal');
    confirmBtn.textContent = 'Guardar';
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.style = '';
    confirmBtn.disabled = false;
    confirmBtn.onclick = async () => {
        await saveColaborador();
    };

    openModal();

    // Inicializar búsqueda de supervisores después de abrir modal
    setupSearchableSupervisor('supervisor_act_id');
    setupSearchableSupervisor('supervisor_reg_id');
}

// Muestra un mensaje de error dentro del modal del formulario
function showFormError(message) {
    const errorDiv = document.getElementById('colabFormError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    } else {
        showAlert(message, 'error');
    }
}

// Guarda un nuevo colaborador en la base de datos desde el formulario del modal
async function saveColaborador() {
    const form = document.getElementById('addColaboradorForm');
    const formData = new FormData(form);

    // Limpiar error previo
    const errorDiv = document.getElementById('colabFormError');
    if (errorDiv) errorDiv.style.display = 'none';

    const idColabRaw = formData.get('id_colab');
    const idColab = parseInt(idColabRaw, 10);

    // Validar que el ID sea un número válido
    if (!idColabRaw || isNaN(idColab) || idColab <= 0) {
        showFormError('El ID del colaborador debe ser un número positivo.');
        return;
    }

    try {
        // Verificar que el ID no exista ya en la base de datos
        const { data: existente, error: checkError } = await supabaseClient
            .from('colaboradores')
            .select('id_colab')
            .eq('id_colab', idColab)
            .maybeSingle();

        if (checkError) throw checkError;

        if (existente) {
            showFormError(`El ID ${idColab} ya está registrado. Usa un ID diferente.`);
            return;
        }

        const colaborador = {
            id_colab: idColab,
            nombre_colab: formData.get('nombre_colab'),
            asignacion_act: formData.get('asignacion_act'),
            dep_id: formData.get('dep_id') || null,
            puesto_id: formData.get('puesto_id') || null,
            supervisor_act_id: formData.get('supervisor_act_id') || 0,
            supervisor_reg_id: formData.get('supervisor_reg_id') || 0
        };

        const { error } = await supabaseClient
            .from('colaboradores')
            .insert([colaborador]);

        if (error) throw error;

        showAlert('Colaborador agregado exitosamente', 'success');
        closeModal();
        await loadColaboradores();

    } catch (error) {
        console.error('Error guardando colaborador:', error);
        showFormError('Error al guardar el colaborador: ' + error.message);
    }
}

// Abre el modal para editar un colaborador existente y carga sus datos
async function editColaborador(colaboradorId) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.textContent = 'Editar Colaborador';

    try {
        const { data: colaborador } = await supabaseClient
            .from('colaboradores')
            .select('*')
            .eq('id_colab', colaboradorId)
            .single();

        const { data: departamentos } = await supabaseClient.from('departamento').select('*').order('nombre_dep');
        const { data: puestos } = await supabaseClient.from('puestos').select('*').order('nombre_puesto');
        const { data: supervisoresRaw } = await supabaseClient.from('colaboradores').select('id_colab, nombre_colab').neq('id_colab', 0).order('nombre_colab');
        const supervisores = supervisoresRaw?.filter(s => s.id_colab !== colaboradorId) || [];

        modalBody.innerHTML = `
            <form id="editColaboradorForm">
                <input type="hidden" name="id_colab" value="${colaborador.id_colab}">
                
                <div class="form-group">
                    <label class="form-label">Nombre *</label>
                    <input type="text" class="form-input" name="nombre_colab" value="${colaborador.nombre_colab || ''}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Asignación *</label>
                    <select class="form-select" name="asignacion_act" required>
                        <option value="">Seleccionar asignación</option>
                        <option value="Asignacion Regular" ${colaborador.asignacion_act === 'Asignacion Regular' ? 'selected' : ''}>Asignación Regular</option>
                        <option value="Asignacion Interina" ${colaborador.asignacion_act === 'Asignacion Interina' ? 'selected' : ''}>Asignación Interina</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Departamento ID</label>
                    <select class="form-select" name="dep_id">
                        <option value="">Sin departamento</option>
                        ${departamentos?.map(dep => `<option value="${dep.id_dep}" ${dep.id_dep === colaborador.dep_id ? 'selected' : ''}>${dep.id_dep}</option>`).join('') || ''}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Puesto</label>
                    <select class="form-select" name="puesto_id">
                        <option value="">Seleccionar puesto</option>
                        ${puestos?.map(puesto => `<option value="${puesto.id_puesto}" ${puesto.id_puesto === colaborador.puesto_id ? 'selected' : ''}>${puesto.nombre_puesto}</option>`).join('') || ''}
                    </select>
                </div>
                
                ${buildSearchableSupervisorHTML('supervisor_act_id', 'Supervisor Activo', supervisores, colaborador.supervisor_act_id)}
                ${buildSearchableSupervisorHTML('supervisor_reg_id', 'Supervisor Regular', supervisores, colaborador.supervisor_reg_id)}
            </form>
        `;

        const confirmBtn = document.getElementById('confirmModal');
        confirmBtn.textContent = 'Guardar';
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.style = '';
        confirmBtn.disabled = false;
        confirmBtn.onclick = async () => {
            await updateColaborador();
        };

        openModal();

        // Inicializar búsqueda de supervisores después de abrir modal
        setupSearchableSupervisor('supervisor_act_id');
        setupSearchableSupervisor('supervisor_reg_id');

    } catch (error) {
        console.error('Error cargando colaborador:', error);
        showAlert('Error al cargar el colaborador', 'error');
    }
}

// Actualiza los datos del colaborador en la base de datos con el formulario
async function updateColaborador() {
    const form = document.getElementById('editColaboradorForm');
    const formData = new FormData(form);

    const colaboradorId = formData.get('id_colab');
    const colaborador = {
        nombre_colab: formData.get('nombre_colab'),
        asignacion_act: formData.get('asignacion_act'),
        dep_id: formData.get('dep_id') || null,
        puesto_id: formData.get('puesto_id') || null,
        supervisor_act_id: formData.get('supervisor_act_id') || 0,
        supervisor_reg_id: formData.get('supervisor_reg_id') || 0
    };

    try {
        const { error } = await supabaseClient
            .from('colaboradores')
            .update(colaborador)
            .eq('id_colab', colaboradorId);

        if (error) throw error;

        showAlert('Colaborador actualizado exitosamente', 'success');
        closeModal();
        await loadColaboradores();

    } catch (error) {
        console.error('Error actualizando colaborador:', error);
        showAlert('Error al actualizar el colaborador', 'error');
    }
}

// Muestra en un modal los supervisores de un colaborador
async function viewColaboradorSupervisores(colaboradorId) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    try {
        const { data: colab } = await supabaseClient
            .from('colaboradores')
            .select('nombre_colab, supervisor_act_id, supervisor_reg_id')
            .eq('id_colab', colaboradorId)
            .single();

        const { data: todosColabs } = await supabaseClient
            .from('colaboradores')
            .select('id_colab, nombre_colab');

        const supervisorMap = {};
        todosColabs?.forEach(c => { supervisorMap[c.id_colab] = c.nombre_colab; });

        modalTitle.textContent = `Supervisores de ${colab?.nombre_colab || 'Colaborador'}`;

        modalBody.innerHTML = `
            <div class="form-group">
                <p><strong>Supervisor Activo:</strong> ${supervisorMap[colab.supervisor_act_id] || '<em>No asignado</em>'}</p>
                <p><strong>Supervisor Regular:</strong> ${supervisorMap[colab.supervisor_reg_id] || '<em>No asignado</em>'}</p>
            </div>
        `;

        const confirmBtn = document.getElementById('confirmModal');
        const cancelBtn = document.getElementById('cancelModal');
        openModal();
        // Ocultar botones DESPUÉS de openModal() para evitar que la función los restaure
        confirmBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        // Restaurar botones al cerrar
        const modal = document.getElementById('mainModal');
        const restoreButtons = () => {
            confirmBtn.style.display = '';
            cancelBtn.style.display = '';
            modal.removeEventListener('click', onOverlayClick);
            document.getElementById('closeModal').removeEventListener('click', restoreButtons);
        };
        const onOverlayClick = (e) => { if (e.target === modal) restoreButtons(); };
        modal.addEventListener('click', onOverlayClick);
        document.getElementById('closeModal').addEventListener('click', restoreButtons);

    } catch (error) {
        console.error('Error cargando supervisores:', error);
        showAlert('Error al cargar los supervisores', 'error');
    }
}

// Elimina un colaborador tras confirmación
async function deleteColaborador(colaboradorId, nombre) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('confirmModal');

    modalTitle.textContent = 'Eliminar Colaborador';
    modalBody.innerHTML = '<p>Cargando dependencias...</p>';

    // Abrir modal mientras carga
    openModal();

    let supervisados = [];
    let totalHistorial = 0;
    let hasSupervisados = false;

    try {
        // 1. Buscar colaboradores donde este es supervisor activo
        const { data: supActivos } = await supabaseClient
            .from('colaboradores')
            .select('id_colab, nombre_colab')
            .eq('supervisor_act_id', colaboradorId);

        // 2. Buscar colaboradores donde este es supervisor regular
        const { data: supRegulares } = await supabaseClient
            .from('colaboradores')
            .select('id_colab, nombre_colab')
            .eq('supervisor_reg_id', colaboradorId);

        // 3. Contar registros de historial
        const { data: historial } = await supabaseClient
            .from('historial_cursos')
            .select('id_historial')
            .eq('colaborador_id', colaboradorId);

        totalHistorial = historial?.length || 0;

        // Combinar supervisados sin duplicados
        const ids = new Set();
        [...(supActivos || []), ...(supRegulares || [])].forEach(s => {
            if (!ids.has(s.id_colab)) {
                ids.add(s.id_colab);
                const roles = [];
                if (supActivos?.some(a => a.id_colab === s.id_colab)) roles.push('Activo');
                if (supRegulares?.some(r => r.id_colab === s.id_colab)) roles.push('Regular');
                supervisados.push({ ...s, roles: roles.join(', ') });
            }
        });

        hasSupervisados = supervisados.length > 0;

        // Construir contenido del modal
        let html = `<p>¿Estás seguro de que deseas eliminar al colaborador <strong>${nombre}</strong> (ID: ${colaboradorId})?</p>`;

        if (hasSupervisados) {
            // Obtener lista de posibles reemplazos (todos menos el que se elimina)
            const { data: reemplazos } = await supabaseClient
                .from('colaboradores')
                .select('id_colab, nombre_colab')
                .neq('id_colab', colaboradorId)
                .neq('id_colab', 0)
                .order('nombre_colab');

            html += `
                <div style="background:#fef3c7; border:1px solid #f59e0b; border-radius:8px; padding:12px; margin:10px 0;">
                    <strong style="color:#92400e;">⚠️ Es supervisor de ${supervisados.length} colaborador(es):</strong>
                    <ul style="margin:8px 0 0; padding-left:20px; font-size:0.9rem;">
                        ${supervisados.map(s => `<li>${s.nombre_colab} (${s.roles})</li>`).join('')}
                    </ul>
                </div>

                <div style="background:#f0fdf4; border:1px solid #22c55e; border-radius:8px; padding:12px; margin:10px 0;">
                    <strong style="color:#166534;">🔄 Asignar nuevo supervisor a los subordinados:</strong>
                    <div style="position: relative; margin-top:8px;">
                        <input type="hidden" id="delete_replacement_sup_id" value="0">
                        <input type="text" class="form-input" id="delete_replacement_search" 
                               placeholder="Buscar nuevo supervisor..." 
                               value="" autocomplete="off" style="width:100%;">
                        <div id="delete_replacement_list" 
                             style="display:none; position:absolute; top:100%; left:0; right:0; z-index:1000; max-height:180px; overflow-y:auto; border:1px solid var(--border-color); border-radius:6px; margin-top:4px; background:var(--surface-color,#fff); box-shadow:0 10px 15px rgba(0,0,0,0.1);">
                            <div class="del-sup-item" data-id="0" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--border-color); font-style:italic; color:#6b7280;">Sin supervisor</div>
                            ${(reemplazos || []).map(r => `<div class="del-sup-item" data-id="${r.id_colab}" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--border-color);">${r.nombre_colab}</div>`).join('')}
                        </div>
                    </div>
                    <p style="font-size:0.8rem; color:#166534; margin:6px 0 0;">Por defecto: Sin supervisor</p>
                </div>
            `;
        }

        if (totalHistorial > 0) {
            html += `
                <div style="background:#dbeafe; border:1px solid #3b82f6; border-radius:8px; padding:12px; margin:10px 0;">
                    <strong style="color:#1e40af;">📋 Tiene ${totalHistorial} capacitación(es) registrada(s).</strong>
                    <p style="font-size:0.85rem; color:#1e40af; margin:8px 0 0;">Se eliminarán todos los registros de historial.</p>
                </div>
            `;
        }

        if (!hasSupervisados && totalHistorial === 0) {
            html += `<p style="color:#6b7280; font-size:0.9rem;">No tiene dependencias. Se puede eliminar directamente.</p>`;
        }

        html += `<p style="color:#dc2626; font-size:0.9rem; margin-top:12px; font-weight:600;">⛔ Esta acción no se puede deshacer.</p>`;

        modalBody.innerHTML = html;

        // Inicializar barra de búsqueda de reemplazo si hay supervisados
        if (hasSupervisados) {
            const searchInput = document.getElementById('delete_replacement_search');
            const listDiv = document.getElementById('delete_replacement_list');
            const hiddenInput = document.getElementById('delete_replacement_sup_id');
            const items = listDiv.querySelectorAll('.del-sup-item');

            searchInput.addEventListener('focus', () => {
                listDiv.style.display = 'block';
                filterDeleteItems('');
            });

            searchInput.addEventListener('input', () => {
                const term = searchInput.value.toLowerCase();
                filterDeleteItems(term);
                if (!searchInput.value.trim()) {
                    hiddenInput.value = '0';
                }
            });

            document.addEventListener('click', function closeDelList(e) {
                if (!searchInput.contains(e.target) && !listDiv.contains(e.target)) {
                    listDiv.style.display = 'none';
                }
            });

            items.forEach(item => {
                item.addEventListener('click', () => {
                    hiddenInput.value = item.dataset.id;
                    searchInput.value = item.dataset.id === '0' ? 'Sin supervisor' : item.textContent;
                    listDiv.style.display = 'none';
                });
                item.addEventListener('mouseenter', () => item.style.background = 'var(--bg-hover, #f3f4f6)');
                item.addEventListener('mouseleave', () => item.style.background = '');
            });

            function filterDeleteItems(term) {
                items.forEach(item => {
                    const text = item.textContent.toLowerCase();
                    item.style.display = text.includes(term) ? '' : 'none';
                });
            }
        }

    } catch (error) {
        console.error('Error cargando dependencias:', error);
        modalBody.innerHTML = `<p style="color:#dc2626;">Error al cargar dependencias: ${error.message}</p>`;
    }

    confirmBtn.textContent = 'Eliminar Todo';
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.style.background = '#dc2626';
    confirmBtn.style.color = '#fff';
    confirmBtn.style.borderColor = '#dc2626';

    confirmBtn.onclick = async () => {
        try {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Eliminando...';

            // Obtener el supervisor de reemplazo seleccionado
            const replacementId = hasSupervisados
                ? parseInt(document.getElementById('delete_replacement_sup_id').value) || 0
                : 0;

            // 1. Reasignar supervisor activo al reemplazo
            await supabaseClient
                .from('colaboradores')
                .update({ supervisor_act_id: replacementId })
                .eq('supervisor_act_id', colaboradorId);

            // 2. Reasignar supervisor regular al reemplazo
            await supabaseClient
                .from('colaboradores')
                .update({ supervisor_reg_id: replacementId })
                .eq('supervisor_reg_id', colaboradorId);

            // 3. Eliminar historial de capacitaciones
            await supabaseClient
                .from('historial_cursos')
                .delete()
                .eq('colaborador_id', colaboradorId);

            // 4. Eliminar el colaborador
            const { error } = await supabaseClient
                .from('colaboradores')
                .delete()
                .eq('id_colab', colaboradorId);

            if (error) throw error;

            showAlert('Colaborador y datos relacionados eliminados exitosamente', 'success');
            closeModal();
            await loadColaboradores();
        } catch (error) {
            console.error('Error eliminando colaborador:', error);
            showAlert('Error al eliminar el colaborador: ' + error.message, 'error');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Guardar';
            confirmBtn.className = 'btn btn-primary';
            confirmBtn.style = '';
        }
    };
}

// Muestra en un modal el historial de cursos de un colaborador dado
async function viewColaboradorCursos(colaboradorId) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    try {
        const { data: colaborador } = await supabaseClient
            .from('colaboradores')
            .select('nombre_colab, puesto_id')
            .eq('id_colab', colaboradorId)
            .single();

        const { data: puesto } = colaborador.puesto_id ? await supabaseClient
            .from('puestos')
            .select('nombre_puesto')
            .eq('id_puesto', colaborador.puesto_id)
            .single() : { data: null };

        const { data: cursos } = await supabaseClient
            .from('historial_cursos')
            .select('*')
            .eq('colaborador_id', colaboradorId)
            .order('fecha_inicio', { ascending: false });

        // Obtener nombres de cursos
        const cursoIds = cursos?.map(c => c.curso_id).filter(Boolean) || [];
        const { data: cursosInfo } = cursoIds.length > 0 ? await supabaseClient
            .from('cursos')
            .select('id_curso, nombre_curso')
            .in('id_curso', cursoIds) : { data: [] };

        const cursoMap = {};
        cursosInfo?.forEach(c => cursoMap[c.id_curso] = c.nombre_curso);

        modalTitle.textContent = `Cursos de ${colaborador?.nombre_colab || 'Colaborador'}`;

        modalBody.innerHTML = `
            <div class="form-group">
                <p><strong>Puesto:</strong> ${puesto?.nombre_puesto || 'N/A'}</p>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Curso</th>
                            <th>Fecha Inicio</th>
                            <th>Fecha Final</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cursos?.length > 0 ? cursos.map(curso => `
                            <tr>
                                <td>${cursoMap[curso.curso_id] || 'N/A'}</td>
                                <td>${formatDate(curso.fecha_inicio)}</td>
                                <td>${curso.fecha_final ? formatDate(curso.fecha_final) : 'En curso'}</td>
                                <td>
                                    <span class="badge ${curso.estado === 'Completado' ? 'badge-success' : 'badge-warning'}">
                                        ${curso.estado || 'En Proceso'}
                                    </span>
                                </td>
                            </tr>
                        `).join('') : '<tr><td colspan="4" class="text-center">No hay cursos registrados</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('confirmModal').style.display = 'none';
        openModal();

    } catch (error) {
        console.error('Error cargando cursos del colaborador:', error);
        showAlert('Error al cargar los cursos', 'error');
    }
}
