// ============================================
// LÓGICA DE CURSOS
// ============================================
document.addEventListener('roleLoaded', () => {
    applyRolePermissions();
});
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('cursosTableBody')) {
        loadCursos();
        setupCursosListeners();
    }
});
function applyRolePermissions() {
    if (CURRENT_USER_ROLE === 'SUPERVISOR') {
        const addButton = document.getElementById('addCursoButton');
        if (addButton) {
            addButton.style.display = 'none';
        }
    }
}

// Restaura un curso eliminado (solo ADMIN)
async function restoreCurso(cursoId) {
    if (CURRENT_USER_ROLE !== 'ADMIN') {
        showAlert('No tiene permisos para restaurar cursos', 'error');
        return;
    }

    try {
        const confirmRestore = confirm('¿Desea restaurar este curso?');
        if (!confirmRestore) return;

        const { error } = await supabaseClient
            .from('cursos')
            .update({ is_active: true })
            .eq('id_curso', cursoId);

        if (error) throw error;

        showAlert('Curso restaurado correctamente', 'success');
        await loadCursos();
    } catch (error) {
        console.error('Error restaurando curso:', error);
        showAlert('Error al restaurar el curso: ' + (error.message || error), 'error');
    }
}
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

    document.getElementById('filterEstado')?.addEventListener('change', (e) => {
        loadCursos();
    });
}

// === CURSOS ===
async function loadCursos(page = 1) {
    PAGINATION.cursos.page = page;
    const tbody = document.getElementById('cursosTableBody');
    if (!tbody) return;

    try {
        // Comprobar si hay parámetro de filtro en la URL
        const urlParams = new URLSearchParams(window.location.search);
        const filter = urlParams.get('filter');

        let query = '';

        if(CURRENT_USER_ROLE === 'ADMIN') {
            query = supabaseClient.from('cursos').select('*').order('id_curso'); // Muestra cursos inactivos (eliminados lógicamente) para ADMIN
        }
        else
            query = supabaseClient.from('cursos').select('*').order('id_curso').neq('is_active', false); // Excluir cursos inactivos (eliminados lógicamente)

        // Obtener todos los cursos primero para permitir filtrado local
        const { data: allCursos, error } = await query;
        if (error) throw error;

        let cursos = allCursos || [];
        let filterMessage = '';

        // Aplicar filtros según el parámetro de la URL
        if (filter === 'duplicados') {
            // Buscar cursos duplicados 
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

        // Mostrar mensaje del filtro si hay un filtro activo
        if (filterMessage) {
            // Eliminar primero cualquier alerta de filtro existente
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
        const searchTerm = document.getElementById('searchCurso')?.value.toLowerCase();
        const estadoFilter = document.getElementById('filterEstado')?.value;

        // Aplicar filtro de estado desde el desplegable si no está sobrescrito por el filtro de la URL
        if (estadoFilter && !filter) {
            cursos = cursos.filter(c => c.estado === estadoFilter);
        }

        if (searchTerm) {
            cursos = cursos.filter(c =>
                (c.nombre_curso?.toLowerCase().includes(searchTerm)) ||
                (c.id_curso?.toLowerCase().includes(searchTerm))
            );
        }

        if (!cursos || cursos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No se encontraron cursos con este filtro</td></tr>';
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
                <td>${curso.origen || 'N/A'}</td>
                <td>${curso.primera_fecha ? new Date(curso.primera_fecha).toLocaleDateString() : 'N/A'}</td>
                <td>${curso.ultima_fecha ? new Date(curso.ultima_fecha).toLocaleDateString() : 'N/A'}</td>
                <td>
                    ${curso.is_active === false ? (
                        (CURRENT_USER_ROLE === 'ADMIN')
                        ? '<button class="btn btn-small btn-success" onclick="restoreCurso(\'' + curso.id_curso + '\')">♻️ Restaurar</button>'
                        : '<span style="color:#6b7280; font-style:italic;">Eliminado</span>'
                    ) : (
                        '<button class="btn btn-small btn-outline" onclick="editCurso(\'' + curso.id_curso + '\')">Editar</button>' +
                        '<button class="btn btn-small btn-danger" onclick="deleteCurso(\'' + curso.id_curso + '\', \'' + (curso.nombre_curso?.replace(/'/g, "\\'")) + '\')">Eliminar</button>'
                    )}
                </td>
            </tr>
        `).join('');

        renderPaginationControls(cursos.length, page, PAGINATION.cursos.limit, 'paginationCursos', 'loadCursos');

    } catch (error) {
        console.error('Error cargando cursos:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Error al cargar cursos</td></tr>';
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

    const confirmBtn = document.getElementById('confirmModal');
    confirmBtn.textContent = 'Guardar';
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.disabled = false;
    confirmBtn.onclick = async () => {
        await saveCurso();
    };

    openModal();
}

async function getNextCursoId() {
    // Obtener siguiente ID disponible y guardar el nuevo curso en la tabla
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
        // Insertar solo el registro del curso
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

// === EDITAR CURSO ===
// Inicia la edición de un curso cargando sus datos y abriendo el modal
function editCurso(cursoId) {
    console.log('editCurso llamado con ID:', cursoId);
    loadCursoData(cursoId);
}

async function loadCursoData(cursoId) {
    // Cargar datos del curso desde la base de datos y manejar errores
    try {
        const { data: curso, error } = await supabaseClient
            .from('cursos')
            .select('*')
            .eq('id_curso', cursoId)
            .single();

        if (error) {
            console.error('Error en la base de datos:', error);
            showAlert('Error al cargar el curso: ' + error.message, 'error');
            return;
        }

        if (!curso) {
            showAlert('Curso no encontrado', 'error');
            return;
        }

        displayEditCursoModal(curso);

    } catch (error) {
        console.error('Excepción en loadCursoData:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

// Muestra en el modal el formulario para editar un curso con sus valores
function displayEditCursoModal(curso) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('confirmModal');

    if (!modalBody || !modalTitle) {
        console.error('Elementos del modal no encontrados');
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

    // Asignar acción de confirmación y abrir modal
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
        console.error('Error actualizando curso:', error);
        showAlert('Error al actualizar el curso: ' + error.message, 'error');
    }
}

async function deleteCurso(cursoId, cursoNombre) {
    if (CURRENT_USER_ROLE === 'SUPERVISOR') {
        showAlert('No tiene permisos para eliminar cursos', 'error');
        return;
    }
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('confirmModal');

    // Verificar registros en historial_cursos y puesto_curso
    try {
        const { count: countHistorial, error: errorHistorial } = await supabaseClient
            .from('historial_cursos')
            .select('*', { count: 'exact', head: true })
            .eq('curso_id', cursoId);

        if (errorHistorial) throw errorHistorial;

        const { count: countGestion, error: errorGestion } = await supabaseClient
            .from('puesto_curso')
            .select('*', { count: 'exact', head: true })
            .eq('curso_id', cursoId);

        if (errorGestion) throw errorGestion;

        const tieneRegistros = (countHistorial > 0 || countGestion > 0);

        modalTitle.textContent = 'Eliminar Curso';

        if (tieneRegistros) {
            // Construir resumen de registros
            const resumenPartes = [];
            if (countHistorial > 0) resumenPartes.push(`${countHistorial} registro(s) en Historial`);
            if (countGestion > 0) resumenPartes.push(`${countGestion} asignación(es) en Gestión`);
            const resumen = resumenPartes.join(' y ');

            modalBody.innerHTML = `
                <div class="alert alert-warning" style="margin-bottom:1rem;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    <div style="flex:1;">
                        <strong>Este curso tiene registros asociados</strong>
                        <div style="margin-top:0.4rem; font-size:0.9rem;">
                            <strong>${cursoNombre}</strong> tiene ${resumen}.
                            Debes transferirlos a otro curso antes de eliminar.
                        </div>
                    </div>
                </div>

                <div class="form-group" style="position: relative;">
                    <label class="form-label">Buscar curso destino para transferir los registros:</label>
                    <input type="text" id="buscarCursoDestino" class="form-input"
                        placeholder="Escribe el nombre del curso..."
                        autocomplete="off">
                    <div id="resultadosBusquedaCurso" style="
                        position: absolute;
                        top: 100%;
                        left: 0;
                        right: 0;
                        z-index: 1000;
                        border: 1px solid #e5e7eb;
                        border-radius: 6px;
                        max-height: 200px;
                        overflow-y: auto;
                        margin-top: 2px;
                        display: none;
                        background: white;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    "></div>
                </div>

                <div id="cursoDestinoSeleccionado" style="display:none; margin-top:0.5rem;">
                    <div class="alert alert-info" style="padding:0.6rem 1rem;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                        </svg>
                        <span>Transfiriendo a: <strong id="nombreCursoDestinoLabel"></strong></span>
                    </div>
                </div>

                <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid #e5e7eb; font-size:0.85rem; color:#6b7280;">
                    ⚠️ Se transferirán los registros y luego se eliminará permanentemente el curso <strong>${cursoNombre}</strong>.
                </div>
            `;

            // Variable para guardar el curso destino seleccionado
            let cursoDestinoId = null;
            let todosCursos = []; // Cache local de cursos

            const inputBusqueda = document.getElementById('buscarCursoDestino');
            const resultadosDiv = document.getElementById('resultadosBusquedaCurso');

            // Función para renderizar lista de resultados
            function renderResultadosCursos(lista) {
                if (!lista || lista.length === 0) {
                    resultadosDiv.style.display = 'block';
                    resultadosDiv.innerHTML = '<div style="padding:0.75rem 1rem; color:#6b7280; font-size:0.875rem;">No se encontraron cursos</div>';
                    return;
                }
                resultadosDiv.style.display = 'block';
                resultadosDiv.innerHTML = lista.map(c => `
                    <div class="resultado-curso-item" data-id="${c.id_curso}" data-nombre="${c.nombre_curso?.replace(/"/g, '&quot;')}"
                        style="padding:0.6rem 1rem; cursor:pointer; border-bottom:1px solid #f3f4f6; font-size:0.9rem; transition:background 0.15s;"
                        onmouseover="this.style.background='#f9fafb'"
                        onmouseout="this.style.background='white'">
                        <strong>${c.id_curso}</strong> – ${c.nombre_curso || 'Sin nombre'}
                    </div>
                `).join('');

                resultadosDiv.querySelectorAll('.resultado-curso-item').forEach(item => {
                    item.addEventListener('click', () => {
                        cursoDestinoId = item.dataset.id;
                        const nombreDestino = item.dataset.nombre;
                        inputBusqueda.value = nombreDestino;
                        resultadosDiv.style.display = 'none';
                        document.getElementById('cursoDestinoSeleccionado').style.display = 'block';
                        document.getElementById('nombreCursoDestinoLabel').textContent = `${cursoDestinoId} – ${nombreDestino}`;
                        confirmBtn.disabled = false;
                    });
                });
            }

            // Precargar todos los cursos (excepto el que se va a eliminar)
            const { data: cursosDisponibles } = await supabaseClient
                .from('cursos')
                .select('id_curso, nombre_curso')
                .neq('id_curso', cursoId)
                .order('nombre_curso');
            todosCursos = cursosDisponibles || [];

            // Filtrar localmente al escribir
            inputBusqueda.addEventListener('input', () => {
                const termino = inputBusqueda.value.trim().toLowerCase();
                cursoDestinoId = null;
                document.getElementById('cursoDestinoSeleccionado').style.display = 'none';
                confirmBtn.disabled = true;

                const filtrados = termino
                    ? todosCursos.filter(c => c.nombre_curso?.toLowerCase().includes(termino) || c.id_curso?.toLowerCase().includes(termino))
                    : todosCursos;

                renderResultadosCursos(filtrados);
            });

            // Mostrar todos los cursos al hacer foco o clic
            const mostrarTodos = () => renderResultadosCursos(todosCursos);
            inputBusqueda.addEventListener('focus', mostrarTodos);
            inputBusqueda.addEventListener('click', mostrarTodos);

            // Cerrar lista al hacer clic fuera
            document.addEventListener('click', (e) => {
                if (!inputBusqueda.contains(e.target) && !resultadosDiv.contains(e.target)) {
                    resultadosDiv.style.display = 'none';
                }
            });

            // El botón confirmar inicia deshabilitado hasta elegir destino
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Transferir y Eliminar';
            confirmBtn.className = 'btn btn-danger';
            confirmBtn.onclick = async () => {
                if (!cursoDestinoId) {
                    showAlert('Debes seleccionar un curso destino para transferir los registros.', 'warning');
                    return;
                }
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Procesando...';
                await transferirYEliminarCurso(cursoId, cursoDestinoId, cursoNombre);
            };

        } else {
            // Sin registros → confirmar eliminación directa con aviso
            modalBody.innerHTML = `
                <div class="alert alert-info" style="margin-bottom:1rem;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z"/>
                    </svg>
                    <div style="flex:1;">
                        <strong>Este curso no tiene registros</strong>
                        <div style="margin-top:0.3rem; font-size:0.875rem;">
                            No hay registros de historial ni asignaciones de gestión asociados a este curso.
                        </div>
                    </div>
                </div>
                <div class="alert alert-warning">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    <div style="flex:1;">
                        <strong>¿Confirmas la eliminación de este curso?</strong>
                        <div style="margin-top:0.5rem;">
                            <strong>Curso:</strong> ${cursoNombre} (${cursoId})
                        </div>
                        <div style="font-size:0.875rem; margin-top:0.5rem; color:#dc2626;">
                            Esta acción no se puede deshacer.
                        </div>
                    </div>
                </div>
            `;

            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Eliminar';
            confirmBtn.className = 'btn btn-danger';
            confirmBtn.onclick = async () => {
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Eliminando...';
                await confirmDeleteCurso(cursoId);
            };
        }

        openModal();

    } catch (error) {
        console.error('Error verificando dependencias del curso:', error);
        showAlert('Error al verificar dependencias del curso: ' + error.message, 'error');
    }
}

// Transfiere todos los registros de historial y gestión al curso destino, luego elimina el curso original
async function transferirYEliminarCurso(cursoOrigenId, cursoDestinoId, cursoNombre) {
    try {
        // 1. Transferir registros de historial_cursos
        const { error: errorHistorial } = await supabaseClient
            .from('historial_cursos')
            .update({ curso_id: cursoDestinoId })
            .eq('curso_id', cursoOrigenId);

        if (errorHistorial) throw new Error('Error al transferir historial: ' + errorHistorial.message);

        // 2. Transferir asignaciones de puesto_curso (gestión)
        const { error: errorGestion } = await supabaseClient
            .from('puesto_curso')
            .update({ curso_id: cursoDestinoId })
            .eq('curso_id', cursoOrigenId);

        if (errorGestion) throw new Error('Error al transferir gestión: ' + errorGestion.message);

        // 3. Eliminar el curso original
        const { error: errorDelete } = await supabaseClient
            .from('cursos')
            .update({is_active: false}) // Eliminación lógica
            .eq('id_curso', cursoOrigenId);

        if (errorDelete) throw new Error('Error al eliminar el curso: ' + errorDelete.message);

        showAlert(`Curso "${cursoNombre}" eliminado. Sus registros fueron transferidos exitosamente.`, 'success');
        closeModal();
        await loadCursos();

        // Restablecer botón
        const confirmBtn = document.getElementById('confirmModal');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Guardar';
            confirmBtn.className = 'btn btn-primary';
        }

    } catch (error) {
        console.error('Error en transferencia y eliminación:', error);
        showAlert('Error: ' + error.message, 'error');
        const confirmBtn = document.getElementById('confirmModal');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Transferir y Eliminar';
        }
    }
}

async function confirmDeleteCurso(cursoId) {
    try {
        // Eliminar el curso en la tabla cursos (sin registros relacionados)
        const { error } = await supabaseClient
            .from('cursos')
            .update({is_active: false})
            .eq('id_curso', cursoId);

        if (error) throw error;

        showAlert('Curso eliminado exitosamente', 'success');
        closeModal();
        await loadCursos();

        const confirmBtn = document.getElementById('confirmModal');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Guardar';
            confirmBtn.className = 'btn btn-primary';
        }

    } catch (error) {
        console.error('Error eliminando curso:', error);
        showAlert('Error al eliminar el curso: ' + error.message, 'error');
        const confirmBtn = document.getElementById('confirmModal');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Eliminar';
        }
    }
}
