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

    // Verificar si ya hay usuario autenticado (redirigir al feed)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Si ya hay sesión, redirigir al index
            window.location.href = 'pages/index.html';
        }
    });

    // --- Envío del formulario ---
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        errorDiv.textContent = '';
        successDiv.textContent = '';
        loginBtn.disabled = true;

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            errorDiv.textContent = 'Todos los campos son obligatorios.';
            loginBtn.disabled = false;
            return;
        }

        try {
            // Iniciar sesión con Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log(`✅ Usuario autenticado: ${user.uid}`);

            successDiv.textContent = '¡Sesión iniciada correctamente! Redirigiendo...';
            loginBtn.disabled = true;

            // Redirigir al feed después de 1.5s
            setTimeout(() => {
                window.location.href = 'pages/index.html';
            }, 1500);

        } catch (error) {
            console.error('❌ Error al iniciar sesión:', error);
            let msg = error.message;
            if (error.code === 'auth/user-not-found') {
                msg = 'No hay cuenta con este correo.';
            } else if (error.code === 'auth/wrong-password') {
                msg = 'Contraseña incorrecta.';
            } else if (error.code === 'auth/too-many-requests') {
                msg = 'Demasiados intentos fallidos. Intenta más tarde.';
            } else if (error.code === 'auth/invalid-email') {
                msg = 'El correo no es válido.';
            }
            errorDiv.textContent = msg;
            loginBtn.disabled = false;
        }
    });
});