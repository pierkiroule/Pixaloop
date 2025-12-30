import PropTypes from './propTypesStub';

const createIcon = (paths) => {
  const Icon = ({ size = 24, ...rest }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {paths.map((d, index) => (
        <path key={d + index} d={d} />
      ))}
    </svg>
  );
  Icon.propTypes = {
    size: PropTypes.number,
  };
  return Icon;
};

export const Anchor = createIcon(['M12 2v7', 'M5 12h14', 'M7 12a5 5 0 0010 0', 'M12 22v-6']);
export const Camera = createIcon([
  'M3 7h4l2-3h6l2 3h4v11H3z',
  'M12 12.5a3 3 0 100 6 3 3 0 000-6z',
]);
export const Cloud = createIcon(['M5 16a4 4 0 010-8 6 6 0 0111.5-1.5A5 5 0 1118 16z']);
export const Droplets = createIcon(['M12 3l-4 7a4 4 0 108 0z', 'M17 4l-2 4', 'M7 4l2 4']);
export const Eye = createIcon(['M1.5 12s4.5-7 10.5-7 10.5 7 10.5 7-4.5 7-10.5 7S1.5 12 1.5 12z', 'M12 12a3 3 0 110 6 3 3 0 010-6z']);
export const Globe = createIcon([
  'M12 2a10 10 0 100 20 10 10 0 000-20z',
  'M2 12h20',
  'M12 2a15 15 0 010 20',
  'M12 2a15 15 0 000 20',
]);
export const Image = createIcon(['M4 4h16v16H4z', 'M4 15l4-4 3 3 4-5 5 6']);
export const LayoutPanelLeft = createIcon(['M4 4h6v16H4z', 'M10 4h10v16H10z']);
export const Menu = createIcon(['M4 7h16', 'M4 12h16', 'M4 17h16']);
export const Monitor = createIcon(['M4 5h16v11H4z', 'M9 19h6']);
export const Palette = createIcon([
  'M12 3a9 9 0 100 18c2 0 3-1 3-2.5a2 2 0 00-2-2 1.5 1.5 0 011.5-1.5A3.5 3.5 0 1115 8',
  'M7.5 10.5h.01',
  'M9 6.5h.01',
  'M15 6.5h.01',
  'M16.5 10.5h.01',
]);
export const Pause = createIcon(['M8 4h3v16H8z', 'M13 4h3v16h-3z']);
export const Play = createIcon(['M7 4l12 8-12 8z']);
export const Sparkles = createIcon([
  'M6 12l2 4 4 2-4 2-2 4-2-4-4-2 4-2z',
  'M18 5l1.2 2.4L21 8.6l-1.8 1.2L18 12l-1.2-2.2L15 8.6l1.8-1.2z',
]);
export const Stars = createIcon(['M12 3l2.5 6.5L21 10l-5 4.5 1.5 6.5L12 17l-5.5 4 1.5-6.5L3 10l6.5-.5z']);
export const Trash2 = createIcon(['M4 7h16', 'M9 7v12', 'M15 7v12', 'M6 7l1-3h10l1 3', 'M5 7v12a2 2 0 002 2h10a2 2 0 002-2V7']);
export const Upload = createIcon(['M12 4v12', 'M8 8l4-4 4 4', 'M4 18h16']);
export const Wand2 = createIcon(['M5 20l14-14', 'M15 6l3-3', 'M9 10l-3 3', 'M19 11l1 1', 'M7 3l1 1']);
export const Wind = createIcon(['M4 8h9a3 3 0 100-6', 'M2 12h14a3 3 0 010 6h-2', 'M5 16h7']);
export const Zap = createIcon(['M13 2l-8 12h7l-1 8 8-12h-7z']);
export const X = createIcon(['M18 6L6 18', 'M6 6l12 12']);
