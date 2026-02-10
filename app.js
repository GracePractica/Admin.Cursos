// ============================================
// SISTEMA DE CAPACITACIONES - JavaScript
// Integración con Supabase
// ============================================

// === CONFIGURACIÓN DE SUPABASE ===
// IMPORTANTE: Reemplaza estos valores con tus credenciales de Supabase
const SUPABASE_URL = 'https://qtozpwzcbifmelqyvvyk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0b3pwd3pjYmlmbWVscXl2dnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mzg2NDIsImV4cCI6MjA4NTExNDY0Mn0.izez0Cc9Ct1VSI3YDVkdmUoEOD3C-FYA0uJVfvO1ytQ';

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

const PAGINATION = {
    colaboradores: { page: 1, limit: 10 },
    cursos: { page: 1, limit: 10 },
    historial: { page: 1, limit: 10 },
    departamentos: { page: 1, limit: 10 },
    puestos: { page: 1, limit: 10 }
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
    // Navegación del sidebar - ya no necesita event listener 
    // porque usamos enlaces directos a páginas HTML separadas
    // Los enlaces href en nav.js funcionan normalmente

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
// Navegación ahora funciona con enlaces directos a páginas separadas
// No se necesita handleNavigation porque cada página es un archivo HTML separado
function handleNavigation(e) {
    // Permitir que el enlace funcione normalmente (no hacemos preventDefault)
    // La navegación del sidebar usa href directos a cada página .html
    return true;
}

async function loadSectionData(section) {
    switch (section) {
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
        case 'gestion-cursos':
            await loadGestionCursos();
            break;
    }
}

// === DASHBOARD ===
async function loadDashboardData() {
    try {
        await loadDataQualityStats();
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        showAlert('Error al cargar los datos del dashboard', 'error');
    }
}

async function loadDataQualityStats() {
    try {
        // 1. Get all courses
        const { data: allCursos } = await supabaseClient.from('cursos').select('id_curso');
        const totalCursos = allCursos?.length || 0;

        // 2. Potential duplicates using Levenshtein distance
        const { data: cursosForDuplicates } = await supabaseClient.from('cursos').select('id_curso, nombre_curso');
        let duplicados = 0;
        if (cursosForDuplicates) {
            const checkedPairs = new Set();
            for (let i = 0; i < cursosForDuplicates.length; i++) {
                for (let j = i + 1; j < cursosForDuplicates.length; j++) {
                    const pairKey = `${cursosForDuplicates[i].id_curso}-${cursosForDuplicates[j].id_curso}`;
                    if (!checkedPairs.has(pairKey)) {
                        const similarity = 1 - (levenshteinDistance(cursosForDuplicates[i].nombre_curso || '', cursosForDuplicates[j].nombre_curso || '') / Math.max(cursosForDuplicates[i].nombre_curso?.length || 0, cursosForDuplicates[j].nombre_curso?.length || 0));
                        if (similarity > 0.8) {
                            duplicados++;
                            checkedPairs.add(pairKey);
                            checkedPairs.add(`${cursosForDuplicates[j].id_curso}-${cursosForDuplicates[i].id_curso}`);
                        }
                    }
                }
            }
        }
        const duplicadosPct = totalCursos > 0 ? (duplicados / totalCursos) * 100 : 0;
        updateStatWithProgress('cursosDuplicados', duplicados, duplicadosPct);

        // 3. Inactive courses
        const { data: inactiveCursos } = await supabaseClient.from('cursos').select('id_curso').eq('estado', 'inactivo');
        const cursosInactivos = inactiveCursos?.length || 0;
        const inactivosPct = totalCursos > 0 ? (cursosInactivos / totalCursos) * 100 : 0;
        updateStatWithProgress('cursosInactivos', cursosInactivos, inactivosPct);

        // 4. Courses without state
        const { data: cursosWithState } = await supabaseClient.from('cursos').select('id_curso, estado');
        const cursosSinEstado = cursosWithState?.filter(c => !c.estado || c.estado === null || c.estado === '').length || 0;
        const sinEstadoPct = totalCursos > 0 ? (cursosSinEstado / totalCursos) * 100 : 0;
        updateStatWithProgress('cursosSinEstado', cursosSinEstado, sinEstadoPct);

        // 5. Collaborators without position
        const { data: allColaboradores } = await supabaseClient.from('colaboradores').select('id_colaborador, id_puesto');
        const totalColaboradores = allColaboradores?.length || 0;
        const colabSinPuesto = allColaboradores?.filter(c => !c.id_puesto || c.id_puesto === null).length || 0;
        const colabSinPuestoPct = totalColaboradores > 0 ? (colabSinPuesto / totalColaboradores) * 100 : 0;
        updateStatWithProgress('colaboradoresSinPuesto', colabSinPuesto, colabSinPuestoPct);

        // Update totals
        const totalColabElement = document.getElementById('totalColaboradores');
        if (totalColabElement) {
            totalColabElement.textContent = totalColaboradores;
        }

        // Calculate overall health score (100% - average of all problem percentages)
        const avgProblems = (duplicadosPct + inactivosPct + sinEstadoPct + colabSinPuestoPct) / 4;
        const healthScore = Math.max(0, 100 - avgProblems);

        // Update health score
        updateHealthScore(healthScore);

    } catch (error) {
        console.error('Error cargando estadísticas de calidad:', error);
    }
}

// Helper function to update stat with progress bar
function updateStatWithProgress(statName, value, percentage) {
    // Update the main value
    const valueElement = document.getElementById(statName);
    if (valueElement) {
        valueElement.textContent = value;
    }

    // Update percentage
    const pctElement = document.getElementById(`${statName}Pct`);
    if (pctElement) {
        pctElement.textContent = `${percentage.toFixed(1)}%`;
    }

    // Update progress bar
    const barElement = document.getElementById(`${statName}Bar`);
    if (barElement) {
        // Animate progress bar
        setTimeout(() => {
            barElement.style.width = `${Math.min(100, percentage)}%`;

            // Apply severity class based on percentage
            const severityClass = getSeverityClass(percentage);
            barElement.className = `progress-fill ${severityClass}`;
        }, 100);
    }
}

// Helper function to determine severity class
function getSeverityClass(percentage) {
    if (percentage <= 5) return 'severity-excellent';
    if (percentage <= 15) return 'severity-good';
    if (percentage <= 35) return 'severity-warning';
    return 'severity-critical';
}

// Levenshtein distance function for string similarity
function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[len1][len2];
}

// Helper function to update health score display
function updateHealthScore(score) {
    const scoreValue = document.getElementById('healthScoreValue');
    const scoreLabel = document.getElementById('healthScoreLabel');
    const healthCircle = document.getElementById('healthCircle');

    if (scoreValue) {
        scoreValue.textContent = `${Math.round(score)}%`;
    }

    if (scoreLabel) {
        if (score >= 90) {
            scoreLabel.textContent = 'Excelente';
        } else if (score >= 75) {
            scoreLabel.textContent = 'Muy Buena';
        } else if (score >= 60) {
            scoreLabel.textContent = 'Buena';
        } else if (score >= 40) {
            scoreLabel.textContent = 'Necesita Atención';
        } else {
            scoreLabel.textContent = 'Crítica';
        }
    }

    if (healthCircle) {
        // Animate circular progress (circumference = 2 * PI * r = 2 * 3.14159 * 70 = 439.82)
        const circumference = 440;
        const offset = circumference - (score / 100) * circumference;

        setTimeout(() => {
            healthCircle.style.strokeDashoffset = offset;
        }, 200);
    }
}

function findPossibleDuplicates(nombres) {
    const normalized = nombres.map(n => ({
        original: n,
        normalized: n.toLowerCase().replace(/[^a-z0-9]/g, '')
    }));

    const seen = new Set();
    let duplicateCount = 0;

    for (let i = 0; i < normalized.length; i++) {
        for (let j = i + 1; j < normalized.length; j++) {
            const similarity = calculateSimilarity(normalized[i].normalized, normalized[j].normalized);
            if (similarity > 0.8) {
                if (!seen.has(normalized[i].original) && !seen.has(normalized[j].original)) {
                    duplicateCount++;
                    seen.add(normalized[i].original);
                    seen.add(normalized[j].original);
                }
            }
        }
    }

    return duplicateCount;
}

function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}


// === COLABORADORES ===
async function loadColaboradores(page = 1) {
    PAGINATION.colaboradores.page = page;
    const tbody = document.getElementById('colaboradoresTableBody');

    try {
        // Check for URL filter parameter
        const urlParams = new URLSearchParams(window.location.search);
        const filter = urlParams.get('filter');

        let query = supabaseClient.from('colaboradores').select('*');

        if (currentFilters.departamento) {
            query = query.eq('dep_id', currentFilters.departamento);
        }

        if (currentFilters.puesto) {
            query = query.eq('id_puesto', currentFilters.puesto);
        }

        if (currentFilters.searchTerm) {
            query = query.or(`nombre.ilike.%${currentFilters.searchTerm}%,apellido.ilike.%${currentFilters.searchTerm}%,correo.ilike.%${currentFilters.searchTerm}%`);
        }

        const { data: allColaboradores, error } = await query.order('nombre');
        if (error) throw error;

        let colaboradores = allColaboradores || [];
        let filterMessage = '';

        // Apply URL filter
        if (filter === 'sin_puesto') {
            colaboradores = colaboradores.filter(c => !c.id_puesto || c.id_puesto === null);
            filterMessage = `Mostrando ${colaboradores.length} colaboradores sin puesto asignado`;
        }

        // Display filter message if filter is active
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
                        Asigna puestos usando el botón "Editar" →
                        <a href="colaboradores.html" style="color: inherit; text-decoration: underline; margin-left: 0.5rem;">Ver todos los colaboradores</a>
                    </div>
                </div>
            `;
            tbody.parentElement.parentElement.insertBefore(filterAlert, tbody.parentElement);
        }

        if (!colaboradores || colaboradores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No se encontraron colaboradores</td></tr>';
            renderPaginationControls(0, 1, PAGINATION.colaboradores.limit, 'paginationColaboradores', 'loadColaboradores');
            return;
        }

        // Paginación
        const startIndex = (page - 1) * PAGINATION.colaboradores.limit;
        const endIndex = startIndex + PAGINATION.colaboradores.limit;
        const paginatedColaboradores = colaboradores.slice(startIndex, endIndex);

        // Obtener departamentos y puestos
        const { data: departamentos } = await supabaseClient.from('departamentos').select('*');
        const { data: puestos } = await supabaseClient.from('puestos').select('*');

        const depMap = {};
        departamentos?.forEach(d => depMap[d.dep_id] = d.dep_nombre);
        const puestoMap = {};
        puestos?.forEach(p => puestoMap[p.id_puesto] = p.nombre_puesto);

        tbody.innerHTML = paginatedColaboradores.map(colab => `
            <tr ${filter ? 'style="background-color: #fef3c7;"' : ''}>
                <td>${colab.id_colaborador}</td>
                <td><strong>${colab.nombre} ${colab.apellido}</strong></td>
                <td>${colab.correo || 'N/A'}</td>
                <td>${depMap[colab.dep_id] || 'N/A'}</td>
                <td>${puestoMap[colab.id_puesto] || '<span style="color: #dc2626; font-weight: 600;">Sin Puesto</span>'}</td>
                <td>${colab.fecha_ingreso ? new Date(colab.fecha_ingreso).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <button class="btn btn-small btn-outline" onclick="editColaborador(${colab.id_colaborador})">
                        Editar
                    </button>
                </td>
            </tr>
        `).join('');

        renderPaginationControls(colaboradores.length, page, PAGINATION.colaboradores.limit, 'paginationColaboradores', 'loadColaboradores');

    } catch (error) {
        console.error('Error cargando colaboradores:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Error al cargar colaboradores</td></tr>';
    }
}

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

// === CURSOS ===
async function loadCursos(page = 1) {
    PAGINATION.cursos.page = page;
    const tbody = document.getElementById('cursosTableBody');

    try {
        // Check for URL filter parameter
        const urlParams = new URLSearchParams(window.location.search);
        const filter = urlParams.get('filter');

        let query = supabaseClient
            .from('cursos')
            .select('*')
            .order('id_curso');

        // Get all courses first for filtering
        const { data: allCursos, error } = await query;
        if (error) throw error;

        let cursos = allCursos || [];
        let filterMessage = '';

        // Apply filters based on URL parameter
        if (filter === 'duplicados') {
            // Find duplicate courses using Levenshtein distance
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

        // Display filter message if filter is active
        if (filterMessage) {
            // Remove any existing filter alerts first
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

        if (!cursos || cursos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No se encontraron cursos con este filtro</td></tr>';
            renderPaginationControls(0, 1, PAGINATION.cursos.limit, 'paginationCursos', 'loadCursos');
            return;
        }

        // Paginación
        const startIndex = (page - 1) * PAGINATION.cursos.limit;
        const endIndex = startIndex + PAGINATION.cursos.limit;
        const paginatedCursos = cursos.slice(startIndex, endIndex);

        // Obtener grupos de cursos
        const { data: grupos } = await supabaseClient.from('curso_grupo').select('*');
        const grupoMap = {};
        grupos?.forEach(g => grupoMap[g.id_grupo] = g.grupo_nombre);

        tbody.innerHTML = paginatedCursos.map(curso => `
            <tr ${filter ? 'style="background-color: #fffbeb;"' : ''}>
                <td>${curso.id_curso}</td>
                <td><strong>${curso.nombre_curso || 'N/A'}</strong></td>
                <td>${grupoMap[curso.grupo_curso] || 'N/A'}</td>
                <td>
                    <span class="badge badge-${curso.estado === 'activo' ? 'success' : 'danger'}">
                        ${curso.estado || 'N/A'}
                    </span>
                </td>
                <td>${curso.vigencia_anio || 'N/A'}</td>
                <td>
                    <button class="btn btn-small btn-outline" onclick="editCurso(${curso.id_curso})">
                        Editar
                    </button>
                </td>
            </tr>
        `).join('');

        renderPaginationControls(cursos.length, page, PAGINATION.cursos.limit, 'paginationCursos', 'loadCursos');

    } catch (error) {
        console.error('Error cargando cursos:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Error al cargar cursos</td></tr>';
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
    document.getElementById('cursoDepartamento').addEventListener('change', function (e) {
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
async function loadHistorial(page = 1) {
    PAGINATION.historial.page = page;
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
            renderPaginationControls(0, 1, PAGINATION.historial.limit, 'paginationHistorial', 'loadHistorial');
            return;
        }

        // Paginación
        const startIndex = (page - 1) * PAGINATION.historial.limit;
        const endIndex = startIndex + PAGINATION.historial.limit;
        const paginatedHistorial = historial.slice(startIndex, endIndex);

        // Obtener datos relacionados
        const colaboradorIds = [...new Set(paginatedHistorial.map(h => h.colaborador_id).filter(Boolean))];
        const cursoIds = [...new Set(paginatedHistorial.map(h => h.curso_id).filter(Boolean))];

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

        tbody.innerHTML = paginatedHistorial.map(item => {
            const colab = colabMap[item.colaborador_id] || {};
            return `
            <tr>
                <td><strong>${colab.nombre_colab || 'N/A'}</strong></td>
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

        renderPaginationControls(historial.length, page, PAGINATION.historial.limit, 'paginationHistorial', 'loadHistorial');

    } catch (error) {
        console.error('Error cargando historial:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Error al cargar el historial</td></tr>';
    }
}

// === DEPARTAMENTOS ===
async function loadDepartamentos(page = 1) {
    PAGINATION.departamentos.page = page;
    const tbody = document.getElementById('departamentosTableBody');

    try {
        const { data: departamentos, error } = await supabaseClient
            .from('departamento')
            .select('*')
            .order('nombre_dep'); // Mantener orden por nombre aunque no se muestre

        if (error) throw error;

        // Fetch counts (aunque no se muestren, mantenemos consistencia o eliminamos si es costoso)
        // Para esta vista simplificada, podríamos no necesitar conteos si ya no se muestran
        // Pero si "colaboradores" se refería a la columna de conteo, entonces ya no la necesitamos.

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
                    <button class="btn btn-small btn-outline" onclick="editDepartamento(${dep.id_dep})">
                        Editar
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteDepartamento(${dep.id_dep})">
                        Eliminar
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
async function loadPuestos(page = 1) {
    PAGINATION.puestos.page = page;
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

function renderPaginationControls(totalItems, currentPage, itemsPerPage, containerId, onPageChange) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const container = document.getElementById(containerId);
    if (!container) return;

    if (totalItems === 0) {
        container.innerHTML = '';
        return;
    }

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    container.innerHTML = `
        <div class="pagination-container">
            <span class="pagination-info">Mostrando ${startItem}-${endItem} de ${totalItems} registros</span>
            <div class="pagination-controls">
                <button class="btn-page" ${currentPage === 1 ? 'disabled' : ''} onclick="${onPageChange}(${currentPage - 1})">Anterior</button>
                <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.9rem;">Página ${currentPage} de ${totalPages}</div>
                <button class="btn-page" ${currentPage === totalPages ? 'disabled' : ''} onclick="${onPageChange}(${currentPage + 1})">Siguiente</button>
            </div>
        </div>
    `;
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