<script lang="ts">
  // =====================================================================
  //  BottomNav — fixed iOS-style tab bar pinned to the bottom of the
  //  viewport. Renders the 5 most-used destinations; less-frequent pages
  //  (Calibrate, Sys, Dashboard tiles) stay reachable via in-page links
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
  // SCREEN (screensaver) lost its tab when DEVICES went in — it's still
  // reachable via the "OPEN SCREENSAVER →" button on the CUSTOM page,
  // which is the natural place to launch it from anyway.
  const TABS: ReadonlyArray<{ id: Page; label: string }> = [
    { id: 'live',    label: 'LIVE'    },
    { id: 'tune',    label: 'TUNE'    },
    { id: 'brand',   label: 'CUSTOM'  },
    { id: 'devices', label: 'DEVICES' },
    { id: 'ota',     label: 'OTA'     },
  ];

  function go(p: Page) { store.page = p; }
</script>

<nav class="bottom-nav" aria-label="Primary">
  {#each TABS as tab}
    <button
      type="button"
      class:active={store.page === tab.id}
      on:click={() => go(tab.id)}
      aria-current={store.page === tab.id ? 'page' : undefined}
    >
      {tab.label}
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
    background: transparent;
    border: 0;
    color: var(--muted);
    padding: var(--s-3) 0 calc(var(--s-3) + 2px);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 1px;
    cursor: pointer;
    transition: color 120ms ease;
    /* iOS HIG ≥44 pt tap target — the env-inset padding compensates the
       rest on devices with a home indicator. */
    min-height: var(--tap-min);
  }

  .bottom-nav button:active { background: var(--surface-2); }
  .bottom-nav button.active {
    color: var(--accent);
    /* Subtle top accent line marks the current tab without an icon. */
    box-shadow: inset 0 2px 0 0 var(--accent);
  }
</style>
