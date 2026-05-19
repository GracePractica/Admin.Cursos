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
        const { rowsByCollaborator, puestos, cursos, courseTotals } = await fetchMissingCoursesRows();
        FALTANTES_DATA.puestos = puestos;
        FALTANTES_DATA.cursos = cursos;
        FALTANTES_DATA.rowsByCollaborator = rowsByCollaborator;
        FALTANTES_DATA.courseTotals = courseTotals || { perCoursePuesto: {}, perCourseTotal: {} };
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
                    faltantes: 0,
                    colaboradoresDetalle: []
                });
            }
            grouped.get(key).faltantes += 1;
            grouped.get(key).colaboradoresDetalle.push({
                id_colab: row.colaboradorId,
                nombre_colab: row.colaborador,
                dep_id: row.depId
            });
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

    // Calcular porcentaje general sobre los rows filtrados
    let totalRequired = 0;
    let totalCompleted = 0;
    rows.forEach(r => {
        const req = Number(r.totalCursosMatriz) || 0;
        const falt = Number(r.cursosFaltantesCount) || 0;
        totalRequired += req;
        totalCompleted += Math.max(0, req - falt);
    });

    const overallPct = totalRequired > 0 ? (totalCompleted / totalRequired) * 100 : null;
    const overallEl = document.getElementById('faltantesGeneralPct');
    if (overallEl) {
        overallEl.textContent = overallPct == null ? '--%' : `${overallPct.toFixed(1)}%`;
    }

    const html = pageRows.map((row, index) => {
        const rowId = `row_${page}_${index}`;
        // Store the row data globally for the modal
        window.faltantesRowData = window.faltantesRowData || {};
        window.faltantesRowData[rowId] = row;
        // Porcentaje por colaborador
        const total = Number(row.totalCursosMatriz) || 0;
        const falt = Number(row.cursosFaltantesCount) || 0;
        const completed = Math.max(0, total - falt);
        const pctText = total > 0 ? `${((completed / total) * 100).toFixed(1)}%` : '-';

        return `
            <tr>
                <td style="white-space: nowrap;">${row.colaborador}</td>
                <td style="white-space: nowrap;">${row.puesto}</td>
                <td style="text-align: center;">${row.totalCursosMatriz}</td>
                <td style="text-align: center;">${row.cursosFaltantesCount}</td>
                <td style="text-align: center; font-weight:700; color:#10b981;">${pctText}</td>
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
        document.body.style.overflow = 'hidden';
        console.log('Modal should be visible now');
    } catch (error) {
        console.error('Error abriendo modal:', error);
    }
}

function closeCursosModal() {
    const modal = document.getElementById('cursosModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
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
        acc[key].puestos.push({ puesto: row.puesto, faltantes: row.faltantes, puestoId: row.puestoId, colaboradoresDetalle: row.colaboradoresDetalle || [] });
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
        // Totales asignados para este curso
        const totalAssigned = (FALTANTES_DATA.courseTotals && FALTANTES_DATA.courseTotals.perCourseTotal && FALTANTES_DATA.courseTotals.perCourseTotal[group.cursoId]) || 0;
        const totalFaltantes = Number(group.total) || 0;
        const totalCompleted = Math.max(0, totalAssigned - totalFaltantes);
        const overallPct = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : null;
        return `
            <div style="border: 1px solid #ddd; border-radius: 12px; overflow: hidden; background: white;">
                <button type="button" onclick="toggleCourseCard('${group.cursoId}')" style="width: 100%; text-align: left; padding: 1rem 1.25rem; background: #f8f8f8; border: none; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                    <div>
                        <div style="font-weight: 600; font-size: 1rem; color: #222;">${group.curso}</div>
                        <div style="font-size: 0.9rem; color: #555; margin-top: 0.35rem;">Total faltantes: ${group.total} colaboradores • ${group.puestos.length} puestos</div>
                        <div style="font-size: 0.9rem; color: ${overallPct != null && overallPct < 50 ? '#ef4444' : '#10b981'}; margin-top: 0.25rem; font-weight:700;">${overallPct == null ? '--%' : overallPct.toFixed(1) + '% completado'}</div>
                    </div>
                    <span style="font-size: 0.9rem; color: #777;">${isExpanded ? '−' : '+'}</span>
                </button>
                <div style="display: ${isExpanded ? 'block' : 'none'}; padding: 0 1.25rem 1.25rem;">
                    <table style="width: 100%; border-collapse: collapse; margin-top: 0.75rem;">
                        <thead>
                            <tr style="background: #f5f5f5; text-align: left;">
                                <th style="padding: 0.75rem 0.5rem; font-weight: 600;">Puesto</th>
                                <th style="padding: 0.75rem 0.5rem; font-weight: 600; text-align: right;">Faltantes</th>
                                <th style="padding: 0.75rem 0.5rem; font-weight: 600; text-align: right;">Asignados</th>
                                <th style="padding: 0.75rem 0.5rem; font-weight: 600; text-align: center;">% Completado</th>
                                <th style="padding: 0.75rem 0.5rem; font-weight: 600; text-align: center;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.puestos.map(puesto => `
                                <tr style="border-top: 1px solid #ececec;">
                                    <td style="padding: 0.75rem 0.5rem;">${puesto.puesto}</td>
                                    <td style="padding: 0.75rem 0.5rem; text-align: right;">${puesto.faltantes}</td>
                                    <td style="padding: 0.75rem 0.5rem; text-align: right;">
                                        ${(FALTANTES_DATA.courseTotals && FALTANTES_DATA.courseTotals.perCoursePuesto && FALTANTES_DATA.courseTotals.perCoursePuesto[group.cursoId] && (FALTANTES_DATA.courseTotals.perCoursePuesto[group.cursoId][puesto.puestoId] || 0)) || 0}
                                    </td>
                                    <td style="padding: 0.75rem 0.5rem; text-align: center; font-weight:700; color:#10b981;">${(() => {
                                        const assigned = (FALTANTES_DATA.courseTotals && FALTANTES_DATA.courseTotals.perCoursePuesto && FALTANTES_DATA.courseTotals.perCoursePuesto[group.cursoId] && (FALTANTES_DATA.courseTotals.perCoursePuesto[group.cursoId][puesto.puestoId] || 0)) || 0;
                                        const falt = Number(puesto.faltantes) || 0;
                                        const comp = Math.max(0, assigned - falt);
                                        return assigned > 0 ? ( (comp / assigned) * 100 ).toFixed(1) + '%' : '-';
                                    })()}</td>
                                    <td style="padding: 0.75rem 0.5rem; text-align: center;">
                                        <button class="btn btn-outline" style="padding: 0.35rem 0.6rem; font-size: 0.8rem;" onclick="openCourseCollaboratorsModal('${group.cursoId}','${puesto.puestoId}')">Ver colaboradores</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
    `
    }).join('');
    
    renderPaginationControls(totalGroups, page, limit, 'paginationFaltantes2', 'renderTab2Page');
}

function toggleCourseCard(cursoId) {
    const current = FALTANTES_STATE.porCurso.expandedCourseId;
    FALTANTES_STATE.porCurso.expandedCourseId = current === String(cursoId) ? null : String(cursoId);
    renderTab2();
}

function openCourseCollaboratorsModal(cursoId, puestoId) {
    const modal = document.getElementById('cursoDetalleModal');
    if (!modal) return;

    // Buscar en los datos agrupados la entrada correspondiente
    const match = FALTANTES_DATA.rowsByCourse.find(r => String(r.cursoId) === String(cursoId) && String(r.puestoId) === String(puestoId));
    const colaboradores = (match && match.colaboradoresDetalle) ? match.colaboradoresDetalle : [];

    document.getElementById('cursoDetalleCurso').textContent = match ? match.curso : '';
    document.getElementById('cursoDetallePuesto').textContent = match ? match.puesto : '';

    // Calcular porcentaje para el puesto seleccionado
    const assigned = (FALTANTES_DATA.courseTotals && FALTANTES_DATA.courseTotals.perCoursePuesto && FALTANTES_DATA.courseTotals.perCoursePuesto[cursoId] && (FALTANTES_DATA.courseTotals.perCoursePuesto[cursoId][puestoId] || 0)) || 0;
    const faltantesCount = colaboradores.length || 0;
    const completed = Math.max(0, assigned - faltantesCount);
    const pctText = assigned > 0 ? `${((completed / assigned) * 100).toFixed(1)}%` : '--%';

    // Mostrar porcentaje en el modal (insertar o actualizar el elemento)
    let pctEl = document.getElementById('cursoDetallePuestoPct');
    if (!pctEl) {
        const container = document.querySelector('#cursoDetalleModal .padding-pct') || document.getElementById('cursoDetallePuesto').parentElement;
        pctEl = document.createElement('div');
        pctEl.id = 'cursoDetallePuestoPct';
        pctEl.style.fontWeight = '800';
        pctEl.style.color = '#10b981';
        pctEl.style.marginTop = '4px';
        document.getElementById('cursoDetallePuesto').parentElement.appendChild(pctEl);
    }
    pctEl.textContent = `Completado puesto: ${pctText} (${completed}/${assigned})`;

    const listHtml = colaboradores.length > 0 ? colaboradores
        .sort((a, b) => a.nombre_colab.localeCompare(b.nombre_colab))
        .map(c => {
            const depText = c.dep_id != null ? `Dep ID: ${c.dep_id}` : 'Dep ID: -';
            return `<div style="padding: 0.5rem; border-bottom: 1px solid #f0f0f0;">• <strong>${c.id_colab}</strong> - ${c.nombre_colab} <span style="color: #666; font-size: 0.88rem;">(${depText})</span></div>`;
        }).join('')
        : '<p>No hay colaboradores faltantes para este puesto.</p>';

    document.getElementById('cursoDetalleList').innerHTML = listHtml;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeCursoDetalleModal() {
    document.getElementById('cursoDetalleModal').style.display = 'none';
    document.body.style.overflow = '';
}

function renderTab1Page(page) {
    FALTANTES_STATE.porColaborador.page = page;
    renderTab1();
}

function renderTab2Page(page) {
    FALTANTES_STATE.porCurso.page = page;
    renderTab2();
}
