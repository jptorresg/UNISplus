//script para el carrusel
window.onload = () => {
    document.querySelectorAll(".carousel").forEach(carousel => {
        const track = carousel.querySelector(".carousel-track");
        const prevBtn = carousel.querySelector(".prev");
        const nextBtn = carousel.querySelector(".next");
        const items = carousel.querySelectorAll(".carousel-item");

        let index = 0;
        const totalItems = items.length;
        const visibleItems = carousel.classList.contains("single-image-carousel") ? 1 : 3;
        const itemWidth = 100 / visibleItems;

        nextBtn.addEventListener("click", () => {
            if (index < totalItems - visibleItems) {
                index++;
                track.style.transform = `translateX(-${index * itemWidth}%)`;
            }
        });

        prevBtn.addEventListener("click", () => {
            if (index > 0) {
                index--;
                track.style.transform = `translateX(-${index * itemWidth}%)`;
            }
        });

        track.style.width = `${totalItems * (100 / visibleItems)}%`;
    });
}

//script para el menu
document.addEventListener("DOMContentLoaded", () => {
    const menu = document.getElementById("slide-menu");
    const menuIcon = document.querySelector(".menu-trigger");
    const closeBtn = document.getElementById("close-btn");

    if (menuIcon && menu && closeBtn) {
        menuIcon.addEventListener("click", openMenu);
        closeBtn.addEventListener("click", closeMenu);

        document.addEventListener("click", (event) => {

            if (
                menu.classList.contains("active") &&
                !menu.contains(event.target) &&
                !menuIcon.contains(event.target)
            ) {
                closeMenu();
            }
        });
    }
});

function openMenu() {
    const menu = document.getElementById("slide-menu");
    if (menu) {
        menu.classList.add("active");
    }
}

function closeMenu() {
    const menu = document.getElementById("slide-menu");
    if (menu) {
        menu.classList.remove("active");
    }
}

//script para likes en posts
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async (event) => {
            event.preventDefault();

            const postElement = btn.closest('.post');
            const postId = postElement.id.replace('post', '');
            const likeCountSpan = postElement.querySelector('.like-count');
            const icon = btn.querySelector('i');

            try {
                const response = await fetch(`/posts/${postId}/like`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                likeCountSpan.textContent = data.likes;

                if (icon.classList.contains('fa-regular')) {
                    icon.classList.remove('fa-regular');
                    icon.classList.add('fa-solid');
                } else {
                    icon.classList.remove('fa-solid');
                    icon.classList.add('fa-regular');
                }
            } catch (error) {
                console.error('Error al dar like:', error);
            }
        });
    });
});

// script para likes en comentarios
document.addEventListener('DOMContentLoaded', () => {
    console.log("Buscando botones de like");
    console.log(document.querySelectorAll('.comment-like-btn'));

    const likeButtons = document.querySelectorAll('.comment-like-btn');

    likeButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const commentId = button.dataset.id;

            try {
                const response = await fetch(`/comment/${commentId}/like`, {
                    method: 'POST'
                });
                const data = await response.json();

                const icon = button.querySelector('i');
                const countSpan = button.querySelector('.like-count');
                let currentCount = parseInt(countSpan.textContent) || 0;

                if (data.liked) {
                    icon.classList.remove('fa-regular');
                    icon.classList.add('fa-solid');
                    countSpan.textContent = currentCount + 1;
                } else {
                    icon.classList.remove('fa-solid');
                    icon.classList.add('fa-regular');
                    countSpan.textContent = currentCount - 1;
                }
            } catch (error) {
                console.error('Error al dar like al comentario:', error);
            }
        });
    });
});

// script para visualización de los juegos
function loadGame(url) {
    const iframe = document.getElementById('game-frame');
    const container = document.getElementById('game-frame-container');
    iframe.src = url;
    container.style.display = 'block';
    window.scrollTo({ top: container.offsetTop, behavior: 'smooth' });
}

function loadGame(url) {
    const iframe = document.getElementById('game-frame');
    const modal = document.getElementById('game-modal');
    iframe.src = url;
    modal.style.display = 'flex';
}

function closeGame() {
    const iframe = document.getElementById('game-frame');
    const modal = document.getElementById('game-modal');
    iframe.src = '';
    modal.style.display = 'none';
}