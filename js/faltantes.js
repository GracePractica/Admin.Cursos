// ============================================
// PANTALLA DE CURSOS FALTANTES
// ============================================

const FALTANTES_STATE = {
    activeTab: 'porColaborador',
    porColaborador: { page: 1, limit: 50, puestoId: null },
    porCurso: { page: 1, limit: 50, cursoId: null }
};

const FALTANTES_DATA = {
    rowsByCollaborator: [],
    rowsByCourse: [],
    puestos: [],
    cursos: []
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('faltantesTableBody') || document.getElementById('faltantesCursoTableBody')) {
        initFaltantesPage();
    }
});

async function initFaltantesPage() {
    setupTabNavigation();
    setupAutocompleteFilters();
    setupPageSizeSelectors();
    await loadFaltantesData();
}

function setupTabNavigation() {
    const buttons = Array.from(document.querySelectorAll('.tab-button'));
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const selectedTab = button.dataset.tab;
            if (!selectedTab || selectedTab === FALTANTES_STATE.activeTab) return;
            FALTANTES_STATE.activeTab = selectedTab;
            buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === selectedTab));
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.toggle('active', tab.id === `tab${selectedTab.charAt(0).toUpperCase()}${selectedTab.slice(1)}`);
            });
            renderCurrentTab();
        });
    });
}

function setupPageSizeSelectors() {
    document.getElementById('tab1PageSize')?.addEventListener('change', (e) => {
        FALTANTES_STATE.porColaborador.limit = Number(e.target.value);
        FALTANTES_STATE.porColaborador.page = 1;
        renderTab1();
    });

    document.getElementById('tab2PageSize')?.addEventListener('change', (e) => {
        FALTANTES_STATE.porCurso.limit = Number(e.target.value);
        FALTANTES_STATE.porCurso.page = 1;
        renderTab2();
    });

    // document.getElementById('resetFiltersTab1')?.addEventListener('click', () => {
    //     document.getElementById('puestoFilterInput').value = '';
    //     document.getElementById('puestoFilterId').value = '';
    //     document.getElementById('clearPuestoFilter').style.display = 'none';
    //     FALTANTES_STATE.porColaborador.puestoId = null;
    //     FALTANTES_STATE.porColaborador.page = 1;
    //     renderTab1();
    // });

    // document.getElementById('resetFiltersTab2')?.addEventListener('click', () => {
    //     document.getElementById('cursoFilterInput').value = '';
    //     document.getElementById('cursoFilterId').value = '';
    //     document.getElementById('clearCursoFilter').style.display = 'none';
    //     FALTANTES_STATE.porCurso.cursoId = null;
    //     FALTANTES_STATE.porCurso.page = 1;
    //     renderTab2();
    // });
}

function setupAutocompleteFilters() {
    const puestoInput = document.getElementById('puestoFilterInput');
    const puestoResults = document.getElementById('puestoFilterResults');
    const puestoIdInput = document.getElementById('puestoFilterId');
    const clearPuesto = document.getElementById('clearPuestoFilter');

    const cursoInput = document.getElementById('cursoFilterInput');
    const cursoResults = document.getElementById('cursoFilterResults');
    const cursoIdInput = document.getElementById('cursoFilterId');
    const clearCurso = document.getElementById('clearCursoFilter');

    const updatePuestoSuggestions = () => {
        const term = puestoInput.value.trim().toLowerCase();
        const results = FALTANTES_DATA.puestos.filter(p => p.nombre_puesto.toLowerCase().includes(term));
        renderAutocompleteList(results, puestoResults, (item) => {
            puestoInput.value = item.nombre_puesto;
            puestoIdInput.value = item.id_puesto;
            FALTANTES_STATE.porColaborador.puestoId = item.id_puesto;
            FALTANTES_STATE.porColaborador.page = 1;
            clearPuesto.style.display = 'inline-flex';
            puestoResults.style.display = 'none';
            renderTab1();
        });
    };

    const updateCursoSuggestions = () => {
        const term = cursoInput.value.trim().toLowerCase();
        const results = FALTANTES_DATA.cursos.filter(c => c.nombre_curso.toLowerCase().includes(term));
        renderAutocompleteList(results, cursoResults, (item) => {
            cursoInput.value = item.nombre_curso;
            cursoIdInput.value = item.id_curso;
            FALTANTES_STATE.porCurso.cursoId = item.id_curso;
            FALTANTES_STATE.porCurso.page = 1;
            clearCurso.style.display = 'inline-flex';
            cursoResults.style.display = 'none';
            renderTab2();
        });
    };

    puestoInput?.addEventListener('input', () => {
        if (!puestoInput.value.trim()) {
            FALTANTES_STATE.porColaborador.puestoId = null;
            puestoIdInput.value = '';
            clearPuesto.style.display = 'none';
            FALTANTES_STATE.porColaborador.page = 1;
            renderTab1();
            puestoResults.style.display = 'none';
            return;
        }
        FALTANTES_STATE.porColaborador.puestoId = null;
        puestoIdInput.value = '';
        clearPuesto.style.display = 'inline-flex';
        updatePuestoSuggestions();
    });

    puestoInput?.addEventListener('focus', () => {
        if (!puestoInput.value) {
            renderAutocompleteList(FALTANTES_DATA.puestos.slice(0, 50), puestoResults, (item) => {
                puestoInput.value = item.nombre_puesto;
                puestoIdInput.value = item.id_puesto;
                FALTANTES_STATE.porColaborador.puestoId = item.id_puesto;
                FALTANTES_STATE.porColaborador.page = 1;
                clearPuesto.style.display = 'inline-flex';
                puestoResults.style.display = 'none';
                renderTab1();
            });
        }
    });

    clearPuesto?.addEventListener('click', () => {
        puestoInput.value = '';
        puestoIdInput.value = '';
        FALTANTES_STATE.porColaborador.puestoId = null;
        clearPuesto.style.display = 'none';
        renderTab1();
    });

    cursoInput?.addEventListener('input', () => {
        if (!cursoInput.value.trim()) {
            FALTANTES_STATE.porCurso.cursoId = null;
            cursoIdInput.value = '';
            clearCurso.style.display = 'none';
            FALTANTES_STATE.porCurso.page = 1;
            renderTab2();
            cursoResults.style.display = 'none';
            return;
        }
        FALTANTES_STATE.porCurso.cursoId = null;
        cursoIdInput.value = '';
        clearCurso.style.display = cursoInput.value ? 'inline-flex' : 'none';
        updateCursoSuggestions();
    });

    cursoInput?.addEventListener('focus', () => {
        if (!cursoInput.value) {
            renderAutocompleteList(FALTANTES_DATA.cursos.slice(0, 50), cursoResults, (item) => {
                cursoInput.value = item.nombre_curso;
                cursoIdInput.value = item.id_curso;
                FALTANTES_STATE.porCurso.cursoId = item.id_curso;
                FALTANTES_STATE.porCurso.page = 1;
                clearCurso.style.display = 'inline-flex';
                cursoResults.style.display = 'none';
                renderTab2();
            });
        }
    });

    clearCurso?.addEventListener('click', () => {
        cursoInput.value = '';
        cursoIdInput.value = '';
        FALTANTES_STATE.porCurso.cursoId = null;
        clearCurso.style.display = 'none';
        renderTab2();
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('#puestoFilterInput') && !event.target.closest('#puestoFilterResults')) {
            puestoResults.style.display = 'none';
        }
        if (!event.target.closest('#cursoFilterInput') && !event.target.closest('#cursoFilterResults')) {
            cursoResults.style.display = 'none';
        }
    });
}

function renderAutocompleteList(items, container, onSelect) {
    container.innerHTML = '';
    if (!items || items.length === 0) {
        container.innerHTML = '<div class="dropdown-item no-results">No se encontraron coincidencias</div>';
        container.style.display = 'block';
        return;
    }
    items.slice(0, 20).forEach(item => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.textContent = item.nombre_puesto || item.nombre_curso;
        div.addEventListener('click', () => onSelect(item));
        container.appendChild(div);
    });
    container.style.display = 'block';
}

async function loadFaltantesData() {
    const loading = document.getElementById('faltantesLoading');
    loading.style.display = 'block';
    try {
        const { rowsByCollaborator, puestos, cursos } = await fetchMissingCoursesRows();
        FALTANTES_DATA.puestos = puestos;
        FALTANTES_DATA.cursos = cursos;
        FALTANTES_DATA.rowsByCollaborator = rowsByCollaborator;
        FALTANTES_DATA.rowsByCourse = buildMissingCoursesByCourse(rowsByCollaborator);

        console.log(`Total registros cargados: ${FALTANTES_DATA.rowsByCollaborator.length}`);
        renderCurrentTab();
    } catch (error) {
        console.error('Error cargando datos faltantes:', error);
        showAlert('No se pudieron cargar los datos de cursos faltantes', 'error');
    } finally {
        document.getElementById('faltantesLoading').style.display = 'none';
    }
}

function buildMissingCoursesByCourse(rows) {
    const grouped = new Map();
    rows.forEach(row => {
        const key = `${row.cursoId}-${row.puestoId}`;
        if (!grouped.has(key)) {
            grouped.set(key, {
                cursoId: row.cursoId,
                curso: row.curso,
                puestoId: row.puestoId,
                puesto: row.puesto,
                faltantes: 0
            });
        }
        grouped.get(key).faltantes += 1;
    });

    return Array.from(grouped.values()).sort((a, b) => {
        const cursoCompare = a.curso.localeCompare(b.curso);
        if (cursoCompare !== 0) return cursoCompare;
        return a.puesto.localeCompare(b.puesto);
    });
}

function renderCurrentTab() {
    if (FALTANTES_STATE.activeTab === 'porCurso') {
        renderTab2();
    } else {
        renderTab1();
    }
}

function renderTab1() {
    const { page, limit, puestoId } = FALTANTES_STATE.porColaborador;
    let rows = [...FALTANTES_DATA.rowsByCollaborator];
    if (puestoId) {
        rows = rows.filter(row => row.puestoId === Number(puestoId));
    }
    const totalRows = rows.length;
    if (totalRows === 0) {
        document.getElementById('faltantesTableBody').innerHTML = '<tr><td colspan="3" class="text-center">No se encontraron cursos faltantes con el filtro seleccionado.</td></tr>';
        renderPaginationControls(0, 1, limit, 'paginationFaltantes1', 'renderTab1Page');
        return;
    }
    const startIndex = (page - 1) * limit;
    const pageRows = rows.slice(startIndex, startIndex + limit);
    const html = pageRows.map(row => `
        <tr>
            <td style="white-space: nowrap;">${row.colaborador}</td>
            <td style="white-space: nowrap;">${row.puesto}</td>
            <td>${row.curso}</td>
        </tr>
    `).join('');
    document.getElementById('faltantesTableBody').innerHTML = html;
    renderPaginationControls(totalRows, page, limit, 'paginationFaltantes1', 'renderTab1Page');
}

function renderTab2() {
    const { page, limit, cursoId } = FALTANTES_STATE.porCurso;
    let rows = [...FALTANTES_DATA.rowsByCourse];
    if (cursoId) {
        rows = rows.filter(row => row.cursoId === Number(cursoId));
    }
    const totalRows = rows.length;
    if (totalRows === 0) {
        document.getElementById('faltantesCursoTableBody').innerHTML = '<tr><td colspan="3" class="text-center">No se encontraron resultados con el filtro seleccionado.</td></tr>';
        renderPaginationControls(0, 1, limit, 'paginationFaltantes2', 'renderTab2Page');
        return;
    }
    const startIndex = (page - 1) * limit;
    const pageRows = rows.slice(startIndex, startIndex + limit);
    document.getElementById('faltantesCursoTableBody').innerHTML = pageRows.map(row => `
        <tr>
            <td>${row.curso}</td>
            <td>${row.puesto}</td>
            <td>${row.faltantes}</td>
        </tr>
    `).join('');
    renderPaginationControls(totalRows, page, limit, 'paginationFaltantes2', 'renderTab2Page');
}

function renderTab1Page(page) {
    FALTANTES_STATE.porColaborador.page = page;
    renderTab1();
}

function renderTab2Page(page) {
    FALTANTES_STATE.porCurso.page = page;
    renderTab2();
}
