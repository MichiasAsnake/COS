import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base: P = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };

export const Icons = {
  home:     (p: P) => <svg {...base} {...p}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>,
  inbox:    (p: P) => <svg {...base} {...p}><path d="M3 13l3-8h12l3 8" /><path d="M3 13v6h18v-6" /><path d="M8 13a4 4 0 008 0" /></svg>,
  folder:   (p: P) => <svg {...base} {...p}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>,
  agents:   (p: P) => <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>,
  tpl:      (p: P) => <svg {...base} {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="3" y="15" width="7" height="6" rx="1.5" /><rect x="14" y="11" width="7" height="10" rx="1.5" /></svg>,
  brain:    (p: P) => <svg {...base} {...p}><path d="M9 4a3 3 0 00-3 3v0a3 3 0 00-2 5 3 3 0 002 5v0a3 3 0 003 3h6a3 3 0 003-3v0a3 3 0 002-5 3 3 0 00-2-5v0a3 3 0 00-3-3H9z" /><path d="M9 8v8M15 8v8M9 12h6" /></svg>,
  book:     (p: P) => <svg {...base} {...p}><path d="M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2V5z" /><path d="M8 7h8M8 11h8M8 15h6" /></svg>,
  bars:     (p: P) => <svg {...base} {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  plus:     (p: P) => <svg {...base} strokeWidth={1.8} {...p}><path d="M12 5v14M5 12h14" /></svg>,
  share:    (p: P) => <svg {...base} {...p}><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 11l7.6-4M8.2 13l7.6 4" /></svg>,
  star:     (p: P) => <svg {...base} {...p}><path d="M12 3l2.6 5.6 6 .9-4.4 4.3 1.1 6.1L12 17.1 6.7 19.9l1.1-6.1L3.4 9.5l6-.9L12 3z" /></svg>,
  more:     (p: P) => <svg {...base} strokeWidth={2} {...p}><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></svg>,
  edit:     (p: P) => <svg {...base} {...p}><path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="M14 6l4 4" /></svg>,
  arrowR:   (p: P) => <svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  chevR:    (p: P) => <svg {...base} {...p}><path d="M9 6l6 6-6 6" /></svg>,
  chevL:    (p: P) => <svg {...base} {...p}><path d="M15 6l-6 6 6 6" /></svg>,
  bookmark: (p: P) => <svg {...base} {...p}><path d="M6 3h12v18l-6-4-6 4V3z" /></svg>,
  check:    (p: P) => <svg {...base} strokeWidth={2} {...p}><path d="M5 12l5 5L20 7" /></svg>,
  wand:     (p: P) => <svg {...base} {...p}><path d="M3 21l12-12" /><path d="M14 4v3M19 4v3M14 7h5M16 14v3M21 14v3M16 17h5" /></svg>,
  cog:      (p: P) => <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 00-.1-1l2-1.5-2-3.5-2.4.9a7 7 0 00-1.7-1L14.5 3h-5l-.3 2.4a7 7 0 00-1.7 1l-2.4-.9-2 3.5 2 1.5a7 7 0 000 2l-2 1.5 2 3.5 2.4-.9a7 7 0 001.7 1l.3 2.4h5l.3-2.4a7 7 0 001.7-1l2.4.9 2-3.5-2-1.5c.07-.33.1-.66.1-1z" /></svg>,
  doc:      (p: P) => <svg {...base} {...p}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 16h6" /></svg>,
  download: (p: P) => <svg {...base} {...p}><path d="M12 4v12M6 12l6 6 6-6M4 20h16" /></svg>,
  refresh:  (p: P) => <svg {...base} {...p}><path d="M3 12a9 9 0 0115-6.7L21 8M21 4v4h-4M21 12a9 9 0 01-15 6.7L3 16M3 20v-4h4" /></svg>,
  copy:     (p: P) => <svg {...base} {...p}><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h3" /></svg>,
  person:   (p: P) => <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M5.5 18a7 7 0 0113 0" /></svg>,
};
