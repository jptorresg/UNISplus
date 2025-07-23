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