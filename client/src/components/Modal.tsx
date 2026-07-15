import { ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// Deliberately does not close on overlay click or Escape — only via an
// explicit close/cancel/submit button inside the modal, so a stray click
// or keypress can't silently discard an in-progress form (e.g. a review
// decision or profile edit).
const Modal = ({ title, onClose, children }: ModalProps) => {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
