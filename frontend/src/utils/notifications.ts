export function showToast(message: string, duration: number = 3000)
{
	const toast = document.createElement('div');
	toast.textContent = message;
	toast.className = 'toast-notification';
	document.body.appendChild(toast);

	setTimeout(() => {
		toast.classList.add('show');
	}, 100);

	setTimeout(() =>
	{
		toast.classList.remove('show');
		toast.addEventListener('transitionend', () => toast.remove());
	}, duration);
}

export function showConfirmationModal(message: string, onConfirm: () => void, onDecline: () => void)
{
	if (document.getElementById('confirmation-modal'))
		return ;

	const modalOverlay = document.createElement('div');
	modalOverlay.id = 'confirmation-modal';
	modalOverlay.className = 'modal-overlay';

	const modalContent = document.createElement('div');
	modalContent.className = 'modal-content';

	const messageP = document.createElement('p');
	messageP.textContent = message;
	messageP.className = 'mb-6 text-lg';

	const buttonContainer = document.createElement('div');
	buttonContainer.className = 'flex justify-center space-x-4';

	const confirmButton = document.createElement('button');
	confirmButton.textContent = 'Accept';
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

	const closeModal = () =>
	{
		modalOverlay.remove();
	};

	confirmButton.onclick = () =>
	{
		onConfirm();
		closeModal();
	};

	declineButton.onclick = () =>
	{
		onDecline();
		closeModal();
	};
}