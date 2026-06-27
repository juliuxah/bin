// ============================================================
// 1. IMPORTAR FIREBASE (AÑADIMOS getAuth y onAuthStateChanged)
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"; // <-- NUEVO

console.log('✅ Módulos Firebase importados correctamente.');

// ============================================================
// 2. CONFIGURACIÓN DE FIREBASE
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyCZwssYsjLjBXiiE5_lBNPYICU3MLgJR08",
  authDomain: "bin1-462ea.firebaseapp.com",
  projectId: "bin1-462ea",
  storageBucket: "bin1-462ea.firebasestorage.app",
  messagingSenderId: "446700825873",
  appId: "1:446700825873:web:2550025dfc6610b8a2b0b0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // <-- NUEVO
console.log('✅ Firebase inicializado. Base de datos y Auth listos.');

// ============================================================
// 3. ESPERAR A QUE EL DOM ESTÉ LISTO
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM completamente cargado.');

    // --- Referencias a elementos ---
    const titleInput = document.getElementById('post-title');
    const descriptionInput = document.getElementById('post-description');
    const titleCount = document.getElementById('title-count');
    const descCount = document.getElementById('desc-count');
    const imageInput = document.getElementById('image-input');
    const uploadArea = document.getElementById('upload-area');
    const previewContainer = document.getElementById('preview-container');
    const previewImg = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image');
    const publishBtn = document.getElementById('publish-btn');
    const successMessage = document.getElementById('success-message');

    let selectedFile = null;
    let isUserAuthenticated = false; // <-- NUEVO

    // --- CONTADORES (sin cambios) ---
    titleInput.addEventListener('input', function() {
        titleCount.textContent = this.value.length;
    });
    descriptionInput.addEventListener('input', function() {
        descCount.textContent = this.value.length;
    });

    // --- SELECCIÓN DE IMAGEN (sin cambios) ---
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = function(ev) {
            previewImg.src = ev.target.result;
            previewContainer.style.display = 'block';
            uploadArea.style.display = 'none';
            // Solo habilitamos publicar si el usuario está autenticado
            if (isUserAuthenticated) {
                publishBtn.disabled = false;
            }
            successMessage.style.display = 'none';
        };
        reader.readAsDataURL(file);
    });

    // --- ELIMINAR IMAGEN (sin cambios) ---
    removeImageBtn.addEventListener('click', function() {
        selectedFile = null;
        previewContainer.style.display = 'none';
        uploadArea.style.display = 'flex';
        imageInput.value = '';
        publishBtn.disabled = true;
        successMessage.style.display = 'none';
    });

    // --- COMPRIMIR IMAGEN (sin cambios) ---
    function compressImage(dataUrl, maxWidth = 800, quality = 0.7) {
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

    // --- PUBLICAR (con verificación de autenticación) ---
    publishBtn.addEventListener('click', async function() {
        // Verificar autenticación antes de publicar (doble seguridad)
        if (!isUserAuthenticated) {
            alert('Debes iniciar sesión para publicar.');
            window.location.href = 'login.html';
            return;
        }

        if (!selectedFile) {
            alert('Por favor, selecciona una imagen.');
            return;
        }

        const title = titleInput.value.trim() || 'NUEVO POST';
        const description = descriptionInput.value.trim() || '';

        const reader = new FileReader();
        reader.onload = async function(ev) {
            try {
                const compressedImage = await compressImage(ev.target.result);
                const postData = {
                    title: title,
                    description: description,
                    image: compressedImage,
                    fecha: new Date()
                };

                const docRef = await addDoc(collection(db, "posts"), postData);
                console.log(`✅ Post guardado con ID: ${docRef.id}`);

                successMessage.style.display = 'block';
                publishBtn.disabled = true;

                // Resetear formulario
                titleInput.value = '';
                descriptionInput.value = '';
                titleCount.textContent = '0';
                descCount.textContent = '0';
                selectedFile = null;
                previewContainer.style.display = 'none';
                uploadArea.style.display = 'flex';
                imageInput.value = '';

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);

            } catch (error) {
                console.error('❌ ERROR al guardar en Firestore:', error);
                alert(`Error al publicar: ${error.message}`);
            }
        };
        reader.readAsDataURL(selectedFile);
    });

    // --- DRAG & DROP (sin cambios) ---
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = '#7ed957';
        this.style.background = '#f4fcf4';
    });
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.style.borderColor = '#d0d0d0';
        this.style.background = '#fafafa';
    });
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#d0d0d0';
        this.style.background = '#fafafa';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            imageInput.files = files;
            imageInput.dispatchEvent(new Event('change'));
        }
    });

    // ============================================================
    // 4. VERIFICAR AUTENTICACIÓN AL CARGAR LA PÁGINA
    // ============================================================
    console.log('🔐 Verificando estado de autenticación...');

    // Mostrar un mensaje de carga mientras se verifica
    const loadingMsg = document.createElement('div');
    loadingMsg.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center;
        color: white; font-size: 20px; z-index: 9999; backdrop-filter: blur(4px);
    `;
    loadingMsg.textContent = '⏳ Verificando sesión...';
    document.body.appendChild(loadingMsg);

    // Escuchar cambios en el estado de autenticación
    onAuthStateChanged(auth, (user) => {
        // Quitamos el mensaje de carga
        if (loadingMsg.parentNode) loadingMsg.remove();

        if (user) {
            // Usuario autenticado
            console.log(`✅ Usuario autenticado: ${user.email || user.displayName}`);
            isUserAuthenticated = true;
            // Habilitar el botón de publicar si ya hay imagen seleccionada
            if (selectedFile) {
                publishBtn.disabled = false;
            }
            // Podemos mostrar un mensaje de bienvenida (opcional)
            console.log('✅ Puedes publicar.');
        } else {
            // Usuario NO autenticado
            console.warn('⛔ No hay sesión iniciada. Redirigiendo a login...');
            isUserAuthenticated = false;
            publishBtn.disabled = true;
            // Mostrar mensaje y redirigir después de 1 segundo
            const warning = document.createElement('div');
            warning.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.85); color: #f87171; padding: 24px 32px;
                border-radius: 16px; font-size: 18px; z-index: 10000;
                text-align: center; backdrop-filter: blur(8px);
                border: 1px solid var(--border-vivid);
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            `;
            warning.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 12px;">🔒</div>
                <p style="font-weight: 600;">Debes iniciar sesión para publicar.</p>
                <p style="font-size: 14px; color: #aaa; margin-top: 8px;">Redirigiendo al login...</p>
            `;
            document.body.appendChild(warning);
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        }
    });

    console.log('✅ Script de crear post completamente inicializado.');
});