// función para formatear la fecha
export function formatRelativeDate(date) {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `Hace ${diffMins} minutos`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `Hace ${diffHrs} horas`;
    const diffDays = Math.floor(diffHrs / 24);
    return `Hace ${diffDays} días`;
}