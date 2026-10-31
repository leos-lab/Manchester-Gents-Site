// Manchester Gents palette (matches the website's globals.css).
export const colors = {
  navy: '#1c2837',
  navyDeep: '#141d29',
  steel: '#2d4059',
  slate: '#3e587b',
  gold: '#ffd460',
  goldSoft: '#ffe293',
  amber: '#ffc62d',
  text: '#f7f4ed',
  textMuted: 'rgba(247, 244, 237, 0.66)',
  textFaint: 'rgba(247, 244, 237, 0.42)',
  card: 'rgba(255, 255, 255, 0.07)',
  cardPressed: 'rgba(255, 255, 255, 0.12)',
  border: 'rgba(255, 255, 255, 0.12)',
  danger: '#ff6b6b',
  success: '#6fd39b',
  bubbleMine: '#ffd460',
  bubbleMineText: '#1c2837',
  bubbleTheirs: 'rgba(255, 255, 255, 0.09)'
};

export const fonts = {
  heading: 'Thelorin',
  body: undefined // system font (SF Pro / Roboto)
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

// Content never stretches edge-to-edge on wide windows (iPhone Duo open, iPad).
export const MAX_CONTENT_WIDTH = 720;
export const WIDE_BREAKPOINT = 700;
