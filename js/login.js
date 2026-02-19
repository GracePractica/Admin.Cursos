// ============================================
// LOGIN - SISTEMA DE CAPACITACIONES
// ============================================

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
    setupForm();
    setupTogglePassword();
});

// === MOSTRAR / OCULTAR CONTRASEÑA ===
function setupTogglePassword() {
    const btn = document.getElementById('togglePassword');
    const input = document.getElementById('password');
    const eyeOpen = btn.querySelector('.eye-open');
    const eyeClosed = btn.querySelector('.eye-closed');

    btn.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        eyeOpen.style.display = isPassword ? 'none' : 'block';
        eyeClosed.style.display = isPassword ? 'block' : 'none';
    });
}

// === VALIDACIÓN ===
function validateForm(email, password) {
    let valid = true;

    clearErrors();

    if (!email) {
        showFieldError('emailError', 'El correo es obligatorio');
        document.getElementById('email').classList.add('is-error');
        valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showFieldError('emailError', 'Ingresa un correo válido');
        document.getElementById('email').classList.add('is-error');
        valid = false;
    }

    if (!password) {
        showFieldError('passwordError', 'La contraseña es obligatoria');
        document.getElementById('password').classList.add('is-error');
        valid = false;
    } else if (password.length < 6) {
        showFieldError('passwordError', 'Mínimo 6 caracteres');
        document.getElementById('password').classList.add('is-error');
        valid = false;
    }

    return valid;
}

function showFieldError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = message;
}

function clearErrors() {
    document.getElementById('emailError').textContent = '';
    document.getElementById('passwordError').textContent = '';
    document.getElementById('email').classList.remove('is-error');
    document.getElementById('password').classList.remove('is-error');
    hideAlert();
}

// === ALERTA GLOBAL ===
function showAlert(message) {
    const box = document.getElementById('alertBox');
    const msg = document.getElementById('alertMsg');
    msg.textContent = message;
    box.style.display = 'flex';
}

function hideAlert() {
    document.getElementById('alertBox').style.display = 'none';
}

// === BOTÓN - LOADING STATE ===
function setLoading(isLoading) {
    const btn = document.getElementById('submitBtn');
    const text = btn.querySelector('.btn-text');
    const spinner = document.getElementById('btnSpinner');
    const arrow = btn.querySelector('.btn-arrow');

    if (isLoading) {
        btn.disabled = true;
        text.textContent = 'Ingresando...';
        spinner.style.display = 'block';
        arrow.style.display = 'none';
    } else {
        btn.disabled = false;
        text.textContent = 'Iniciar Sesión';
        spinner.style.display = 'none';
        arrow.style.display = 'block';
    }
}

// === SUBMIT DEL FORMULARIO ===
function setupForm() {
    const form = document.getElementById('loginForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!validateForm(email, password)) return;

        setLoading(true);

        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                const msg = translateError(error.message);
                showAlert(msg);
                setLoading(false);
                return;
            }

            // ============================================
            // 🔐 VALIDAR PERFIL Y ROL
            // ============================================

            const user = data.user;

            if (!user) {
                showAlert('No se pudo obtener el usuario.');
                setLoading(false);
                return;
            }

            const { data: perfil, error: perfilError } = await window.supabaseClient
                .from('perfiles')
                .select('rol')
                .eq('id', user.id)
                .single();

            if (perfilError || !perfil) {
                showAlert('No tienes un rol asignado. Contacta al administrador.');
                await window.supabaseClient.auth.signOut();
                setLoading(false);
                return;
            }

            // Guardar datos en localStorage
            localStorage.setItem('userRole', perfil.rol);
            localStorage.setItem('userId', user.id);

            // Redirigir
            window.location.href = 'dashboard.html';

        } catch (err) {
            console.error('Error de autenticación:', err);
            showAlert('Ocurrió un error. Inténtalo de nuevo.');
            setLoading(false);
        }
    });

    // Limpiar errores al escribir
    document.getElementById('email').addEventListener('input', () => {
        document.getElementById('emailError').textContent = '';
        document.getElementById('email').classList.remove('is-error');
    });

    document.getElementById('password').addEventListener('input', () => {
        document.getElementById('passwordError').textContent = '';
        document.getElementById('password').classList.remove('is-error');
    });
}

// === TRADUCIR ERRORES DE SUPABASE ===
function translateError(message) {
    const errors = {
        'Invalid login credentials': 'Correo o contraseña incorrectos',
        'Email not confirmed': 'Debes confirmar tu correo antes de iniciar sesión',
        'User not found': 'No existe una cuenta con ese correo',
        'Too many requests': 'Demasiados intentos. Espera unos minutos',
        'Network request failed': 'Error de conexión. Revisa tu internet'
    };

    for (const [key, value] of Object.entries(errors)) {
        if (message.includes(key)) return value;
    }

    return 'Ocurrió un error al iniciar sesión';
}