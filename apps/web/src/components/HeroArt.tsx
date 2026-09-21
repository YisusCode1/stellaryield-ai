export default function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 320 240" aria-hidden="true">
      <defs>
        <radialGradient id="coin" cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor="#8f9cff" />
          <stop offset="1" stopColor="#3327c9" />
        </radialGradient>
      </defs>
      <ellipse cx="165" cy="130" rx="140" ry="52" fill="none" stroke="#5b6cff" strokeOpacity=".45" strokeDasharray="3 6" transform="rotate(-24 165 130)" />
      <circle cx="165" cy="120" r="68" fill="url(#coin)" />
      <circle cx="165" cy="120" r="54" fill="none" stroke="#c9d0ff" strokeOpacity=".5" strokeWidth="2" />
      <ellipse cx="165" cy="120" rx="34" ry="13" fill="none" stroke="#fff" strokeWidth="6" transform="rotate(-28 165 120)" />
      <ellipse cx="165" cy="120" rx="34" ry="13" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="3" transform="rotate(-28 165 120) translate(0 14)" />
      <circle cx="82" cy="52" r="20" fill="#2f6bff" />
      <text x="82" y="60" textAnchor="middle" fontSize="22" fontWeight="700" fill="#fff">$</text>
      <path d="M70 176c2 9 6 13 15 15-9 2-13 6-15 15-2-9-6-13-15-15 9-2 13-6 15-15Z" fill="#12163a" stroke="#6b78ff" strokeWidth="2" />
      <path d="M232 168c2.5 9 6.5 13 15.5 15-9 2-13 6-15.5 15-2.5-9-6.5-13-15.5-15 9-2 13-6 15.5-15Z" fill="#12163a" stroke="#6b78ff" strokeWidth="2" />
      <circle cx="262" cy="36" r="3" fill="#8f9cff" />
      <circle cx="40" cy="120" r="2.5" fill="#8f9cff" />
    </svg>
  )
}