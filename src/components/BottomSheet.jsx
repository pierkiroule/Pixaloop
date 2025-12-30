import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from '../propTypesStub';
import { X } from '../icons';

function BottomSheet({ open, onClose, title, icon: Icon, children, desktopMode = false }) {
  const [dragOffset, setDragOffset] = useState(0);
  const startYRef = useRef(null);
  const sheetRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && open) {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setDragOffset(0);
      startYRef.current = null;
    }
  }, [open]);

  const closedOffset = useMemo(() => (desktopMode ? '40px' : '110%'), [desktopMode]);
  const translateValue = open ? `${dragOffset}px` : closedOffset;
  const transformValue = `translate(-50%, ${translateValue})`;

  const handlePointerDown = (event) => {
    startYRef.current = event.clientY;
    sheetRef.current?.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (startYRef.current === null) return;
    const delta = event.clientY - startYRef.current;
    setDragOffset(Math.max(delta, 0));
  };

  const handlePointerEnd = (event) => {
    if (startYRef.current === null) return;
    const delta = dragOffset;
    startYRef.current = null;
    setDragOffset(0);
    sheetRef.current?.releasePointerCapture?.(event.pointerId);
    if (delta > 80) {
      onClose?.();
    }
  };

  return (
    <>
      <div className={`sheet-backdrop ${open ? 'open' : ''}`} aria-hidden onClick={onClose} />
      <section
        className={`bottom-sheet ${open ? 'open' : ''} ${desktopMode ? 'desktop' : ''}`}
        style={{ transform: transformValue }}
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
      >
        <div
          className="sheet-grab-area"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          role="presentation"
        >
          <span className="sheet-handle" />
        </div>

        <header className="sheet-header">
          <div className="sheet-title">
            {Icon && <Icon size={18} />}
            <div>
              <p className="chip">Panneau</p>
              <h3>{title}</h3>
            </div>
          </div>
          <button type="button" className="sheet-close" aria-label="Fermer le panneau" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="sheet-body">{children}</div>
      </section>
    </>
  );
}

BottomSheet.propTypes = {
  children: PropTypes.node,
  desktopMode: PropTypes.bool,
  icon: PropTypes.elementType,
  onClose: PropTypes.func,
  open: PropTypes.bool,
  title: PropTypes.string,
};

export default BottomSheet;
