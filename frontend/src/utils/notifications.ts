// frontend/src/utils/notifications.ts

// Ekranda kısa süreliğine bir bildirim (toast) gösterir.
export function showToast(message: string, duration: number = 3000) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = 'toast-notification'; // CSS için bir sınıf atıyoruz
    document.body.appendChild(toast);

    // Kısa bir süre sonra görünür yap (animasyon için)
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Belirtilen süre sonunda kaldır
    setTimeout(() => {
        toast.classList.remove('show');
        // Animasyon bittikten sonra elementi DOM'dan kaldır
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}

// Kullanıcıdan onay isteyen bir modal pencere gösterir.
export function showConfirmationModal(message: string, onConfirm: () => void, onDecline: () => void) {
    // Eğer zaten bir modal açıksa, yenisini açma
    if (document.getElementById('confirmation-modal')) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'confirmation-modal';
    modalOverlay.className = 'modal-overlay'; // CSS için

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    const messageP = document.createElement('p');
    messageP.textContent = message;
    messageP.className = 'mb-6 text-lg';

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex justify-center space-x-4';

    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'Accept'; // Bunları da dil desteğine alabiliriz ama şimdilik basit tutalım
    confirmButton.className = 'bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded';

    const declineButton = document.createElement('button');
    declineButton.textContent = 'Decline';
    declineButton.className = 'bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded';

    buttonContainer.appendChild(declineButton);
    buttonContainer.appendChild(confirmButton);
    modalContent.appendChild(messageP);
    modalContent.appendChild(buttonContainer);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    const closeModal = () => {
        modalOverlay.remove();
    };

    confirmButton.onclick = () => {
        onConfirm();
        closeModal();
    };

    declineButton.onclick = () => {
        onDecline();
        closeModal();
    };
}