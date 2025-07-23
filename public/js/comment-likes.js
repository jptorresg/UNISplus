// script para likes en comentarios
document.addEventListener('DOMContentLoaded', () => {

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