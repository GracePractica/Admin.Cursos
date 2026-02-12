// ============================================
// LÓGICA DE PUESTOS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('puestosTableBody')) {
        loadPuestos();
        setupPuestosListeners();
        loadDepartamentosFilter('filterDepartamentoPuesto');
    }
});

function setupPuestosListeners() {
    document.getElementById('addPuestoButton')?.addEventListener('click', () => openAddPuestoModal());

    document.getElementById('filterDepartamentoPuesto')?.addEventListener('change', (e) => {
        currentFilters.departamento = e.target.value;
        loadPuestos();
    });

    document.getElementById('searchPuesto')?.addEventListener('input', (e) => {
        loadPuestos();
    });
}

// === PUESTOS ===
async function loadPuestos(page = 1) {
    PAGINATION.puestos.page = page;
    const tbody = document.getElementById('puestosTableBody');
    if (!tbody) return;

    try {
        let query = supabaseClient.from('puestos').select('*');

        if (currentFilters.departamento) {
            query = query.eq('dep_id', currentFilters.departamento);
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

        const { data: departamentos } = await supabaseClient.from('departamento').select('*');
        const depMap = {};
        departamentos?.forEach(d => depMap[d.id_dep] = d.nombre_dep);

        tbody.innerHTML = paginatedPuestos.map(puesto => `
            <tr>
                <td><strong>${puesto.id_puesto}</strong></td>
                <td>${puesto.nombre_puesto}</td>
                <td>${depMap[puesto.dep_id] || 'N/A'}</td>
                <td>
                    <button class="btn btn-small btn-outline" onclick="editPuesto(${puesto.id_puesto})">
                        Editar
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deletePuesto(${puesto.id_puesto})">
                        Eliminar
                    </button>
                </td>
            </tr>
        `).join('');

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

    const { data: departamentos } = await supabaseClient.from('departamento').select('*').order('nombre_dep');

    modalBody.innerHTML = `
        <form id="addPuestoForm">
            <div class="form-group">
                <label class="form-label">Nombre del Puesto *</label>
                <input type="text" class="form-input" name="nombre_puesto" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Departamento *</label>
                <select class="form-select" name="dep_id" required>
                    <option value="">Seleccionar departamento</option>
                    ${departamentos?.map(dep => `<option value="${dep.id_dep}">${dep.nombre_dep}</option>`).join('') || ''}
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

    const puesto = {
        nombre_puesto: formData.get('nombre_puesto'),
        dep_id: formData.get('dep_id')
    };

    try {
        const { error } = await supabaseClient
            .from('puestos')
            .insert([puesto]);

        if (error) throw error;

        showAlert('Puesto agregado exitosamente', 'success');
        closeModal();
        await loadPuestos();

    } catch (error) {
        console.error('Error guardando puesto:', error);
        showAlert('Error al guardar el puesto', 'error');
    }
}

async function editPuesto(puestoId) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.textContent = 'Editar Puesto';

    try {
        const { data: puesto } = await supabaseClient
            .from('puestos')
            .select('*')
            .eq('id_puesto', puestoId)
            .single();

        const { data: departamentos } = await supabaseClient.from('departamento').select('*').order('nombre_dep');

        modalBody.innerHTML = `
            <form id="editPuestoForm">
                <input type="hidden" name="id_puesto" value="${puesto.id_puesto}">
                
                <div class="form-group">
                    <label class="form-label">Nombre del Puesto *</label>
                    <input type="text" class="form-input" name="nombre_puesto" value="${puesto.nombre_puesto || ''}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Departamento *</label>
                    <select class="form-select" name="dep_id" required>
                        <option value="">Seleccionar departamento</option>
                        ${departamentos?.map(dep => `<option value="${dep.id_dep}" ${dep.id_dep === puesto.dep_id ? 'selected' : ''}>${dep.nombre_dep}</option>`).join('') || ''}
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
    const puesto = {
        nombre_puesto: formData.get('nombre_puesto'),
        dep_id: formData.get('dep_id')
    };

    try {
        const { error } = await supabaseClient
            .from('puestos')
            .update(puesto)
            .eq('id_puesto', puestoId);

        if (error) throw error;

        showAlert('Puesto actualizado exitosamente', 'success');
        closeModal();
        await loadPuestos();

    } catch (error) {
        console.error('Error actualizando puesto:', error);
        showAlert('Error al actualizar el puesto', 'error');
    }
}

async function deletePuesto(puestoId) {
    if (!confirm('¿Está seguro de eliminar este puesto? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('puestos')
            .delete()
            .eq('id_puesto', puestoId);

        if (error) throw error;

        showAlert('Puesto eliminado exitosamente', 'success');
        await loadPuestos();

    } catch (error) {
        console.error('Error eliminando puesto:', error);
        showAlert('Error al eliminar. Puede que tenga datos relacionados.', 'error');
    }
}
