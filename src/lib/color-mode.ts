export const COLOR_MODE_KEY = "nabous-color-mode-v1";
export const colorModeScript = `(()=>{let mode;try{mode=localStorage.getItem('${COLOR_MODE_KEY}')}catch{}document.documentElement.dataset.theme=mode==='light'||mode==='dark'?mode:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'})()`;
