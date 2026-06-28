// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit, startAfter } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Configuración de Firebase
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
const auth = getAuth(app);

// ============================================================
// ESTADO GLOBAL DEL PERFIL
// ============================================================
let currentUser = null;
let userProfile = null;
let lastPostDoc = null;
let hasMorePosts = true;
let isLoadingPosts = false;
const POSTS_PER_PAGE = 9;

// ============================================================
// REFERENCIAS A ELEMENTOS DOM
// ============================================================
const profileName = document.getElementById('profile-name');
const profileUsername = document.getElementById('profile-username');
const profileBio = document.getElementById('profile-bio');
const profileAvatar = document.getElementById('profile-avatar');
const coverImage = document.getElementById('cover-image');
const postCountEl = document.getElementById('post-count');
const eventCountEl = document.getElementById('event-count');
const followerCountEl = document.getElementById('follower-count');
const userPostsContainer = document.getElementById('user-posts');
const userEventsContainer = document.getElementById('user-events');

const editProfileBtn = document.getElementById('edit-profile-btn');
const editModal = document.getElementById('edit-profile-modal');
const closeModalBtn = document.getElementById('close-modal');
const saveProfileBtn = document.getElementById('save-profile-btn');
const editName = document.getElementById('edit-name');
const editUsername = document.getElementById('edit-username');
const editBio = document.getElementById('edit-bio');
const editCover = document.getElementById('edit-cover');

const changeCoverBtn = document.getElementById('change-cover-btn');
const changeAvatarBtn = document.getElementById('change-avatar-btn');

const tabButtons = document.querySelectorAll('.tab-btn');
const tabPosts = document.getElementById('tab-posts');
const tabEvents = document.getElementById('tab-events');

// ============================================================
// FUNCIONES DE CARGA DE DATOS
// ============================================================

// Cargar perfil del usuario desde Firestore
async function loadUserProfile(uid) {
    try {
        const profileRef = doc(db, "usuarios", uid);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
            userProfile = profileSnap.data();
        } else {
            // Si no existe, crear perfil por defecto
            userProfile = {
                displayName: currentUser.displayName || 'Usuario',
                username: currentUser.displayName ? `@${currentUser.displayName.toLowerCase().replace(/\s/g, '')}` : '@usuario',
                bio: 'Artista urbano en BIN 🎨',
                photoURL: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'Usuario')}&background=f7c948&color=0d0b0e&size=128`,
                coverURL: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&h=200&fit=crop'
            };
            // Guardar perfil por defecto
            await setDoc(profileRef, userProfile);
        }
        
        // Actualizar UI
        renderProfile();
        
    } catch (error) {
        console.error('Error al cargar perfil:', error);
        showNotification('Error al cargar perfil', '#ff4d6d');
    }
}

// Renderizar perfil en la UI
function renderProfile() {
    if (!userProfile) return;
    
    profileName.textContent = userProfile.displayName || 'Usuario';
    profileUsername.textContent = userProfile.username || '@usuario';
    profileBio.textContent = userProfile.bio || 'Artista urbano en BIN 🎨';
    profileAvatar.src = userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName || 'Usuario')}&background=f7c948&color=0d0b0e&size=128`;
    coverImage.src = userProfile.coverURL || 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&h=200&fit=crop';
    
    // Rellenar modal de edición
    editName.value = userProfile.displayName || '';
    editUsername.value = userProfile.username || '';
    editBio.value = userProfile.bio || '';
    editCover.value = userProfile.coverURL || '';
}

// Cargar publicaciones del usuario
async function loadUserPosts(uid, loadMore = false) {
    if (isLoadingPosts || (!hasMorePosts && loadMore)) return;
    isLoadingPosts = true;
    
    if (!loadMore) {
        userPostsContainer.innerHTML = '<div class="loading-message">Cargando publicaciones...</div>';
        lastPostDoc = null;
        hasMorePosts = true;
    }
    
    try {
        let q = query(
            collection(db, "posts"),
            where("uid", "==", uid),
            orderBy("fecha", "desc"),
            limit(POSTS_PER_PAGE)
        );
        if (loadMore && lastPostDoc) {
            q = query(
                collection(db, "posts"),
                where("uid", "==", uid),
                orderBy("fecha", "desc"),
                startAfter(lastPostDoc),
                limit(POSTS_PER_PAGE)
            );
        }
        
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs;
        
        if (docs.length === 0) {
            hasMorePosts = false;
            if (!loadMore) {
                userPostsContainer.innerHTML = '<div class="empty-message">📸 No tienes publicaciones aún. ¡Crea la primera!</div>';
            } else {
                const noMore = document.createElement('div');
                noMore.className = 'no-more-message';
                noMore.textContent = '— No hay más publicaciones —';
                noMore.style.cssText = 'grid-column:1/-1; text-align:center; color:var(--text-2); padding:20px; font-size:13px;';
                userPostsContainer.appendChild(noMore);
            }
            isLoadingPosts = false;
            return;
        }
        
        lastPostDoc = docs[docs.length - 1];
        
        if (!loadMore) {
            userPostsContainer.innerHTML = '';
        } else {
            // Eliminar mensaje de "no hay más" previo
            const noMore = userPostsContainer.querySelector('.no-more-message');
            if (noMore) noMore.remove();
            // Eliminar botón de carga previo
            const loadBtn = document.getElementById('load-more-posts-btn');
            if (loadBtn) loadBtn.remove();
        }
        
        // Crear tarjetas de publicaciones
        docs.forEach((doc) => {
            const data = doc.data();
            const postCard = document.createElement('div');
            postCard.className = 'post-card';
            
            const img = document.createElement('img');
            img.src = data.image || 'https://via.placeholder.com/300/161218/f7c948?text=📦';
            img.alt = data.title || 'Post';
            img.loading = 'lazy';
            postCard.appendChild(img);
            
            const overlay = document.createElement('div');
            overlay.className = 'post-overlay';
            overlay.innerHTML = `
                <span class="title">${data.title || 'Sin título'}</span>
                <span class="likes">❤️ ${data.likes || 0}</span>
            `;
            postCard.appendChild(overlay);
            
            postCard.addEventListener('click', () => {
                // Abrir preview del post (simplificado)
                showNotification('Abrir post en preview (funcionalidad próxima)', '#00d4ff');
            });
            
            userPostsContainer.appendChild(postCard);
        });
        
        // Si hay más posts, añadir botón "Cargar más"
        if (docs.length === POSTS_PER_PAGE) {
            const loadBtn = document.createElement('button');
            loadBtn.id = 'load-more-posts-btn';
            loadBtn.textContent = 'Cargar más publicaciones';
            loadBtn.addEventListener('click', () => loadUserPosts(uid, true));
            userPostsContainer.appendChild(loadBtn);
        }
        
        // Actualizar contador de publicaciones
        postCountEl.textContent = userPostsContainer.querySelectorAll('.post-card').length;
        
        isLoadingPosts = false;
        
    } catch (error) {
        console.error('Error al cargar publicaciones:', error);
        if (!loadMore) {
            userPostsContainer.innerHTML = '<div class="error-message">Error al cargar publicaciones</div>';
        }
        isLoadingPosts = false;
    }
}

// Cargar eventos del usuario (simulados)
async function loadUserEvents(uid) {
    // Los eventos pueden ser guardados en Firestore o generados desde publicaciones
    // Por ahora, usaremos eventos simulados + eventos reales si existen
    userEventsContainer.innerHTML = '<div class="loading-message">Cargando eventos...</div>';
    
    try {
        // Buscar eventos en Firestore (colección "eventos" con uid)
        const eventsRef = collection(db, "eventos");
        const q = query(eventsRef, where("uid", "==", uid), orderBy("fecha", "desc"));
        const querySnapshot = await getDocs(q);
        const events = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Si no hay eventos en Firestore, mostrar eventos simulados
        if (events.length === 0) {
            // Eventos simulados (pueden ser reemplazados por datos reales)
            const mockEvents = [
                {
                    id: '1',
                    title: 'Exposición urbana',
                    description: 'Muestra de arte callejero en el centro',
                    date: '2025-02-15',
                    icon: '🎨'
                },
                {
                    id: '2',
                    title: 'Live painting session',
                    description: 'Pintura en vivo con artistas locales',
                    date: '2025-02-22',
                    icon: '🖌️'
                },
                {
                    id: '3',
                    title: 'Concierto de hip-hop',
                    description: 'Noche de rap y graffiti',
                    date: '2025-03-01',
                    icon: '🎤'
                }
            ];
            
            // Guardar eventos simulados en Firestore (opcional)
            // await Promise.all(mockEvents.map(e => addDoc(collection(db, "eventos"), { ...e, uid })));
            
            renderEvents(mockEvents);
        } else {
            renderEvents(events);
        }
        
        eventCountEl.textContent = events.length || 3;
        
    } catch (error) {
        console.error('Error al cargar eventos:', error);
        // Fallback a eventos simulados
        const fallbackEvents = [
            { title: 'Exposición urbana', description: 'Muestra de arte callejero', date: '2025-02-15', icon: '🎨' },
            { title: 'Live painting session', description: 'Pintura en vivo', date: '2025-02-22', icon: '🖌️' },
            { title: 'Concierto de hip-hop', description: 'Noche de rap y graffiti', date: '2025-03-01', icon: '🎤' }
        ];
        renderEvents(fallbackEvents);
        eventCountEl.textContent = fallbackEvents.length;
    }
}

// Renderizar eventos
function renderEvents(events) {
    userEventsContainer.innerHTML = '';
    
    if (events.length === 0) {
        userEventsContainer.innerHTML = '<div class="empty-message">📅 No hay eventos programados</div>';
        return;
    }
    
    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <div class="event-icon">${event.icon || '📅'}</div>
            <div class="event-info">
                <h3>${event.title}</h3>
                <p>${event.description || ''}</p>
            </div>
            <div class="event-date">${event.date || 'Próximamente'}</div>
        `;
        userEventsContainer.appendChild(card);
    });
}

// ============================================================
// FUNCIONES DE EDICIÓN DE PERFIL
// ============================================================

function openEditModal() {
    editName.value = userProfile.displayName || '';
    editUsername.value = userProfile.username || '';
    editBio.value = userProfile.bio || '';
    editCover.value = userProfile.coverURL || '';
    editModal.style.display = 'flex';
}

function closeEditModal() {
    editModal.style.display = 'none';
}

async function saveProfile() {
    if (!currentUser) return;
    
    const updatedProfile = {
        displayName: editName.value.trim() || currentUser.displayName || 'Usuario',
        username: editUsername.value.trim() || '@usuario',
        bio: editBio.value.trim() || 'Artista urbano en BIN 🎨',
        coverURL: editCover.value.trim() || 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&h=200&fit=crop',
        photoURL: userProfile.photoURL // mantener la misma foto por ahora
    };
    
    try {
        const profileRef = doc(db, "usuarios", currentUser.uid);
        await setDoc(profileRef, updatedProfile);
        userProfile = updatedProfile;
        renderProfile();
        closeEditModal();
        showNotification('Perfil actualizado ✅', '#4ade80');
    } catch (error) {
        console.error('Error al guardar perfil:', error);
        showNotification('Error al guardar perfil', '#ff4d6d');
    }
}

// ============================================================
// NOTIFICACIONES
// ============================================================
function showNotification(message, color = '#4ade80') {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
        background: ${color}; color: #0d0b0e; padding: 12px 24px;
        border-radius: 4px 12px 4px 12px; font-weight: 700;
        z-index: 9999; font-family: 'Roboto', sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        animation: slideDown 0.3s ease;
        max-width: 90%;
        text-align: center;
        border: 2px solid rgba(255,255,255,0.1);
    `;
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.transition = 'all 0.4s ease';
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => notif.remove(), 400);
    }, 2500);
}

// ============================================================
// EVENTOS DE UI
// ============================================================

// Tabs
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tab = btn.dataset.tab;
        if (tab === 'posts') {
            tabPosts.style.display = 'block';
            tabEvents.style.display = 'none';
        } else {
            tabPosts.style.display = 'none';
            tabEvents.style.display = 'block';
        }
    });
});

// Editar perfil
editProfileBtn.addEventListener('click', openEditModal);
closeModalBtn.addEventListener('click', closeEditModal);
saveProfileBtn.addEventListener('click', saveProfile);
editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
});

// Cambiar portada (simulado)
changeCoverBtn.addEventListener('click', () => {
    const url = prompt('Pega la URL de la nueva imagen de portada:', userProfile.coverURL);
    if (url && url.trim() !== '') {
        userProfile.coverURL = url.trim();
        coverImage.src = url.trim();
        // Guardar en Firestore
        if (currentUser) {
            setDoc(doc(db, "usuarios", currentUser.uid), userProfile)
                .then(() => showNotification('Portada actualizada ✅', '#4ade80'))
                .catch(() => showNotification('Error al guardar portada', '#ff4d6d'));
        }
    }
});

// Cambiar avatar (simulado)
changeAvatarBtn.addEventListener('click', () => {
    const url = prompt('Pega la URL de la nueva foto de perfil:', userProfile.photoURL);
    if (url && url.trim() !== '') {
        userProfile.photoURL = url.trim();
        profileAvatar.src = url.trim();
        if (currentUser) {
            setDoc(doc(db, "usuarios", currentUser.uid), userProfile)
                .then(() => showNotification('Avatar actualizado ✅', '#4ade80'))
                .catch(() => showNotification('Error al guardar avatar', '#ff4d6d'));
        }
    }
});

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            // Cargar perfil
            loadUserProfile(user.uid);
            // Cargar publicaciones
            loadUserPosts(user.uid);
            // Cargar eventos
            loadUserEvents(user.uid);
        } else {
            // No autenticado, redirigir a login
            showNotification('Inicia sesión para ver tu perfil', '#ff4d6d');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        }
    });
});