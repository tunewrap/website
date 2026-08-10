export const SOUND_ICON_KEYS=[
  'music-note','waveform','pulse','disco','guitar','bass','drums','piano',
  'cello','violin','strings','sax','trumpet','brass','synth','keys',
  'orchestra','ethnic','sparkles','metal'
];

export const SOUND_ICON_LABELS={
  'music-note':'Нота',
  waveform:'Волна',
  pulse:'Пульс',
  disco:'Диско',
  guitar:'Гитара',
  bass:'Бас',
  drums:'Барабаны',
  piano:'Фортепиано',
  cello:'Виолончель',
  violin:'Скрипка',
  strings:'Струнные',
  sax:'Саксофон',
  trumpet:'Труба',
  brass:'Духовые',
  synth:'Синтезатор',
  keys:'Клавиши',
  orchestra:'Оркестр',
  ethnic:'Этника',
  sparkles:'TuneWrap',
  metal:'Metal'
};

const PATHS={
  'music-note':'<path d="M10 5v11.3a3.2 3.2 0 1 1-2-3V7l10-2v9.3a3.2 3.2 0 1 1-2-3V5.4L10 6.6"/>',
  waveform:'<path d="M3 12h2l1.4-5 2.2 10 2.2-12 2.3 14 2.1-11 1.8 8 1-4h3"/>',
  pulse:'<path d="M3 12h4l2-5 3 10 3-10 2 5h4"/>',
  disco:'<circle cx="12" cy="12" r="7"/><path d="M5.5 9h13M5.5 15h13M9 5.5v13M15 5.5v13"/>',
  guitar:'<path d="M8 14c-3 0-4.8 1.8-4.8 4 0 1.9 1.5 3.2 3.5 3.2 2.3 0 4.1-1.5 4.1-3.7 0-.8-.2-1.5-.6-2.1l6.9-6.9 1.9 1.9 2-2-5.4-5.4-2 2 1.9 1.9-6.8 6.8c-.2.2-.4.3-.7.3Z"/>',
  bass:'<path d="M8 14c-3 0-4.8 1.8-4.8 4 0 1.9 1.5 3.2 3.5 3.2 2.3 0 4.1-1.5 4.1-3.7 0-.8-.2-1.5-.6-2.1l7.4-7.4M13 5l6 6M16 4l4 4"/>',
  drums:'<ellipse cx="12" cy="8" rx="7" ry="3"/><path d="M5 8v8c0 1.7 3.1 3 7 3s7-1.3 7-3V8M8 4l-2-2M16 4l2-2"/>',
  piano:'<path d="M4 5h16v14H4zM8 5v14M12 5v14M16 5v14M6.5 5v7h3V5M14.5 5v7h3V5"/>',
  cello:'<path d="M12 3v18M9 5c-3 1-3 4-1 6-3 2-2 7 1 8M15 5c3 1 3 4 1 6 3 2 2 7-1 8M8 12h8M10 21h4"/>',
  violin:'<path d="M12 3v18M9 6c-2 1-2 4 0 5-2 1-2 5 0 6M15 6c2 1 2 4 0 5 2 1 2 5 0 6M9 12h6M15 5l3-2"/>',
  strings:'<path d="M5 5v14M9 4v16M13 6v12M17 3v18M21 7v10"/>',
  sax:'<path d="M9 4c1 4 1 8-1 11-1 2 0 5 3 5 4 0 6-4 4-7l-2-2M13 11l5-5M17 5l2 2M7 7h4"/>',
  trumpet:'<path d="M4 10h9v4H4M13 9v6M16 8v8M19 7v10M19 10h2v4h-2M7 8v2M10 8v2"/>',
  brass:'<path d="M4 8h8v3H4M4 13h10v3H4M12 6l8 3v6l-6 3M8 5v3M10 17v2"/>',
  synth:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M6 10h2M10 10h2M14 10h2M18 10h1M6 14h8M16 14h3"/>',
  keys:'<path d="M4 7h16v10H4zM8 7v10M12 7v10M16 7v10M6 7v5h3V7M14 7v5h3V7"/>',
  orchestra:'<path d="M4 18h16M6 18V9l3-3v12M12 18V5l3 3v10M18 18V10M4 6l16 12"/>',
  ethnic:'<path d="M12 3c5 0 8 4 8 9s-3 9-8 9-8-4-8-9 3-9 8-9Z"/><path d="M8 7c3 3 5 7 6 12M15 6c-2 4-4 7-7 10"/>',
  sparkles:'<path d="M12 3l1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3ZM18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2ZM6 14.5l.7 1.8 1.8.7-1.8.7L6 19.5l-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"/>',
  metal:'<path d="M5 4l3 16 4-10 4 10 3-16M7 8h10"/>'
};

export function soundIconSvg(key,className='sound-icon'){
  const path=PATHS[key]||PATHS['music-note'];
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${path}</svg>`;
}
