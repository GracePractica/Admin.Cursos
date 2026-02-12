// ============================================
// LÓGICA DE DEPARTAMENTOS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('departamentosTableBody')) {
        loadDepartamentos();
        setupDepartamentosListeners();
    }
});

function setupDepartamentosListeners() {
    document.getElementById('addDepartamentoButton')?.addEventListener('click', () => openAddDepartamentoModal());

    document.getElementById('searchDepartamento')?.addEventListener('input', (e) => {
        loadDepartamentos();
    });
}

// === DEPARTAMENTOS ===
async function loadDepartamentos(page = 1) {
    PAGINATION.departamentos.page = page;
    const tbody = document.getElementById('departamentosTableBody');
    if (!tbody) return;

    try {
        let query = supabaseClient.from('departamento').select('*');
        const searchTerm = document.getElementById('searchDepartamento')?.value.toLowerCase();

        const { data: allDepartamentos, error } = await query.order('id_dep');

        if (error) throw error;

        let departamentos = allDepartamentos || [];

        if (searchTerm) {
            departamentos = departamentos.filter(d =>
                (d.id_dep?.toString().toLowerCase().includes(searchTerm))
            );
        }

        if (!departamentos || departamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="text-center">No hay departamentos registrados</td></tr>';
            renderPaginationControls(0, 1, PAGINATION.departamentos.limit, 'paginationDepartamentos', 'loadDepartamentos');
            return;
        }

        // Paginación
        const startIndex = (page - 1) * PAGINATION.departamentos.limit;
        const endIndex = startIndex + PAGINATION.departamentos.limit;
        const paginatedDepartamentos = departamentos.slice(startIndex, endIndex);

        tbody.innerHTML = paginatedDepartamentos.map(dep => `
            <tr>
                <td><strong>${dep.id_dep}</strong></td>
                <td>
                    <button class="btn btn-small btn-outline" onclick="editDepartamento('${dep.id_dep}')">
                        Editar
                    </button>
                </td>
            </tr>
        `).join('');

        renderPaginationControls(departamentos.length, page, PAGINATION.departamentos.limit, 'paginationDepartamentos', 'loadDepartamentos');

    } catch (error) {
        console.error('Error cargando departamentos:', error);
        tbody.innerHTML = '<tr><td colspan="2" class="text-center">Error al cargar departamentos</td></tr>';
    }
}

async function openAddDepartamentoModal() {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.textContent = 'Agregar Nuevo Departamento';

    modalBody.innerHTML = `
        <form id="addDepartamentoForm">
            <div class="form-group">
                <label class="form-label">ID (SIGLAS) *</label>
                <input type="text" class="form-input" name="id_dep" required>
            </div>
        </form>
    `;

    document.getElementById('confirmModal').onclick = async () => {
        await saveDepartamento();
    };

    openModal();
}

async function saveDepartamento() {
    const form = document.getElementById('addDepartamentoForm');
    const formData = new FormData(form);

    const departamento = {
        id_dep: formData.get('id_dep')
    };

    try {
        const { error } = await supabaseClient
            .from('departamento')
            .insert([departamento]);

        if (error) throw error;

        showAlert('Departamento agregado exitosamente', 'success');
        closeModal();
        await loadDepartamentos();
        // await loadDataQualityStats();

    } catch (error) {
        console.error('Error guardando departamento:', error);
        showAlert('Error al guardar el departamento', 'error');
    }
}

async function editDepartamento(departamentoId) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.textContent = 'Editar Departamento';

    try {
        const { data: departamento } = await supabaseClient
            .from('departamento')
            .select('*')
            .eq('id_dep', departamentoId)
            .single();

        modalBody.innerHTML = `
            <form id="editDepartamentoForm">
                <input type="hidden" name="original_id_dep" value="${departamento.id_dep}">
                
                <div class="form-group">
                    <label class="form-label">ID (SIGLAS) *</label>
                    <input type="text" class="form-input" name="id_dep" value="${departamento.id_dep || ''}" required>
                </div>
            </form>
        `;

        document.getElementById('confirmModal').onclick = async () => {
            await updateDepartamento();
        };

        openModal();

    } catch (error) {
        console.error('Error cargando departamento:', error);
        showAlert('Error al cargar el departamento', 'error');
    }
}

async function updateDepartamento() {
    const form = document.getElementById('editDepartamentoForm');
    const formData = new FormData(form);

    const originalId = formData.get('original_id_dep');
    const newId = formData.get('id_dep');

    // Only update if ID changed
    if (originalId === newId) {
        closeModal();
        return;
    }

    const departamento = {
        id_dep: newId
    };

    try {
        const { error } = await supabaseClient
            .from('departamento')
            .update(departamento)
            .eq('id_dep', originalId);

        if (error) throw error;

        showAlert('Departamento actualizado exitosamente', 'success');
        closeModal();
        await loadDepartamentos();

    } catch (error) {
        console.error('Error actualizando departamento:', error);
        showAlert('Error al actualizar el departamento', 'error');
    }
}

async function deleteDepartamento(departamentoId) {
    if (!confirm('¿Está seguro de eliminar este departamento? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('departamento')
            .delete()
            .eq('id_dep', departamentoId);

        if (error) throw error;

        showAlert('Departamento eliminado exitosamente', 'success');
        await loadDepartamentos();
        // await loadDataQualityStats();

    } catch (error) {
        console.error('Error eliminando departamento:', error);
        showAlert('Error al eliminar. Puede que tenga datos relacionados.', 'error');
    }
}
