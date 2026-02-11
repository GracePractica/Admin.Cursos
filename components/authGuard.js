document.addEventListener('DOMContentLoaded', async () => {

    if (!window.supabaseClient) {
        console.error('Supabase no está inicializado');
        return;
    }

    const { data: { session }, error } = await window.supabaseClient.auth.getSession();

    if (error) {
        console.error('Error verificando sesión:', error);
        return;
    }

    if (!session) {
        // Si NO hay sesión → enviar al login
        window.location.href = 'login.html';
    }

});
