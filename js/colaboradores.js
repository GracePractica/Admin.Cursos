// ============================================
// LÓGICA DE COLABORADORES
// ============================================
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

    document.getElementById('filterDepartamentoColab')?.addEventListener('change', (e) => {
        currentFilters.departamento = e.target.value;
        loadColaboradores();
    });

    document.getElementById('searchColab')?.addEventListener('input', (e) => {
        currentFilters.searchTerm = e.target.value;
        loadColaboradores();
    });
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

        let query = supabaseClient.from('colaboradores').select('*');

        if (currentFilters.departamento) {
            query = query.eq('dep_id', currentFilters.departamento);
        }

        if (currentFilters.puesto) {
            query = query.eq('puesto_id', currentFilters.puesto);
        }

        if (currentFilters.searchTerm) {
            const term = currentFilters.searchTerm;
            query = query.or(`id_colab.ilike.%${term}%,nombre_colab.ilike.%${term}%,asignacion_act.ilike.%${term}%`);
        }

        const { data: allColaboradores, error } = await query.order('nombre_colab');
        if (error) throw error;

        let colaboradores = allColaboradores || [];
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
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No se encontraron colaboradores</td></tr>';
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
                <td>${colab.id_colab}</td>
                <td><strong>${colab.nombre_colab}</strong></td>
                <td>${colab.asignacion_act || 'N/A'}</td>
                <td>${depMap[colab.dep_id] || 'N/A'}</td>
                <td>${puestoMap[colab.puesto_id] || '<span style="color: #dc2626; font-weight: 600;">Sin Puesto</span>'}</td>
                <td>${supervisorMap[colab.supervisor_act_id] || 'N/A'}</td>
                <td>${supervisorMap[colab.supervisor_reg_id] || 'N/A'}</td>
                <td>
                    <button class="btn btn-small btn-outline" onclick="editColaborador(${colab.id_colab})">
                        Editar
                    </button>
                    <button class="btn btn-small btn-outline" onclick="viewColaboradorCursos(${colab.id_colab})">
                        Cursos
                    </button>
                </td>
            </tr>
        `).join('');

        renderPaginationControls(colaboradores.length, page, PAGINATION.colaboradores.limit, 'paginationColaboradores', 'loadColaboradores');

    } catch (error) {
        console.error('Error cargando colaboradores:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Error al cargar colaboradores</td></tr>';
    }
}

// Abre el modal para agregar un nuevo colaborador y prepara el formulario
async function openAddColaboradorModal() {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.textContent = 'Agregar Nuevo Colaborador';

    const { data: departamentos } = await supabaseClient.from('departamento').select('*').order('nombre_dep');
    const { data: puestos } = await supabaseClient.from('puestos').select('*').order('nombre_puesto');
    const { data: supervisores } = await supabaseClient.from('colaboradores').select('id_colab, nombre_colab').order('nombre_colab');

    modalBody.innerHTML = `
        <form id="addColaboradorForm">
            <div class="form-group">
                <label class="form-label">Nombre *</label>
                <input type="text" class="form-input" name="nombre_colab" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Asignación *</label>
                <input type="text" class="form-input" name="asignacion_act" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Departamento</label>
                <select class="form-select" name="dep_id">
                    <option value="">Seleccionar departamento</option>
                    ${departamentos?.map(dep => `<option value="${dep.id_dep}">${dep.nombre_dep}</option>`).join('') || ''}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Puesto</label>
                <select class="form-select" name="puesto_id">
                    <option value="">Seleccionar puesto</option>
                    ${puestos?.map(puesto => `<option value="${puesto.id_puesto}">${puesto.nombre_puesto}</option>`).join('') || ''}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Supervisor Activo</label>
                <select class="form-select" name="supervisor_act_id">
                    <option value="">Sin supervisor</option>
                    ${supervisores?.map(sup => `<option value="${sup.id_colab}">${sup.nombre_colab}</option>`).join('') || ''}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Supervisor Regular</label>
                <select class="form-select" name="supervisor_reg_id">
                    <option value="">Sin supervisor</option>
                    ${supervisores?.map(sup => `<option value="${sup.id_colab}">${sup.nombre_colab}</option>`).join('') || ''}
                </select>
            </div>
        </form>
    `;

    document.getElementById('confirmModal').onclick = async () => {
        await saveColaborador();
    };

    openModal();
}

// Guarda un nuevo colaborador en la base de datos desde el formulario del modal
async function saveColaborador() {
    const form = document.getElementById('addColaboradorForm');
    const formData = new FormData(form);

    const colaborador = {
        nombre_colab: formData.get('nombre_colab'),
        asignacion_act: formData.get('asignacion_act'),
        dep_id: formData.get('dep_id') || null,
        puesto_id: formData.get('puesto_id') || null,
        supervisor_act_id: formData.get('supervisor_act_id') || null,
        supervisor_reg_id: formData.get('supervisor_reg_id') || null
    };

    try {
        const { error } = await supabaseClient
            .from('colaboradores')
            .insert([colaborador]);

        if (error) throw error;

        showAlert('Colaborador agregado exitosamente', 'success');
        closeModal();
        await loadColaboradores();

    } catch (error) {
        console.error('Error guardando colaborador:', error);
        showAlert('Error al guardar el colaborador: ' + error.message, 'error');
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
        const { data: supervisores } = await supabaseClient.from('colaboradores').select('id_colab, nombre_colab').order('nombre_colab');

        modalBody.innerHTML = `
            <form id="editColaboradorForm">
                <input type="hidden" name="id_colab" value="${colaborador.id_colab}">
                
                <div class="form-group">
                    <label class="form-label">Nombre *</label>
                    <input type="text" class="form-input" name="nombre_colab" value="${colaborador.nombre_colab || ''}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Asignación *</label>
                    <input type="text" class="form-input" name="asignacion_act" value="${colaborador.asignacion_act || ''}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Departamento</label>
                    <select class="form-select" name="dep_id">
                        <option value="">Seleccionar departamento</option>
                        ${departamentos?.map(dep => `<option value="${dep.id_dep}" ${dep.id_dep === colaborador.dep_id ? 'selected' : ''}>${dep.nombre_dep}</option>`).join('') || ''}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Puesto</label>
                    <select class="form-select" name="puesto_id">
                        <option value="">Seleccionar puesto</option>
                        ${puestos?.map(puesto => `<option value="${puesto.id_puesto}" ${puesto.id_puesto === colaborador.puesto_id ? 'selected' : ''}>${puesto.nombre_puesto}</option>`).join('') || ''}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Supervisor Activo</label>
                    <select class="form-select" name="supervisor_act_id">
                        <option value="">Sin supervisor</option>
                        ${supervisores?.map(sup => `<option value="${sup.id_colab}" ${sup.id_colab === colaborador.supervisor_act_id ? 'selected' : ''}>${sup.nombre_colab}</option>`).join('') || ''}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Supervisor Regular</label>
                    <select class="form-select" name="supervisor_reg_id">
                        <option value="">Sin supervisor</option>
                        ${supervisores?.map(sup => `<option value="${sup.id_colab}" ${sup.id_colab === colaborador.supervisor_reg_id ? 'selected' : ''}>${sup.nombre_colab}</option>`).join('') || ''}
                    </select>
                </div>
            </form>
        `;

        document.getElementById('confirmModal').onclick = async () => {
            await updateColaborador();
        };

        openModal();

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
        supervisor_act_id: formData.get('supervisor_act_id') || null,
        supervisor_reg_id: formData.get('supervisor_reg_id') || null
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
