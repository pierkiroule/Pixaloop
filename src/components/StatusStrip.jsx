import PropTypes from '../propTypesStub';

function StatusStrip({ hasFile, filterLabel, isAnimating, vrEnabled }) {
  const chips = [
    {
      label: 'Fichier',
      value: hasFile ? 'Chargé' : 'Aucun',
      tone: hasFile ? 'on' : 'off',
    },
    {
      label: 'Filtre',
      value: filterLabel || 'Original',
      tone: 'info',
    },
    {
      label: 'Lecture',
      value: isAnimating ? 'En cours' : 'En pause',
      tone: isAnimating ? 'on' : 'off',
    },
    {
      label: 'VR',
      value: vrEnabled ? 'Activée' : 'Inactive',
      tone: vrEnabled ? 'on' : 'off',
    },
  ];

  return (
    <div className="status-strip">
      {chips.map((chip) => (
        <div key={chip.label} className={`status-chip ${chip.tone}`}>
          <span className="status-chip-label">{chip.label}</span>
          <span className="status-chip-value">{chip.value}</span>
        </div>
      ))}
    </div>
  );
}

StatusStrip.propTypes = {
  filterLabel: PropTypes.string,
  hasFile: PropTypes.bool,
  isAnimating: PropTypes.bool,
  vrEnabled: PropTypes.bool,
};

StatusStrip.defaultProps = {
  filterLabel: 'Original',
  hasFile: false,
  isAnimating: false,
  vrEnabled: false,
};

export default StatusStrip;
