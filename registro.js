// ============================================================
// 1. IMPORTAR MÓDULOS DE FIREBASE
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadString,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCZwssYsjLjBXiIE5_1BNPYICU3MLgJR08",
    authDomain: "bin1-462ea.firebaseapp.com",
    projectId: "bin1-462ea",
    storageBucket: "bin1-462ea.firebasestorage.app",
    messagingSenderId: "446700825873",
    appId: "1:446700825873:web:2550025dfc6610b8a2b8b3"
};

// Inicializar
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

console.log('✅ Firebase Auth + Firestore + Storage inicializados.');

// ============================================================
// 2. ESPERAR DOM
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('register-form');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirm');
    const photoInput = document.getElementById('photo-input');
    const photoPreview = document.getElementById('photo-preview');
    const registerBtn = document.getElementById('register-btn');
    const errorDiv = document.getElementById('form-error');
    const successDiv = document.getElementById('form-success');

    let selectedPhotoBase64 = null; // para guardar la foto comprimida

    // --- Previsualización de foto ---
    photoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            // Mostrar miniatura
            const img = document.createElement('img');
            img.src = ev.target.result;
            photoPreview.innerHTML = '';
            photoPreview.appendChild(img);
            // Guardar base64 (más adelante se comprimirá)
            selectedPhotoBase64 = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    // --- Función para comprimir imagen (opcional) ---
    function compressImage(dataUrl, maxWidth = 200, quality = 0.6) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = dataUrl;
        });
    }

    // --- Envío del formulario ---
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        errorDiv.textContent = '';
        successDiv.textContent = '';
        registerBtn.disabled = true;

        // Validar campos
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirm = confirmInput.value;

        if (!username || !email || !password || !confirm) {
            errorDiv.textContent = 'Todos los campos son obligatorios.';
            registerBtn.disabled = false;
            return;
        }
        if (password.length < 6) {
            errorDiv.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            registerBtn.disabled = false;
            return;
        }
        if (password !== confirm) {
            errorDiv.textContent = 'Las contraseñas no coinciden.';
            registerBtn.disabled = false;
            return;
        }

        try {
            // 1. Crear usuario en Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log(`✅ Usuario creado: ${user.uid}`);

            // 2. Subir foto (si existe) a Storage y obtener URL
            let photoURL = '';
            if (selectedPhotoBase64) {
                // Comprimir
                const compressed = await compressImage(selectedPhotoBase64);
                // Guardar en Storage con ruta: profiles/{uid}.jpg
                const storageRef = ref(storage, `profiles/${user.uid}.jpg`);
                await uploadString(storageRef, compressed, 'data_url');
                photoURL = await getDownloadURL(storageRef);
                console.log('✅ Foto subida a Storage:', photoURL);
            } else {
                // Foto por defecto
                photoURL = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username) + '&background=7c3aed&color=fff&size=64';
            }

            // 3. Actualizar perfil de Auth (displayName y photoURL)
            await updateProfile(user, {
                displayName: username,
                photoURL: photoURL
            });

            // 4. Guardar datos en Firestore (colección "usuarios")
            await setDoc(doc(db, 'usuarios', user.uid), {
                uid: user.uid,
                nombre: username,
                email: email,
                foto: photoURL,
                fechaRegistro: new Date().toISOString()
            });

            console.log('✅ Datos guardados en Firestore');

            // Mostrar éxito
            successDiv.textContent = '¡Registro exitoso! Redirigiendo...';
            registerBtn.disabled = true;

            // Redirigir al feed después de 1.5s
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);

        } catch (error) {
            console.error('❌ Error en registro:', error);
            let msg = error.message;
            if (error.code === 'auth/email-already-in-use') {
                msg = 'Este correo ya está registrado.';
            } else if (error.code === 'auth/weak-password') {
                msg = 'Contraseña muy débil.';
            }
            errorDiv.textContent = msg;
            registerBtn.disabled = false;
        }
    });
});