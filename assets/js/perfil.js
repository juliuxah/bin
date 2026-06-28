// ============================================================
// 1. IMPORTAR FIREBASE
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCZwssYsjLjBXiiE5_lBNPYICU3MLgJR08",
  authDomain: "bin1-462ea.firebaseapp.com",
  projectId: "bin1-462ea",
  storageBucket: "bin1-462ea.firebasestorage.app",
  messagingSenderId: "446700825873",
  appId: "1:446700825873:web:2550025dfc6610b8a2b0b0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log('✅ Firebase inicializado para perfil.');

// ============================================================
// 2. CARGAR DATOS DEL PERFIL
// ============================================================
async function cargarPerfil(uid) {
    const container = document.getElementById('perfil-content');
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'block';

    try {
        // Obtener datos del usuario desde Firestore (colección "usuarios")
        const userDoc = await getDoc(doc(db, 'usuarios', uid));
        const user = auth.currentUser;

        if (!userDoc.exists()) {
            // Usar datos de Auth
            mostrarPerfil({
                nombre: user.displayName || 'Usuario',
                email: user.email || '',
                bio: 'Sin descripción',
                foto: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Usuario')}&background=f7c948&color=0d0b0e&size=128`,
                portada: '',
                posts: [],
                eventos: [
                    { fecha: '20 Jul', nombre: 'Street Art Jam' },
                    { fecha: '5 Ago', nombre: 'Graffiti Battle' }
                ]
            });
            return;
        }

        const data = userDoc.data();
        // Obtener posts del usuario (si guardas el uid en cada post)
        let posts = [];
        try {
            const postsQuery = query(collection(db, 'posts'), where('uid', '==', uid));
            const postsSnapshot = await getDocs(postsQuery);
            posts = postsSnapshot.docs.map(doc => doc.data());
        } catch (e) {
            console.warn('No se pudieron cargar posts:', e);
        }

        mostrarPerfil({
            nombre: data.nombre || 'Usuario',
            email: data.email || '',
            bio: data.bio || 'Sin descripción',
            foto: data.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre || 'Usuario')}&background=f7c948&color=0d0b0e&size=128`,
            portada: data.portada || '',
            posts: posts,
            eventos: data.eventos || [
                { fecha: '20 Jul', nombre: 'Street Art Jam' },
                { fecha: '5 Ago', nombre: 'Graffiti Battle' }
            ]
        });

    } catch (error) {
        console.error('❌ Error al cargar perfil:', error);
        if (container) {
            container.innerHTML = `<div class="error-message">Error al cargar el perfil. Intenta de nuevo.</div>`;
        }
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
}

// ============================================================
// 3. RENDERIZAR PERFIL
// ============================================================
function mostrarPerfil(perfil) {
    const container = document.getElementById('perfil-content');
    if (!container) return;

    const portadaHTML = perfil.portada
        ? `<img src="${perfil.portada}" alt="Portada">`
        : '';

    // Generar miniaturas de posts (si hay imágenes)
    const postsHTML = perfil.posts && perfil.posts.length > 0
        ? perfil.posts.map(post => `
            <div class="post-thumb">
                <img src="${post.image || 'assets/images/default-post.jpg'}" alt="Post">
            </div>
        `).join('')
        : '<div class="empty-message">Sin publicaciones aún</div>';

    const eventosHTML = perfil.eventos && perfil.eventos.length > 0
        ? perfil.eventos.map(ev => `
            <div class="event-item">
                <span class="event-date">${ev.fecha}</span>
                <span class="event-name">${ev.nombre}</span>
            </div>
        `).join('')
        : '<p class="empty-message" style="grid-column:1/-1;">Sin eventos próximos</p>';

    container.innerHTML = `
        <div class="cover">${portadaHTML}</div>
        <div class="avatar-wrapper">
            <div class="avatar-large">
                <img src="${perfil.foto}" alt="${perfil.nombre}">
            </div>
        </div>
        <div class="user-info">
            <div class="name">${perfil.nombre}</div>
            <div class="email">${perfil.email}</div>
            <div class="bio">${perfil.bio}</div>
        </div>
        <div class="stats">
            <div class="stat">
                <div class="number">${perfil.posts ? perfil.posts.length : 0}</div>
                <div class="label">Publicaciones</div>
            </div>
            <div class="stat">
                <div class="number">0</div>
                <div class="label">Seguidores</div>
            </div>
            <div class="stat">
                <div class="number">0</div>
                <div class="label">Siguiendo</div>
            </div>
        </div>

        <div class="section-title">
            <span class="icon">📸</span> Publicaciones
        </div>
        <div class="grid-posts">${postsHTML}</div>

        <div class="section-title" style="margin-top:12px;">
            <span class="icon">📅</span> Eventos
        </div>
        <div class="events-list">${eventosHTML}</div>

        <button id="edit-profile-btn">✏️ EDITAR PERFIL</button>
    `;

    // Asignar evento al botón editar
    const editBtn = document.getElementById('edit-profile-btn');
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            alert('Función de editar perfil en desarrollo.');
            // Aquí puedes abrir un modal o redirigir a una página de edición.
        });
    }
}

// ============================================================
// 4. INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log(`👤 Usuario autenticado: ${user.uid}`);
            cargarPerfil(user.uid);
        } else {
            console.warn('⛔ Usuario no autenticado. Redirigiendo a login...');
            window.location.href = '../pages/login.html';
        }
    });
});