<script>
  // @ts-nocheck
  // SN AXIS shell — the interactive design, ported from the demo. Reuses the REAL
  // gauge renderer (../lib/gaugeRender, the ScreenGauge mirror) for every preview.
  import { onMount } from 'svelte';
  import { renderGaugePreview, ensureGaugeFont, chanMeta, setPreviewUnits } from '../lib/gaugeRender';
  import { store } from '../lib/store.svelte';
  import { hexToRgb565, rgb565ToHex, CHANNELS, CHANNEL_GROUPS, Ch, channelDef, MonitorBleClient, UNITS_METRIC, UNITS_IMPERIAL, UNIT_OPTIONS, UC_COUNT } from '../lib/monitorCfg';
  import { BleClient } from '../lib/bleClient';
  import { fetchCanManifest, latest, parseVer, downloadFirmware } from '../lib/axisCanOta';
  import { carbonWave } from '../lib/carbonWave';
  import { t, has, setLang, LANGS } from '../lib/i18n';
  // DTC dictionary is LAZY — a large payload (code dict + Thai i18n) only needed on the
  // DTC tab, kept out of the initial bundle. One SHARED in-flight promise; _alive guards a
  // resolve that lands after the shell unmounts; render() repaints once data is in.
  // render() lives inside onMount's closure, but these helpers are module-scope → call it
  // through _render (captured in onMount). _alive guards a resolve after unmount.
  let _richDtc = null, _SEVERITY_META = null, _dtcLoading = null, _dtcErr = false, _alive = true, _render = null;
  function _repaint(){ if (_alive && _render) _render(); }
  function ensureDtc(){
    if (_richDtc) return Promise.resolve();
    if (_dtcLoading) return _dtcLoading;
    if (_dtcErr) return Promise.resolve();       // stay in the error state until the user taps Retry — no auto-retry loop
    // Split load-failure from render-failure (GPT‑6 nit): the rejection handler sits ONLY on the
    // import, so a throw inside render() during the repaint can't flip _dtcErr → the UI never
    // reports a successful load as "couldn't load the data".
    _dtcLoading = import('../lib/dtcRich').then(
      m  => { _richDtc = m.richDtc; _SEVERITY_META = m.SEVERITY_META; },   // success: module assign only
      () => { _dtcErr = true; }                                           // LOAD failure only
    ).then(() => { _dtcLoading = null; _repaint(); });                     // repaint after, outside the load catch
    return _dtcLoading;
  }
  function retryDtc(){ if (_dtcLoading) return; _dtcErr = false; ensureDtc(); _repaint(); }
  import '../lib/axisShell.css';

  onMount(() => {

const GOLD='#cea24a';
// element colour palette (cycled by tapping a swatch)
const PALETTE=[['#cea24a','GOLD'],['#eef0f4','WHITE'],['#9aa0a6','SILVER'],['#b85144','RED'],['#4aa8c9','CYAN'],['#68b09b','GREEN'],['#e08a4a','AMBER']];
// value options = the FULL founder-gauge channel catalogue (monitorCfg), grouped.
const CHAN_ORDER=CHANNELS.filter(c=>c.id!==0).map(c=>c.id);
// APP uses the FULL label (not the gauge's short code), translated when available.
const chName=id=>{const d=channelDef(id);if(!d)return '-';const k='chan:'+d.label;return has(k)?t(k):d.label;};
const FACES=[['concentric','5-Arc',0],['hero','Hero',0],['bars','Bars',0],['needle','Needle',0],['ticks','Ticks',0],['gmeter','G-Meter',0],['trip','Trip',0],['lanes','Lanes',0],['tuner','Tuner',1],['regent','Regent',1],['chrono','Chrono',1]];
// Per-face ELEMENTS. Each row = a shown value (s = ch slot, -1 = none) + a colour
// source `c`: a NUMBER n = PER-VALUE colour slot n (own swatch → work.slot[n], one
// per value, matches firmware slotColour) · 'col2'/'text' = a shared decorative/text
// colour · null = no swatch. Every VALUE gets its own colour (owner: "แยกทุกค่า").
const ELEMS={
  concentric:[{n:'Arc 1',s:0,c:0},{n:'Arc 2',s:1,c:1},{n:'Arc 3',s:2,c:2},{n:'Arc 4',s:3,c:3},{n:'Arc 5',s:4,c:4}],
  hero:[{n:'Big value',s:0,c:0},{n:'Support 1',s:1,c:1},{n:'Support 2',s:2,c:2},{n:'Support 3',s:3,c:3}],
  bars:[{n:'Bar 1',s:0,c:0},{n:'Bar 2',s:1,c:1},{n:'Bar 3',s:2,c:2},{n:'Bar 4',s:3,c:3},{n:'Value text',s:-1,c:'text'}],
  needle:[{n:'Main needle',s:0,c:0},{n:'2nd needle',s:1,c:1},{n:'Value text',s:-1,c:'text'}],
  ticks:[{n:'Lit window',s:0,c:0},{n:'2nd marker',s:1,c:1},{n:'Value text',s:-1,c:'text'}],
  tuner:[{n:'Energy arc',s:1,c:1},{n:'Dot tacho',s:0,c:null},{n:'Readout',s:2,c:'text'},{n:'Sub value',s:3,c:null},{n:'Honeycomb',s:-1,c:'col2'}],
  regent:[{n:'Needle + majors',s:0,c:0},{n:'Value text',s:-1,c:'text'}],
  chrono:[{n:'Main dial',s:0,c:0},{n:'Sub dial',s:1,c:1},{n:'Background',s:-1,c:'col2'},{n:'Value text',s:-1,c:'text'}],
  // G-Meter is IMU-driven — NO channel slots (s:-1). Only decorative colour swatches:
  // the grid/rings (slot 0) + the value text. The live G dot ramps green→amber→red on
  // its own in firmware, so it is not a picked colour.
  gmeter:[{n:'Grid + rings',s:-1,c:0},{n:'Value text',s:-1,c:'text'}],
  trip:[{n:'Trip A / B',s:-1,c:'text'}],
  // LANES live-graph — 4 stacked channel lanes, each with its own colour (slot 0..3).
  lanes:[{n:'Lane 1',s:0,c:0},{n:'Lane 2',s:1,c:1},{n:'Lane 3',s:2,c:2},{n:'Lane 4',s:3,c:3}],
};
// STORE &mdash; the paid gauge faces (the premium tier) sold through App Store / Play Billing.
const STORE_ITEMS=[
  {id:'regent',name:'Regent',price:'$4.99',kind:'face',blurb:'Coachbuilt power-reserve dial'},
  {id:'tuner', name:'Tuner', price:'$4.99',kind:'face',blurb:'Energy-arc tacho, tuner-style'},
  {id:'chrono',name:'Chrono',price:'$4.99',kind:'face',blurb:'Chronograph twin-dial'},
  {id:'allfaces',name:'All premium faces',price:'$9.99',kind:'bundle',blurb:'Regent + Tuner + Chrono, save $5'},
];
const FREE_FACES=['hero','bars','needle','ticks','concentric','gmeter','trip','lanes'];
// The gauge holds MULTIPLE pages (up to 10). S.face/S.work are the LIVE editing values
// for the current page; S.pages[] holds every page (each {face, work}); S.cur = index.
let S={tab:store.axisTab||'home',target:'gauge',face:'hero',peak:true,work:null,owned:new Set([...FREE_FACES,'regent','tuner','chrono']),buying:null,pages:null,cur:0,dirty:false,knobName:'AXIS',dtcSnap:null,dtcBusy:false,dtcLook:'',bright:200,night:{mode:0,nightBright:50,startHr:18,endHr:6,rtcValid:false,curHour:0},connect:false,connecting:null,upd:false,updBusy:null,units:[...UNITS_METRIC]};
// one decoded fault-code card (severity + plain-language symptoms + basic fixes)
function dtcCard(r){const sv=_SEVERITY_META[r.severity];
  return `<div class="dtccard" style="--sv:${sv.color}">
    <div class="dch"><span class="dcode">${r.code}</span>
      <span class="dsev">${has('dtc.sev_'+r.severity)?t('dtc.sev_'+r.severity):sv.label}</span></div>
    <div class="dhl">${r.headline}</div><div class="dsys">${r.systemShort}</div>`
    +(r.symptoms.length?`<div class="dsub">${t('dtc.symptoms')}</div><ul class="dsym">${r.symptoms.map(s=>`<li>${s}</li>`).join('')}</ul>`:'')
    +`<div class="ddrive">${r.drive}</div>`
    +(r.causes.length?`<div class="dsub">${t('dtc.causes')}</div><ol class="dcauses">${r.causes.map((c,i)=>`<li><span class="dnum">${i+1}</span><span>${c}</span></li>`).join('')}</ol>`:'')
    +(r.fixes.length?`<div class="dsub">${t('dtc.checks')}</div><ul class="dchecks">${r.fixes.map(f=>`<li>${f}</li>`).join('')}</ul>`:'')
    +`<button class="dsearch" onclick="dtcSearch('${r.code}')">${t('dtc.search_more')}</button>`
    +`</div>`;}
const accent=()=>S.work?S.work.slot[0]:GOLD;
const isOwned=id=>S.owned.has(id);

// ---- REAL device status for the Home cards (NO mock values) ----
// Knob → live gear (telemetry). Gauge → firmware version (readVersions).
// OBD  → real stored fault count (readDtcCodes). best → best 0-100 (readAccelTimes).
// Everything here is fetched from the connected device; when nothing is connected
// the Home shows a demo banner + em-dashes, never fabricated numbers.
let LIVE = { gear:null, fw:null, dtc:null, best:null };
// OBD (the CAN node) is a SEPARATE link from the gauge BLE: the gauge only sees it
// once the node broadcasts its hello over ESP-NOW (readVersions().node != null).
// State lives on `store.obdSeen` (already reactive) so this component stays in
// legacy mode — adding a local $state rune here flips the whole file to runes
// mode and blanks the screen. Fixes "gauge BLE up, no OBD module, yet OBD showed
// connected" (owner 2026-07-24).
let liveSock=null, liveMonId=null, liveKnob=false;
// FIRMWARE UPDATE state — the gauge + OBD node share the axis-can jsDelivr manifest
// and both flash THROUGH the gauge BLE (flashMonitor / flashNode). Each entry:
// {cur:'x.y.z'|null, latest:'x.y.z'|null, entry:<manifest row>|null, has:bool}.
let UPD = { loading:false, checked:false, gauge:null, node:null };
let _restoreAfterUpdate = false;   // set after a gauge flash → re-push local style on reconnect
function _vstr(v){ return v.major+'.'+v.minor+'.'+v.patch; }
function _newer(a,b){ return a.major!==b.major?a.major>b.major:a.minor!==b.minor?a.minor>b.minor:a.patch>b.patch; }
function updAvail(){ return !!((UPD.gauge&&UPD.gauge.has)||(UPD.node&&UPD.node.has)); }
// Fetch the manifest + the device's reported versions, compute what's newer. Cheap
// to call repeatedly — guarded so it runs at most once until forced (after a flash).
async function checkUpdates(force){
  const mon=store.monClient;
  if(!mon || UPD.loading || (UPD.checked && !force)) return;
  UPD.loading=true; if(S.tab==='update'||S.upd) render();
  try{
    const [man,vers]=await Promise.all([fetchCanManifest(), mon.readVersions()]);
    const build=(entries,curFw)=>{ const L=latest(entries||[]);
      return { cur:curFw?_vstr(curFw):null, latest:L?L.version:null, entry:L,
               has:!!(L&&curFw&&_newer(parseVer(L.version),curFw)) }; };
    UPD.gauge=build(man.monitor, vers&&vers.monitor);
    UPD.node =build(man.node,    vers&&vers.node);
    UPD.checked=true;
  }catch(e){ toast(t('toast.check_failed')+((e&&e.message)||'offline')); }
  UPD.loading=false; if(S.tab==='update'||S.upd) render();
}
async function openLive(){
  // Knob live gear over telemetry (subscribe once per connection)
  if (store.client && !liveKnob) {
    liveKnob = true;
    try {
      liveSock = store.client.openTelemetry((f)=>{
        // Real knob telemetry carries the gear in `label` (TelemetryFrame.label,
        // matching Live.svelte + the firmware frame). The MockClient used `gear_label`,
        // so the Home card only ever updated in demo — accept either. (fix: live gear)
        const gl = (f && f.label != null) ? f.label : (f && f.gear_label != null ? f.gear_label : null);
        if (gl != null) { LIVE.gear = String(gl); if (S.tab==='home') render(); }
      }, ()=>{});
    } catch(e){ liveKnob=false; }
  }
  if (!store.client) { liveKnob=false; LIVE.gear=null; }
  // Gauge reads (firmware + faults + best time) — once per gauge connection
  const mon = store.monClient;
  if (mon && liveMonId !== mon) {
    liveMonId = mon;
    try { if(mon.setTime) await mon.setTime(new Date()); } catch(e){}   // sync the gauge clock (universal auto-night)
    try { if(mon.readNight){ const n=await mon.readNight(); if(n) S.night=n; } } catch(e){}
    try { const v = await mon.readVersions(); const m=v?.monitor; if(m) LIVE.fw = 'v'+m.major+'.'+m.minor; store.obdSeen = !!v?.node; } catch(e){ store.obdSeen=false; }
    try { const d = await mon.readDtcCodes(); LIVE.dtc = d ? { count:d.count, mil:!!d.mil } : null; } catch(e){ LIVE.dtc = null; }
    try { const t = await mon.readAccelTimes(); const b=t?.speed?.[0]; LIVE.best = (b&&b.ms!=null) ? (b.ms/1000).toFixed(2) : null; } catch(e){}
    await pullGaugeConfig(mon);   // load the gauge's ACTUAL pages/faces/colours into the editor
    // Multi-car: read the VIN-decoded car and auto-switch to its saved profile (if any).
    try { if(mon.carId){ const car=await mon.carId(); if(car&&car.make){ S.detectedCar={make:car.make,year:car.year||0}; presetAutoSwitch(); } } } catch(e){}
    // AUTO-RESTORE after a firmware update: a version bump resets the gauge to
    // defaults, so once it reboots + reconnects, push the owner's LOCAL style back
    // automatically (owner 2026-07-25: "style หาย ตั้งคืนไม่ได้ หลังจาก update").
    if (_restoreAfterUpdate && localStorage.getItem('axis.pages')) {
      _restoreAfterUpdate = false;
      setTimeout(() => { window.applyLooks && window.applyLooks('all'); window.toast && window.toast(t('toast.style_restored')); }, 700);
    }
    if (S.tab==='home') render();
  }
  if (!mon) { liveMonId=null; LIVE.fw=null; LIVE.dtc=null; LIVE.best=null; store.obdSeen=false; }
}
// Enter DEMO MODE from the Home banner — a synthetic knob + monitor so a reviewer (or
// a buyer who hasn't got their AXIS yet) can explore EVERY screen with no hardware.
async function exploreDemo(){
  store.enterDemo('default');
  await openLive();          // subscribe the mock telemetry + read the mock monitor (config/versions/dtc)
  render();
}

// Read the gauge's CURRENT config over BLE and load it into the Looks editor, so
// what you see + edit is what's really on the gauge — not the demo defaults.
// GUARD: never clobber UNSAVED edits (S.dirty) — e.g. when this runs because the
// owner tapped "Connect gauge & apply" with pending changes, keep their edits.
async function pullGaugeConfig(mon){
  if (S.dirty) return;
  try {
    const cfg = await mon.config();
    if (!cfg || !cfg.pages || !cfg.pages.length) return;
    _gaugeCfg = cfg;   // cache the base cfg for live preview (previewCfg pushes)
    if (typeof cfg.brightness === 'number') S.bright = cfg.brightness;   // gauge's real screen brightness
    const L2F = {}; Object.keys(FACECFG).forEach(f => { L2F[FACECFG[f].l] = f; });
    // Unlock any PREMIUM face the gauge already runs — always, even when we KEEP the
    // local editor config below — so the owner can open/edit that face.
    let unlockedG=false;
    (cfg.pages||[]).forEach(p=>{ const fc=L2F[p&&p.layout]; if(fc && !FREE_FACES.includes(fc) && !S.owned.has(fc)){ S.owned.add(fc); unlockedG=true; } });
    if(unlockedG) saveOwned();
    // ★ DEVICE-AUTHORITATIVE CONNECT (owner 2026-09-09: "app ต้องดึง look/peak/warn ล่าสุด
    // มา ไม่ใช่ reset ใหม่"). The gauge is the source of truth: on a genuine connect we ADOPT
    // its real pages/units/peaks/warn into the editor, so what you see + then Save matches
    // what's on the gauge (never overwrite the gauge with stale app-local defaults). Two
    // things still protect local work: (1) the S.dirty guard above keeps UNSAVED in-session
    // edits; (2) the _restoreAfterUpdate path (openLive) re-pushes the owner's saved style
    // after a firmware update wiped the gauge — that stays flag-gated + explicit. We no
    // longer let a persisted localStorage copy silently shadow the live gauge config (that
    // guard is what made connect ignore the gauge and clobber it on Save).
    S.units = Array.isArray(cfg.units) ? cfg.units.slice(0, UC_COUNT) : [...UNITS_METRIC];   // per-quantity display units
    const n = Math.max(1, Math.min(10, cfg.pageCount || cfg.pages.length));
    const pages = [];
    for (let i=0;i<n;i++){
      const p = cfg.pages[i]; if(!p) continue;
      const face = L2F[p.layout] || 'hero';
      const arcHex = rgb565ToHex(p.arcColor || 0xCD09);
      const slot = [];
      for (let s=0;s<5;s++){ const c = p.slotColor && p.slotColor[s]; slot.push(c ? rgb565ToHex(c) : arcHex); }
      const ch = (p.ch || []).slice(0,5); while(ch.length<5) ch.push(0);
      pages.push({ face, work: { ch, slot,
        col2: p.color2 ? rgb565ToHex(p.color2) : '#8b9199',
        text: p.textColor ? rgb565ToHex(p.textColor) : '#eef0f4' } });
      // peak + arc-scale limit for the page's primary value → the alerts editor
      const pk = p.peak; const c0 = ch[0];
      if (c0 && S.peaks[c0]) { if (pk>0){ S.peaks[c0].val = Math.round(pk*100)/100; S.peaks[c0].on = true; } else { S.peaks[c0].on = false; } }
      ch.forEach((c,i)=>{ const lv=p.slotLimit&&p.slotLimit[i]; if(c && lv>0 && S.limits[c]!==undefined) S.limits[c]=Math.round(lv*100)/100; });
    }
    if (!pages.length) return;
    // v16: adopt the gauge's per-channel WARN column so the alerts editor shows the
    // gauge's real thresholds (device-authoritative connect — see the note above).
    if (cfg.warnSet && Array.isArray(cfg.warn)) {
      for (let c=0;c<cfg.warn.length;c++){ if(S.peaks[c]!==undefined){ const w=cfg.warn[c]; if(w>0){ S.peaks[c].val=Math.round(w*100)/100; S.peaks[c].on=true; } else { S.peaks[c].on=false; } } }
    }
    // Any PREMIUM face already on the gauge is OWNED — unlock it so its page is
    // selectable + editable (owner: a page with Chrono couldn't be opened).
    let unlocked=false;
    pages.forEach(pg=>{ if(!FREE_FACES.includes(pg.face) && !S.owned.has(pg.face)){ S.owned.add(pg.face); unlocked=true; } });
    if(unlocked) saveOwned();
    S.pages = pages; S.cur = 0; S.face = pages[0].face; S.work = pages[0].work; S.dirty = false;
    savePages();   // gauge config becomes the persisted baseline (survives a remount)
    render();   // reflect the pulled config (Home dots + Looks editor)
    drawGaugeCanvas();
  } catch(e){ /* keep the demo pages on any read error */ }
}

// the real renderer's ChanLookup (id -> {label,unit,min,max}) from the founder catalogue
const CHAN=chanMeta;
// per-face default slot channels (real Ch ids) + secondary colour (col2)
const FACECFG={
  concentric:{l:7,ch:[Ch.RPM,Ch.COOLANT,Ch.BOOST,Ch.OILTEMP,Ch.VOLT]},
  hero:{l:0,ch:[Ch.RPM,Ch.SPEED,Ch.COOLANT,Ch.BOOST]},
  bars:{l:1,ch:[Ch.BOOST,Ch.COOLANT,Ch.VOLT,Ch.SPEED]},
  needle:{l:2,ch:[Ch.RPM,Ch.SPEED],c2:'#8b9199'},
  ticks:{l:3,ch:[Ch.RPM,Ch.COOLANT]},
  tuner:{l:4,ch:[Ch.RPM,Ch.SOC,Ch.GEAR,Ch.SPEED],c2:'#12262e'},
  regent:{l:5,ch:[Ch.SOC]},
  chrono:{l:6,ch:[Ch.RPM,Ch.SPEED],c2:'#0a0b0d'},
  gmeter:{l:8,ch:[Ch.NONE,Ch.NONE,Ch.NONE,Ch.NONE,Ch.NONE]},   // IMU-driven; no channels
  trip:{l:9,ch:[Ch.NONE,Ch.NONE,Ch.NONE,Ch.NONE,Ch.NONE]},     // OBD-computed on the gauge; no channels
  lanes:{l:10,ch:[Ch.RPM,Ch.SPEED,Ch.BOOST,Ch.THROTTLE],slotDef:['#CEA24A','#37E0C8','#E06AC8','#5C9BFF']},  // live-graph; per-lane default gold/cyan/mag/blue
};
// slot[] = PER-VALUE colour, one CSS colour per slot (default all gold = the old
// single-arc look). col2 = shared decorative (2nd needle bg / honeycomb); text = value text.
function defWork(f){const c=FACECFG[f];const base=[GOLD,GOLD,GOLD,GOLD,GOLD];if(c.slotDef)c.slotDef.forEach((x,i)=>{if(i<5)base[i]=x;});return{ch:[...c.ch],slot:base,col2:c.c2||'#8b9199',text:'#eef0f4'};}
function buildPage(){const f=FACECFG[S.face];return{layout:f.l,ch:S.work.ch,arc:S.work.slot[0],col2:S.work.col2,text:S.work.text,slot:[...S.work.slot],slotLimit:S.work.ch.map(c=>S.limits[c]||0),peak:(S.peaks[S.work.ch[0]]&&S.peaks[S.work.ch[0]].on)?S.peaks[S.work.ch[0]].val:0};}

// ---- LIVE PREVIEW on the physical gauge -------------------------------------
// The monitor has a RAM-only preview char (0209, previewCfg): pushing the whole
// edited cfg makes the REAL gauge show the change instantly, WITHOUT saving. We
// cache the gauge's base cfg on connect (_gaugeCfg) then debounce-push edits.
let _gaugeCfg=null, _pvT=null, _saveT=null;
// write one editor page (P={face,work}) into a firmware PageCfg (p)
function writePage(P,p){
  p.layout=FACECFG[P.face].l;
  p.ch=[0,0,0,0,0]; P.work.ch.forEach((c,j)=>{ if(j<5) p.ch[j]=c||0; });
  p.slotColor=P.work.slot.map(hexToRgb565);   // v12 per-value colour
  p.arcColor=hexToRgb565(P.work.slot[0]);     // slot0 = v11 fallback
  p.color2=hexToRgb565(P.work.col2);
  p.textColor=hexToRgb565(P.work.text);
  const pk=S.peaks[P.work.ch[0]]; p.peak=pk&&pk.on?pk.val:0;
  p.slotLimit=P.work.ch.map(c=>{const v=S.limits[c]; return (v&&v>0)?v:0;});   // arc full-scale PER slot/value
}
// v16: the WARN column for EVERY channel → the global warn[] the gauge reads for
// blink (on-screen) / full-screen alarm (off-screen). warnSet=1 makes it authoritative
// (a channel toggled OFF sends 0 = disabled). S.peaks[id] = {val, on}, keyed by Ch id.
function warnArray(){ const a=[]; for(let c=0;c<Ch.COUNT;c++){ const p=S.peaks[c]; a.push((p&&p.on&&+p.val>0)?+p.val:0); } return a; }
function applyWarn(cfg){ if(cfg){ cfg.warnSet=1; cfg.warn=warnArray(); } return cfg; }
function livePush(){
  // persist the edited layout locally (debounced) so ALL edits — colours, channels,
  // face, pages — survive a shell remount, even with no gauge connected.
  clearTimeout(_saveT); _saveT=setTimeout(()=>{ try{ syncCur(); savePages(); }catch(e){} }, 220);
  const mon=store.monClient; if(!mon||!_gaugeCfg||S.target!=='gauge') return;
  clearTimeout(_pvT);
  _pvT=setTimeout(()=>{ try{
    syncCur();
    _gaugeCfg.pageCount=S.pages.length;
    _gaugeCfg.units = [...S.units];
    for(let i=0;i<S.pages.length && i<_gaugeCfg.pages.length;i++) writePage(S.pages[i], _gaugeCfg.pages[i]);
    applyWarn(_gaugeCfg);                       // v16: carry the per-channel warn column
    mon.previewCfg(_gaugeCfg).catch(()=>{});   // RAM-only; the physical gauge updates live
  }catch(e){} }, 140);
}

// ---- faithful KNOB main view (mirror axis-companion DevicePreview main) ----
function knobSVG(a){
  return `<svg viewBox="0 0 240 240" role="img" aria-label="Knob preview" style="width:100%;height:100%"><g>
    <circle cx="120" cy="120" r="120" fill="#000"/>
    <text x="120" y="36" text-anchor="middle" font-family="Psionic,monospace" font-size="13" letter-spacing="2" fill="#8b9199">HPATTERN</text>
    <text x="120" y="158" text-anchor="middle" font-family="Psionic,monospace" font-size="132" font-weight="700" fill="${a}">3</text>
    <text x="120" y="208" text-anchor="middle" font-family="Psionic,monospace" font-size="12" letter-spacing="2" fill="#9aa0a8">AXIS</text>
  </g></svg>`;
}
function previewMarkup(){
  return S.target==='knob'
    ? knobSVG(accent())
    : `<canvas id="gcv" width="466" height="466" style="width:100%;height:100%;display:block;border-radius:50%"></canvas>`;
}
// draw the gauge canvas AFTER it's in the DOM (canvas needs a live element)
function drawGaugeCanvas(){
  if(S.target==='knob')return;
  const cv=document.getElementById('gcv');if(!cv)return;const ctx=cv.getContext('2d');
  setPreviewUnits([...S.units]);   // preview mirrors the per-quantity units choice
  renderGaugePreview(ctx,buildPage(),CHAN);
}

function faceThumb(id,a){ // small gallery thumb (52x38); a = accent (gold if selected, else silver)
  const m={concentric:`<circle cx="26" cy="19" r="18" fill="none" stroke="#868c94" stroke-width="1.4"/><g fill="none" stroke="${a}" stroke-width="1.4"><path d="M26 4.5 A14.5 14.5 0 0 0 26 33.5"/><path d="M26 8 A11 11 0 0 0 26 30"/><path d="M26 11.5 A7.5 7.5 0 0 0 26 26.5"/><path d="M26 15 A4 4 0 0 0 26 23"/></g>`,
    gmeter:`<g fill="none" stroke="#868c94" stroke-width="1.3"><circle cx="26" cy="19" r="15"/><circle cx="26" cy="19" r="8"/></g><g stroke="#565c64" stroke-width="1"><line x1="26" y1="5" x2="26" y2="33"/><line x1="12" y1="19" x2="40" y2="19"/></g><circle cx="34" cy="12" r="3" fill="${a}"/>`,
    trip:`<line x1="11" y1="28" x2="41" y2="28" stroke="#868c94" stroke-width="1.6"/><circle cx="13" cy="28" r="2.6" fill="none" stroke="#868c94" stroke-width="1.4"/><circle cx="39" cy="28" r="2.6" fill="none" stroke="${a}" stroke-width="1.4"/><path d="M20 28 L26 12 L32 28" fill="none" stroke="${a}" stroke-width="1.6"/>`,
    hero:`<path d="M12 32 A16 16 0 1 1 40 32" fill="none" stroke="#868c94" stroke-width="3"/><path d="M12 32 A16 16 0 0 1 28 11" fill="none" stroke="${a}" stroke-width="3"/>`,
    bars:`<g fill="#868c94"><rect x="10" y="8" width="32" height="4" rx="2"/><rect x="10" y="17" width="22" height="4" rx="2"/><rect x="10" y="26" width="28" height="4" rx="2"/></g><rect x="10" y="8" width="20" height="4" rx="2" fill="${a}"/>`,
    needle:`<circle cx="26" cy="19" r="14" fill="none" stroke="#868c94" stroke-width="1.5"/><line x1="26" y1="19" x2="35" y2="12" stroke="${a}" stroke-width="2"/><circle cx="26" cy="19" r="2.5" fill="${a}"/>`,
    ticks:`<g stroke="#868c94" stroke-width="1.5"><line x1="26" y1="6" x2="26" y2="10"/><line x1="40" y1="19" x2="36" y2="19"/><line x1="26" y1="32" x2="26" y2="28"/><line x1="12" y1="19" x2="16" y2="19"/></g><line x1="26" y1="6" x2="26" y2="10" stroke="${a}" stroke-width="1.5"/>`,
    tuner:`<path d="M13 30 A16 16 0 0 1 39 30" fill="none" stroke="#868c94" stroke-width="2" stroke-dasharray="1 3"/><path d="M13 30 A16 16 0 0 1 26 8" fill="none" stroke="${a}" stroke-width="2" stroke-dasharray="1 3"/><text x="26" y="35" fill="${a}" font-size="8" font-family="monospace" text-anchor="middle">3</text>`,
    regent:`<g stroke="#868c94" stroke-width="1"><line x1="26" y1="5" x2="26" y2="9"/><line x1="10" y1="19" x2="14" y2="19"/><line x1="42" y1="19" x2="38" y2="19"/></g><line x1="26" y1="19" x2="37" y2="12" stroke="${a}" stroke-width="1.5"/><circle cx="26" cy="19" r="1.8" fill="${a}"/>`,
    chrono:`<circle cx="26" cy="16" r="12" fill="none" stroke="#868c94" stroke-width="1.5"/><circle cx="26" cy="25" r="5" fill="none" stroke="#9aa0a6" stroke-width="1"/><line x1="26" y1="16" x2="34" y2="10" stroke="${a}" stroke-width="1.5"/>`};
  return `<svg width="52" height="38" viewBox="0 0 52 38">${m[id]}</svg>`;
}

const heatCells=()=>{let s='';const L=[1,3,2,0,4,2,1,3,0,2,4,1,2,0,0,2,4,1,2,0,3,1,4,2,0,3,1,2];
  for(const l of L) s+=`<i style="background:${l?`rgba(206,162,74,${[0,.28,.5,.74,1][l]})`:'var(--panelhi)'}"></i>`;return s;};

function render(){
  const b=document.getElementById('body'); const a=accent();
  let h='';
  if(S.tab==='home'){
    // ---- DEMO vs LIVE: the shell explores with sample data until a real device
    //      is connected over BLE. Device cards route to the real connect flow. ----
    const cK=!!store.client, cG=!!store.monClient, live=cK||cG, demo=store.isDemo;
    const kOn=(x)=>x?'':'off';
    h=`<div class="eyebrow">${t('home.your_axis')} &middot; ${(live&&!demo)?t('home.live'):t('home.demo')}</div>`;
    if(!live) h+=`<div class="demobanner">${t('home.demo_banner')}
      <button class="prim" style="width:100%;margin-top:10px" onclick="exploreDemo()">${t('home.try_demo')}</button></div>`;
    // REAL status only. Knob = live gear · Gauge = firmware version · OBD = real
    // fault count. Unconnected → em-dash + "off" (no fabricated readings). '···'
    // = connected but the read hasn't landed yet.
    const kGear = cK ? (LIVE.gear!=null ? LIVE.gear : '&middot;&middot;&middot;') : '&mdash;';
    const gFw   = cG ? (LIVE.fw!=null ? LIVE.fw : '&middot;&middot;&middot;') : '&mdash;';
    // OBD rides the gauge link → it can NEVER be "on" without the gauge. Gate on BOTH
    // (owner 2026-07-25: OBD stayed "connected" after the gauge dropped — obdSeen sticky).
    const obdC = cG && store.obdSeen;
    const faults = obdC && LIVE.dtc ? LIVE.dtc.count : null;
    // no gauge → connect first · gauge but no node → no module · node seen → live.
    const oVal  = !cG ? '&mdash;' : (!obdC ? '&mdash;' : (LIVE.dtc==null ? '&middot;&middot;&middot;' : (faults>0 ? String(faults) : 'OK')));
    const oLbl  = !cG ? t('home.lbl_off') : (!obdC ? t('home.lbl_no_module') : (LIVE.dtc==null ? t('home.lbl_checking') : (faults>0 ? (faults>1?t('home.lbl_faults'):t('home.lbl_fault')) : t('home.lbl_no_faults'))));
    const oCol  = faults>0 ? 'var(--danger)' : 'inherit';
    h+=`<div class="homedevs">
      <div class="hdev ${kOn(cK)}" onclick="${cK?`go('looks')`:`openConnect()`}"><span class="sd"></span><span class="g">&#9673;</span><div class="c"><div class="n">${t('home.knob')}</div><div class="s">${cK?t('home.connected'):t('home.tap_connect')}</div></div><div class="v"><div class="vv">${kGear}</div><div class="vl">${cK?t('home.lbl_gear'):t('home.lbl_off')}</div></div></div>
      <div class="hdev ${kOn(cG)}" onclick="${cG?`openUpdate()`:`openConnect()`}"><span class="sd"></span><span class="g">&#9680;</span><div class="c"><div class="n">${t('home.gauge')}</div><div class="s">${cG?t('home.connected'):t('home.tap_connect')}</div></div><div class="v"><div class="vv" style="font-size:15px">${gFw}</div><div class="vl">${cG?t('home.lbl_firmware'):t('home.lbl_off')}</div></div></div>
      <div class="hdev ${kOn(obdC)}" onclick="${obdC?`go('dtc')`:`openConnect()`}"><span class="sd"></span><span class="g">&#9636;</span><div class="c"><div class="n">${t('home.obd')}</div><div class="s">${obdC?t('home.via_gauge'):(cG?t('home.no_obd_module'):t('home.connect_gauge_first'))}</div></div><div class="v"><div class="vv" style="color:${oCol}">${oVal}</div><div class="vl">${oLbl}</div></div></div></div>
      <button class="linkrow" onclick="goPage('analysis')">${t('home.analysis')} &rarr;</button>
      <button class="linkrow" onclick="goPage('track')">${t('home.track')} &rarr;</button>
      <button class="linkrow" onclick="go('setup')">${t('home.first_setup')} &rarr;</button>
      <div class="cta">${live?`<button class="prim" onclick="go('looks')">&#10003; ${t('home.style_gauge')}</button>`:`<button class="prim" onclick="openConnect()">${t('home.connect_axis')}</button>`}<button class="sec" onclick="go('store')">&#9670;</button></div>`;
    if(live&&!demo) h+=`<button class="linkrow discrow" onclick="disconnectDev()">${t('home.disconnect')}</button>`;
  } else if(S.tab==='looks'){
    // PINNED preview — stays at the top of the scroll while faces/elements/peaks
    // scroll under it, so the owner sees the live gauge without scrolling up.
    h=`<div class="stick-top"><div class="disc">${previewMarkup()}</div></div>
      <div class="tgt"><button class="${S.target==='gauge'?'on':''}" onclick="setT('gauge')">${t('common.gauge')}</button><button class="${S.target==='knob'?'on':''}" onclick="setT('knob')">${t('common.knob')}</button></div>`;
    if(S.target==='gauge'){
      // PRESETS — save/load the whole gauge setup (multi-car: 1 gauge ↔ many cars).
      const _pl = presetList();
      h+=`<div class="eyebrow">${t('preset.title')}</div>
        <div class="preset-help">${t('preset.help')}</div>
        <div class="presets">`+
        _pl.map(p=>`<div class="prow${p.id===S.activePreset?' active':''}">
          <input class="pname" value="${(p.name||'').replace(/"/g,'&quot;')}" maxlength="20" spellcheck="false" onchange="presetRename('${p.id}',this.value)" aria-label="preset name">
          <button class="ppill" onclick="presetLoad('${p.id}')">${p.id===S.activePreset?t('preset.loaded'):t('preset.load')}</button>
          <button class="ppill gh${p.car?' caron':''}" onclick="presetAssignCar('${p.id}')" title="${t('preset.assign_car')}" aria-label="${t('preset.assign_car')}">${p.car?((p.car.make||'').slice(0,8)):'CAR'}</button>
          <button class="ppill gh" onclick="presetOverwrite('${p.id}')" title="${t('preset.update')}" aria-label="${t('preset.update')}">&#8635;</button>
          <button class="ppill gh" onclick="presetShare('${p.id}')" title="${t('preset.share')}" aria-label="${t('preset.share')}">&#8599;</button>
          <button class="pdel" onclick="presetDelete('${p.id}')" aria-label="delete">&times;</button>
        </div>`).join('')+
        `<button class="pgact addpreset" onclick="presetSaveNew()">+ ${t('preset.save_new')}</button>
        <div class="preset-util">
          <button class="pgact" onclick="presetImportOpen()">${t('preset.import_btn')}</button>
          <button class="pgact" onclick="backupOpen()">${t('preset.backup_btn')}</button>
          <button class="pgact" onclick="restoreOpen()">${t('preset.restore_btn')}</button>
        </div>
        </div>`;
      // page selector — the page numbers in one row; Add / Remove BELOW them
      h+=`<div class="eyebrow">${t('looks.pages')} &middot; ${S.cur+1} ${t('looks.of')} ${S.pages.length}</div>
        <div class="pages">`+
        S.pages.map((p,i)=>`<button class="pgbtn ${i===S.cur?'on':''}" onclick="setPage(${i})">${i+1}</button>`).join('')+
        `</div>
        <div class="pageadd">`+
        `${S.pages.length<10?`<button class="pgact" onclick="addPage()">${t('looks.add_page')}</button>`:''}`+
        `${S.pages.length>1?`<button class="pgact del" onclick="removePage()">${t('looks.remove_page',{n:S.cur+1})}</button>`:''}`+
        `</div>`;
      h+=`<div class="eyebrow">${t('looks.gauge_face')}</div><div class="faces">`+
        FACES.map(([id,nm])=>{return `<div class="face ${id===S.face?'sel':''}" onclick="setFace('${id}')">${faceThumb(id,id===S.face?a:'#c8cdd4')}<span class="nm">${nm}</span></div>`;}).join('')+`</div>`;
      // ELEMENTS &mdash; each element picks the VALUE it shows + its COLOUR (tap to cycle)
      h+=`<div class="eyebrow">${t('looks.elements')}</div><div class="rows">`+
        ELEMS[S.face].map(e=>{
          const chip = e.s>=0 ? chanSelect(e.s) : `<span class="chipmut">&mdash;</span>`;
          // colour picker (unlimited — native full-spectrum wheel + hex): a number
          // → this value's OWN colour (work.slot[n]); a string → a shared role
          // (col2/text); null → no picker.
          let dot;
          if (typeof e.c==='number')      dot=`<input type="color" class="ck" value="${S.work.slot[e.c]}" oninput="setSlotColor(${e.c},this.value)" title="pick any colour for this value">`;
          else if (typeof e.c==='string') dot=`<input type="color" class="ck" value="${S.work[e.c]}" oninput="setRoleColor('${e.c}',this.value)" title="pick any colour">`;
          else                            dot=`<span style="width:22px"></span>`;
          return `<div class="erow"><span class="en">${has('elem:'+e.n)?t('elem:'+e.n):e.n}</span>${chip}${dot}</div>`;
        }).join('')+`</div>`;
      // PEAK ALERTS &mdash; a settable peak per shown value, then a link to the combined page
      // only channels that HAVE a peak entry — id 0 (NONE, an empty slot) and any
      // unknown/newer-firmware id aren't in S.peaks, and dereferencing them crashed render().
      const shown=[...new Set(ELEMS[S.face].filter(e=>e.s>=0).map(e=>S.work.ch[e.s]))].filter(id=>id&&S.peaks[id]);
      // VALUE + WARNING — one row PER VALUE SHOWN on this face (like the manage page,
      // scoped to what's on screen; owner: "value เท่ากับจำนวนค่าที่มีบนจอ เหมือน warning").
      // Value = arc full-scale MAX (RPM 7000 → needle sweeps full at 7000). Warning = flash red past.
      h+=`<div class="eyebrow">${t('looks.value_warning')}</div>
        <div style="font-size:10.5px;color:var(--ink3);line-height:1.4;margin:-4px 2px 2px">${t('looks.vw_help')}</div>
        <div class="erow" style="padding-bottom:0"><span class="en"></span>
          <span class="pkin sm" style="color:var(--ink3);letter-spacing:.06em;font-size:8.5px">${t('looks.value_col')}</span>
          <span class="pkin sm" style="color:var(--ink3);letter-spacing:.06em;font-size:8.5px">${t('looks.warn_col')}</span>
          <span class="tog" style="visibility:hidden">ON</span></div>
        <div class="rows">`+
        shown.map(id=>`<div class="erow"><span class="en">${chName(id)} <small style="color:var(--ink3)">${channelDef(id)?.unit||''}</small></span>
          <input class="pkin sm" type="number" value="${S.limits[id]??''}" oninput="setLimit(${id},this.value)" aria-label="${chName(id)} value / full-scale">
          <input class="pkin sm" type="number" value="${S.peaks[id].val}" oninput="setPeak(${id},this.value)" aria-label="${chName(id)} warning">
          <span class="tog ${S.peaks[id].on?'on':''}" onclick="togPeak(${id})">${S.peaks[id].on?t('common.on'):t('common.off')}</span></div>`).join('')+
        `</div>
        <button class="linkrow" onclick="go('peaks')">${t('looks.manage_vw')}</button>`;
      // DISPLAY — screen brightness (live-dims via mon.setBrightness).
      h+=`<div class="eyebrow">${t('looks.display')}</div><div class="rows">
        <div class="erow"><span class="en">${t('looks.brightness')}</span>
          <input class="brislider" type="range" min="8" max="255" value="${S.bright}" oninput="setBright(this.value)" aria-label="Gauge screen brightness">
          <span class="en" id="brival" style="min-width:44px;text-align:right">${Math.round(S.bright/255*100)}%</span></div>
      </div>`;
      // (Vehicle mass lives on the Drivetrain page now — it's a per-car physics value that auto-
      //  fills from the picked car, so it was removed from here to avoid two places for one setting.)
      // NIGHT MODE — universal auto-dim by the on-board RTC (no light sensor, no car data).
      { const nm=S.night||{mode:0,nightBright:50,startHr:18,endHr:6};
        h+=`<div class="eyebrow">${t('night.title')}</div><div class="rows">
          <div class="erow"><span class="en">${t('night.mode')}</span><span class="uopts">
            <span class="chip sm ${nm.mode===0?'on':''}" onclick="setNightMode(0)">${t('night.off')}</span>
            <span class="chip sm ${nm.mode===1?'on':''}" onclick="setNightMode(1)">${t('night.auto')}</span>
            <span class="chip sm ${nm.mode===2?'on':''}" onclick="setNightMode(2)">${t('night.manual')}</span>
          </span></div>`;
        if(nm.mode!==0){
          h+=`<div class="erow"><span class="en">${t('night.bright')}</span>
            <input class="brislider" type="range" min="8" max="255" value="${nm.nightBright}" onchange="setNightBright(this.value)" aria-label="Night brightness">
            <span class="en" style="min-width:44px;text-align:right">${Math.round(nm.nightBright/255*100)}%</span></div>`;
        }
        if(nm.mode===1){
          h+=`<div class="erow"><span class="en">${t('night.hours')}</span><span class="uopts" style="align-items:center">
            <input class="pkin sm" type="number" min="0" max="23" value="${nm.startHr}" onchange="setNightHours(this.value,${nm.endHr})" aria-label="night start hour">
            <span style="color:var(--ink3)">&ndash;</span>
            <input class="pkin sm" type="number" min="0" max="23" value="${nm.endHr}" onchange="setNightHours(${nm.startHr},this.value)" aria-label="night end hour"></span></div>`;
        }
        if(nm.mode===2){
          h+=`<div class="erow"><span class="en">${t('night.now')}</span>
            <span class="tog ${nm.manualNight?'on':''}" onclick="toggleNightNow()">${nm.manualNight?t('night.is_night'):t('night.is_day')}</span></div>`;
        }
        h+=`</div><div style="font-size:10.5px;color:var(--ink3);line-height:1.4;margin:2px 2px 0">${nm.mode===0?t('night.help_off'):nm.rtcValid?t('night.help_synced',{h:nm.curHour}):t('night.help_sync')}</div>`;
      }
      // (Splash-sound selector removed 2026-09-02 — the boot sound is finalized to the
      //  anime intro on the gauge, fw v0.63.0; the gentleman theme is gone.)
      // UNITS — per-quantity choice (each value's unit set individually, like peak/limit),
      // with Metric / Imperial presets that set every row at once.
      const uMetric   = S.units.every(v=>v===0);
      const uImperial = UNITS_IMPERIAL.every((v,i)=>S.units[i]===v);
      h+=`<div class="eyebrow">${t('looks.units')}</div><div class="rows">
        <div class="erow"><span class="en">${t('looks.preset')}</span><span class="uopts">
          <span class="chip sm ${uMetric?'on':''}" onclick="setUnitsAll('metric')">${t('looks.metric')}</span>
          <span class="chip sm ${uImperial?'on':''}" onclick="setUnitsAll('imperial')">${t('looks.imperial')}</span></span></div>`+
        UNIT_OPTIONS.map(u=>`<div class="erow"><span class="en">${has('unit:'+u.label)?t('unit:'+u.label):u.label}</span><span class="uopts">`+
          u.opts.map((o,i)=>`<span class="chip sm ${S.units[u.cls]===i?'on':''}" onclick="setUnit(${u.cls},${i})">${o}</span>`).join('')+
          `</span></div>`).join('')+
      `</div>`;
    } else {
      h+=`<div class="eyebrow">${t('looks.knob_elements')}</div><div class="rows">
        <div class="erow"><span class="en">${t('looks.gear_number')}</span><span class="chipmut">GEAR</span><input type="color" class="ck" value="${accent()}" oninput="setSlotColor(0,this.value)" title="pick any colour"></div>
        <div class="erow"><span class="en">${t('looks.shift_ring')}</span>${chanSelect(0)}<input type="color" class="ck" value="${accent()}" oninput="setSlotColor(0,this.value)" title="pick any colour"></div>
        <div class="erow"><span class="en">${t('looks.device_name')}</span><input class="nameinput" value="${S.knobName}" oninput="setKnobName(this.value)" maxlength="14" placeholder="AXIS" spellcheck="false" aria-label="Device name"><input type="color" class="ck" value="${S.work.text}" oninput="setRoleColor('text',this.value)" title="pick any colour"></div></div>
        <div class="eyebrow">${t('looks.peak_hold')}</div><div class="rows">
        <div class="erow"><span class="en">${t('looks.redline_flash')}</span><span class="tog ${S.peak?'on':''}" onclick="togglePeak()">${S.peak?t('common.on'):t('common.off')}</span></div></div>
        <button class="linkrow" onclick="goPage('screensaver')">${t('saver.title')} &rarr;</button>`;
    }
    if(S.target==='knob'){
      h+=`<div class="cta"><button class="prim" onclick="applyLooks('all')">&#10003; ${t('looks.apply_knob')}</button></div>`;
    } else if(!store.monClient){
      h+=`<div class="cta"><button class="prim" onclick="applyLooks('all')">${t('looks.connect_save')}</button></div>`;
    } else {
      // two saves: THIS page only, or every page (owner: เซฟแยกหน้าได้). NO leading ✓ —
      // it read as "already saved" (owner: ปุ่ม save ขึ้นเครื่องหมายถูกตลอด). Confirmation
      // is the toast after a real save; the gold "breathing" frame signals unsaved edits.
      h+=`<div class="cta"><button class="prim" onclick="applyLooks('current')">&#10003; ${t('looks.save_page',{n:S.cur+1})}</button></div>`;
    }
  } else if(S.tab==='feel'){
    const opt=(id,path)=>`<div class="segopt ${S.feel===id?'sel':''}" onclick="setFeel('${id}')"><svg class="gr" viewBox="0 0 40 26"><path d="${path}" fill="none" stroke="${S.feel===id?a:'#565c64'}" stroke-width="1.5"/></svg><div class="st2"><div class="t">${t('feel.'+id)}</div><div class="d">${t('feel.'+id+'_desc')}</div></div>${S.feel===id?`<span class="mk">${t('feel.set')}</span>`:''}</div>`;
    S.feel=S.feel||'balanced';
    h=`<div class="eyebrow">${t('feel.how_respond')}</div><div class="seg">
      ${opt('relaxed','M2 22 C14 22 26 6 38 6')}
      ${opt('balanced','M2 22 C18 22 22 6 38 6')}
      ${opt('snappy','M2 22 C10 22 12 6 38 6')}</div>
      <div class="eyebrow">${t('feel.what_changes')}</div><div class="heat" style="padding:6px 14px"><div class="rows">
      <div class="prow"><span class="pn">${t('feel.needle_damping')}</span><span class="pv">${({relaxed:t('feel.high'),balanced:t('feel.medium'),snappy:t('feel.low')})[S.feel]}</span></div>
      <div class="prow"><span class="pn">${t('feel.gear_hold')}</span><span class="pv">${({relaxed:'320 ms',balanced:'220 ms',snappy:'90 ms'})[S.feel]}</span></div>
      <div class="prow"><span class="pn">${t('feel.peak_hold')}</span><span class="pv">${t('common.on')} &middot; 1.6 s</span></div></div></div>
      <div style="font-size:11px;color:var(--ink3);line-height:1.5">${t('feel.note')}</div>
      <div class="cta"><button class="prim" onclick="toast(t('toast.feel_saved'))">&#10003; ${t('feel.save')}</button></div>`;
  } else if(S.tab==='update'){
    // Firmware update — status rows + one action, all in-shell (a connect-style sheet
    // does the actual flashing). The button goes GOLD only when a newer version is
    // actually available (owner 2026-07-24). Kick a one-time background check so the
    // rows + button reflect reality without opening the sheet.
    const cG=!!store.monClient;
    if(cG && !UPD.checked && !UPD.loading) checkUpdates();
    const avail=updAvail();
    const statRow=(id,name,e,icon)=>{
      let v, tag='';
      if(!cG) v=t('update.connect_first');
      else if(UPD.loading&&!UPD.checked) v=t('update.checking');
      else if(!e||e.cur==null) v=(id==='node'?t('update.no_module'):'&mdash;');
      else if(e.has){ v=`v${e.cur} &rarr; v${e.latest}`; tag=`<span class="act new">${t('update.tag_update')}</span>`; }
      else { v=`v${e.cur} &middot; ${t('update.up_to_date')}`; tag=`<span class="act cur">OK</span>`; }
      return `<div class="urow" style="cursor:pointer" onclick="openUpdate()"><span class="g">${icon}</span><div class="c"><div class="n">${name}</div><div class="v">${v}</div></div>${tag}</div>`;
    };
    const cK=!!store.client;
    // Knob is a SEPARATE device with its OWN firmware manifest + BLE OTA flow (Ota page),
    // not the gauge-BLE flash the sheet does — so its row routes to the knob updater
    // (restored 2026-07-24: "update knob หาย" after the tab was reworked to gauge+OBD).
    const knobRow=`<div class="urow" style="cursor:pointer" onclick="${cK?`goPage('ota')`:`openConnect()`}"><span class="g">&#9673;</span><div class="c"><div class="n">${t('home.knob')}</div><div class="v">${cK?t('update.knob_check'):t('update.knob_connect')}</div></div><span class="act ${cK?'cur':''}">${cK?t('update.open'):''}</span></div>`;
    h=`<div class="eyebrow">${t('update.firmware')}</div><div class="upd">
      ${knobRow}
      ${statRow('gauge',t('home.gauge'),UPD.gauge,'&#9680;')}
      ${statRow('node',t('update.obd_module'),UPD.node,'&#9636;')}</div>
      <div class="heat" style="padding:13px 14px"><div style="font-size:11.5px;color:var(--ink2);line-height:1.55">${t('update.help')}</div></div>
      <div class="cta" style="margin-top:auto"><button class="${avail?'prim':'frostgold'}" style="width:100%" onclick="openUpdate()">${avail?t('update.update_now'):(cG?t('update.check'):t('update.connect_to_update'))}</button></div>`;
  } else if(S.tab==='setup'){
    h=`<div class="eyebrow">${t('setup.title')}</div>
      <div class="homedevs">
      <div class="hdev"><span class="sd"></span><span class="g">&#9673;</span><div class="c"><div class="n">${t('setup.knob_paired')}</div><div class="s">${t('setup.bt_direct')}</div></div><div class="v"><div class="vv" style="color:var(--live)">&#10003;</div></div></div>
      <div class="hdev"><span class="sd"></span><span class="g">&#9680;</span><div class="c"><div class="n">${t('setup.gauge_paired')}</div><div class="s">${t('setup.bt_direct')}</div></div><div class="v"><div class="vv" style="color:var(--live)">&#10003;</div></div></div>
      <div class="hdev"><span class="sd"></span><span class="g">&#9636;</span><div class="c"><div class="n">${t('setup.obd_linked')}</div><div class="s">${t('setup.via_awake')}</div></div><div class="v"><div class="vv" style="color:var(--live)">&#10003;</div></div></div></div>
      <div class="eyebrow">${t('setup.teach_gears')}</div>
      <div class="heat" style="padding:13px 14px"><div style="font-size:12px;color:var(--ink2);line-height:1.55">${t('setup.teach_help')}</div></div>
      <div class="cta"><button class="prim" onclick="toast(t('toast.ready_teach'))">&#10003; ${t('setup.start_teach')}</button></div>`;
  } else if(S.tab==='peaks'){
    h=`<div class="backrow" onclick="go('looks')">&larr; ${t('peaks.back_looks')}</div>
      <div class="eyebrow">${t('peaks.title')}</div>
      <div style="font-size:11px;color:var(--ink3);line-height:1.5;margin:-4px 0 2px">${t('peaks.help')}</div>
      <div class="erow" style="padding-bottom:0"><span class="en"></span>
        <span class="pkin sm" style="color:var(--ink3);letter-spacing:.06em;font-size:8.5px">${t('looks.value_col')}</span>
        <span class="pkin sm" style="color:var(--ink3);letter-spacing:.06em;font-size:8.5px">${t('looks.warn_col')}</span>
        <span class="tog" style="visibility:hidden">ON</span></div>
      <div class="rows">`+
      CHAN_ORDER.map(id=>`<div class="erow"><span class="en">${chName(id)} <small style="color:var(--ink3)">${channelDef(id)?.unit||''}</small></span>
        <input class="pkin sm" type="number" value="${S.limits[id]??''}" oninput="setLimit(${id},this.value)" aria-label="${chName(id)} value / full-scale">
        <input class="pkin sm" type="number" value="${S.peaks[id].val}" oninput="setPeak(${id},this.value)" aria-label="${chName(id)} warning">
        <span class="tog ${S.peaks[id].on?'on':''}" onclick="togPeak(${id})">${S.peaks[id].on?t('common.on'):t('common.off')}</span></div>`).join('')+
      `</div>
      <div class="eyebrow">${t('peaks.global')}</div><div class="rows">
        <div class="erow"><span class="en">${t('peaks.warning_style')}</span><span class="chipmut">${t('peaks.red_flash')}</span></div></div>
      <div class="cta"><button class="prim" onclick="toast(t('toast.saved'))">&#10003; ${t('peaks.save')}</button></div>`;
  } else if(S.tab==='store'){
    h=`<div class="eyebrow">${t('store.title')}</div>
      <div style="font-size:11px;color:var(--ink3);line-height:1.5;margin:-4px 0 2px">${t('store.help')}</div>
      <div class="stgrid">`+
      STORE_ITEMS.map(it=>{
        const owned=it.kind==='bundle'?['regent','tuner','chrono'].every(isOwned):isOwned(it.id);
        const thumb=it.kind==='face'?`<canvas class="stcv" id="st-${it.id}" width="466" height="466"></canvas>`:`<div class="stbundle">&#9670;<br>&#9670;&#9670;</div>`;
        return `<div class="stcard"><div class="stthumb">${thumb}</div>
          <div class="stname">${it.id==='allfaces'?t('store.all_faces'):it.name}</div>
          <div class="stblurb">${has('blurb:'+it.blurb)?t('blurb:'+it.blurb):it.blurb}</div>
          ${owned?`<div class="stown">&#10003; ${t('store.added')}</div>`:`<button class="stget" onclick="openBuy('${it.id}')">${t('store.add')}</button>`}</div>`;
      }).join('')+`</div>`;
  } else if(S.tab==='pro'){
    h=`<div class="eyebrow">${t('settings.title')}</div>
      <div class="eyebrow">${t('settings.language')}</div>
      <div class="langrow" style="margin-top:0">${LANGS.map(L=>`<button class="langchip ${store.lang===L.code?'on':''}" onclick="setLangUI('${L.code}')">${L.native}</button>`).join('')}</div>
      <div class="eyebrow">${t('settings.legal')}</div>
      <div class="rows"><button class="linkrow" onclick="goPage('legal')">${t('settings.privacy_terms')} &rarr;</button></div>
      <div class="door" style="margin-top:8px">
        <div class="eyebrow" style="color:var(--gold)">${t('pro.pro_eng')}</div>
        <div style="font-size:17px;font-weight:600">${t('pro.workshop')}</div>
        <div style="font-size:12px;color:var(--ink2);line-height:1.5">${t('pro.workshop_desc')}</div>
        <div class="rows" style="margin-top:4px">
          ${[['KNOB','pro.gear_calibration','calibrate'],['KNOB','pro.gear_feel','tune'],['GAUGE','pro.anti_sleep','antisleep'],['GAUGE','pro.record_log','diag'],['OBD','pro.drivetrain','drivetrain']].map(([d,k,pg])=>`<div class="prow" style="font-size:11.5px;cursor:pointer" onclick="goPage('${pg}')"><span style="color:var(--ink3);width:44px;display:inline-block">${d}</span>${t(k)}<span class="pv">&rarr;</span></div>`).join('')}
        </div>
      </div>`;
  } else if(S.tab==='dtc'){
    // Fault codes — a REAL shell tab (not a shortcut). Live read/clear needs the
    // gauge; the code look-up below is an OFFLINE dictionary, always available.
    const cG=!!store.monClient, snap=S.dtcSnap;
    ensureDtc();                                   // kick off the lazy dict load on first DTC-tab render
    const dtcReady = !!_richDtc;
    const dtcPlace = _dtcErr
      ? `<div class="dmsg">Couldn't load the fault-code data. <button class="linkrow" onclick="retryDtc()">Retry</button></div>`
      : `<div class="dmsg" aria-busy="true">Loading fault-code data&hellip;</div>`;
    h=`<div class="eyebrow">${t('dtc.fault_codes')}</div>`;
    if(cG){
      const mil = snap ? (snap.mil?t('common.on'):t('common.off')) : '&mdash;';
      const milC = snap ? (snap.mil?'#e24b4a':'#68b09b') : 'var(--ink3)';
      h+=`<div class="rows"><div class="erow"><span class="en">${t('dtc.check_engine')}</span><span class="dbig" style="color:${milC}">${mil}</span></div>
        <div class="erow"><span class="en">${t('dtc.stored_codes')}</span><span class="dbig">${snap?snap.count:'&mdash;'}</span></div></div>
        <div class="cta" style="margin-top:0"><button class="prim" onclick="dtcRead()">${S.dtcBusy?'&hellip;':(snap?t('dtc.reread_car'):t('dtc.read_car'))}</button>${snap&&snap.count>0?`<button class="sec2" onclick="dtcClear()">${t('dtc.clear_codes')}</button>`:''}</div>`;
      if(snap){ if(snap.count===0) h+=`<div class="dclean">${t('dtc.clean')}</div>`;
        else if(!dtcReady) h+=dtcPlace;
        else h+=`<div class="rows2">`+snap.codes.map(c=>{const r=_richDtc(c);return r?dtcCard(r):'';}).join('')+`</div>`; }
    } else {
      h+=`<div class="demobanner">${t('dtc.connect_read')} <button class="linkrow" style="margin-top:8px" onclick="openConnect()">${t('dtc.connect_gauge')}</button></div>`;
    }
    // OFFLINE look-up — always available (once the dict is loaded)
    const lk = (dtcReady && S.dtcLook.trim())? _richDtc(S.dtcLook.trim().toUpperCase()) : null;
    h+=`<div class="eyebrow">${t('dtc.lookup')}</div>
      <input class="codeinput" value="${S.dtcLook||''}" oninput="dtcLook(this.value)" placeholder="${t('dtc.lookup_ph')}" maxlength="6" autocapitalize="characters" spellcheck="false">
      <div id="dtclookres">${!dtcReady?dtcPlace:(lk?dtcCard(lk):(S.dtcLook.trim()?`<div class="dmsg">${t('dtc.lookup_bad')}</div>`:''))}</div>`;
  }
  b.innerHTML=h;
  b.classList.toggle('looks', S.tab==='looks');   // enables the sticky preview + Apply (CSS)
  // Animate the content ONLY when the tab changed (a settle-in stagger) — not on every
  // in-tab tweak, which would flicker. The `.enter` class drives the CSS keyframes.
  if(S.tab!==_lastTab){ b.classList.remove('enter'); void b.offsetWidth; b.classList.add('enter'); _lastTab=S.tab; b.scrollTop=0; }
  else { b.classList.remove('enter'); }
  // Unsaved-edit signal: the gold-framed selectors "breathe" until Apply is pressed.
  const _root=document.querySelector('.axisshell'); if(_root) _root.classList.toggle('dirty', !!S.dirty);
  const nav=document.getElementById('nav');
  const TABS=['home','looks','store','dtc','feel','update','pro'];
  nav.innerHTML=TABS.map(tb=>`<button class="${S.tab===tb?'on':''}" onclick="go('${tb}')">${t('nav.'+tb)}</button>`).join('');
  renderSheet();
  drawGaugeCanvas(); drawStore();
}
let _lastTab=null;
function buySheet(){const it=STORE_ITEMS.find(i=>i.id===S.buying);if(!it)return'';
  return `<div class="sheet"><div class="sheetcard">
    <div class="sheeteyebrow">${t('sheet.buy_eyebrow')}</div>
    <div class="sheetname">${it.id==='allfaces'?t('store.all_faces'):it.name}</div>
    <div class="sheetblurb">${has('blurb:'+it.blurb)?t('blurb:'+it.blurb):it.blurb}</div>
    <button class="prim" onclick="confirmBuy()">&#10003; ${t('sheet.add_try')}</button>
    <button class="sheetcancel" onclick="cancelBuy()">${t('sheet.not_now')}</button>
  </div></div>`;}
// Preset confirm (Load-over-unsaved-edits / Delete) — reuses the frosted sheet pattern.
function presetConfirmSheet(){const c=S.presetConfirm;if(!c)return'';
  return `<div class="sheet"><div class="sheetcard">
    <div class="sheeteyebrow">${t('preset.confirm_eyebrow')}</div>
    <div class="sheetname">${(c.name||'').replace(/</g,'&lt;')}</div>
    <div class="sheetblurb">${c.blurb}</div>
    <button class="prim" onclick="presetConfirmYes()">${c.ok}</button>
    <button class="sheetcancel" onclick="presetConfirmNo()">${t('sheet.not_now')}</button>
  </div></div>`;}
// Preset Share / Backup / Import / Restore — one sheet, 4 modes (export shows a code to copy,
// import/restore take a pasted code). Codes are portable "AXIS1." text (no backend).
function shareSheetView(){const c=S.shareSheet;if(!c)return'';
  const isOut = c.mode==='share'||c.mode==='backup';
  const title = c.mode==='share'?t('preset.share_title'):c.mode==='backup'?t('preset.backup_title')
              : c.mode==='import'?t('preset.import_title'):t('preset.restore_title');
  const blurb = c.mode==='share'?t('preset.share_blurb',{name:c.name})
              : c.mode==='backup'?t('preset.backup_blurb',{n:c.n})
              : c.mode==='import'?t('preset.import_blurb'):t('preset.restore_blurb');
  const body = isOut
    ? `<textarea id="sharecode" class="codebox" readonly onclick="this.select()">${(c.code||'').replace(/</g,'&lt;')}</textarea>
       <button class="prim" onclick="shareCopy()">${t('preset.copy')}</button>`
    : `<textarea id="sharecode" class="codebox" placeholder="AXIS1…" oninput="shareInput(this.value)"></textarea>
       <button class="prim" onclick="${c.mode==='import'?'shareImportDo()':'shareRestoreDo()'}">${c.mode==='import'?t('preset.do_import'):t('preset.do_restore')}</button>`;
  return `<div class="sheet"><div class="sheetcard">
    <div class="sheeteyebrow">${t('preset.title')}</div>
    <div class="sheetname">${title}</div>
    <div class="sheetblurb">${blurb}</div>
    ${body}
    <button class="sheetcancel" onclick="shareClose()">${isOut?t('sheet.done'):t('sheet.not_now')}</button>
  </div></div>`;}
// In-shell CONNECT sheet — replaces the old bounce to the dense MonitorConfig editor.
// One tap per device → native OS BLE chooser (BleClient.pick / MonitorBleClient.pick),
// live status (Connect → Connecting… → Connected ✓), all inside the frosted shell.
function connectSheet(){
  const cK=!!store.client, cG=!!store.monClient;
  const row=(id,name,sub,on,icon)=>`<div class="crow ${on?'on':''}">
      <span class="cico">${icon}</span>
      <div class="cinfo"><div class="cnm">${name}</div><div class="csub">${on?t('sheet.connected'):sub}</div></div>
      ${on?`<span class="cok">&#10003;</span>`
        :(S.connecting===id?`<span class="cbtn cbusy">${t('sheet.connecting')}</span>`
        :`<button class="cbtn" onclick="connectDev('${id}')">${t('sheet.connect_btn')}</button>`)}
    </div>`;
  return `<div class="sheet"><div class="sheetcard">
    <div class="sheeteyebrow">${t('sheet.pair_bt')}</div>
    <div class="sheetname">${t('home.connect_axis')}</div>
    <div class="crows">
      ${row('knob',t('home.knob'),t('sheet.knob_sub'),cK,'&#9673;')}
      ${row('gauge',t('home.gauge'),t('sheet.gauge_sub'),cG,'&#9680;')}
    </div>
    <div class="csheetnote">${t('sheet.connect_note')}</div>
    <button class="sheetcancel" onclick="closeConnect()">${(cK||cG)?t('sheet.done'):t('sheet.not_now')}</button>
  </div></div>`;}
// Single writer for the #sheet overlay. Adds the entrance-animation class `.in`
// ONLY on a closed→open transition, so re-renders (progress %, connecting→connected)
// swap the content WITHOUT replaying fade/rise — kills the popup stutter.
let _sheetOpen=false;
function renderSheet(){
  const el=document.getElementById('sheet'); if(!el)return;
  const html=(S.onboard!=null)?onboardView():S.connect?connectSheet():S.upd?updateSheet():S.buying?buySheet():S.presetConfirm?presetConfirmSheet():S.shareSheet?shareSheetView():'';
  const opening=!!html && !_sheetOpen;
  el.innerHTML=html; _sheetOpen=!!html;
  if(opening){ const sh=el.querySelector('.sheet'); if(sh)sh.classList.add('in'); }
}
function openConnect(){S.connect=true;render();}
function closeConnect(){S.connect=false;S.connecting=null;render();}
async function connectDev(which){
  if(S.connecting)return;
  S.connecting=which; renderSheet();
  try{
    if(which==='gauge'){ await ensureGauge(); }
    else {
      const id=await BleClient.pick();
      const c=new BleClient(id);
      await c.connect(()=>{ store.client=null; store.connected=false; render(); });
      store.client=c;
      // Read device INFO (name/version/build/gauge-link) just like the Connect +
      // Devices paths do. WITHOUT this the Home-card connect left store.info null,
      // so the Firmware page showed "Installed: ?" and no gear/version ever — even
      // though telemetry subscribed fine (same service). try/catch so a transient
      // first-read blip still lets the connection stand; the infoTimer/pages re-read.
      try{ store.info = await c.info(); }catch(e){ /* transient; pages re-read */ }
      store.connected=true; openLive(); toast(t('toast.knob_connected'));
    }
  }catch(e){ const m=String((e&&e.message)?e.message:e);
    toast(/cancel|abort|no device/i.test(m)?'Connect cancelled':'Couldn’t connect — try again'); }
  S.connecting=null; render();
}
// Explicit DISCONNECT — drop the gauge (+ knob) BLE links. The gauge then reboots
// out of app-connect back into DRIVE (voice returns). Owner: a manual Disconnect on
// HOME so you're not stuck connected while reading DTC at the engine / leaving the car.
async function disconnectDev(){
  try{ if(liveSock&&liveSock.close) liveSock.close(); }catch{} liveSock=null; liveKnob=false;
  const mon=store.monClient, kn=store.client;
  try{ if(mon) await mon.disconnect(); }catch{}
  try{ if(kn)  await kn.disconnect();  }catch{}
  store.monClient=null; store.client=null; store.connected=false; store.obdSeen=false;
  liveMonId=null;
  LIVE.fw=null; LIVE.gear=null; LIVE.dtc=null; LIVE.best=null;
  S.upd=false; S.connect=false;
  toast(t('toast.disconnected'));
  render();
}
// ---- Firmware update sheet (same in-shell popup pattern as connectSheet) --------
function openUpdate(){ if(!store.monClient){ openConnect(); return; } S.upd=true; render(); checkUpdates(); }
function closeUpdate(){ S.upd=false; render(); }
function updateSheet(){
  const cG=!!store.monClient;
  const row=(id,name,e,icon)=>{
    const busy=S.updBusy&&S.updBusy.t===id;
    let sub, act='';
    if(!cG){ sub=t('update.connect_first'); }
    else if(UPD.loading&&!UPD.checked){ sub=t('update.checking'); }
    else if(!e||e.cur==null){ sub=(id==='node'?t('update.no_module'):'&mdash;'); }
    else if(busy){ sub=`<span class="updbarwrap"><span class="updbar"><i id="updfill" style="width:${S.updBusy.pct}%"></i></span><b id="updpct">${S.updBusy.pct}%</b></span>`; act=''; }
    else if(e.has){ sub=`v${e.cur} &rarr; <b style="color:var(--gold)">v${e.latest}</b>`; act=`<button class="cbtn" onclick="doUpdate('${id}')">${t('sheet.update_btn')}</button>`; }
    else { sub=`v${e.cur} &middot; ${t('update.up_to_date')}`; act=`<span class="cok">&#10003;</span>`; }
    return `<div class="crow ${(cG&&e&&e.cur!=null&&!e.has&&!busy)?'on':''}">
      <span class="cico">${icon}</span>
      <div class="cinfo"><div class="cnm">${name}</div><div class="csub">${sub}</div></div>${act}</div>`;
  };
  return `<div class="sheet"><div class="sheetcard">
    <div class="sheeteyebrow">${t('sheet.update_eyebrow')}</div>
    <div class="sheetname">${t('sheet.update_title')}</div>
    <div class="crows">
      ${row('gauge',t('home.gauge'),UPD.gauge,'&#9680;')}
      ${row('node',t('update.obd_module'),UPD.node,'&#9636;')}
    </div>
    ${(()=>{ const g=UPD.gauge, nd=UPD.node; const e=(g&&g.has)?g:(nd&&nd.has)?nd:null; const n=e&&e.entry&&e.entry.notes;
      return n?`<div class="whatsnew"><div class="wnh">${t('update.whats_new')} &middot; v${e.latest}</div><div class="wnb">${String(n).replace(/</g,'&lt;')}</div></div>`:''; })()}
    <div class="csheetnote">${t('sheet.update_note')}</div>
    <button class="sheetcancel" onclick="closeUpdate()">${S.updBusy?t('sheet.updating'):t('sheet.done')}</button>
  </div></div>`;}
async function doUpdate(target){
  if(S.updBusy) return;
  const mon=store.monClient; const e=target==='gauge'?UPD.gauge:UPD.node;
  if(!mon||!e||!e.entry) return;
  S.updBusy={t:target,pct:0}; renderSheet();   // one full render → shows the busy state
  try{
    const bin=await downloadFirmware(e.entry);
    const onAz=()=>toast(t('monota.tap_gauge'));   // Phase-2 authz (fw v0.69.0+): gauge asks for an on-gauge tap
    await (target==='gauge'?mon.flashMonitor(bin,onP,onAz):mon.flashNode(bin,onP,onAz));
    S.updBusy=null;
    if(target==='gauge') _restoreAfterUpdate=true;   // a firmware bump resets the gauge → auto re-push local style on reconnect
    toast(target==='gauge'?t('toast.gauge_updated'):t('toast.node_updated'));
    UPD.checked=false; setTimeout(()=>checkUpdates(true), 1800);   // re-read versions after reboot
  }catch(err){ S.updBusy=null; toast(t('toast.update_failed')+((err&&err.message)||'try again')); }
  render();
  // progress: update ONLY the % text (no sheet rebuild → no jank); fall back to a
  // full renderSheet if the element isn't there yet (structure changed).
  function onP(pct){ S.updBusy={t:target,pct:Math.max(0,Math.min(100,Math.round(pct)))};
    const t=document.getElementById('updpct'), f=document.getElementById('updfill');
    if(t&&f){ t.textContent=S.updBusy.pct+'%'; f.style.width=S.updBusy.pct+'%'; } else renderSheet(); }
}
function drawStore(){if(S.tab!=='store')return;STORE_ITEMS.filter(i=>i.kind==='face').forEach(it=>{
  const cv=document.getElementById('st-'+it.id);if(!cv)return;const ctx=cv.getContext('2d');const w=defWork(it.id);
  renderGaugePreview(ctx,{layout:FACECFG[it.id].l,ch:w.ch,arc:GOLD,col2:w.col2,text:'#eef0f4'},CHAN);});}
let tmr;
function toast(m){const t=document.getElementById('toast');t.innerHTML='&#10003; '+m;t.classList.add('show');clearTimeout(tmr);tmr=setTimeout(()=>t.classList.remove('show'),1700);}
function go(t){S.tab=t;store.axisTab=t;render();}   // persist so a sub-page round-trip returns here
function setLangUI(l){ setLang(l); render(); }      // change UI language + repaint the shell
function setT(x){S.target=x;render();}
// ---- multi-page: save the live page, switch/add/remove pages ----
function syncCur(){ if(S.pages) S.pages[S.cur]={face:S.face,work:S.work}; }
// Persist the whole page layout locally so it SURVIVES a shell remount (opening a Pro
// page swaps store.page, which unmounts AxisShell → onMount re-runs → S resets). Without
// this, a page set to a premium face reverted to Hero on return. (owner bug 2026-07-24)
function savePages(){try{localStorage.setItem('axis.pages',JSON.stringify({cur:S.cur,pages:S.pages,limits:S.limits,peaks:S.peaks}));}catch(e){}}
function setPage(i){ syncCur(); S.cur=i; S.face=S.pages[i].face; S.work=S.pages[i].work; savePages(); render(); livePush(); }
function addPage(){ if(S.pages.length>=10)return; syncCur(); const np={face:'hero',work:defWork('hero')}; S.pages.push(np); S.cur=S.pages.length-1; S.face=np.face; S.work=np.work; S.dirty=true; savePages(); render(); livePush(); }
function removePage(){ if(S.pages.length<=1)return; S.pages.splice(S.cur,1); if(S.cur>=S.pages.length)S.cur=S.pages.length-1; S.face=S.pages[S.cur].face; S.work=S.pages[S.cur].work; S.dirty=true; savePages(); render(); livePush(); }
function setFace(f){ S.face=f;S.work=defWork(f);S.dirty=true; syncCur(); savePages(); render();livePush(); }
function openBuy(id){S.buying=id;render();}
function cancelBuy(){S.buying=null;render();}
function saveOwned(){try{localStorage.setItem('axis.owned',JSON.stringify([...S.owned]));}catch(e){}}
function confirmBuy(){const it=STORE_ITEMS.find(i=>i.id===S.buying);if(!it)return;
  if(it.kind==='bundle')['regent','tuner','chrono'].forEach(x=>S.owned.add(x));else S.owned.add(it.id);
  saveOwned();S.buying=null;
  // jump STRAIGHT to the setup: select the new premium face + open Looks so you land
  // on its config page (owner: "กดเลือก premium gauge ก่อน ถึงเด้งไปหน้าที่ตั้ง").
  if(it.kind==='face'){ S.face=it.id; S.work=defWork(it.id); S.dirty=true; syncCur(); savePages(); }
  S.tab='looks'; store.axisTab='looks'; render();
  toast(it.kind==='face'?t('toast.face_setup',{name:it.name}):t('toast.item_added',{name:it.name}));}
// device (knob) name — editable text; mirrors setPeak (mutate + dirty, no full render → keeps focus)
function setKnobName(v){S.knobName=v;S.dirty=true;document.querySelector('.axisshell')?.classList.add('dirty');}
// ---- DTC tab handlers ----
async function dtcRead(){const mon=store.monClient;if(!mon||S.dtcBusy)return;S.dtcBusy=true;render();
  try{S.dtcSnap=await mon.readDtcCodes();}catch(e){toast(t('toast.read_failed'));}
  S.dtcBusy=false;render();}
// Clearing fault codes is a Phase-2 AUTHZ-gated (dangerous) command: the app writes it, the
// gauge shows a TAP-TO-CONFIRM card, and nothing clears until the driver taps the gauge. So we
// guide the user to tap, wait, then re-read and report honestly (never claim a premature clear).
async function dtcClear(){const mon=store.monClient;if(!mon||S.dtcBusy)return;
  const before=(S.dtcSnap&&S.dtcSnap.count)||0;
  S.dtcBusy=true;render();
  try{
    await mon.clearDtcCodes();                 // gauge now shows "TAP TO CONFIRM"
    toast(t('dtc.tap_confirm'));               // → tap your gauge to confirm
    await new Promise(r=>setTimeout(r,4500));   // give the driver time to reach over + tap
    S.dtcSnap=await mon.readDtcCodes();
    const after=(S.dtcSnap&&S.dtcSnap.count)||0;
    toast(after<before||after===0 ? t('toast.codes_cleared') : t('dtc.not_confirmed'));
  }catch(e){toast(t('toast.clear_failed'));}
  S.dtcBusy=false;render();}
// look-up updates ONLY the result div (no full render → the text input keeps focus)
function dtcLook(v){S.dtcLook=v;
  const el=document.getElementById('dtclookres');if(!el)return;
  if(!_richDtc){ ensureDtc();   // dict still loading → placeholder; render() repaints the real result when ready
    el.innerHTML = _dtcErr ? `<div class="dmsg">Couldn't load the fault-code data. <button class="linkrow" onclick="retryDtc()">Retry</button></div>`
                           : `<div class="dmsg" aria-busy="true">Loading fault-code data&hellip;</div>`;
    return; }
  const lk=v.trim()?_richDtc(v.trim().toUpperCase()):null;
  el.innerHTML=lk?dtcCard(lk):(v.trim()?`<div class="dmsg">Enter a valid code like P0301, P0420 or U0100.</div>`:'');}
// Open a web search for the code — deeper detail + repair videos the offline card can't hold.
function dtcSearch(code){ const q=encodeURIComponent(code+' OBD code symptoms causes fix'); window.open('https://www.google.com/search?q='+q,'_blank'); }
function chanSelect(slot){const cur=S.work.ch[slot];let o='';CHANNEL_GROUPS.forEach(g=>{const items=CHANNELS.filter(c=>c.id!==0&&c.group===g);if(!items.length)return;o+=`<optgroup label="${has('group:'+g)?t('group:'+g):g}">`;items.forEach(c=>{o+=`<option value="${c.id}" ${c.id===cur?'selected':''}>${chName(c.id)}</option>`;});o+='</optgroup>';});return `<select class="chsel" onchange="setChan(${slot},this.value)">${o}</select>`;}
function setChan(slot,v){S.work.ch[slot]=+v;S.dirty=true;render();livePush();}
function cycleChan(slot){const cur=S.work.ch[slot],i=CHAN_ORDER.indexOf(cur);S.work.ch[slot]=CHAN_ORDER[(i+1)%CHAN_ORDER.length];S.dirty=true;render();livePush();}
function cycleColor(role){const cur=S.work[role],i=PALETTE.findIndex(p=>p[0].toLowerCase()===String(cur).toLowerCase());S.work[role]=PALETTE[(i+1)%PALETTE.length][0];S.dirty=true;render();livePush();}
// per-VALUE colour: cycle just slot n through the palette (every value independent)
function cycleSlot(n){const cur=S.work.slot[n],i=PALETTE.findIndex(p=>p[0].toLowerCase()===String(cur).toLowerCase());S.work.slot[n]=PALETTE[(i+1)%PALETTE.length][0];S.dirty=true;render();livePush();}
// UNLIMITED colour (native full-spectrum picker). Fires live as the user drags, so
// mirror setPeak: mutate + mark dirty + repaint ONLY the preview canvas — a full
// render() would rebuild the DOM mid-pick and close the wheel.
function markDirty(){S.dirty=true;const r=document.querySelector('.axisshell');if(r)r.classList.add('dirty');}
function setSlotColor(n,hex){S.work.slot[n]=hex;markDirty();syncCur();drawGaugeCanvas();livePush();}
function setRoleColor(role,hex){S.work[role]=hex;markDirty();syncCur();drawGaugeCanvas();livePush();}
// Gauge screen brightness — live-dims the AMOLED via the dedicated brightness char
// (applies instantly, like MonitorConfig). No full render → the slider keeps the drag;
// only the % label updates. Also folded into _gaugeCfg so a later Save-all persists it.
function setBright(v){S.bright=Math.max(8,Math.min(255,+v||0)); if(_gaugeCfg)_gaugeCfg.brightness=S.bright;
  const el=document.getElementById('brival'); if(el)el.textContent=Math.round(S.bright/255*100)+'%';
  const mon=store.monClient; if(mon&&mon.setBrightness)mon.setBrightness(S.bright).catch(()=>{});}
// Vehicle mass (kg) — VirtualDyno power/torque physics input; per-car, so it rides in presets.
// Night mode — universal auto-dim by the gauge RTC. Each change pushes the whole config over BLE.
let _nightT=null;
function nightPush(){ const mon=store.monClient; if(!mon||!mon.setNight) return; clearTimeout(_nightT); _nightT=setTimeout(()=>{ mon.setNight(S.night).catch(()=>{}); },140); }
function setNightMode(m){ S.night={...S.night,mode:(m|0)}; render(); nightPush(); }
function setNightBright(v){ S.night={...S.night,nightBright:Math.max(8,Math.min(255,Math.round(+v||8)))}; render(); nightPush(); }
function setNightHours(s,e){ S.night={...S.night,startHr:Math.max(0,Math.min(23,+s|0)),endHr:Math.max(0,Math.min(23,+e|0))}; render(); nightPush(); }
function toggleNightNow(){ S.night={...S.night,mode:2,manualNight:!S.night.manualNight}; render(); nightPush(); }
// Display units — one chip flips the whole gauge Metric ↔ Imperial (cfg.units array).
function setUnit(cls,idx){ S.units[cls]=idx; S.dirty=true; document.querySelector('.axisshell')?.classList.add('dirty'); saveUnits(); render(); livePush(); }
function setUnitsAll(kind){ S.units = kind==='imperial'?[...UNITS_IMPERIAL]:[...UNITS_METRIC]; S.dirty=true; document.querySelector('.axisshell')?.classList.add('dirty'); saveUnits(); render(); livePush(); }
function saveUnits(){try{localStorage.setItem('axis.units',JSON.stringify(S.units));}catch(e){}}
function togglePeak(){S.peak=!S.peak;S.dirty=true;render();}
// per-value peak: setPeak stores WITHOUT re-render so the number input keeps focus while typing.
function setPeak(id,v){S.peaks[id].val=(v===''?0:+v);S.dirty=true;document.querySelector('.axisshell')?.classList.add('dirty');livePush();}
function setLimit(id,v){S.limits[id]=(v===''?0:+v);S.dirty=true;document.querySelector('.axisshell')?.classList.add('dirty');livePush();}
function togPeak(id){S.peaks[id].on=!S.peaks[id].on;S.dirty=true;render();livePush();}
function setFeel(f){S.feel=f;render();}

// ---- Gauge PRESETS: named full-config snapshots (multi-car: 1 gauge ↔ many cars) ----------
// A preset captures EVERYTHING the Looks editor owns + what applyLooks('all') pushes: every
// page (face + values + per-value colours), each channel's peak/warn + arc full-scale limit,
// the per-quantity units, and screen brightness. Stored app-side (localStorage) — Load restores
// the editor state then pushes it to the physical gauge over BLE in one tap. Cap at 8.
const PRESET_MAX = 8;
function presetList(){ try{ return JSON.parse(localStorage.getItem('axis.presets')||'[]'); }catch(e){ return []; } }
function presetStore(a){ try{ localStorage.setItem('axis.presets', JSON.stringify(a)); }catch(e){} }
function presetSnapshot(){
  syncCur();   // fold the live page edits into S.pages first
  return {
    pages:  JSON.parse(JSON.stringify(S.pages)),
    peaks:  JSON.parse(JSON.stringify(S.peaks)),
    limits: JSON.parse(JSON.stringify(S.limits)),
    units:  [...S.units],
    bright: S.bright,
  };
}
function presetSaveNew(){
  const a=presetList();
  if(a.length>=PRESET_MAX){ toast(t('preset.full',{n:PRESET_MAX})); return; }
  // Name a new preset after the detected car (multi-car) if we know it, else the default.
  const car=S.detectedCar&&S.detectedCar.make?{...S.detectedCar}:null;
  const name=car?(car.make+(car.year?(' '+car.year):'')).slice(0,20):t('preset.default',{n:a.length+1});
  a.push({ id:'p'+Date.now().toString(36), name, ts:Date.now(), car, snap:presetSnapshot() });
  presetStore(a); toast(t('preset.saved')); render();
}
// Overwrite now CONFIRMS first (owner: guard the one-tap update of a saved car profile).
function presetOverwrite(id){ const a=presetList(); const p=a.find(x=>x.id===id); if(!p)return;
  S.presetConfirm={kind:'overwrite',id,name:p.name,blurb:t('preset.confirm_ow',{name:p.name}),ok:t('preset.ow_ok')}; render(); }
function presetOverwriteDo(id){ const a=presetList(); const p=a.find(x=>x.id===id); if(!p)return; p.snap=presetSnapshot(); p.ts=Date.now(); presetStore(a); toast(t('preset.updated',{name:p.name})); render(); }
// Tag/untag a preset with the currently-detected car → it auto-loads when that car is seen.
function presetAssignCar(id){ const a=presetList(); const p=a.find(x=>x.id===id); if(!p)return;
  if(!S.detectedCar||!S.detectedCar.make){ toast(t('preset.no_car')); return; }
  const same=p.car&&p.car.make===S.detectedCar.make&&p.car.year===S.detectedCar.year;
  p.car=same?null:{...S.detectedCar};
  presetStore(a); toast(same?t('preset.car_cleared'):t('preset.car_set',{car:p.car.make})); render();
}
// Auto-switch to the saved profile whose car matches the VIN-decoded car — once per car change,
// never over unsaved edits or when it's already active.
function presetAutoSwitch(){
  const car=S.detectedCar; if(!car||!car.make) return;
  const m=car.make.toLowerCase();
  if(S._autoCar===m) return; S._autoCar=m;
  const hit=presetList().find(p=>p&&p.car&&(p.car.make||'').toLowerCase()===m);
  if(!hit||hit.id===S.activePreset||S.dirty) return;
  toast(t('preset.switched',{car:car.make+(car.year?(' '+car.year):'')}));
  presetLoadDo(hit.id);
}
function presetRename(id,name){ const a=presetList(); const p=a.find(x=>x.id===id); if(!p)return; p.name=(name||'').trim().slice(0,20)||p.name; presetStore(a); }
function presetDelete(id){   // confirm first — a preset is precious, delete is one tap
  const p=presetList().find(x=>x.id===id); if(!p)return;
  S.presetConfirm={kind:'delete',id,name:p.name,blurb:t('preset.confirm_del'),ok:t('preset.del_ok')}; render();
}
function presetDeleteDo(id){
  presetStore(presetList().filter(x=>x.id!==id));
  if(S.activePreset===id) S.activePreset=null;
  toast(t('preset.deleted')); render();
}
// Guard: loading REPLACES the whole editor state, so if there are unsaved edits confirm first.
function presetLoad(id){
  const p=presetList().find(x=>x.id===id); if(!p||!p.snap||!Array.isArray(p.snap.pages)||!p.snap.pages.length) return;
  if(S.dirty){ S.presetConfirm={kind:'load',id,name:p.name,blurb:t('preset.confirm_load'),ok:t('preset.load_ok')}; render(); return; }
  presetLoadDo(id);
}
function presetConfirmYes(){ const c=S.presetConfirm; S.presetConfirm=null; if(!c){render();return;} if(c.kind==='load')presetLoadDo(c.id); else if(c.kind==='delete')presetDeleteDo(c.id); else if(c.kind==='overwrite')presetOverwriteDo(c.id); }
function presetConfirmNo(){ S.presetConfirm=null; render(); }
async function presetLoadDo(id){
  const p=presetList().find(x=>x.id===id); if(!p||!p.snap||!Array.isArray(p.snap.pages)||!p.snap.pages.length) return;
  const s=p.snap;
  // restore the editor state from the snapshot
  S.pages  = JSON.parse(JSON.stringify(s.pages));
  S.peaks  = Object.assign({}, S.peaks, s.peaks||{});     // merge so any newer channel id keeps a default
  S.limits = Object.assign({}, S.limits, s.limits||{});
  if(Array.isArray(s.units)) S.units = s.units.slice(0,UC_COUNT);
  if(typeof s.bright==='number') S.bright = s.bright;
  S.cur=0; S.face=S.pages[0].face; S.work=S.pages[0].work; S.dirty=false;
  S.activePreset=id;                                               // highlight the loaded preset
  S.pages.forEach(pg=>{ if(pg&&pg.face) S.owned.add(pg.face); });   // unlock any premium face the preset uses
  savePages(); saveUnits(); saveOwned();
  drawGaugeCanvas(); render();
  // push to the physical gauge if connected — brightness (live char) + the whole config
  if(store.monClient){
    try{ if(store.monClient.setBrightness) await store.monClient.setBrightness(S.bright); }catch(e){}
    await applyLooks('all');                                // pages + units + warn + limits → gauge
    toast(t('preset.applied',{name:p.name}));
  } else {
    toast(t('preset.loaded_local',{name:p.name}));          // staged locally; applies on next connect+save
  }
}

// ---- Preset SHARE + full BACKUP: portable "AXIS1." text codes (copy/paste, no backend) -----
// One preset (or the whole set) serialises to a short code the owner can copy + send; importing
// decodes it back. Same codec powers per-preset Share and a full-set Backup / Restore.
function axisEncode(obj){ try{ return 'AXIS1.'+btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }catch(e){ return ''; } }
function axisDecode(str){ try{ const s=(str||'').trim(); const b=s.startsWith('AXIS1.')?s.slice(6):s; return JSON.parse(decodeURIComponent(escape(atob(b)))); }catch(e){ return null; } }
function presetShare(id){ const p=presetList().find(x=>x.id===id); if(!p)return;
  S.shareSheet={mode:'share', name:p.name, code:axisEncode({t:'preset', name:p.name, snap:p.snap})}; render(); }
function presetImportOpen(){ S.shareSheet={mode:'import', text:''}; render(); }
function backupOpen(){ const a=presetList(); S.shareSheet={mode:'backup', n:a.length, code:axisEncode({t:'backup', presets:a})}; render(); }
function restoreOpen(){ S.shareSheet={mode:'restore', text:''}; render(); }
function shareClose(){ S.shareSheet=null; render(); }
function shareInput(v){ if(S.shareSheet) S.shareSheet.text=v; }
async function shareCopy(){ const c=S.shareSheet&&S.shareSheet.code; if(!c)return;
  try{ await navigator.clipboard.writeText(c); toast(t('preset.copied')); }
  catch(e){ const ta=document.getElementById('sharecode'); if(ta){ ta.focus(); ta.select(); try{ document.execCommand('copy'); toast(t('preset.copied')); }catch(_){ toast(t('preset.copy_manual')); } } } }
function shareImportDo(){ const d=axisDecode(S.shareSheet&&S.shareSheet.text);
  if(!d||d.t!=='preset'||!d.snap||!Array.isArray(d.snap.pages)||!d.snap.pages.length){ toast(t('preset.bad_code')); return; }
  const a=presetList(); if(a.length>=PRESET_MAX){ toast(t('preset.full',{n:PRESET_MAX})); return; }
  a.push({ id:'p'+Date.now().toString(36), name:(d.name||t('preset.default',{n:a.length+1})).toString().slice(0,20), ts:Date.now(), snap:d.snap });
  presetStore(a); S.shareSheet=null; toast(t('preset.imported')); render(); }
function shareRestoreDo(){ const d=axisDecode(S.shareSheet&&S.shareSheet.text);
  if(!d||d.t!=='backup'||!Array.isArray(d.presets)){ toast(t('preset.bad_code')); return; }
  const clean=d.presets.filter(p=>p&&p.snap&&Array.isArray(p.snap.pages)&&p.snap.pages.length).slice(0,PRESET_MAX)
    .map(p=>({ id:p.id||('p'+Math.random().toString(36).slice(2,9)), name:(p.name||'?').toString().slice(0,20), ts:p.ts||Date.now(), snap:p.snap }));
  presetStore(clean); S.shareSheet=null; S.activePreset=null; toast(t('preset.restored',{n:clean.length})); render(); }
// Canvas bakes whatever font is loaded at draw time, so resolve Psionic first,
// then draw, and redraw once more when it settles (belt + braces).
S.work=defWork(S.face);
// start with a 4-page set (matches the gauge's factory default page count)
S.pages=[{face:'hero',work:defWork('hero')},{face:'bars',work:defWork('bars')},
         {face:'needle',work:defWork('needle')},{face:'ticks',work:defWork('ticks')}];
S.cur=0; S.face=S.pages[0].face; S.work=S.pages[0].work;
// LOW-side channels warn when the value drops BELOW (low battery / fuel / charge / oil
// pressure / fuel-rail pressure) — MUST match firmware channelLowSide(). Others warn ABOVE.
const LOW_SIDE=new Set([Ch.VOLT,Ch.FUELLVL,Ch.SOC,Ch.OILPRESS,Ch.FRP]);
// Sensible starting WARN per channel (native units). Missing → derived from range/redline.
const WARN_DEF={[Ch.VOLT]:11.8,[Ch.FUELLVL]:15,[Ch.SOC]:20,[Ch.OILPRESS]:1,[Ch.FRP]:30,
  [Ch.COOLANT]:112,[Ch.OILTEMP]:128,[Ch.CATTEMP]:920,[Ch.AFR_M]:16,[Ch.LAMBDA_M]:1.1};
// Channels that genuinely warrant a warning OUT OF THE BOX — over-rev / overheat /
// overboost / low voltage / low oil-or-fuel pressure / low fuel. Everything else
// (speed, load, throttle, flows, trims, economy, power/torque, counters…) defaults
// OFF: hitting them is normal driving, not a fault. The owner can enable any of them.
const WARN_ON=new Set([Ch.RPM,Ch.COOLANT,Ch.OILTEMP,Ch.CATTEMP,Ch.BOOST,
  Ch.VOLT,Ch.OILPRESS,Ch.FRP,Ch.FUELLVL,Ch.SOC,Ch.AFR_M,Ch.LAMBDA_M]);   // AF/Lambda = lean-under-load
S.peaks={};CHAN_ORDER.forEach(id=>{const d=channelDef(id);
  if(!d){S.peaks[id]={val:0,on:false};return;}
  let dv=WARN_DEF[id];
  // Fallback: low-side → 20% up from the bottom of range; high-side → redline or 85% of max.
  if(dv===undefined) dv=LOW_SIDE.has(id)?(d.min+(d.max-d.min)*0.2):(d.peak??d.max*0.85);
  const val=dv<20?Math.round(dv*10)/10:Math.round(dv/5)*5;   // keep 1 dp for small values; round others to 5
  S.peaks[id]={val,on:WARN_ON.has(id)};});
// arc full-scale MAX per channel — default = the channel's native max; the owner can
// tune it so the arc sweeps to the real limit (e.g. RPM 7000). 0 handled as "default".
S.limits={};CHAN_ORDER.forEach(id=>{const d=channelDef(id);S.limits[id]=d?d.max:0;});
// restore faces the user has already tried (persist across launches)
try{const o=JSON.parse(localStorage.getItem('axis.owned')||'[]');o.forEach(x=>S.owned.add(x));}catch(e){}
// restore the per-quantity unit choices (survives a remount, like pages)
try{const u=JSON.parse(localStorage.getItem('axis.units')||'null');if(Array.isArray(u)&&u.length===UC_COUNT)S.units=u.map(x=>x|0);}catch(e){}
// restore the saved page layout (premium faces + colours) so it survives a remount
try{const raw=localStorage.getItem('axis.pages');const o=raw?JSON.parse(raw):null;
  if(o&&Array.isArray(o.pages)){
    const pad5=(a,fill)=>{const r=Array.isArray(a)?a.slice(0,5):[];while(r.length<5)r.push(fill);return r;};
    // keep only pages with a KNOWN face; NORMALISE work to the canonical shape (5 ch,
    // 5 slot colours, col2/text) so a stale/short saved entry can't yield undefined.
    const pgs=o.pages.filter(p=>p&&p.face&&FACECFG[p.face]&&p.work).map(p=>({face:p.face,work:{
      ch:pad5(p.work.ch,0), slot:pad5(p.work.slot,GOLD),
      col2:p.work.col2||'#8b9199', text:p.work.text||'#eef0f4'}}));
    if(pgs.length){
      // any PREMIUM face placed on a page must be unlocked so it renders (not → Hero)
      pgs.forEach(p=>{ if(!FREE_FACES.includes(p.face)) S.owned.add(p.face); });
      S.pages=pgs; S.cur=Math.min(Math.max(0,o.cur|0),pgs.length-1);
      S.face=S.pages[S.cur].face; S.work=S.pages[S.cur].work; S.dirty=false;
    }
    // restore the owner's custom Value(limit) + Warning(peak) over the channel defaults
    if(o.limits&&typeof o.limits==='object') for(const k in o.limits){ if(S.limits[k]!==undefined&&Number.isFinite(+o.limits[k])) S.limits[k]=+o.limits[k]; }
    if(o.peaks&&typeof o.peaks==='object') for(const k in o.peaks){ if(S.peaks[k]&&o.peaks[k]) S.peaks[k]={val:+o.peaks[k].val||0,on:!!o.peaks[k].on}; }
  }}catch(e){}
render();

    // Pro tab → open the real engineering pages (they render outside this shell).
    function goPage(p){ store.page = p; }

    // ---- Apply → push the chosen face to the REAL gauge (page 0 = MAIN) --------
    // The shell's demo channel ids map to the firmware Ch enum; the face maps to the
    // firmware PageLayout (FACECFG[].l already IS that number). We read the gauge's
    // current config first so pages 2..N are preserved, edit MAIN, and write it back.
    // Connect the gauge RIGHT HERE (native OS BLE chooser) so the owner never
    // gets bounced to Pro just to pair — Looks is where you style AND push.
    async function ensureGauge(){
      if (store.monClient) return true;
      try {
        toast(t('toast.choose_gauge'));
        const id = await MonitorBleClient.pick();          // OS device chooser, filtered to AXIS
        const m  = new MonitorBleClient(id);
        await m.connect(() => { store.monClient = null; store.obdSeen = false; liveMonId = null; render(); });   // reflect a later drop (OBD goes with the gauge)
        store.monClient = m;
        render();                                          // header dots + Apply label flip to "connected"
        openLive();                                         // pull REAL firmware/faults/best for the Home cards
        toast(t('toast.gauge_connected'));
        return true;
      } catch (e) {
        const msg = String((e && e.message) ? e.message : e);
        toast(/cancel|abort|no device/i.test(msg) ? 'Connect cancelled' : 'Couldn’t connect — try again');
        return false;
      }
    }
    // mode 'current' = save ONLY this page · 'all' = save every page.
    async function applyLooks(mode){
      mode = mode || 'all';
      if (S.target === 'knob') {
        // Knob styling apply (previously a stub that only toasted). Push the edited
        // colours + device name to the knob over BLE via store.client.setBranding()
        // — the same working path Brand.svelte uses. The firmware's branding char
        // applies + persists (brand.save()) on write. Only fires when the knob is
        // actually connected (store.client set); otherwise prompt to connect.
        const kc = store.client;
        if (!kc) { toast(t('toast.knob_style_connect')); return; }
        try {
          syncCur();
          const acc = accent();               // S.work.slot[0] — gear/accent colour
          await kc.setBranding({
            name:       (S.knobName || '').trim().slice(0, 14),
            accent_hex: acc,
            gear_hex:   acc,
            name_hex:   S.work.text            // device-name colour
          });
          S.dirty = false;
          document.querySelector('.axisshell')?.classList.remove('dirty');
          toast(t('toast.saved_all', { n: 1 }));
        } catch (e) {
          toast(t('toast.save_failed') + (e && e.message ? e.message : 'try again'));
        }
        return;
      }
      // Not paired yet? Pair now (inline) instead of dead-ending at Pro.
      if (!store.monClient) { if (!(await ensureGauge())) return; }
      const mon = store.monClient;
      if (!mon) return;
      // Keep S.dirty=TRUE through connect+read+write: pairing here can trigger a
      // connect-time pullGaugeConfig, and its `if(S.dirty)return` guard is what stops it
      // clobbering these unsaved edits with the gauge's (still-default) config mid-save.
      // Clear dirty only AFTER setConfig succeeds (owner 2026-07-24: page reset to default
      // on the connect+save path).
      try {
        syncCur();                                          // fold the live edits back into S.pages
        const cfg = await mon.config();                     // read current, then overwrite
        if (!cfg || !Array.isArray(cfg.pages) || !cfg.pages.length) throw new Error('gauge did not send its settings — reconnect');
        cfg.units = [...S.units];   // per-quantity display units (whole config)
        applyWarn(cfg);             // v16: persist the per-channel warn column (both save modes)
        if (mode === 'current') {
          const i = Math.max(0, Math.min(S.cur, S.pages.length - 1));   // clamp to a real page
          if (!cfg.pages[i]) cfg.pages[i] = { layout:0, ch:[0,0,0,0,0], arcColor:0, peak:0, color2:0, textColor:0 };
          writePage(S.pages[i], cfg.pages[i]);              // this page only — others stay as the gauge has them
          if (i + 1 > cfg.pageCount) cfg.pageCount = i + 1;
          await mon.setConfig(cfg);
          toast(t('toast.saved_page',{n:i+1}));
        } else {
          cfg.pageCount = S.pages.length;
          for (let i = 0; i < S.pages.length && i < cfg.pages.length; i++) writePage(S.pages[i], cfg.pages[i]);
          await mon.setConfig(cfg);
          toast(t('toast.saved_all',{n:S.pages.length}));
        }
        S.dirty=false; document.querySelector('.axisshell')?.classList.remove('dirty');   // clear ONLY after the save actually landed
      } catch (e) { toast(t('toast.save_failed') + (e && e.message ? e.message : 'try again')); }
    }

    // expose the handlers the innerHTML onclick="" attributes call
    // ---- First-run guided setup: a 2-step welcome that hands off to Connect, shown once ----
    function onboardMark(){ try{ localStorage.setItem('axis.onboarded','1'); }catch(e){} }
    function onboardNext(){ S.onboard=(S.onboard||0)+1; render(); }
    function onboardSkip(){ S.onboard=null; onboardMark(); render(); }
    function onboardConnect(){ S.onboard=null; onboardMark(); openConnect(); }   // hand off to the real connect sheet
    function onboardStyle(){ S.onboard=null; onboardMark(); go('looks'); }
    function onboardOpen(){ S.onboard=0; render(); }                              // re-openable from Settings
    function onboardView(){
      const step=S.onboard|0, cG=!!store.monClient;
      const dots=`<div class="obdots">${[0,1].map(i=>`<i class="${i===step?'on':''}"></i>`).join('')}</div>`;
      if(step===0){
        return `<div class="sheet"><div class="sheetcard ob">
          <div class="sheeteyebrow">${t('ob.eyebrow')}</div>
          <div class="sheetname">${t('ob.welcome')}</div>
          <div class="sheetblurb">${t('ob.welcome_sub')}</div>
          ${dots}
          <button class="prim" onclick="onboardNext()">${t('ob.start')}</button>
          <button class="sheetcancel" onclick="onboardSkip()">${t('ob.skip')}</button>
        </div></div>`;
      }
      const steps=[['1',t('ob.s1'),t('ob.s1d')],['2',t('ob.s2'),t('ob.s2d')],['3',t('ob.s3'),t('ob.s3d')]]
        .map(([n,h,d])=>`<div class="obstep"><span class="obn">${n}</span><div><div class="obh">${h}</div><div class="obd">${d}</div></div></div>`).join('');
      return `<div class="sheet"><div class="sheetcard ob">
        <div class="sheeteyebrow">${t('ob.eyebrow')}</div>
        <div class="sheetname">${t('ob.setup')}</div>
        <div class="obsteps">${steps}</div>
        ${dots}
        ${cG?`<button class="prim" onclick="onboardStyle()">${t('ob.style_now')}</button>`
            :`<button class="prim" onclick="onboardConnect()">${t('ob.connect_gauge')}</button>`}
        <button class="sheetcancel" onclick="onboardSkip()">${t('ob.later')}</button>
      </div></div>`;
    }
    // Show onboarding on a genuine first run only (never onboarded · no device · not demo).
    try{ if(!localStorage.getItem('axis.onboarded') && !store.monClient && !store.client && !store.isDemo) S.onboard=0; }catch(e){}
    _render = render;   // let the module-scope lazy-DTC helpers repaint the shell (see ensureDtc)
    Object.assign(window, { go, setT, setFace, cycleChan, setChan, cycleColor, cycleSlot, setSlotColor, setRoleColor, setKnobName, dtcRead, dtcClear, dtcLook, dtcSearch, retryDtc, setBright, setUnit, setUnitsAll, setLimit, setPeak, togPeak, togglePeak, openConnect, closeConnect, connectDev, openUpdate, closeUpdate, doUpdate, setFeel, toast, openBuy, cancelBuy, confirmBuy, goPage, applyLooks, setPage, addPage, removePage, setLangUI, exploreDemo, disconnectDev, setNightMode, setNightBright, setNightHours, toggleNightNow, presetSaveNew, presetOverwrite, presetRename, presetDelete, presetLoad, presetAssignCar, presetConfirmYes, presetConfirmNo, presetShare, presetImportOpen, backupOpen, restoreOpen, shareClose, shareInput, shareCopy, shareImportDo, shareRestoreDo, onboardNext, onboardSkip, onboardConnect, onboardStyle, onboardOpen });
    render();
    ensureGaugeFont().then(() => { drawGaugeCanvas(); drawStore(); }).catch(() => {});
    openLive();   // if a device is already connected on mount, pull its REAL status
    _stopWave = carbonWave(document.getElementById('aeroflow'), {NL:72,lineA:.24,lineW:2,sheen:.3,speed:1.35});
    return () => { _alive=false; _render=null; try { liveSock && liveSock.close(); } catch(e){} _stopWave && _stopWave(); };   // on unmount: drop the render ref so a late DTC-dict resolve can't repaint a dead shell
  });

// AERO background — SN's draped carbon-fibre waves + a slow light sheen behind
// everything (shows through the gaps + blurs behind the frosted frame). Hero
// intensity, no logo (the logo version is the splash). See lib/carbonWave.ts.
let _stopWave=null;
</script>

<div class="axisshell">
  <canvas class="aeroflow" id="aeroflow" aria-hidden="true"></canvas>
  <div class="st">
    <div class="brand"><svg viewBox="0 0 1000 1000" fill="currentColor" aria-hidden="true"><path d="M900,100.06v-.06H300.75s0,0,0,0,0,0,0,0c-12.77,0-25.25,1.26-37.35,3.66-48,8.69-91.37,32.87-122.7,69.26-29.98,34.82-45.83,76.85-45.83,121.56v600.92h5.14v1.52h600.74c31.16,0,60.65-7.46,86.96-20.77,26.28-12.36,49.78-29.96,68.83-52.09,29.98-34.82,45.83-76.85,45.83-121.56V100.06h-2.36ZM512.97,702.57l-.84-129.46v-51.43h61.37l127.23.8c85.88,0,155.74,73.38,155.74,163.58s-69.87,163.58-155.74,163.58l-95.08.61c-55.25-28.97-92.69-84.31-92.69-147.69ZM296.73,147.32l94.76-.63c55.29,28.97,92.76,84.34,92.76,147.76l.36,180.34-183.87-.36c-85.88,0-155.74-73.38-155.74-163.58s67.7-161.29,151.73-163.53ZM826.44,521.68c-34.4-29.06-78.11-46.46-125.7-46.46l-188.61-.37v-181.38c-.24-44.35-16.09-86.04-45.83-120.57-8.36-9.71-17.59-18.53-27.52-26.44h436.51v427.89l-.05,7.47c-12.56-23.14-29.16-43.54-48.81-60.14ZM121.92,850.45v-427.83l.11-15.71c12.95,26.51,31.08,49.78,53,68.3,34.16,28.86,77.49,46.21,124.68,46.46.35,0,.69.01,1.04.01s.69-.01,1.04-.01h182.93l.36,180.82c0,44.71,15.85,86.74,45.83,121.56,8.34,9.69,17.55,18.5,27.45,26.39H121.92Z"/></svg><span class="t psi">AXIS</span></div>
    <div class="devs">
      <span class="d" class:on={!!store.client}><span class="dot"></span>KNOB</span>
      <span class="d" class:on={!!store.monClient}><span class="dot"></span>GAUGE</span>
      <span class="d" class:on={!!store.monClient && store.obdSeen}><span class="dot"></span>OBD</span>
    </div>
  </div>
  <div class="body" id="body"></div>
  <div class="toast" id="toast"></div>
  <div class="nav" id="nav"></div>
  <div id="sheet"></div>
</div>
