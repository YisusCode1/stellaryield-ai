const paths: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5',
  bars: 'M5 20V11M12 20V5M19 20v-7',
  wallet: 'M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5v-9ZM4 8h15M15.5 13.5h.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16Z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8h.01',
  check: 'M5 12.5 10 17.5 19 7.5',
  chevron: 'M6 9l6 6 6-6',
  drop: 'M12 3s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.2 12 3 12 3Z',
  shield: 'M12 3l7 3v5.5c0 4.3-2.9 8-7 9.5-4.1-1.5-7-5.2-7-9.5V6l7-3Z',
  trend: 'M4 17l6-6 4 4 6-7M15 8h5v5',
  send: 'M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z',
  x: 'M6 6l12 12M18 6 6 18',
  chat: 'M4 5h16v11H9l-5 4V5Z',
  rocket: 'M14 4c3.5 0 6 2.5 6 6-2 3-4 5-7 6l-5-5c1-3 3-5 6-7ZM8 13l-3 1 1 3M11 16l-1 3 3-1M15 9.5h.01',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5H5V6h5',
}

export default function Icon({ name, size = 18 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name] ?? ''} />
    </svg>
  )
}
