export function LogoMark(){
  return <svg className="logo-mark" aria-hidden="true" viewBox="0 0 40 40" fill="none">
    <g className="logo-mark-dark">
      <rect width="40" height="40" rx="11" fill="#10241b"/>
      <rect x="7" y="22" width="5.2" height="11" rx="1.6" fill="#3dff8f"/>
      <rect x="14" y="13" width="5.2" height="20" rx="1.6" fill="#3dff8f"/>
      <rect x="21" y="17" width="5.2" height="16" rx="1.6" fill="#2ee07a"/>
      <rect x="28" y="9" width="5.2" height="24" rx="1.6" fill="#7cffb4"/>
    </g>
    <g className="logo-mark-light">
      <rect width="40" height="40" rx="11" fill="#254edb"/>
      <path d="M15 12V9h10v3" stroke="#c4d5ff" strokeWidth="2.5" strokeLinejoin="round"/>
      <rect x="7" y="13" width="26" height="21" rx="4" fill="#17379f" stroke="#d8e3ff" strokeWidth="1.6"/>
      <path d="M12 28l6-7 5 4 6-8m-6 0h6v6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  </svg>;
}
