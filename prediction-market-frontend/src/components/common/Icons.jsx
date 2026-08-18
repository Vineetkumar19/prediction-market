/**
 * Icons.jsx
 * Inline SVG icons. Kept local so the project has no icon-library dependency
 * and works offline. Every icon inherits `currentColor` and takes a size prop.
 */

const base = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
});

export const IconHome = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </svg>
);

export const IconWallet = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1" />
    <path d="M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7H6a3 3 0 0 1-3-3.5Z" />
    <circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconHistory = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const IconUser = ({ size = 20 }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6" />
  </svg>
);

export const IconBell = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
    <path d="M10.5 20a2 2 0 0 0 3 0" />
  </svg>
);

export const IconShield = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3Z" />
    <path d="m9.5 12 1.8 1.8 3.4-3.6" />
  </svg>
);

export const IconTrendUp = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </svg>
);

export const IconTrendDown = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M3 7l6 6 4-4 8 8" />
    <path d="M15 17h6v-6" />
  </svg>
);

export const IconClock = ({ size = 20 }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);

export const IconCheck = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const IconCheckCircle = ({ size = 20 }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.2 2.4 2.4 4.6-5" />
  </svg>
);

export const IconX = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconXCircle = ({ size = 20 }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </svg>
);

export const IconAlert = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M12 4.5 2.8 20h18.4L12 4.5Z" />
    <path d="M12 10v4" />
    <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const IconInfo = ({ size = 20 }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSearch = ({ size = 18 }) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const IconEye = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
);

export const IconEyeOff = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M4 4l16 16" />
    <path d="M9.5 5.9A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.2 4" />
    <path d="M6.3 7.9A17.2 17.2 0 0 0 2.5 12S6 18.5 12 18.5a9.7 9.7 0 0 0 4-.85" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);

export const IconCopy = ({ size = 16 }) => (
  <svg {...base(size)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </svg>
);

export const IconLogout = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 8l-4 4 4 4" />
    <path d="M6 12h9" />
  </svg>
);

export const IconPlus = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconRefresh = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.5" />
    <path d="M4 4v4.5h4.5" />
    <path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.5" />
    <path d="M20 20v-4.5h-4.5" />
  </svg>
);

export const IconArrowLeft = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </svg>
);

export const IconLock = ({ size = 18 }) => (
  <svg {...base(size)}>
    <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </svg>
);

export const IconCoins = ({ size = 20 }) => (
  <svg {...base(size)}>
    <ellipse cx="12" cy="6.5" rx="7.5" ry="3" />
    <path d="M4.5 6.5v5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-5" />
    <path d="M4.5 11.5v5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-5" />
  </svg>
);

export const IconInbox = ({ size = 22 }) => (
  <svg {...base(size)}>
    <path d="M3 13h5l1.5 3h5L16 13h5" />
    <path d="M4.6 5.5 3 13v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5l-1.6-7.5A2 2 0 0 0 17.5 4h-11a2 2 0 0 0-1.9 1.5Z" />
  </svg>
);

export const IconUsers = ({ size = 20 }) => (
  <svg {...base(size)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5" />
    <path d="M16 5.2a3.5 3.5 0 0 1 0 6.6" />
    <path d="M18 14.8c2.1.7 3.5 2.3 3.5 4.2" />
  </svg>
);

export const IconGrid = ({ size = 20 }) => (
  <svg {...base(size)}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </svg>
);

export const IconImage = ({ size = 22 }) => (
  <svg {...base(size)}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="m4 17 5-4.5 3.5 3L16 12l4 4" />
  </svg>
);

export const IconTarget = ({ size = 18 }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

export const IconMenu = ({ size = 22 }) => (
  <svg {...base(size)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconChevronRight = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const IconSpark = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 20.5l-1.8-5.9L4.5 12.8 10.2 11 12 3.5Z" />
  </svg>
);
