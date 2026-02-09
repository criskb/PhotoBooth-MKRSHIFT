export function createModalManager() {
  const modals = new Map();
  let activeModal = null;

  function registerModal({
    id,
    element,
    openClass,
    priority = 0,
    onOpen = null,
    onClose = null,
  }) {
    if (!element) {
      return {
        open: () => false,
        close: () => false,
        isOpen: () => false,
      };
    }

    const modal = { id, element, openClass, priority, onOpen, onClose };
    modals.set(id, modal);

    element.addEventListener("click", (event) => {
      if (event.target === element) {
        close(id);
      }
    });

    return {
      open: () => open(id),
      close: () => close(id),
      isOpen: () => isOpen(id),
    };
  }

  function isOpen(id) {
    const modal = modals.get(id);
    if (!modal) {
      return false;
    }
    return modal.element.classList.contains(modal.openClass);
  }

  function open(id, { force = false } = {}) {
    const modal = modals.get(id);
    if (!modal) {
      return false;
    }
    if (activeModal?.id === id) {
      return true;
    }
    if (activeModal && !force) {
      if (activeModal.priority > modal.priority) {
        return false;
      }
      close(activeModal.id);
    }
    modal.element.classList.add(modal.openClass);
    activeModal = modal;
    modal.onOpen?.();
    return true;
  }

  function close(id) {
    const modal = modals.get(id);
    if (!modal) {
      return false;
    }
    if (!isOpen(id)) {
      return false;
    }
    modal.element.classList.remove(modal.openClass);
    if (activeModal?.id === id) {
      activeModal = null;
    }
    modal.onClose?.();
    return true;
  }

  function closeActive() {
    if (!activeModal) {
      return false;
    }
    return close(activeModal.id);
  }

  function handleEscape(event) {
    if (event.key !== "Escape") {
      return false;
    }
    return closeActive();
  }

  return {
    registerModal,
    open,
    close,
    closeActive,
    handleEscape,
    isOpen,
  };
}
