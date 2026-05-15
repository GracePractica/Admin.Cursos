// ============================================
// PANTALLA DE CURSOS FALTANTES
// ============================================

const FALTANTES_STATE = {
    activeTab: 'porColaborador',
    porColaborador: { page: 1, limit: 50, puestoId: null },
    porCurso: { page: 1, limit: 50, cursoId: null, expandedCourseId: null }
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
    setupPageSizeSelectors();
    setupSelectFilters();
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
        FALTANTES_STATE.porCurso.cursoId = value ? value : null;
        FALTANTES_STATE.porCurso.page = 1;
        renderTab2();
    });
}

function populateSelectFiltersFromData() {
    const puestoSelect = document.getElementById('puestoFilterSelect');
    const cursoSelect = document.getElementById('cursoFilterSelect');

    if (puestoSelect) {
        puestoSelect.innerHTML = '<option value="">Todos los puestos</option>' +
            FALTANTES_DATA.puestos.map(puesto =>
                `<option value="${puesto.id_puesto}">${puesto.nombre_puesto}</option>`
            ).join('');
    }

    if (cursoSelect) {
        const uniqueCourses = new Map();
        FALTANTES_DATA.rowsByCourse.forEach(row => {
            if (!uniqueCourses.has(row.cursoId)) {
                uniqueCourses.set(row.cursoId, row.curso);
            }
        });

        cursoSelect.innerHTML = '<option value="">Todos los cursos</option>' +
            Array.from(uniqueCourses.entries())
                .sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB))
                .map(([id, nombre]) =>
                    `<option value="${id}">${nombre}</option>`
                ).join('');
    }
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

        populateSelectFiltersFromData();

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
        const filterValue = String(puestoId);
        rows = rows.filter(row => String(row.puestoId) === filterValue);
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
    const { page, limit, cursoId, expandedCourseId } = FALTANTES_STATE.porCurso;
    let rows = [...FALTANTES_DATA.rowsByCourse];
    if (cursoId) {
        const filterValue = String(cursoId);
        rows = rows.filter(row => String(row.cursoId) === filterValue);
    }

    const grouped = rows.reduce((acc, row) => {
        const key = String(row.cursoId);
        if (!acc[key]) {
            acc[key] = {
                cursoId: row.cursoId,
                curso: row.curso,
                total: 0,
                puestos: []
            };
        }
        acc[key].puestos.push({ puesto: row.puesto, faltantes: row.faltantes });
        acc[key].total += Number(row.faltantes);
        return acc;
    }, {});

    const groupedCourses = Object.values(grouped).sort((a, b) => a.curso.localeCompare(b.curso));
    const totalGroups = groupedCourses.length;

    if (totalGroups === 0) {
        document.getElementById('faltantesCursoCards').innerHTML = '<div class="text-center" style="padding: 1.25rem; color: #555;">No se encontraron resultados con el filtro seleccionado.</div>';
        renderPaginationControls(0, 1, limit, 'paginationFaltantes2', 'renderTab2Page');
        return;
    }

    const startIndex = (page - 1) * limit;
    const pageGroups = groupedCourses.slice(startIndex, startIndex + limit);

    document.getElementById('faltantesCursoCards').innerHTML = pageGroups.map(group => {
        const isExpanded = String(group.cursoId) === String(expandedCourseId);
        return `
            <div style="border: 1px solid #ddd; border-radius: 12px; overflow: hidden; background: white;">
                <button type="button" onclick="toggleCourseCard('${group.cursoId}')" style="width: 100%; text-align: left; padding: 1rem 1.25rem; background: #f8f8f8; border: none; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                    <div>
                        <div style="font-weight: 600; font-size: 1rem; color: #222;">${group.curso}</div>
                        <div style="font-size: 0.9rem; color: #555; margin-top: 0.35rem;">Total: ${group.total} colaboradores • ${group.puestos.length} puestos</div>
                    </div>
                    <span style="font-size: 0.9rem; color: #777;">${isExpanded ? '−' : '+'}</span>
                </button>
                <div style="display: ${isExpanded ? 'block' : 'none'}; padding: 0 1.25rem 1.25rem;">
                    <table style="width: 100%; border-collapse: collapse; margin-top: 0.75rem;">
                        <thead>
                            <tr style="background: #f5f5f5; text-align: left;">
                                <th style="padding: 0.75rem 0.5rem; font-weight: 600;">Puesto</th>
                                <th style="padding: 0.75rem 0.5rem; font-weight: 600; text-align: right;">Faltantes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.puestos.map(puesto => `
                                <tr style="border-top: 1px solid #ececec;">
                                    <td style="padding: 0.75rem 0.5rem;">${puesto.puesto}</td>
                                    <td style="padding: 0.75rem 0.5rem; text-align: right;">${puesto.faltantes}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <button type="button" onclick="openCursoDetalleModal('${group.cursoId}')" style="margin-top: 1rem; padding: 0.65rem 1rem; border: 1px solid #0070f3; background: #fff; color: #0070f3; border-radius: 8px; cursor: pointer;">Ver en modal</button>
                </div>
            </div>
        `;
    }).join('');

    renderPaginationControls(totalGroups, page, limit, 'paginationFaltantes2', 'renderTab2Page');
}

function toggleCourseCard(cursoId) {
    const current = FALTANTES_STATE.porCurso.expandedCourseId;
    FALTANTES_STATE.porCurso.expandedCourseId = current === String(cursoId) ? null : String(cursoId);
    renderTab2();
}

function openCursoDetalleModal(cursoId) {
    const rows = FALTANTES_DATA.rowsByCourse.filter(row => String(row.cursoId) === String(cursoId));
    if (!rows.length) return;

    const cursoName = rows[0].curso;
    const total = rows.reduce((sum, row) => sum + Number(row.faltantes), 0);
    const puestosHtml = rows.map(row => `
        <tr style="border-top: 1px solid #e8e8e8;">
            <td style="padding: 0.75rem 0.5rem;">${row.puesto}</td>
            <td style="padding: 0.75rem 0.5rem; text-align: right;">${row.faltantes}</td>
        </tr>
    `).join('');

    document.getElementById('cursoModalSubtitle').textContent = `${cursoName} · Total de faltantes: ${total}`;
    document.getElementById('cursoModalContent').innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f5f5f5; text-align: left;">
                    <th style="padding: 0.75rem 0.5rem; font-weight: 600;">Puesto</th>
                    <th style="padding: 0.75rem 0.5rem; font-weight: 600; text-align: right;">Colaboradores faltantes</th>
                </tr>
            </thead>
            <tbody>
                ${puestosHtml}
            </tbody>
        </table>
    `;
    document.getElementById('cursoDetalleModal').style.display = 'flex';
}

function closeCursoDetalleModal() {
    document.getElementById('cursoDetalleModal').style.display = 'none';
}

function renderTab1Page(page) {
    FALTANTES_STATE.porColaborador.page = page;
    renderTab1();
}

function renderTab2Page(page) {
    FALTANTES_STATE.porCurso.page = page;
    renderTab2();
}
