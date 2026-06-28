// ============================================================
// 1. IMPORTAR MÓDULOS DE FIREBASE
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Configuración de Firebase (misma que en los otros archivos)
const firebaseConfig = {
  apiKey: "AIzaSyCZwssYsjLjBXiiE5_lBNPYICU3MLgJR08",
  authDomain: "bin1-462ea.firebaseapp.com",
  projectId: "bin1-462ea",
  storageBucket: "bin1-462ea.firebasestorage.app",
  messagingSenderId: "446700825873",
  appId: "1:446700825873:web:2550025dfc6610b8a2b0b0"
};

// Inicializar
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

console.log('✅ Firebase Auth inicializado para login.');

// ============================================================
// 2. ESPERAR DOM
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const errorDiv = document.getElementById('form-error');
    const successDiv = document.getElementById('form-success');

    // Verificar si los elementos existen (debug)
    if (!form || !emailInput || !passwordInput || !loginBtn) {
        console.error('❌ No se encontraron todos los elementos del formulario.');
        return;
    }

    // --- Si el usuario ya está autenticado, redirigir al index ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('ℹ️ Usuario ya autenticado, redirigiendo...');
            window.location.href = '../index.html'; // CORREGIDO
        }
    });

    // --- Envío del formulario ---
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        errorDiv.textContent = '';
        successDiv.textContent = '';
        loginBtn.disabled = true;
        loginBtn.textContent = '⏳ ENTRANDO...';

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            errorDiv.textContent = '⚠️ Todos los campos son obligatorios.';
            loginBtn.disabled = false;
            loginBtn.textContent = 'ENTRAR';
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log(`✅ Usuario autenticado: ${user.uid}`);

            successDiv.textContent = '¡Sesión iniciada correctamente! Redirigiendo...';
            loginBtn.disabled = true;
            loginBtn.textContent = '✓ ENTRADO';

            // Redirigir al feed (ruta relativa desde pages/)
            setTimeout(() => {
                window.location.href = '../index.html'; // CORREGIDO
            }, 1500);

        } catch (error) {
            console.error('❌ Error al iniciar sesión:', error);
            let msg = 'Error desconocido.';
            switch (error.code) {
                case 'auth/user-not-found':
                    msg = '❌ No hay cuenta con este correo.';
                    break;
                case 'auth/wrong-password':
                    msg = '❌ Contraseña incorrecta.';
                    break;
                case 'auth/too-many-requests':
                    msg = '⛔ Demasiados intentos fallidos. Intenta más tarde.';
                    break;
                case 'auth/invalid-email':
                    msg = '❌ El correo no es válido.';
                    break;
                default:
                    msg = `❌ ${error.message}`;
            }
            errorDiv.textContent = msg;
            loginBtn.disabled = false;
            loginBtn.textContent = 'ENTRAR';
        }
    });

    // --- Permitir login con Enter ---
    const inputs = [emailInput, passwordInput];
    inputs.forEach(input => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                loginBtn.click();
            }
        });
    });
});