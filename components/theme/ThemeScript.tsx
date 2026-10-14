import { STORAGE_KEY } from "@/lib/theme/settings";
import { PRESET_IDS } from "@/lib/theme/presets";

// Runs before first paint so the saved theme never flashes. Mirrors parseSettings() loosely.
const script = `(function(){try{
var d=document.documentElement,s={};
try{s=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"{}")||{}}catch(e){}
var p=${JSON.stringify(PRESET_IDS)}.indexOf(s.preset)>=0?s.preset:"parchment";
var m=s.mode==="light"||s.mode==="dark"?s.mode:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
d.dataset.preset=p;d.dataset.scheme=m;
if(typeof s.scale==="number"&&s.scale>=0.9&&s.scale<=1.3)d.style.setProperty("--fs-scale",String(s.scale));
}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
