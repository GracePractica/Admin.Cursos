/**
 * Shared Navigation Component - Horizontal Top Navbar
 * Provides consistent navigation across all pages
 */

function getNavigationHTML(activePage = 'dashboard') {
    return `
        <header class="top-navbar">
            <div class="navbar-container">
                <div class="navbar-brand">
                    <div class="navbar-logo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white">
                            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                        </svg>
                    </div>
                    <span class="navbar-title">Capacitaciones</span>
                </div>
                
                <nav class="navbar-nav">
                    <a href="dashboard.html" class="navbar-link ${activePage === 'dashboard' ? 'active' : ''}">
                        <svg class="navbar-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                        </svg>
                        <span>Dashboard</span>
                    </a>
                    <a href="colaboradores.html" class="navbar-link ${activePage === 'colaboradores' ? 'active' : ''}">
                        <svg class="navbar-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                        </svg>
                        <span>Colaboradores</span>
                    </a>
                    <a href="cursos.html" class="navbar-link ${activePage === 'cursos' ? 'active' : ''}">
                        <svg class="navbar-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
                        </svg>
                        <span>Cursos</span>
                    </a>
                    <a href="historial.html" class="navbar-link ${activePage === 'historial' ? 'active' : ''}">
                        <svg class="navbar-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z" />
                        </svg>
                        <span>Historial</span>
                    </a>
                    <a href="departamentos.html" class="navbar-link ${activePage === 'departamentos' ? 'active' : ''}">
                        <svg class="navbar-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2z" />
                        </svg>
                        <span>Departamentos</span>
                    </a>
                    <a href="puestos.html" class="navbar-link ${activePage === 'puestos' ? 'active' : ''}">
                        <svg class="navbar-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
                        </svg>
                        <span>Puestos</span>
                    </a>
                    <a href="gestion.html" class="navbar-link ${activePage === 'gestion' ? 'active' : ''}">
                        <svg class="navbar-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                        <span>Gestión</span>
                    </a>
                </nav>
                <div class="navbar-user">
                    <span class="navbar-user-name">Admin</span>
                    <button class="logout-btn" id="logoutBtn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 17l5-5-5-5v3H3v4h7v3zm9-12H12v2h7v10h-7v2h7c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z"/>
                        </svg>
                        <span>Salir</span>
                    </button>
                </div>

    `;
}

// Initialize navigation on page load
document.addEventListener('DOMContentLoaded', function () {
    const currentPage = document.body.dataset.page || 'dashboard';
    const navContainer = document.getElementById('navigation');

    if (navContainer) {
        navContainer.innerHTML = getNavigationHTML(currentPage);
    }
// Logout handler
    document.addEventListener('click', async function (e) {
        if (e.target.closest('#logoutBtn')) {
            if (!window.supabaseClient) return;

            const { error } = await window.supabaseClient.auth.signOut();

            if (error) {
                console.error('Error cerrando sesión:', error);
                return;
            }

            window.location.href = 'login.html';
        }
    });

    
});
