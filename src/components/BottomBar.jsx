import PropTypes from '../propTypesStub';
import { Camera, Droplets, Image as ImageIcon, Wind } from '../icons';

const tabs = [
  { id: 'scene', label: 'Mouvement', icon: Wind },
  { id: 'paint', label: 'Peinture', icon: Droplets },
  { id: 'export', label: 'Export', icon: Camera },
  { id: 'media', label: 'Média', icon: ImageIcon },
];

function BottomBar({ activeTab, onChange }) {
  return (
    <nav className="bottom-bar" aria-label="Navigation principale">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            className={`bottom-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
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
