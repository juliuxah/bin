// Importar los módulos necesarios desde la CDN de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, startAfter } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCZwssYsjLjBXiiE5_lBNPYICU3MLgJR08",
  authDomain: "bin1-462ea.firebaseapp.com",
  projectId: "bin1-462ea",
  storageBucket: "bin1-462ea.firebasestorage.app",
  messagingSenderId: "446700825873",
  appId: "1:446700825873:web:2550025dfc6610b8a2b0b0"
};

// Inicializar Firebase, Firestore y Auth
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ------------------------------------------------------------
// FUNCIONES DEL CARRUSEL (solo para preview)
// ------------------------------------------------------------
function initCarousel(carouselElement) {
    const container = carouselElement.querySelector('.carousel-container');
    if (!container) return;
    const track = container.querySelector('.carousel-track');
    const slides = track.querySelectorAll('.carousel-slide');
    const dots = container.querySelectorAll('.dot');
    if (slides.length === 0) return;

    let currentIndex = 0;
    let isCarouselDragging = false;
    let isSwiping = false;
    let startX = 0, startY = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    const THRESHOLD = 20;

    container.style.touchAction = 'pan-y';

    function updateCarousel(index) {
        const slideWidth = container.offsetWidth;
        currentIndex = index;
        currentTranslate = -currentIndex * slideWidth;
        prevTranslate = currentTranslate;
        track.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        track.style.transform = `translateX(${currentTranslate}px)`;
        dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    }

    container.addEventListener('pointerdown', (e) => {
        if (document.body.classList.contains('dragging')) return;
        if (e.target.closest('.action-btn')) return;
        isCarouselDragging = true;
        isSwiping = false;
        startX = e.clientX;
        startY = e.clientY;
        track.style.transition = 'none';
        if (container.setPointerCapture) container.setPointerCapture(e.pointerId);
    });

    container.addEventListener('pointermove', (e) => {
        if (document.body.classList.contains('dragging')) {
            isCarouselDragging = false;
            return;
        }
        if (!isCarouselDragging) return;
        const diffX = e.clientX - startX;
        const diffY = e.clientY - startY;
        if (!isSwiping && (Math.abs(diffX) > THRESHOLD || Math.abs(diffY) > THRESHOLD)) {
            if (Math.abs(diffX) > Math.abs(diffY)) {
                isSwiping = true;
                const post = carouselElement.closest('.draggable-post');
                if (post) post.classList.remove('long-press-active');
            } else {
                isCarouselDragging = false;
                return;
            }
        }
        if (isSwiping) {
            track.style.transform = `translateX(${prevTranslate + diffX}px)`;
        }
    });

    const handlePointerEnd = (e) => {
        if (!isCarouselDragging) return;
        isCarouselDragging = false;
        if (isSwiping) {
            const diffX = e.clientX - startX;
            if (diffX > 50 && currentIndex > 0) updateCarousel(currentIndex - 1);
            else if (diffX < -50 && currentIndex < slides.length - 1) updateCarousel(currentIndex + 1);
            else updateCarousel(currentIndex);
        } else {
            updateCarousel(currentIndex);
        }
        isSwiping = false;
    };

    container.addEventListener('pointerup', handlePointerEnd);
    container.addEventListener('pointercancel', handlePointerEnd);
    window.addEventListener('resize', () => updateCarousel(currentIndex));
}

// ------------------------------------------------------------
// FUNCIONES DE ACCIONES (like, comentario, compartir)
// ------------------------------------------------------------
function initActions(postCard) {
    const cards = postCard ? [postCard] : document.querySelectorAll('.post-card:not([data-actions-initialized])');
    cards.forEach(card => {
        // Like
        card.querySelectorAll('.like-btn').forEach(btn => {
            btn.classList.remove('liked');
            const iconSpan = btn.querySelector('.icon');
            if (iconSpan && !iconSpan.textContent) iconSpan.textContent = '♡';
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const countSpan = this.querySelector('.count');
                const iconSpan = this.querySelector('.icon');
                let count = parseInt(countSpan.textContent);
                if (this.classList.contains('liked')) {
                    this.classList.remove('liked');
                    count--;
                    iconSpan.textContent = '♡';
                    this.style.transform = 'scale(0.85)';
                    setTimeout(() => this.style.transform = '', 150);
                } else {
                    this.classList.add('liked');
                    count++;
                    iconSpan.textContent = '♥';
                    this.style.transform = 'scale(1.3)';
                    setTimeout(() => {
                        this.style.transform = 'scale(0.9)';
                        setTimeout(() => this.style.transform = '', 100);
                    }, 150);
                    createHeartParticles(this);
                }
                countSpan.textContent = count;
            });
        });

        // Comentario
        card.querySelectorAll('.comment-btn').forEach(btn => {
            const iconSpan = btn.querySelector('.icon');
            if (iconSpan && !iconSpan.textContent) iconSpan.textContent = '💬';
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const postId = this.dataset.id;
                const commentCount = this.querySelector('.count');
                let count = parseInt(commentCount.textContent);
                const mensaje = prompt(`Escribe un comentario para el post ${postId}:`);
                if (mensaje !== null && mensaje.trim() !== '') {
                    count++;
                    commentCount.textContent = count;
                    this.style.transform = 'scale(0.85)';
                    setTimeout(() => this.style.transform = '', 150);
                    showNotification(card, `Comentario: "${mensaje.slice(0, 40)}${mensaje.length > 40 ? '...' : ''}"`, '#4a90d9');
                }
            });
        });

        // Compartir
        card.querySelectorAll('.share-btn').forEach(btn => {
            const iconSpan = btn.querySelector('.icon');
            if (iconSpan && !iconSpan.textContent) iconSpan.textContent = '➤';
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const postId = this.dataset.id;
                this.style.transform = 'scale(0.85)';
                setTimeout(() => this.style.transform = '', 150);
                if (navigator.share) {
                    navigator.share({
                        title: 'Mira este post en BIN',
                        text: '¡Mira este increíble post!',
                        url: window.location.href
                    }).catch(() => {
                        showNotification(card, `Post ${postId} compartido (simulado)`, '#2ecc71');
                    });
                } else {
                    showNotification(card, `Post ${postId} compartido (simulado)`, '#2ecc71');
                }
            });
        });

        card.dataset.actionsInitialized = 'true';
    });
}

// ------------------------------------------------------------
// FUNCIONES AUXILIARES (corazones, notificaciones)
// ------------------------------------------------------------
function createHeartParticles(element) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const emojis = ['♥', '❤️', '💕', '💖', '💗'];
    for (let i = 0; i < 5; i++) {
        const particle = document.createElement('div');
        particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        particle.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            font-size: ${16 + Math.random() * 20}px;
            pointer-events: none;
            z-index: 99999;
            transition: all 1s cubic-bezier(0.34, 1.56, 0.64, 1);
            opacity: 1;
        `;
        document.body.appendChild(particle);
        const angle = (Math.random() - 0.5) * 2 * Math.PI;
        const distance = 40 + Math.random() * 80;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance - 60;
        setTimeout(() => {
            particle.style.transform = `translate(${dx}px, ${dy}px) scale(0.5)`;
            particle.style.opacity = '0';
        }, 50);
        setTimeout(() => particle.remove(), 1100);
    }
}

function showNotification(card, message, color = '#4a90d9') {
    card.querySelectorAll('.post-notification').forEach(n => n.remove());
    const notif = document.createElement('div');
    notif.className = 'post-notification';
    notif.style.cssText = `
        background: ${color};
        color: white;
        padding: 10px 16px;
        margin: 0 16px 12px 16px;
        border-radius: 12px;
        font-size: 13px;
        text-align: center;
        animation: slideDown 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-weight: 500;
    `;
    notif.textContent = message;
    const actions = card.querySelector('.post-actions');
    card.insertBefore(notif, actions);
    setTimeout(() => {
        notif.style.transition = 'all 0.4s ease';
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            if (notif.parentNode) notif.remove();
        }, 400);
    }, 3000);
}

function showGlobalNotification(message, color = '#2ecc71') {
    const existing = document.querySelector('.global-notification');
    if (existing) existing.remove();
    const notif = document.createElement('div');
    notif.className = 'global-notification';
    notif.style.cssText = `
        position: fixed;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        background: ${color};
        color: white;
        padding: 14px 28px;
        border-radius: 16px;
        font-size: 15px;
        font-weight: 600;
        z-index: 99999;
        animation: slideDown 0.4s ease;
        box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        max-width: 90%;
        text-align: center;
        backdrop-filter: blur(10px);
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

// ------------------------------------------------------------
// CREAR ELEMENTO POST (sin carrusel en feed)
// ------------------------------------------------------------
function createPostElement(postData, docId) {
    const newPost = document.createElement('div');
    newPost.className = 'post-card saved-post';
    newPost.style.animation = 'fadeIn 0.3s ease both';
    
    const title = postData.title || 'Sin título';
    const description = postData.description || '';
    const image = postData.image || '';
    const isImage = image && image.startsWith('data:image');
    
    const descriptionHTML = description ? 
        `<div class="post-description">${description}</div>` : '';
    
    newPost.innerHTML = `
        <div class="post-header-black">${title.toUpperCase()}</div>
        ${descriptionHTML}
        <div class="post-image-carousel draggable-post" data-post-id="saved-${docId}">
            <div class="carousel-container">
                <div class="carousel-track">
                    <div class="carousel-slide" style="${isImage ? '' : 'background: linear-gradient(135deg, #7ed957, #5cb85c);'}">
                        ${isImage ? `<img src="${image}" alt="${title}" loading="lazy">` : '📦'}
                    </div>
                </div>
                <div class="carousel-indicators">
                    <span class="dot active" data-index="0"></span>
                </div>
            </div>
        </div>
        <div class="post-actions">
            <button class="action-btn like-btn" data-id="saved-${docId}">
                <span class="icon">♡</span>
                <span class="count">0</span>
            </button>
            <button class="action-btn comment-btn" data-id="saved-${docId}">
                <span class="icon">💬</span>
                <span class="count">0</span>
            </button>
            <button class="action-btn share-btn" data-id="saved-${docId}">
                <span class="icon">➤</span>
            </button>
        </div>
    `;
    return newPost;
}

// ------------------------------------------------------------
// SCROLL INFINITO: VARIABLES DE ESTADO
// ------------------------------------------------------------
let lastVisible = null;
let isLoading = false;
let hasMore = true;
const PAGE_SIZE = 9; // 3 columnas × 3 filas = 9 posts

// ------------------------------------------------------------
// CARGAR POSTS (con paginación)
// ------------------------------------------------------------
async function cargarPostsDesdeLaNube(loadMore = false) {
    if (isLoading) return;
    if (!hasMore && loadMore) return;

    isLoading = true;
    const feed = document.getElementById('feed');

    if (!loadMore) {
        feed.innerHTML = `<div class="loading-message">Cargando publicaciones…</div>`;
        lastVisible = null;
        hasMore = true;
    }

    try {
        let q = query(collection(db, "posts"), orderBy("fecha", "desc"), limit(PAGE_SIZE));
        if (loadMore && lastVisible) {
            q = query(collection(db, "posts"), orderBy("fecha", "desc"), startAfter(lastVisible), limit(PAGE_SIZE));
        }

        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs;

        if (docs.length === 0) {
            hasMore = false;
            if (!loadMore) {
                feed.innerHTML = `<div class="empty-message">No hay publicaciones aún. ¡Crea la primera!</div>`;
            } else {
                const sentinel = document.getElementById('sentinel');
                if (sentinel) {
                    sentinel.innerHTML = '<div class="no-more-message">— No hay más publicaciones —</div>';
                }
            }
            isLoading = false;
            return;
        }

        lastVisible = docs[docs.length - 1];

        if (!loadMore) {
            feed.innerHTML = '';
        } else {
            const oldSentinel = document.getElementById('sentinel');
            if (oldSentinel) oldSentinel.remove();
        }

        docs.forEach((doc) => {
            const postData = doc.data();
            const newPost = createPostElement(postData, doc.id);
            feed.appendChild(newPost);
        });

        initActions();

        feed.querySelectorAll('.carousel-slide img').forEach(img => {
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
        });

        if (docs.length === PAGE_SIZE) {
            const sentinel = document.createElement('div');
            sentinel.id = 'sentinel';
            sentinel.style.cssText = `
                grid-column: 1 / -1;
                text-align: center;
                padding: 20px;
                color: var(--text-2);
                font-size: 14px;
            `;
            // CORREGIDO: spinner y texto separados
            sentinel.innerHTML = '<span class="loading-spinner"></span> Cargando más publicaciones…';
            feed.appendChild(sentinel);
            observeSentinel();
        } else {
            hasMore = false;
            const sentinel = document.createElement('div');
            sentinel.id = 'sentinel';
            sentinel.style.cssText = `
                grid-column: 1 / -1;
                text-align: center;
                padding: 20px;
                color: var(--text-2);
                font-size: 14px;
            `;
            sentinel.innerHTML = '<div class="no-more-message">— No hay más publicaciones —</div>';
            feed.appendChild(sentinel);
        }

        updateAuthUI(auth.currentUser);

        console.log(`✅ Cargados ${docs.length} posts (total: ${feed.querySelectorAll('.post-card').length})`);
        isLoading = false;

    } catch (error) {
        console.error("❌ Error al cargar posts:", error);
        if (!loadMore) {
            feed.innerHTML = `<div class="error-message">Error al cargar las publicaciones. Intenta de nuevo.</div>`;
        }
        showGlobalNotification('Error al cargar los posts. Intenta de nuevo.', '#e74c3c');
        isLoading = false;
    }
}

// ------------------------------------------------------------
// OBSERVADOR DEL CENTINELA PARA SCROLL INFINITO
// ------------------------------------------------------------
let observer = null;

function observeSentinel() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }

    const sentinel = document.getElementById('sentinel');
    if (!sentinel) return;
    if (sentinel.querySelector('.no-more-message')) return;

    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && hasMore && !isLoading) {
                console.log('📜 Centinela visible, cargando más posts...');
                cargarPostsDesdeLaNube(true);
            }
        });
    }, {
        root: document.getElementById('feed'),
        rootMargin: '0px 0px 100px 0px',
        threshold: 0.1
    });

    observer.observe(sentinel);
}

// ------------------------------------------------------------
// VISTA PREVIA DE POSTS — FULLSCREEN CON SWIPE ENTRE POSTS
// ------------------------------------------------------------
function initPostSelection() {
    const feed = document.getElementById('feed');
    const overlay = document.getElementById('post-preview-overlay');
    const closeBtn = document.getElementById('close-preview');

    let currentIndex = 0;
    let allCards = [];
    let previewTrack = null;

    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeActive = false;
    let swipeDir = null;
    let dragDelta = 0;
    const SWIPE_THRESHOLD = 50;

    function buildSlide(postCard) {
        const slide = document.createElement('div');
        slide.className = 'preview-slide';

        const title = postCard.querySelector('.post-header-black');
        const desc = postCard.querySelector('.post-description');
        const carouselSrc = postCard.querySelector('.post-image-carousel');

        const imgWrap = document.createElement('div');
        imgWrap.className = 'preview-img-wrap';

        if (carouselSrc) {
            const carouselClone = carouselSrc.cloneNode(true);
            carouselClone.dataset.initialized = '';
            imgWrap.appendChild(carouselClone);
            requestAnimationFrame(() => initCarousel(carouselClone));
        } else {
            const emoji = document.createElement('div');
            emoji.className = 'preview-emoji';
            emoji.textContent = '🖼️';
            imgWrap.appendChild(emoji);
        }
        slide.appendChild(imgWrap);

        const bottom = document.createElement('div');
        bottom.className = 'preview-bottom';

        if (title && title.textContent.trim()) {
            const t = document.createElement('div');
            t.className = 'preview-title';
            t.textContent = title.textContent.trim();
            bottom.appendChild(t);
        }
        if (desc && desc.textContent.trim()) {
            const d = document.createElement('div');
            d.className = 'preview-description';
            d.textContent = desc.textContent.trim();
            bottom.appendChild(d);
        }

        const actionsRow = document.createElement('div');
        actionsRow.className = 'preview-actions-row';
        const origActions = postCard.querySelectorAll('.action-btn');
        origActions.forEach(btn => {
            const clone = btn.cloneNode(true);
            actionsRow.appendChild(clone);
        });
        bottom.appendChild(actionsRow);
        slide.appendChild(bottom);

        initActions(slide);
        return slide;
    }

    function openPreview(index) {
        allCards = Array.from(feed.querySelectorAll('.post-card'));
        if (allCards.length === 0) return;
        currentIndex = Math.max(0, Math.min(index, allCards.length - 1));

        const container = document.getElementById('preview-container');
        container.innerHTML = '';

        const trackWrapper = document.createElement('div');
        trackWrapper.className = 'preview-track-wrapper';

        previewTrack = document.createElement('div');
        previewTrack.className = 'preview-track';

        allCards.forEach(card => {
            previewTrack.appendChild(buildSlide(card));
        });
        trackWrapper.appendChild(previewTrack);
        container.appendChild(trackWrapper);

        updateCounter();
        setTrackPosition(currentIndex, false);

        overlay.style.display = 'flex';
        overlay.classList.add('active');

        attachSwipeHandlers(trackWrapper);
    }

    function setTrackPosition(index, animate = true) {
        if (!previewTrack) return;
        previewTrack.style.transition = animate
            ? 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)'
            : 'none';
        previewTrack.style.transform = `translateX(${-index * 100}%)`;
    }

    function goTo(index) {
        currentIndex = Math.max(0, Math.min(index, allCards.length - 1));
        setTrackPosition(currentIndex, true);
        updateCounter();
    }

    function updateCounter() {
        let counter = overlay.querySelector('.preview-post-counter');
        if (!counter) {
            counter = document.createElement('div');
            counter.className = 'preview-post-counter';
            overlay.appendChild(counter);
        }
        if (allCards.length > 1) {
            counter.style.display = '';
            counter.textContent = `${currentIndex + 1} / ${allCards.length}`;
        } else {
            counter.style.display = 'none';
        }
    }

    function attachSwipeHandlers(el) {
        if (el._swipeAttached) return;
        el._swipeAttached = true;

        el.addEventListener('pointerdown', onSwipeStart, { passive: true });
        el.addEventListener('pointermove', onSwipeMove, { passive: false });
        el.addEventListener('pointerup', onSwipeEnd);
        el.addEventListener('pointercancel', onSwipeEnd);
    }

    function onSwipeStart(e) {
        if (e.target.closest('.action-btn')) return;
        swipeActive = true;
        swipeDir = null;
        dragDelta = 0;
        swipeStartX = e.clientX;
        swipeStartY = e.clientY;
        if (previewTrack) previewTrack.style.transition = 'none';
    }

    function onSwipeMove(e) {
        if (!swipeActive) return;
        const dx = e.clientX - swipeStartX;
        const dy = e.clientY - swipeStartY;

        if (!swipeDir && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
            swipeDir = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
        }
        if (swipeDir !== 'h') return;

        e.preventDefault();

        dragDelta = dx;
        const base = -currentIndex * 100;
        const dragPct = (dx / window.innerWidth) * 100;
        let pct = base + dragPct;
        if (currentIndex === 0 && dx > 0) pct = base + dragPct * 0.25;
        if (currentIndex === allCards.length - 1 && dx < 0) pct = base + dragPct * 0.25;
        if (previewTrack) previewTrack.style.transform = `translateX(${pct}%)`;
    }

    function onSwipeEnd(e) {
        if (!swipeActive) return;
        swipeActive = false;

        if (swipeDir === 'h') {
            if (dragDelta < -SWIPE_THRESHOLD) goTo(currentIndex + 1);
            else if (dragDelta > SWIPE_THRESHOLD) goTo(currentIndex - 1);
            else goTo(currentIndex);
        }
        swipeDir = null;
        dragDelta = 0;
    }

    function closePreview() {
        overlay.style.display = 'none';
        overlay.classList.remove('active');
        const container = document.getElementById('preview-container');
        container.innerHTML = '';
        previewTrack = null;
    }

    closeBtn.addEventListener('click', closePreview);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePreview();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.style.display === 'flex') closePreview();
        if (e.key === 'ArrowRight' && overlay.style.display === 'flex') goTo(currentIndex + 1);
        if (e.key === 'ArrowLeft'  && overlay.style.display === 'flex') goTo(currentIndex - 1);
    });

    feed.addEventListener('click', function(e) {
        const carousel = e.target.closest('.post-image-carousel');
        if (!carousel) return;
        if (e.target.closest('.action-btn')) return;
        const postCard = carousel.closest('.post-card');
        if (!postCard) return;
        const cards = Array.from(feed.querySelectorAll('.post-card'));
        const idx = cards.indexOf(postCard);
        openPreview(idx >= 0 ? idx : 0);
    });

    feed.addEventListener('touchstart', function(e) {
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const carousel = target ? target.closest('.post-image-carousel') : null;
        if (!carousel) return;
        if (target.closest('.action-btn')) return;

        const startX = touch.clientX;
        const startY = touch.clientY;

        const touchEndHandler = function(ev) {
            const endTouch = ev.changedTouches[0];
            const dx = endTouch.clientX - startX;
            const dy = endTouch.clientY - startY;
            if (Math.sqrt(dx*dx + dy*dy) > 10) {
                document.removeEventListener('touchend', touchEndHandler);
                return;
            }
            const postCard = carousel.closest('.post-card');
            if (postCard) {
                const cards = Array.from(feed.querySelectorAll('.post-card'));
                const idx = cards.indexOf(postCard);
                openPreview(idx >= 0 ? idx : 0);
            }
            document.removeEventListener('touchend', touchEndHandler);
        };
        document.addEventListener('touchend', touchEndHandler, { passive: true });
    }, { passive: true });
}

// ------------------------------------------------------------
// MANEJO DE AUTENTICACIÓN Y VISIBILIDAD DE BOTONES
// ------------------------------------------------------------
function updateAuthUI(user) {
    const registerBtn = document.getElementById('register-btn-nav');
    const loginBtn = document.getElementById('login-btn-nav');
    const logoutBtn = document.getElementById('logout-btn');
    const userAvatarContainer = document.getElementById('user-avatar'); // ahora es un <a>
    const userAvatarImg = document.getElementById('user-avatar-img');
    const createPostBtn = document.querySelector('.create-post-btn');
    const feed = document.getElementById('feed');

    if (user) {
        // Usuario autenticado
        registerBtn.style.display = 'none';
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'flex';

        if (userAvatarContainer) {
            userAvatarContainer.style.display = 'flex';
            userAvatarContainer.href = 'perfil.html'; // enlace a perfil
            if (user.photoURL) {
                userAvatarImg.src = user.photoURL;
            } else {
                const name = user.displayName || 'Usuario';
                userAvatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7c3aed&color=fff&size=64`;
            }
            userAvatarContainer.title = user.displayName || 'Usuario';
        }

        if (createPostBtn) createPostBtn.style.display = 'flex';

        // Mostrar mensaje de bienvenida en el feed
        if (feed) {
            let authMsg = document.getElementById('auth-message');
            const displayName = user.displayName || 'Usuario';
            if (authMsg) {
                authMsg.innerHTML = `
                    <div style="font-size: 28px;">👋</div>
                    <div><strong>Bienvenido a BIN, ${displayName}!</strong></div>
                    <div style="font-size: 13px; color: var(--text-2);">Disfruta explorando y compartiendo</div>
                `;
                authMsg.style.background = 'var(--bg-raised)';
                authMsg.style.border = '1px solid var(--border-vivid)';
                authMsg.style.color = 'var(--text-1)';
            } else {
                const msg = document.createElement('div');
                msg.id = 'auth-message';
                msg.style.cssText = `
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 16px 20px;
                    color: var(--text-1);
                    background: var(--bg-raised);
                    border-radius: 12px;
                    border: 1px solid var(--border-vivid);
                    margin-bottom: 8px;
                    font-size: 15px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                `;
                msg.innerHTML = `
                    <div style="font-size: 28px;">👋</div>
                    <div><strong>Bienvenido a BIN, ${displayName}!</strong></div>
                    <div style="font-size: 13px; color: var(--text-2);">Disfruta explorando y compartiendo</div>
                `;
                feed.prepend(msg);
            }
        }
    } else {
        // No autenticado
        registerBtn.style.display = 'flex';
        loginBtn.style.display = 'flex';
        logoutBtn.style.display = 'none';
        if (userAvatarContainer) {
            userAvatarContainer.style.display = 'none';
            userAvatarImg.src = '';
        }
        if (createPostBtn) createPostBtn.style.display = 'none';

        // Mostrar mensaje de invitación en el feed
        if (feed) {
            let authMsg = document.getElementById('auth-message');
            if (authMsg) {
                authMsg.innerHTML = `
                    <div style="font-size: 32px;">🔐</div>
                    <div><strong>Inicia sesión</strong> para publicar y comentar.</div>
                    <div style="font-size: 13px; color: var(--text-2);">
                        <a href="login.html" style="color: var(--accent); text-decoration: none; font-weight: 600;">Iniciar sesión</a>
                        &nbsp;o&nbsp;
                        <a href="registro.html" style="color: var(--accent); text-decoration: none; font-weight: 600;">Registrarse</a>
                    </div>
                `;
                authMsg.style.background = 'var(--bg-surface)';
                authMsg.style.border = '1px solid var(--border-vivid)';
                authMsg.style.color = 'var(--text-2)';
            } else {
                const msg = document.createElement('div');
                msg.id = 'auth-message';
                msg.style.cssText = `
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 24px 20px;
                    color: var(--text-2);
                    background: var(--bg-surface);
                    border-radius: 12px;
                    border: 1px solid var(--border-vivid);
                    margin-bottom: 8px;
                    font-size: 15px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                `;
                msg.innerHTML = `
                    <div style="font-size: 32px;">🔐</div>
                    <div><strong>Inicia sesión</strong> para publicar y comentar.</div>
                    <div style="font-size: 13px; color: var(--text-2);">
                        <a href="login.html" style="color: var(--accent); text-decoration: none; font-weight: 600;">Iniciar sesión</a>
                        &nbsp;o&nbsp;
                        <a href="registro.html" style="color: var(--accent); text-decoration: none; font-weight: 600;">Registrarse</a>
                    </div>
                `;
                feed.prepend(msg);
            }
        }
    }
}

// ------------------------------------------------------------
// INICIALIZACIÓN
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    // Inyectar estilos adicionales (loading spinner para scroll infinito)
    if (!document.getElementById('infinite-scroll-styles')) {
        const style = document.createElement('style');
        style.id = 'infinite-scroll-styles';
        style.textContent = `
            .loading-spinner {
                display: inline-block;
                width: 24px;
                height: 24px;
                border: 3px solid var(--border);
                border-top-color: var(--accent);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin-right: 8px;
                vertical-align: middle;
            }
            #sentinel {
                padding: 16px;
                text-align: center;
                color: var(--text-2);
                font-size: 14px;
            }
            .no-more-message {
                color: var(--text-2);
                font-size: 13px;
                letter-spacing: 1px;
            }
        `;
        document.head.appendChild(style);
    }

    // Inicializar acciones
    initActions();

    // Escuchar autenticación
    onAuthStateChanged(auth, (user) => {
        updateAuthUI(user);
    });

    // Cargar primera página (9 posts)
    cargarPostsDesdeLaNube(false);

    // Inicializar vista previa
    initPostSelection();

    // ------------------------------------------------------------
    // CÁMARA
    // ------------------------------------------------------------
    const cameraBtn = document.getElementById('camera-btn');
    const cameraOverlay = document.getElementById('camera-overlay');
    const closeCameraBtn = document.getElementById('close-camera');
    const webcam = document.getElementById('webcam');
    const cameraFallback = document.getElementById('camera-fallback');
    let stream = null;

    if (cameraBtn && cameraOverlay) {
        cameraBtn.addEventListener('click', async () => {
            cameraOverlay.style.display = 'flex';
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
                });
                webcam.srcObject = stream;
                webcam.style.display = 'block';
                cameraFallback.style.display = 'none';
            } catch (err) {
                webcam.style.display = 'none';
                cameraFallback.style.display = 'flex';
            }
        });

        closeCameraBtn.addEventListener('click', () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
            cameraOverlay.style.display = 'none';
        });

        const shutter = document.querySelector('.camera-shutter');
        if (shutter) {
            shutter.addEventListener('click', () => {
                const flash = document.createElement('div');
                flash.style.cssText = `
                    position: absolute; top:0; left:0; width:100%; height:100%;
                    background:white; z-index:53; opacity:0; pointer-events:none;
                    transition: opacity 0.1s;
                `;
                cameraOverlay.appendChild(flash);
                flash.style.opacity = '0.8';
                setTimeout(() => {
                    flash.style.opacity = '0';
                    setTimeout(() => flash.remove(), 200);
                }, 100);
                const notif = document.createElement('div');
                notif.style.cssText = `
                    position: absolute; bottom:140px; left:50%; transform:translateX(-50%);
                    background:rgba(0,0,0,0.8); color:white; padding:12px 24px;
                    border-radius:12px; font-size:16px; z-index:54;
                    animation: slideDown 0.3s ease;
                `;
                notif.textContent = 'Captura simulada';
                cameraOverlay.appendChild(notif);
                setTimeout(() => notif.remove(), 1500);
            });
        }
    }

    // ------------------------------------------------------------
    // CERRAR SESIÓN
    // ------------------------------------------------------------
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                showGlobalNotification('Sesión cerrada correctamente.', '#f87171');
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                showGlobalNotification('Error al cerrar sesión.', '#e74c3c');
            }
        });
    }
});