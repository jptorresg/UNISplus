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