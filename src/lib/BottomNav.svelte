<script lang="ts">
  // =====================================================================
  //  BottomNav — fixed iOS-style tab bar pinned to the bottom of the
  //  viewport. Renders the 5 most-used destinations; less-frequent pages
  //  (Calibrate, Sys) stay reachable via in-page links
  //  but don't crowd the bar.
  //
  //  Safe-area handling:
  //   • padding-bottom uses env(safe-area-inset-bottom) so iPhones with a
  //     home indicator add space (typ. ~34 px) and we don't sit under it.
  //   • Page content needs matching padding-bottom — added in app.css so
  //     it doesn't need to be repeated per page.
  // =====================================================================
  import { store, type Page } from './store.svelte';

  // Each tab = { id, label }. Order matches the visual left→right.
  //
  // 6 tabs at 11 px mono fits on every supported iPhone (375 px wide
  // worst case for iPhone SE → 62 px per tab → "DEVICES" is the widest
  // label at ~58 px). CALIB sits between TUNE and CUSTOM because it's
  // the "device knows what each gear is" foundation that TUNE's response
  // curves and CUSTOM's colour mappings ride on top of — easier to find
  // when it's next to its prerequisites.
  //
  // SCREEN (screensaver) lives off the CUSTOM page; SYS lives off the
  // Connect screen and Live overflow. They're occasional destinations
  // and don't earn a permanent tab.
  // v3.1 buyer-facing nav. The engineer pages (TUNE/GAUGE/DEVICES/OTA/SYS)
  // moved behind the Pro door; CUSTOM became Looks, TUNE's feel became Feel,
  // CALIB became the plain "Setup". Each tab carries a thin monoline icon
  // (inner SVG markup) so the app speaks the device's own visual language.
  const TABS: ReadonlyArray<{ id: Page; label: string; icon: string }> = [
    { id: 'live',      label: 'HOME',  icon: '<circle cx="11" cy="11" r="7"/><circle cx="11" cy="11" r="1.6" fill="currentColor" stroke="none"/>' },
    { id: 'looks',     label: 'LOOKS', icon: '<path d="M11 3C8 8 6 11 6 13.5a5 5 0 0 0 10 0C16 11 14 8 11 3Z"/>' },
    { id: 'feel',      label: 'FEEL',  icon: '<line x1="4" y1="7.5" x2="18" y2="7.5"/><circle cx="8" cy="7.5" r="2.2"/><line x1="4" y1="14.5" x2="18" y2="14.5"/><circle cx="14" cy="14.5" r="2.2"/>' },
    { id: 'calibrate', label: 'SETUP', icon: '<path d="M11 4l1.6 4.4L17 10l-4.4 1.6L11 16l-1.6-4.4L5 10l4.4-1.6Z"/>' },
    { id: 'ota',       label: 'UPDATE',icon: '<path d="M11 3v9"/><path d="M7 8.5l4 4 4-4"/><path d="M4.5 17.5h13"/>' },
    { id: 'pro',       label: 'PRO',   icon: '<circle cx="11" cy="11" r="3.5"/><path d="M11 2.5v3M11 16.5v3M2.5 11h3M16.5 11h3M5 5l2 2M17 17l-2-2M17 5l-2 2M5 17l2-2"/>' },
  ];

  function go(p: Page) { store.page = p; }

  // Sub-pages without their own tab still light up their owning tab, so a
  // user who lands on e.g. Sys (via Pro) always sees which section they're
  // in — no "no tab highlighted" dead-end.
  const OWNED: Partial<Record<Page, Page[]>> = {
    pro:   ['tune', 'sys', 'devices', 'gaugesetup', 'brand', 'diag', 'drivetrain', 'monota', 'monconfig'],
    looks: ['screensaver'],
  };
  function tabActive(id: Page): boolean {
    return store.page === id || (OWNED[id]?.includes(store.page) ?? false);
  }
</script>

<nav class="bottom-nav" aria-label="Primary">
  {#each TABS as tab}
    <button
      type="button"
      class:active={tabActive(tab.id)}
      on:click={() => go(tab.id)}
      aria-current={tabActive(tab.id) ? 'page' : undefined}
    >
      <svg viewBox="0 0 22 22" aria-hidden="true">{@html tab.icon}</svg>
      <span>{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    background: var(--surface);
    border-top: 1px solid var(--border);
    /* env(safe-area-inset-bottom) is the height of the home-indicator on
       iPhones without a home button — adds breathing room so the buttons
       don't sit under the indicator. */
    padding-bottom: env(safe-area-inset-bottom, 0);
    z-index: 100;
  }

  .bottom-nav button {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    background: transparent;
    border: 0;
    color: var(--muted);
    padding: 6px 0 8px;
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: .5px;
    cursor: pointer;
    transition: color 120ms ease;
    /* iOS HIG ≥44 pt tap target — the env-inset padding compensates the
       rest on devices with a home indicator. */
    min-height: var(--tap-min);
  }

  .bottom-nav button svg {
    width: 20px;
    height: 20px;
    stroke: currentColor;
    fill: none;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .bottom-nav button:active { background: var(--surface-2); }
  .bottom-nav button.active {
    color: var(--accent);
    /* Subtle top accent line marks the current tab without an icon. */
    box-shadow: inset 0 2px 0 0 var(--accent);
  }
</style>
