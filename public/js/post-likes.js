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
                const response = await fetch(`/post/${postId}/like`, {
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