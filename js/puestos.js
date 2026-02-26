// ============================================
// LÓGICA DE PUESTOS
// ============================================
document.addEventListener('roleLoaded', () => {
    applyRolePermissions();
});
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('puestosTableBody')) {
        loadPuestos();
        setupPuestosListeners();
        loadDepartamentosFilter('filterDepartamentoPuesto');
    }
});
function applyRolePermissions() {
    if (CURRENT_USER_ROLE === 'SUPERVISOR') {
        const addButton = document.getElementById('addPuestoButton');
        if (addButton) {
            addButton.style.display = 'none';
        }
    }
}
function setupPuestosListeners() {
    document.getElementById('addPuestoButton')?.addEventListener('click', () => openAddPuestoModal());

    document.getElementById('filterDepartamentoPuesto')?.addEventListener('change', (e) => {
        currentFilters.departamento = e.target.value;
        loadPuestos();
    });

    document.getElementById('searchPuesto')?.addEventListener('input', () => {
        loadPuestos();
    });
}

// === PUESTOS ===
async function loadPuestos(page = 1) {
    PAGINATION.puestos.page = page;
    const tbody = document.getElementById('puestosTableBody');
    if (!tbody) return;

    try {
        let query = '';

        if(CURRENT_USER_ROLE === 'ADMIN') {
            query = supabaseClient
            .from('puestos')
            .select(`
                id_puesto,
                nombre_puesto,
                departamento_puesto (
                    dep_id
                )
            `); // Muestra puestos inactivos (eliminados lógicamente) para ADMIN
        }
        else
            query = supabaseClient.from('puestos').select(`id_puesto,nombre_puesto,departamento_puesto (dep_id)`).neq('is_active', false); // Excluir puestos inactivos (eliminados lógicamente) para SUPERVISOR

        // 🔑 Filtro por departamento seleccionado
        if (currentFilters.departamento) {
            query = query.eq('departamento_puesto.dep_id', currentFilters.departamento);
        }

        const searchTerm = document.getElementById('searchPuesto')?.value.toLowerCase();

        const { data: allPuestos, error } = await query.order('nombre_puesto');
        if (error) throw error;

        let puestos = allPuestos || [];

        if (searchTerm) {
            puestos = puestos.filter(p =>
                (p.nombre_puesto?.toLowerCase().includes(searchTerm)) ||
                (p.id_puesto?.toString().toLowerCase().includes(searchTerm))
            );
        }

        if (!puestos || puestos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay puestos registrados</td></tr>';
            renderPaginationControls(0, 1, PAGINATION.puestos.limit, 'paginationPuestos', 'loadPuestos');
            return;
        }

        // Paginación
        const startIndex = (page - 1) * PAGINATION.puestos.limit;
        const endIndex = startIndex + PAGINATION.puestos.limit;
        const paginatedPuestos = puestos.slice(startIndex, endIndex);

        tbody.innerHTML = paginatedPuestos.map(puesto => {
            // Renderizamos departamentos
            const deps = puesto.departamento_puesto?.length
                ? puesto.departamento_puesto.map(dp => `<div>${dp.dep_id}</div>`).join('')
                : 'N/A';

            // Renderizamos acciones por cada departamento (sin mostrar el ID en el botón)
            const acciones = puesto.departamento_puesto?.length
                ? puesto.departamento_puesto.map(dp => `
                    <div>
                        <button class="btn btn-small btn-outline" onclick="editPuesto(${puesto.id_puesto}, '${dp.dep_id}')">Editar</button>
                        <button class="btn btn-small btn-danger" onclick="deletePuesto(${puesto.id_puesto}, '${dp.dep_id}')">Eliminar</button>
                    </div>
                `).join('')
                : `
                    <div>
                        <button class="btn btn-small btn-outline" onclick="editPuesto(${puesto.id_puesto})">Editar</button>
                        <button class="btn btn-small btn-danger" onclick="deletePuesto(${puesto.id_puesto})">Eliminar</button>
                    </div>
                `;

            return `
                <tr>
                    <td><strong>${puesto.id_puesto}</strong></td>
                    <td>${puesto.nombre_puesto}</td>
                    <td>${deps}</td>
                    <td>${acciones}</td>
                </tr>
            `;
        }).join('');

        renderPaginationControls(puestos.length, page, PAGINATION.puestos.limit, 'paginationPuestos', 'loadPuestos');

    } catch (error) {
        console.error('Error cargando puestos:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Error al cargar puestos</td></tr>';
    }
}

async function openAddPuestoModal() {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.textContent = 'Agregar Nuevo Puesto';

    const { data: departamentos } = await supabaseClient.from('departamento').select('*').order('id_dep');

    modalBody.innerHTML = `
        <form id="addPuestoForm">
            <div class="form-group">
                <label class="form-label">Nombre del Puesto *</label>
                <input type="text" class="form-input" name="nombre_puesto" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Departamento (ID) *</label>
                <select class="form-select" name="dep_id" required>
                    <option value="">Seleccionar departamento</option>
                    ${departamentos?.map(dep => `<option value="${dep.id_dep}">${dep.id_dep}</option>`).join('') || ''}
                </select>
            </div>
        </form>
    `;

    document.getElementById('confirmModal').onclick = async () => {
        await savePuesto();
    };

    openModal();
}

async function savePuesto() {
    const form = document.getElementById('addPuestoForm');
    const formData = new FormData(form);

    try {
        // Insertamos el puesto
        const { data: newPuesto, error: puestoError } = await supabaseClient
            .from('puestos')
            .insert([{ nombre_puesto: formData.get('nombre_puesto') }])
            .select()
            .single();

        if (puestoError) throw puestoError;

        // Obtenemos el ID del nuevo puesto
        const puestoId = newPuesto.id_puesto;

        // Obtenemos todos los departamentos seleccionados
        const depIds = formData.getAll('dep_id').filter(id => id !== "");

        // Insertamos las relaciones en departamento_puesto
        const relaciones = depIds.map(depId => ({
            puesto_id: puestoId,
            dep_id: depId
        }));

        const { error: depError } = await supabaseClient
            .from('departamento_puesto')
            .insert(relaciones);

        if (depError) throw depError;

        showAlert('Puesto agregado exitosamente', 'success');
        closeModal();
        await loadPuestos();

    } catch (error) {
        console.error('Error guardando puesto:', error);
        showAlert('Error al guardar el puesto', 'error');
    }
}

async function editPuesto(puestoId, depId = null) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.textContent = 'Editar Puesto';

    try {
        const { data: puesto } = await supabaseClient
            .from('puestos')
            .select(`
                id_puesto,
                nombre_puesto,
                departamento_puesto (
                    dep_id
                )
            `)
            .eq('id_puesto', puestoId)
            .single();

        const { data: departamentos } = await supabaseClient.from('departamento').select('*').order('id_dep');

        // Si se pasa depId, solo se edita esa relación
        const depActual = depId || (puesto.departamento_puesto?.[0]?.dep_id || '');

        modalBody.innerHTML = `
            <form id="editPuestoForm">
                <input type="hidden" name="id_puesto" value="${puesto.id_puesto}">
                
                <div class="form-group">
                    <label class="form-label">Nombre del Puesto *</label>
                    <input type="text" class="form-input" name="nombre_puesto" value="${puesto.nombre_puesto || ''}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Departamento (ID) *</label>
                    <select class="form-select" name="dep_id" required>
                        <option value="">Seleccionar departamento</option>
                        ${departamentos?.map(dep => `<option value="${dep.id_dep}" ${dep.id_dep === depActual ? 'selected' : ''}>${dep.id_dep}</option>`).join('') || ''}
                    </select>
                </div>
            </form>
        `;

        document.getElementById('confirmModal').onclick = async () => {
            await updatePuesto();
        };

        openModal();

    } catch (error) {
        console.error('Error cargando puesto:', error);
        showAlert('Error al cargar el puesto', 'error');
    }
}

async function updatePuesto() {
    const form = document.getElementById('editPuestoForm');
    const formData = new FormData(form);

    const puestoId = formData.get('id_puesto');
    const depIds = formData.getAll('dep_id'); // 🔑 aquí definimos depIds correctamente

    try {
        // Actualizamos el nombre del puesto
        const { error: puestoError } = await supabaseClient
            .from('puestos')
            .update({ nombre_puesto: formData.get('nombre_puesto') })
            .eq('id_puesto', puestoId);

        if (puestoError) throw puestoError;

        // Eliminamos relaciones viejas
        await supabaseClient
            .from('departamento_puesto')
            .delete()
            .eq('puesto_id', puestoId);

        // Insertamos nuevas relaciones
        const relaciones = depIds.map(depId => ({
            puesto_id: puestoId,
            dep_id: depId
        }));

        const { error: depError } = await supabaseClient
            .from('departamento_puesto')
            .insert(relaciones);

        if (depError) throw depError;

        showAlert('Puesto actualizado exitosamente', 'success');
        closeModal();
        await loadPuestos();

    } catch (error) {
        console.error('Error actualizando puesto:', error);
        showAlert('Error al actualizar el puesto', 'error');
    }
}

async function deletePuesto(puestoId, depId = null) {
    if (depId) {
        if (!confirm('¿Está seguro de eliminar este departamento del puesto?')) {
            return;
        }

        try {
            await supabaseClient
                .from('departamento_puesto')
                .delete()
                .eq('puesto_id', puestoId)
                .eq('dep_id', depId);

            showAlert('Departamento eliminado del puesto exitosamente', 'success');
            await loadPuestos();

        } catch (error) {
            console.error('Error eliminando departamento del puesto:', error);
            showAlert('Error al eliminar el departamento del puesto', 'error');
        }
    } else {
        if (!confirm('¿Está seguro de eliminar este puesto completo? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await supabaseClient
                .from('departamento_puesto')
                .delete()
                .eq('puesto_id', puestoId);

            const { error } = await supabaseClient
                .from('puestos')
                .update({is_active: false})
                .eq('id_puesto', puestoId);

            if (error) throw error;

            showAlert('Puesto eliminado exitosamente', 'success');
            await loadPuestos();

        } catch (error) {
            console.error('Error eliminando puesto:', error);
            showAlert('Error al eliminar el puesto', 'error');
        }
    }
}
// === FILTRO DE DEPARTAMENTOS POR ID ===
async function loadDepartamentosFilter(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    try {
        const { data: departamentos, error } = await supabaseClient
            .from('departamento')
            .select('*')
            .order('id_dep');

        if (error) throw error;

        select.innerHTML = `
            <option value="">Todos</option>
            ${departamentos?.map(dep => `<option value="${dep.id_dep}">${dep.id_dep}</option>`).join('') || ''}
        `;
    } catch (error) {
        console.error('Error cargando departamentos:', error);
        select.innerHTML = '<option value="">Error al cargar</option>';
    }

    
}