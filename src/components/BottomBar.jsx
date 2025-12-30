import { useRef } from 'react';
import PropTypes from '../propTypesStub';
import { Camera, Droplets, Image as ImageIcon, Wind } from '../icons';

const tabs = [
  { id: 'media', label: 'Média', icon: ImageIcon },
  { id: 'scene', label: 'Mouvement', icon: Wind },
  { id: 'paint', label: 'Peinture', icon: Droplets },
  { id: 'export', label: 'Export', icon: Camera },
];

function BottomBar({ activeTab, onChange }) {
  const startXRef = useRef(null);
  const swipeConsumedRef = useRef(false);
  const navRef = useRef(null);
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

  const handleTabChange = (tabId) => {
    if (swipeConsumedRef.current) {
      swipeConsumedRef.current = false;
      return;
    }
    onChange?.(tabId);
  };

  const goToRelativeTab = (direction) => {
    if (activeIndex === -1) return;
    const nextIndex = (activeIndex + direction + tabs.length) % tabs.length;
    onChange?.(tabs[nextIndex].id);
  };

  const handlePointerDown = (event) => {
    startXRef.current = event.clientX;
    swipeConsumedRef.current = false;
    navRef.current?.setPointerCapture?.(event.pointerId);
  };

  const handlePointerEnd = (event) => {
    if (startXRef.current === null) return;
    const deltaX = event.clientX - startXRef.current;
    navRef.current?.releasePointerCapture?.(event.pointerId);
    startXRef.current = null;

    if (Math.abs(deltaX) > 48) {
      swipeConsumedRef.current = true;
      goToRelativeTab(deltaX < 0 ? 1 : -1);
    }
  };

  return (
    <nav
      className="bottom-bar"
      aria-label="Navigation principale"
      ref={navRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            className={`bottom-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
            aria-label={`Onglet ${tab.label}`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <Icon size={18} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

BottomBar.propTypes = {
  activeTab: PropTypes.string,
  onChange: PropTypes.func,
};

export default BottomBar;
