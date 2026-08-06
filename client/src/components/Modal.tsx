import { ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  // Most modals cap at 90vh with their own internal scrollbar (the
  // default — see .modal-card). Some content (e.g. the full Applicant
  // Profile view) reads better growing to its natural height with no
  // nested scrollbar of its own — passing false lets the modal grow
  // freely and, if it's taller than the viewport, scrolls via the
  // overlay/page instead of a cramped inner box.
  scrollable?: boolean;
}

// Deliberately does not close on overlay click or Escape — only via an
// explicit close/cancel/submit button inside the modal, so a stray click
// or keypress can't silently discard an in-progress form (e.g. a review
// decision or profile edit).
const Modal = ({ title, onClose, children, scrollable = true }: ModalProps) => {
  return (
    <div
      className="modal-overlay"
      style={scrollable ? undefined : { alignItems: 'flex-start', overflowY: 'auto' }}
    >
      <div className="modal-card" style={scrollable ? undefined : { maxHeight: 'none', overflowY: 'visible', margin: '1.5rem 0' }}>
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
