import { useEffect, useRef, useState } from 'react';
import { Camera, Droplets, Menu, Upload } from '../icons';
import PropTypes from '../propTypesStub';

function QuickFab({ onImport, onPaint, onExport, isPaintActive, isExportActive, hasImage }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const imageReady = hasImage ?? true;

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const actions = [
    { id: 'import', label: 'Import', icon: Upload, onClick: onImport },
    { id: 'paint', label: 'Peindre', icon: Droplets, onClick: onPaint, active: isPaintActive, disabled: !imageReady },
    { id: 'export', label: 'Export', icon: Camera, onClick: onExport, active: isExportActive, disabled: !imageReady },
  ];

  const handleAction = (action) => {
    if (action.disabled) return;
    action.onClick?.();
    setOpen(false);
  };

  return (
    <div className={`quick-fab ${open ? 'open' : ''}`} ref={containerRef}>
      <div className="fab-menu" aria-hidden={!open}>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              className={`fab-action ${action.active ? 'active' : ''}`}
              onClick={() => handleAction(action)}
              disabled={action.disabled}
              aria-label={action.label}
              aria-pressed={action.active}
            >
              <Icon size={16} />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="fab-button"
        aria-label={open ? 'Fermer le menu rapide' : 'Ouvrir le menu rapide'}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Menu size={20} />
      </button>
    </div>
  );
}

QuickFab.propTypes = {
  onImport: PropTypes.func,
  onPaint: PropTypes.func,
  onExport: PropTypes.func,
  isPaintActive: PropTypes.bool,
  isExportActive: PropTypes.bool,
  hasImage: PropTypes.bool,
};

export default QuickFab;
