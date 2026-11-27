export default function ProfileIcon({ name }) {
  const paths = {
    sparkle: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/><path d="M20 2v4m-2-2h4"/></>,
    undo: <><path d="m8 3-5 5 5 5M3 8h11a7 7 0 0 1 0 14"/></>,
    back: <path d="m10 5-7 7 7 7M3 12h18"/>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
    edit: <><path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5"/></>,
    camera: <><path d="M4 6h4l2-3h4l2 3h4v15H4Z"/><circle cx="12" cy="13" r="4"/></>,
    education: <><path d="m2 8 10-5 10 5-10 5Z"/><path d="M6 10v7q6 5 12 0v-7M22 8v9"/></>,
    work: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12q9 6 18 0M12 12v5"/></>,
    skills: <><path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/></>,
    file: <><path d="M14 2H5v20h14V7Z"/><path d="M14 2v6h5M8 13h8M8 17h6"/></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
    arrow: <path d="M7 17 17 7M7 7h10v10"/>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
