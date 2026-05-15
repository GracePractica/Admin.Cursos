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
    setupSelectFilters();
    setupPageSizeSelectors();
    await loadFilterOptions();
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
}

function setupSelectFilters() {
    const puestoSelect = document.getElementById('puestoFilterSelect');
    const cursoSelect = document.getElementById('cursoFilterSelect');

    puestoSelect?.addEventListener('change', (e) => {
        const value = e.target.value;
        FALTANTES_STATE.porColaborador.puestoId = value ? Number(value) : null;
        FALTANTES_STATE.porColaborador.page = 1;
        renderTab1();
    });

    cursoSelect?.addEventListener('change', (e) => {
        const value = e.target.value;
        FALTANTES_STATE.porCurso.cursoId = value ? Number(value) : null;
        FALTANTES_STATE.porCurso.page = 1;
        renderTab2();
    });
}

async function loadFilterOptions() {
    await Promise.all([
        loadPuestosFilter('puestoFilterSelect'),
        loadCursosFilter('cursoFilterSelect')
    ]);
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
        (row.cursosFaltantesDetalle || []).forEach(curso => {
            const key = `${curso.id_curso}-${row.puestoId}`;
            if (!grouped.has(key)) {
                grouped.set(key, {
                    cursoId: curso.id_curso,
                    curso: curso.nombre_curso,
                    puestoId: row.puestoId,
                    puesto: row.puesto,
                    faltantes: 0
                });
            }
            grouped.get(key).faltantes += 1;
        });
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
        document.getElementById('faltantesTableBody').innerHTML = '<tr><td colspan="5" class="text-center">No se encontraron cursos faltantes con el filtro seleccionado.</td></tr>';
        renderPaginationControls(0, 1, limit, 'paginationFaltantes1', 'renderTab1Page');
        return;
    }
    const startIndex = (page - 1) * limit;
    const pageRows = rows.slice(startIndex, startIndex + limit);
    const html = pageRows.map((row, index) => {
        const rowId = `row_${page}_${index}`;
        // Store the row data globally for the modal
        window.faltantesRowData = window.faltantesRowData || {};
        window.faltantesRowData[rowId] = row;
        return `
            <tr>
                <td style="white-space: nowrap;">${row.colaborador}</td>
                <td style="white-space: nowrap;">${row.puesto}</td>
                <td style="text-align: center;">${row.totalCursosMatriz}</td>
                <td style="text-align: center;">${row.cursosFaltantesCount}</td>
                <td style="text-align: center;">
                    <button class="btn btn-outline" style="padding: 0.4rem 1rem; font-size: 0.85rem;" onclick="openCursosModal('${rowId}')">Ver</button>
                </td>
            </tr>
        `;
    }).join('');
    document.getElementById('faltantesTableBody').innerHTML = html;
    renderPaginationControls(totalRows, page, limit, 'paginationFaltantes1', 'renderTab1Page');
}

function openCursosModal(rowId) {
    console.log('openCursosModal called with rowId:', rowId);
    try {
        const row = window.faltantesRowData[rowId];
        console.log('Retrieved row:', row);
        if (!row) {
            console.error('No row data found for id:', rowId);
            return;
        }
        const modal = document.getElementById('cursosModal');
        console.log('Modal element:', modal);
        document.getElementById('cursosModalColaborador').textContent = row.colaborador;
        document.getElementById('cursosModalPuesto').textContent = row.puesto;
        document.getElementById('cursosModalTotal').textContent = row.totalCursosMatriz;
        document.getElementById('cursosModalFaltantes').textContent = row.cursosFaltantesCount;

        const cursosList = (row.cursosFaltantesDetalle || [])
            .map(c => `<div style="padding: 0.5rem; border-bottom: 1px solid #f0f0f0;">• ${c.nombre_curso}</div>`)
            .join('');
        document.getElementById('cursosModalList').innerHTML = cursosList || '<p>No hay cursos faltantes</p>';

        modal.style.display = 'flex';
        console.log('Modal should be visible now');
    } catch (error) {
        console.error('Error abriendo modal:', error);
    }
}

function closeCursosModal() {
    const modal = document.getElementById('cursosModal');
    modal.style.display = 'none';
}

// Close modal when clicking outside
document.addEventListener('click', (event) => {
    const modal = document.getElementById('cursosModal');
    if (modal && modal.style.display === 'flex' && event.target === modal) {
        closeCursosModal();
    }
});

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
