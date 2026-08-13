import { createPortal } from 'react-dom';

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Да',
  cancelLabel = 'Нет',
  onConfirm,
  onCancel,
  danger,
}) {
  return createPortal(
    <div className="modal-overlay" onClick={onCancel}>
      <article className="booking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <button className="modal-close" onClick={onCancel} aria-label="Закрыть">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        <div className="modal-body">
          <h2>{title}</h2>
          <p>{message}</p>
          <div className="two-cols" style={{ marginTop: 12 }}>
            <button className={`primary${danger ? ' danger' : ''}`} onClick={onConfirm}>
              {confirmLabel}
            </button>
            <button className="secondary" onClick={onCancel}>
              {cancelLabel}
            </button>
          </div>
        </div>
      </article>
    </div>,
    document.body,
  );
}
