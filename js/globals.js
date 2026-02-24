// ============================================
// ESTADO GLOBAL Y UTILIDADES
// ============================================

let currentSection = 'dashboard';
let currentFilters = {
    departamento: '',
    asignacion: '',
    puesto: '',
    clasificacion: '',
    estado: '',
    searchTerm: ''
};

const PAGINATION = {
    colaboradores: { page: 1, limit: 10 },
    cursos: { page: 1, limit: 10 },
    historial: { page: 1, limit: 10 },
    departamentos: { page: 1, limit: 10 },
    puestos: { page: 1, limit: 10 }
};

// === UTILIDADES ===

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');

    // Si no existe el contenedor, lo creamos (fallback)
    if (!alertContainer) {
        const tempContainer = document.createElement('div');
        tempContainer.id = 'alertContainer';
        tempContainer.style.position = 'fixed';
        tempContainer.style.top = '20px';
        tempContainer.style.right = '20px';
        tempContainer.style.zIndex = '9999';
        document.body.appendChild(tempContainer);
        return showAlert(message, type);
    }

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

function openModal(modalId = 'mainModal') {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        const confirmBtn = document.getElementById('confirmModal');
        if (confirmBtn) confirmBtn.style.display = 'inline-flex';
    }
}

function closeModal(modalId = 'mainModal') {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        const modalBody = document.getElementById('modalBody');
        if (modalBody) modalBody.innerHTML = '';

        // Restablecer el estado del botón de confirmación por si acaso
        const confirmBtn = document.getElementById('confirmModal');
        if (confirmBtn) {
            confirmBtn.style.display = 'inline-flex';
            confirmBtn.onclick = null; // Limpiar manejadores de eventos anteriores
        }
    }
}

function setupModalListeners() {
    // Botón de cerrar (x)
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => closeModal());
    });

    // Botón de cancelar
    document.getElementById('cancelModal')?.addEventListener('click', () => closeModal());

    // Clic fuera del modal
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('mainModal');
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Inicializar escuchas globales
document.addEventListener('DOMContentLoaded', () => {
    setupModalListeners();
});

// === TOM SELECT HELPERS ===
window.tomSelectInstances = window.tomSelectInstances || {};

function initTomSelect(selectSelector, options = {}, initialValues = []) {
    const el = document.querySelector(selectSelector);
    if (!el) return null;

    const key = selectSelector;
    // destruir instancia previa si existe
    if (window.tomSelectInstances[key]) {
        try { window.tomSelectInstances[key].destroy(); } catch (e) { /* ignore */ }
        delete window.tomSelectInstances[key];
    }

    if (!window.TomSelect) return null;

    const defaultOpts = Object.assign({
        plugins: ['remove_button'],
        create: false,
        maxItems: null,
        persist: false,
        allowEmptyOption: true
    }, options || {});

    const instance = new TomSelect(selectSelector, defaultOpts);
    window.tomSelectInstances[key] = instance;

    if (initialValues && initialValues.length) {
        try { instance.setValue(initialValues); } catch (e) { /* ignore */ }
    }

    return instance;
}

function getTomSelectValue(selectSelector) {
    const inst = window.tomSelectInstances[selectSelector];
    if (inst) return inst.getValue();
    const el = document.querySelector(selectSelector);
    if (!el) return [];
    return Array.from(el.selectedOptions).map(opt => opt.value);
}

function destroyTomSelect(selectSelector) {
    const inst = window.tomSelectInstances[selectSelector];
    if (inst) {
        try { inst.destroy(); } catch (e) { /* ignore */ }
        delete window.tomSelectInstances[selectSelector];
    }
}


// Función auxiliar para actualizar estadística con barra de progreso
function updateStatWithProgress(statName, value, percentage) {
    // Actualizar el valor principal
    const valueElement = document.getElementById(statName);
    if (valueElement) {
        valueElement.textContent = value;
    }

    // Actualizar porcentaje
    const pctElement = document.getElementById(`${statName}Pct`);
    if (pctElement) {
        pctElement.textContent = `${percentage.toFixed(1)}%`;
    }

    // Actualizar barra de progreso
    const barElement = document.getElementById(`${statName}Bar`);
    if (barElement) {
        // Animar barra de progreso
        setTimeout(() => {
            barElement.style.width = `${Math.min(100, percentage)}%`;

            // Aplicar clase de severidad basada en el porcentaje
            const severityClass = getSeverityClass(percentage);
            barElement.className = `progress-fill ${severityClass}`;
        }, 100);
    }
}

// Función auxiliar para determinar la clase de severidad
function getSeverityClass(percentage) {
    if (percentage <= 5) return 'severity-excellent';
    if (percentage <= 15) return 'severity-good';
    if (percentage <= 35) return 'severity-warning';
    return 'severity-critical';
}

// Función de distancia de Levenshtein para similitud de cadenas
function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    // Inicializar matriz
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    // Llenar matriz
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // sustitución
                    matrix[i][j - 1] + 1,     // inserción
                    matrix[i - 1][j] + 1      // eliminación
                );
            }
        }
    }

    return matrix[len1][len2];
}

function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

// Función auxiliar para actualizar la visualización del puntaje de salud
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
        // Animar progreso circular
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

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    // Si es una cadena de fecha simple AAAA-MM-DD, dividirla para evitar problemas de zona horaria
    if (dateString.length === 10 && dateString.includes('-')) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Panama'
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

    // Ajustar llamada onPageChange para manejar tanto nombres de funciones como llamadas a funciones
    let prevCall, nextCall;
    if (onPageChange.includes('(')) {
        prevCall = onPageChange.replace(')', `, ${currentPage - 1})`);
        nextCall = onPageChange.replace(')', `, ${currentPage + 1})`);
    } else {
        prevCall = `${onPageChange}(${currentPage - 1})`;
        nextCall = `${onPageChange}(${currentPage + 1})`;
    }

    container.innerHTML = `
        <div class="pagination-container">
            <span class="pagination-info">Mostrando ${startItem}-${endItem} de ${totalItems} registros</span>
            <div class="pagination-controls">
                <button class="btn-page" ${currentPage === 1 ? 'disabled' : ''} onclick="${prevCall}">Anterior</button>
                <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.9rem;">Página ${currentPage} de ${totalPages}</div>
                <button class="btn-page" ${currentPage === totalPages ? 'disabled' : ''} onclick="${nextCall}">Siguiente</button>
            </div>
        </div>
    `;
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
