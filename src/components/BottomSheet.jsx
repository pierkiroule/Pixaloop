import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from '../propTypesStub';
import { X } from '../icons';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function BottomSheet({ open, onClose, title, icon: Icon, children, desktopMode = false }) {
  const [dragOffset, setDragOffset] = useState(0);
  const startYRef = useRef(null);
  const pointerIdRef = useRef(null);
  const sheetRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const focusableElements = () => {
      if (!sheetRef.current) return [];
      return Array.from(sheetRef.current.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
        (el) => (el.offsetParent !== null || el.getClientRects().length > 0) && !el.hasAttribute('aria-hidden'),
      );
    };

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;

    const [firstFocusable] = focusableElements();
    (firstFocusable || sheetRef.current)?.focus?.({ preventScroll: true });

    const handleKeyDown = (event) => {
      if (!open) return;
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const elements = focusableElements();
      if (!elements.length) {
        event.preventDefault();
        sheetRef.current?.focus?.({ preventScroll: true });
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !sheetRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setDragOffset(0);
      startYRef.current = null;
      pointerIdRef.current = null;
    }
  }, [open]);

  const closedOffset = useMemo(() => (desktopMode ? '40px' : '110%'), [desktopMode]);
  const translateValue = open ? `${dragOffset}px` : closedOffset;
  const transformValue = `translate(-50%, ${translateValue})`;

  const handlePointerDown = (event) => {
    const isSwipeAllowed = !desktopMode || event.pointerType === 'touch' || event.pointerType === 'pen';
    if (!isSwipeAllowed) return;

    startYRef.current = event.clientY;
    pointerIdRef.current = event.pointerId;
    sheetRef.current?.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!sheetRef.current || pointerIdRef.current !== event.pointerId) return;
    if (startYRef.current === null) return;
    const delta = event.clientY - startYRef.current;
    setDragOffset(Math.max(delta, 0));
  };

  const handlePointerEnd = (event) => {
    if (startYRef.current === null || pointerIdRef.current !== event.pointerId) return;
    const delta = dragOffset;
    startYRef.current = null;
    pointerIdRef.current = null;
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
        tabIndex={-1}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
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
