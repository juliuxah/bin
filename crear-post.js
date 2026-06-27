// ============================================================
// 1. IMPORTAR FIREBASE
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log('✅ Módulos Firebase importados correctamente.');

// ============================================================
// 2. CONFIGURACIÓN DE FIREBASE
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyCZwssYsjLjBXiIE5_1BNPYICU3MLgJR08",
    authDomain: "bin1-462ea.firebaseapp.com",
    projectId: "bin1-462ea",
    storageBucket: "bin1-462ea.firebasestorage.app",
    messagingSenderId: "446700825873",
    appId: "1:446700825873:web:2550025dfc6610b8a2b8b3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log('✅ Firebase inicializado. Base de datos lista.');

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

    // Verificar que todos los elementos existen
    console.log('🔍 Elementos del DOM:', {
        titleInput: !!titleInput,
        descriptionInput: !!descriptionInput,
        imageInput: !!imageInput,
        publishBtn: !!publishBtn,
        successMessage: !!successMessage
    });

    let selectedFile = null;

    // --- Contador de caracteres ---
    titleInput.addEventListener('input', function() {
        titleCount.textContent = this.value.length;
    });
    descriptionInput.addEventListener('input', function() {
        descCount.textContent = this.value.length;
    });

    // --- Selección de imagen ---
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) {
            console.warn('⚠️ No se seleccionó ningún archivo.');
            return;
        }
        selectedFile = file;
        console.log(`📸 Archivo seleccionado: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

        const reader = new FileReader();
        reader.onload = function(ev) {
            previewImg.src = ev.target.result;
            previewContainer.style.display = 'block';
            uploadArea.style.display = 'none';
            publishBtn.disabled = false;
            successMessage.style.display = 'none';
            console.log('✅ Vista previa de imagen cargada.');
        };
        reader.readAsDataURL(file);
    });

    // --- Eliminar imagen ---
    removeImageBtn.addEventListener('click', function() {
        console.log('🗑️ Eliminando imagen seleccionada.');
        selectedFile = null;
        previewContainer.style.display = 'none';
        uploadArea.style.display = 'flex';
        imageInput.value = '';
        publishBtn.disabled = true;
        successMessage.style.display = 'none';
    });

    // --- Función para comprimir imagen (reduce tamaño) ---
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

    // --- Publicar en Firestore ---
    publishBtn.addEventListener('click', async function() {
        console.log('🚀 Click en PUBLICAR.');

        if (!selectedFile) {
            alert('Por favor, selecciona una imagen.');
            return;
        }

        const title = titleInput.value.trim() || 'NUEVO POST';
        const description = descriptionInput.value.trim() || '';
        console.log(`📝 Título: "${title}"`);
        console.log(`📄 Descripción: "${description}"`);

        // Leer la imagen como DataURL
        const reader = new FileReader();
        reader.onload = async function(ev) {
            try {
                // Comprimir la imagen para no exceder el límite de 1MB de Firestore
                console.log('🔄 Comprimiendo imagen...');
                const compressedImage = await compressImage(ev.target.result);
                console.log(`✅ Imagen comprimida. Tamaño: ${(compressedImage.length / 1024).toFixed(2)} KB`);

                // Datos del post
                const postData = {
                    title: title,
                    description: description,
                    image: compressedImage,
                    fecha: new Date()  // campo para ordenar en el feed
                };

                // Guardar en Firestore
                console.log('⏳ Enviando datos a Firestore...');
                const docRef = await addDoc(collection(db, "posts"), postData);
                console.log(`✅ Post guardado con ID: ${docRef.id}`);

                // Mostrar mensaje de éxito
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

                // Redirigir al feed
                console.log('⏳ Redirigiendo a index.html en 1.5 segundos...');
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

    // --- Drag & Drop ---
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

    console.log('✅ Script de crear post completamente inicializado.');
});