import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

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
  // Rendered via a portal straight into <body> — a modal invoked from
  // deep inside a table cell (e.g. clicking an Avatar thumbnail in a
  // table row) otherwise inherits any stacking-context/containing-block
  // quirks from its DOM ancestors (a filter/transform/overflow
  // somewhere up the tree can trap a position:fixed descendant, leaving
  // just the dimmed backdrop visible with no card on top of it). A
  // portal sidesteps that entirely regardless of where in the tree
  // <Modal> gets invoked from.
  return createPortal(
    <div className="modal-overlay" style={scrollable ? undefined : { alignItems: 'flex-start', overflowY: 'auto' }}>
      <div className="modal-card" style={scrollable ? undefined : { maxHeight: 'none', overflowY: 'visible', margin: '1.5rem 0' }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
