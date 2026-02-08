// ============================================
// SISTEMA DE CAPACITACIONES - JavaScript
// Integración con Supabase
// ============================================

// === CONFIGURACIÓN DE SUPABASE ===
// IMPORTANTE: Reemplaza estos valores con tus credenciales de Supabase
const SUPABASE_URL = 'https://vwterkaunraowtkcmxzm.supabase.co'; // Ejemplo: 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dGVya2F1bnJhb3d0a2NteHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MjMxMjksImV4cCI6MjA4NjA5OTEyOX0.U8rV9xFm5VbI-clu842hAEYYBIb2fvepHcXuMx7PH8M';

// Inicializar cliente de Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === ESTADO GLOBAL ===
let currentSection = 'dashboard';
let currentFilters = {
    departamento: '',
    puesto: '',
    clasificacion: '',
    estado: ''
};

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    setupEventListeners();
    await loadDashboardData();
}

// === EVENT LISTENERS ===
function setupEventListeners() {
    // Navegación del sidebar
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // Botones de agregar
    document.getElementById('addColaboradorButton')?.addEventListener('click', () => openAddColaboradorModal());
    document.getElementById('addCursoButton')?.addEventListener('click', () => openAddCursoModal());
    document.getElementById('addDepartamentoButton')?.addEventListener('click', () => openAddDepartamentoModal());
    document.getElementById('addPuestoButton')?.addEventListener('click', () => openAddPuestoModal());
    document.getElementById('refreshActivity')?.addEventListener('click', () => loadActividades());

    // Modal
    document.getElementById('closeModal')?.addEventListener('click', closeModal);
    document.getElementById('cancelModal')?.addEventListener('click', closeModal);
    
    // Filtros
    document.getElementById('filterDepartamentoColab')?.addEventListener('change', (e) => {
        currentFilters.departamento = e.target.value;
        loadColaboradores();
    });
    
    document.getElementById('filterPuestoCurso')?.addEventListener('change', (e) => {
        currentFilters.puesto = e.target.value;
        loadCursos();
    });
    
    document.getElementById('filterClasificacion')?.addEventListener('change', (e) => {
        currentFilters.clasificacion = e.target.value;
        loadCursos();
    });
    
    document.getElementById('filterDepartamentoHist')?.addEventListener('change', (e) => {
        currentFilters.departamento = e.target.value;
        loadHistorial();
    });
    
    document.getElementById('filterPuestoHist')?.addEventListener('change', (e) => {
        currentFilters.puesto = e.target.value;
        loadHistorial();
    });
    
    document.getElementById('filterEstadoHist')?.addEventListener('change', (e) => {
        currentFilters.estado = e.target.value;
        loadHistorial();
    });
    
    document.getElementById('filterDepartamentoPuesto')?.addEventListener('change', (e) => {
        currentFilters.departamento = e.target.value;
        loadPuestos();
    });

    // Cerrar modal al hacer click fuera
    document.getElementById('mainModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'mainModal') {
            closeModal();
        }
    });
}

// === NAVEGACIÓN ===
function handleNavigation(e) {
    e.preventDefault();
    
    const section = e.currentTarget.dataset.section;
    
    // Actualizar navegación activa
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
    
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.add('hidden');
    });
    
    // Mostrar sección seleccionada
    const sectionElement = document.getElementById(`${section}Section`);
    if (sectionElement) {
        sectionElement.classList.remove('hidden');
    }
    
    // Actualizar título
    const titles = {
        'dashboard': 'Dashboard',
        'colaboradores': 'Colaboradores',
        'cursos': 'Cursos',
        'historial': 'Historial de Capacitaciones',
        'departamentos': 'Departamentos',
        'puestos': 'Puestos'
    };
    
    document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard';
    
    // Ocultar botón genérico "Agregar Nuevo"
    const addNewButton = document.getElementById('addNewButton');
    if (addNewButton) {
        addNewButton.style.display = 'none';
    }
    
    // Cargar datos según la sección
    currentSection = section;
    loadSectionData(section);
}

async function loadSectionData(section) {
    switch(section) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'colaboradores':
            await loadColaboradores();
            await loadDepartamentosFilter('filterDepartamentoColab');
            break;
        case 'cursos':
            await loadCursos();
            await loadPuestosFilter('filterPuestoCurso');
            break;
        case 'historial':
            await loadHistorial();
            await loadDepartamentosFilter('filterDepartamentoHist');
            await loadPuestosFilter('filterPuestoHist');
            break;
        case 'departamentos':
            await loadDepartamentos();
            break;
        case 'puestos':
            await loadPuestos();
            await loadDepartamentosFilter('filterDepartamentoPuesto');
            break;
    }
}

// === DASHBOARD ===
async function loadDashboardData() {
    try {
        await loadStats();
        await loadActividades();
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        showAlert('Error al cargar los datos del dashboard', 'error');
    }
}

async function loadStats() {
    try {
        // Total de colaboradores
        const { count: totalColaboradores } = await supabaseClient
            .from('colaboradores')
            .select('*', { count: 'exact', head: true });
        
        document.getElementById('totalColaboradores').textContent = totalColaboradores || 0;

        // Total de departamentos
        const { count: totalDepartamentos } = await supabaseClient
            .from('departamento')
            .select('*', { count: 'exact', head: true });
        
        document.getElementById('totalDepartamentos').textContent = totalDepartamentos || 0;

        // Total de cursos activos
        const { count: totalCursos } = await supabaseClient
            .from('cursos')
            .select('*', { count: 'exact', head: true })
            .eq('estado', 'activo');
        
        document.getElementById('totalCursos').textContent = totalCursos || 0;

        // Total de actividades recientes (últimos 30 días)
        const fecha30DiasAtras = new Date();
        fecha30DiasAtras.setDate(fecha30DiasAtras.getDate() - 30);
        
        const { count: totalActividades } = await supabaseClient
            .from('historial_cursos')
            .select('*', { count: 'exact', head: true })
            .gte('fecha_inicio', fecha30DiasAtras.toISOString().split('T')[0]);
        
        document.getElementById('totalActividades').textContent = totalActividades || 0;

    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

async function loadActividades() {
    const tbody = document.getElementById('actividadesTableBody');
    
    try {
        // Primero obtener las actividades
        const { data: actividades, error } = await supabaseClient
            .from('historial_cursos')
            .select('*')
            .order('fecha_inicio', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error en query:', error);
            throw error;
        }

        if (!actividades || actividades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay actividades recientes</td></tr>';
            return;
        }

        // Luego obtener colaboradores y cursos separadamente
        const colaboradorIds = [...new Set(actividades.map(a => a.colaborador_id).filter(Boolean))];
        const cursoIds = [...new Set(actividades.map(a => a.curso_id).filter(Boolean))];

        const { data: colaboradores } = await supabaseClient
            .from('colaboradores')
            .select('id_colab, nombre')
            .in('id_colab', colaboradorIds);

        const { data: cursos } = await supabaseClient
            .from('cursos')
            .select('id_curso, nombre_curso')
            .in('id_curso', cursoIds);

        // Crear mapas para búsqueda rápida
        const colabMap = {};
        colaboradores?.forEach(c => colabMap[c.id_colab] = c.nombre);

        const cursoMap = {};
        cursos?.forEach(c => cursoMap[c.id_curso] = c.nombre_curso);

        tbody.innerHTML = actividades.map(act => `
            <tr>
                <td>${colabMap[act.colaborador_id] || 'N/A'}</td>
                <td>${cursoMap[act.curso_id] || 'N/A'}</td>
                <td>${formatDate(act.fecha_inicio)}</td>
                <td>${act.fecha_final ? formatDate(act.fecha_final) : 'En curso'}</td>
                <td>
                    <span class="badge ${act.estado === 'Completado' ? 'badge-success' : 'badge-warning'}">
                        ${act.estado || 'En Proceso'}
                    </span>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error cargando actividades:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Error al cargar actividades. Verifica la consola.</td></tr>';
    }
}

// === COLABORADORES ===
async function loadColaboradores() {
    const tbody = document.getElementById('colaboradoresTableBody');
    
    try {
        let query = supabaseClient.from('colaboradores').select('*');

        if (currentFilters.departamento) {
            query = query.eq('dep_id', currentFilters.departamento);
        }

        const { data: colaboradores, error } = await query.order('nombre');

        if (error) throw error;

        if (!colaboradores || colaboradores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay colaboradores registrados</td></tr>';
            return;
        }

        // Obtener departamentos, puestos y supervisores
        const { data: departamentos } = await supabaseClient.from('departamento').select('*');
        const { data: puestos } = await supabaseClient.from('puestos').select('*');

        const depMap = {};
        departamentos?.forEach(d => depMap[d.id_dep] = d.nombre_dep);

        const puestoMap = {};
        puestos?.forEach(p => puestoMap[p.id_puesto] = p.nombre_puesto);

        const colabMap = {};
        colaboradores.forEach(c => colabMap[c.id_colab] = c.nombre);

        tbody.innerHTML = colaboradores.map(colab => `
            <tr>
                <td><strong>${colab.nombre || 'N/A'}</strong></td>
                <td>${colab.asignacion || 'N/A'}</td>
                <td>${depMap[colab.dep_id] || 'N/A'}</td>
                <td>${puestoMap[colab.puesto_id] || 'N/A'}</td>
                <td>${colabMap[colab.supervisor_act_id] || 'Sin supervisor'}</td>
                <td>
                    <button class="btn btn-small btn-outline" onclick="viewColaboradorCursos(${colab.id_colab})">
                        Ver Cursos
                    </button>
                    <button class="btn btn-small btn-outline" onclick="editColaborador(${colab.id_colab})">
                        Editar
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error cargando colaboradores:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Error al cargar colaboradores</td></tr>';
    }
}

async function openAddColaboradorModal() {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = 'Agregar Nuevo Colaborador';
    
    const { data: departamentos } = await supabaseClient.from('departamento').select('*').order('nombre_dep');
    const { data: puestos } = await supabaseClient.from('puestos').select('*').order('nombre_puesto');
    const { data: supervisores } = await supabaseClient.from('colaboradores').select('id_colab, nombre').order('nombre');
    
    modalBody.innerHTML = `
        <form id="addColaboradorForm">
            <div class="form-group">
                <label class="form-label">Nombre *</label>
                <input type="text" class="form-input" name="nombre" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Asignación *</label>
                <input type="text" class="form-input" name="asignacion" required>
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
                    ${supervisores?.map(sup => `<option value="${sup.id_colab}">${sup.nombre}</option>`).join('') || ''}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Supervisor Regular</label>
                <select class="form-select" name="supervisor_reg_id">
                    <option value="">Sin supervisor</option>
                    ${supervisores?.map(sup => `<option value="${sup.id_colab}">${sup.nombre}</option>`).join('') || ''}
                </select>
            </div>
        </form>
    `;
    
    document.getElementById('confirmModal').onclick = async () => {
        await saveColaborador();
    };
    
    openModal();
}

async function saveColaborador() {
    const form = document.getElementById('addColaboradorForm');
    const formData = new FormData(form);
    
    const colaborador = {
        nombre: formData.get('nombre'),
        asignacion: formData.get('asignacion'),
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
        await loadStats();
        
    } catch (error) {
        console.error('Error guardando colaborador:', error);
        showAlert('Error al guardar el colaborador: ' + error.message, 'error');
    }
}

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
        const { data: supervisores } = await supabaseClient.from('colaboradores').select('id_colab, nombre').order('nombre');
        
        modalBody.innerHTML = `
            <form id="editColaboradorForm">
                <input type="hidden" name="id_colab" value="${colaborador.id_colab}">
                
                <div class="form-group">
                    <label class="form-label">Nombre *</label>
                    <input type="text" class="form-input" name="nombre" value="${colaborador.nombre || ''}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Asignación *</label>
                    <input type="text" class="form-input" name="asignacion" value="${colaborador.asignacion || ''}" required>
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
                        ${supervisores?.map(sup => `<option value="${sup.id_colab}" ${sup.id_colab === colaborador.supervisor_act_id ? 'selected' : ''}>${sup.nombre}</option>`).join('') || ''}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Supervisor Regular</label>
                    <select class="form-select" name="supervisor_reg_id">
                        <option value="">Sin supervisor</option>
                        ${supervisores?.map(sup => `<option value="${sup.id_colab}" ${sup.id_colab === colaborador.supervisor_reg_id ? 'selected' : ''}>${sup.nombre}</option>`).join('') || ''}
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

async function updateColaborador() {
    const form = document.getElementById('editColaboradorForm');
    const formData = new FormData(form);
    
    const colaboradorId = formData.get('id_colab');
    const colaborador = {
        nombre: formData.get('nombre'),
        asignacion: formData.get('asignacion'),
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

async function viewColaboradorCursos(colaboradorId) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    
    try {
        const { data: colaborador } = await supabaseClient
            .from('colaboradores')
            .select('nombre, puesto_id')
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
        
        modalTitle.textContent = `Cursos de ${colaborador?.nombre || 'Colaborador'}`;
        
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

// === CURSOS ===
async function loadCursos() {
    const tbody = document.getElementById('cursosTableBody');
    
    try {
        let query = supabaseClient.from('puesto_curso').select('*');

        if (currentFilters.puesto) {
            query = query.eq('puesto_id', currentFilters.puesto);
        }
        
        if (currentFilters.clasificacion) {
            query = query.eq('clasificacion_estrategica', currentFilters.clasificacion);
        }

        const { data: cursosData, error } = await query.order('id_puesto_curso');

        if (error) throw error;

        if (!cursosData || cursosData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay cursos registrados</td></tr>';
            return;
        }

        // Obtener puestos y cursos
        const puestoIds = [...new Set(cursosData.map(c => c.puesto_id))];
        const cursoIds = [...new Set(cursosData.map(c => c.curso_id))];

        const { data: puestos } = await supabaseClient.from('puestos').select('*').in('id_puesto', puestoIds);
        const { data: cursos } = await supabaseClient.from('cursos').select('*').in('id_curso', cursoIds);

        const puestoMap = {};
        puestos?.forEach(p => puestoMap[p.id_puesto] = p.nombre_puesto);

        const cursoMap = {};
        cursos?.forEach(c => cursoMap[c.id_curso] = { nombre: c.nombre_curso, grupo: c.grupo_curso, estado: c.estado });

        tbody.innerHTML = cursosData.map(item => {
            const cursoInfo = cursoMap[item.curso_id] || {};
            return `
            <tr>
                <td><strong>${cursoInfo.nombre || 'N/A'}</strong></td>
                <td>${puestoMap[item.puesto_id] || 'N/A'}</td>
                <td>
                    <span class="badge badge-${item.clasificacion_estrategica?.toLowerCase() || 'info'}">
                        ${item.clasificacion_estrategica || 'N/A'}
                    </span>
                </td>
                <td>${item.vigencia_anio || 'N/A'} años</td>
                <td>${cursoInfo.grupo || 'N/A'}</td>
                <td>
                    <label class="switch">
                        <input type="checkbox" ${cursoInfo.estado === 'activo' ? 'checked' : ''} 
                               onchange="toggleCursoEstado(${item.curso_id}, this.checked)">
                        <span class="slider"></span>
                    </label>
                </td>
                <td>
                    <button class="btn btn-small btn-outline" onclick="editPuestoCurso(${item.id_puesto_curso})">
                        Editar
                    </button>
                </td>
            </tr>
        `}).join('');

    } catch (error) {
        console.error('Error cargando cursos:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Error al cargar cursos</td></tr>';
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
        await loadStats();
        
    } catch (error) {
        console.error('Error actualizando estado del curso:', error);
        showAlert('Error al actualizar el estado', 'error');
    }
}

async function openAddCursoModal() {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = 'Agregar Nuevo Curso';
    
    const { data: puestos } = await supabaseClient.from('puestos').select('*').order('nombre_puesto');
    const { data: departamentos } = await supabaseClient.from('departamento').select('*').order('nombre_dep');
    
    modalBody.innerHTML = `
        <form id="addCursoForm">
            <div class="form-group">
                <label class="form-label">Nombre del Curso *</label>
                <input type="text" class="form-input" name="nombre_curso" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Grupo del Curso</label>
                <input type="text" class="form-input" name="grupo_curso">
            </div>
            
            <div class="form-group">
                <label class="form-label">Vigencia (años) *</label>
                <input type="number" class="form-input" name="vigencia_anio" min="1" value="1" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Estado *</label>
                <select class="form-select" name="estado" required>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                </select>
            </div>
            
            <hr style="margin: 1.5rem 0; border: none; border-top: 2px solid var(--border-color);">
            <h4 style="margin-bottom: 1rem; color: var(--primary-color);">Asignación a Puesto</h4>
            
            <div class="form-group">
                <label class="form-label">Departamento</label>
                <select class="form-select" name="dep_id" id="cursoDepartamento">
                    <option value="">Todos los departamentos</option>
                    ${departamentos?.map(dep => `<option value="${dep.id_dep}">${dep.nombre_dep}</option>`).join('') || ''}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Puesto *</label>
                <select class="form-select" name="puesto_id" id="cursoPuesto" required>
                    <option value="">Seleccionar puesto</option>
                    ${puestos?.map(puesto => `<option value="${puesto.id_puesto}" data-dep="${puesto.dep_id}">${puesto.nombre_puesto}</option>`).join('') || ''}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Clasificación Estratégica *</label>
                <select class="form-select" name="clasificacion_estrategica" required>
                    <option value="">Seleccionar clasificación</option>
                    <option value="Necesario">Necesario</option>
                    <option value="Complementa">Complementa</option>
                    <option value="Aporta">Aporta</option>
                </select>
            </div>
        </form>
    `;
    
    // Filtrar puestos por departamento
    document.getElementById('cursoDepartamento').addEventListener('change', function(e) {
        const depId = e.target.value;
        const puestoSelect = document.getElementById('cursoPuesto');
        const options = puestoSelect.querySelectorAll('option');
        
        options.forEach(option => {
            if (option.value === '') {
                option.style.display = 'block';
            } else if (!depId || option.dataset.dep === depId) {
                option.style.display = 'block';
            } else {
                option.style.display = 'none';
            }
        });
        
        puestoSelect.value = '';
    });
    
    document.getElementById('confirmModal').onclick = async () => {
        await saveCurso();
    };
    
    openModal();
}

async function saveCurso() {
    const form = document.getElementById('addCursoForm');
    const formData = new FormData(form);
    
    const curso = {
        nombre_curso: formData.get('nombre_curso'),
        grupo_curso: formData.get('grupo_curso') || null,
        vigencia_anio: parseInt(formData.get('vigencia_anio')),
        estado: formData.get('estado')
    };
    
    const puestoId = formData.get('puesto_id');
    const clasificacion = formData.get('clasificacion_estrategica');
    const vigenciaAnio = parseInt(formData.get('vigencia_anio'));
    
    try {
        // Primero insertar el curso
        const { data: cursoInsertado, error: errorCurso } = await supabaseClient
            .from('cursos')
            .insert([curso])
            .select()
            .single();
        
        if (errorCurso) throw errorCurso;
        
        // Luego insertar la relación puesto_curso
        if (puestoId && clasificacion) {
            const puestoCurso = {
                puesto_id: parseInt(puestoId),
                curso_id: cursoInsertado.id_curso,
                clasificacion_estrategica: clasificacion,
                vigencia_anio: vigenciaAnio,
                estado: 'activo'
            };
            
            const { error: errorRelacion } = await supabaseClient
                .from('puesto_curso')
                .insert([puestoCurso]);
            
            if (errorRelacion) throw errorRelacion;
        }
        
        showAlert('Curso agregado exitosamente', 'success');
        closeModal();
        await loadCursos();
        await loadStats();
        
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

// === HISTORIAL ===
async function loadHistorial() {
    const tbody = document.getElementById('historialTableBody');
    
    try {
        let query = supabaseClient.from('historial_cursos').select('*');

        if (currentFilters.estado) {
            query = query.eq('estado', currentFilters.estado);
        }

        const { data: historial, error } = await query.order('fecha_inicio', { ascending: false });

        if (error) throw error;

        if (!historial || historial.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay registros en el historial</td></tr>';
            return;
        }

        // Obtener datos relacionados
        const colaboradorIds = [...new Set(historial.map(h => h.colaborador_id).filter(Boolean))];
        const cursoIds = [...new Set(historial.map(h => h.curso_id).filter(Boolean))];

        const { data: colaboradores } = await supabaseClient.from('colaboradores').select('*').in('id_colab', colaboradorIds);
        const { data: cursos } = await supabaseClient.from('cursos').select('*').in('id_curso', cursoIds);
        const { data: departamentos } = await supabaseClient.from('departamento').select('*');
        const { data: puestos } = await supabaseClient.from('puestos').select('*');

        const colabMap = {};
        colaboradores?.forEach(c => colabMap[c.id_colab] = c);

        const cursoMap = {};
        cursos?.forEach(c => cursoMap[c.id_curso] = c.nombre_curso);

        const depMap = {};
        departamentos?.forEach(d => depMap[d.id_dep] = d.nombre_dep);

        const puestoMap = {};
        puestos?.forEach(p => puestoMap[p.id_puesto] = p.nombre_puesto);

        tbody.innerHTML = historial.map(item => {
            const colab = colabMap[item.colaborador_id] || {};
            return `
            <tr>
                <td><strong>${colab.nombre || 'N/A'}</strong></td>
                <td>${depMap[colab.dep_id] || 'N/A'}</td>
                <td>${puestoMap[colab.puesto_id] || 'N/A'}</td>
                <td>${cursoMap[item.curso_id] || 'N/A'}</td>
                <td>${formatDate(item.fecha_inicio)}</td>
                <td>${item.fecha_final ? formatDate(item.fecha_final) : 'En curso'}</td>
                <td>${item.duracion_horas || 'N/A'} hrs</td>
                <td>
                    <span class="badge ${item.estado === 'Completado' ? 'badge-success' : 'badge-warning'}">
                        ${item.estado || 'En Proceso'}
                    </span>
                </td>
            </tr>
        `}).join('');

    } catch (error) {
        console.error('Error cargando historial:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Error al cargar el historial</td></tr>';
    }
}

// === DEPARTAMENTOS ===
async function loadDepartamentos() {
    const tbody = document.getElementById('departamentosTableBody');
    
    try {
        const { data: departamentos, error } = await supabaseClient
            .from('departamento')
            .select('*')
            .order('nombre_dep');

        if (error) throw error;

        // Obtener conteo de colaboradores
        const { data: colabCount } = await supabaseClient
            .from('colaboradores')
            .select('dep_id');

        const conteos = {};
        colabCount?.forEach(c => {
            conteos[c.dep_id] = (conteos[c.dep_id] || 0) + 1;
        });

        if (!departamentos || departamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay departamentos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = departamentos.map(dep => `
            <tr>
                <td><strong>${dep.id_dep}</strong></td>
                <td>${dep.nombre_dep}</td>
                <td>${conteos[dep.id_dep] || 0}</td>
                <td>
                    <button class="btn btn-small btn-outline" onclick="editDepartamento(${dep.id_dep})">
                        Editar
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteDepartamento(${dep.id_dep})">
                        Eliminar
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error cargando departamentos:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Error al cargar departamentos</td></tr>';
    }
}

async function openAddDepartamentoModal() {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = 'Agregar Nuevo Departamento';
    
    modalBody.innerHTML = `
        <form id="addDepartamentoForm">
            <div class="form-group">
                <label class="form-label">Nombre del Departamento *</label>
                <input type="text" class="form-input" name="nombre_dep" required>
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
        nombre_dep: formData.get('nombre_dep')
    };
    
    try {
        const { error } = await supabaseClient
            .from('departamento')
            .insert([departamento]);
        
        if (error) throw error;
        
        showAlert('Departamento agregado exitosamente', 'success');
        closeModal();
        await loadDepartamentos();
        await loadStats();
        
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
                <input type="hidden" name="id_dep" value="${departamento.id_dep}">
                
                <div class="form-group">
                    <label class="form-label">Nombre del Departamento *</label>
                    <input type="text" class="form-input" name="nombre_dep" value="${departamento.nombre_dep || ''}" required>
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
    
    const departamentoId = formData.get('id_dep');
    const departamento = {
        nombre_dep: formData.get('nombre_dep')
    };
    
    try {
        const { error } = await supabaseClient
            .from('departamento')
            .update(departamento)
            .eq('id_dep', departamentoId);
        
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
        await loadStats();
        
    } catch (error) {
        console.error('Error eliminando departamento:', error);
        showAlert('Error al eliminar. Puede que tenga datos relacionados.', 'error');
    }
}

// === PUESTOS ===
async function loadPuestos() {
    const tbody = document.getElementById('puestosTableBody');
    
    try {
        let query = supabaseClient.from('puestos').select('*');

        if (currentFilters.departamento) {
            query = query.eq('dep_id', currentFilters.departamento);
        }

        const { data: puestos, error } = await query.order('nombre_puesto');

        if (error) throw error;

        if (!puestos || puestos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay puestos registrados</td></tr>';
            return;
        }

        const { data: departamentos } = await supabaseClient.from('departamento').select('*');
        const depMap = {};
        departamentos?.forEach(d => depMap[d.id_dep] = d.nombre_dep);

        tbody.innerHTML = puestos.map(puesto => `
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

// === FILTROS ===
async function loadDepartamentosFilter(selectId) {
    try {
        const { data: departamentos } = await supabaseClient
            .from('departamento')
            .select('*')
            .order('nombre_dep');
        
        const select = document.getElementById(selectId);
        if (select && departamentos) {
            const options = departamentos.map(dep => 
                `<option value="${dep.id_dep}">${dep.nombre_dep}</option>`
            ).join('');
            
            select.innerHTML = '<option value="">Todos los departamentos</option>' + options;
        }
    } catch (error) {
        console.error('Error cargando departamentos para filtro:', error);
    }
}

async function loadPuestosFilter(selectId) {
    try {
        const { data: puestos } = await supabaseClient
            .from('puestos')
            .select('*')
            .order('nombre_puesto');
        
        const select = document.getElementById(selectId);
        if (select && puestos) {
            const options = puestos.map(puesto => 
                `<option value="${puesto.id_puesto}">${puesto.nombre_puesto}</option>`
            ).join('');
            
            select.innerHTML = '<option value="">Todos los puestos</option>' + options;
        }
    } catch (error) {
        console.error('Error cargando puestos para filtro:', error);
    }
}

// === MODAL ===
function openModal() {
    const modal = document.getElementById('mainModal');
    modal.classList.add('active');
    document.getElementById('confirmModal').style.display = 'inline-flex';
}

function closeModal() {
    const modal = document.getElementById('mainModal');
    modal.classList.remove('active');
    document.getElementById('modalBody').innerHTML = '';
}

// === ALERTAS ===
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            ${type === 'success' ? '<path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>' : 
              type === 'error' ? '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>' :
              '<path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>'}
        </svg>
        <span>${message}</span>
    `;
    
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        alert.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

// === UTILIDADES ===
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    });
}

// === CSS ADICIONAL ===
const switchStyle = `
.switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 24px;
}

.switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
    border-radius: 24px;
}

.slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
}

input:checked + .slider {
    background-color: #10b981;
}

input:checked + .slider:before {
    transform: translateX(26px);
}

.btn-danger {
    background-color: #ef4444;
    color: white;
}

.btn-danger:hover:not(:disabled) {
    background-color: #dc2626;
}

@keyframes fadeOut {
    from {
        opacity: 1;
        transform: translateY(0);
    }
    to {
        opacity: 0;
        transform: translateY(-10px);
    }
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = switchStyle;
document.head.appendChild(styleSheet);