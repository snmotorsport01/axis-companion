<script lang="ts">
  import { onMount } from 'svelte';
  import { DeviceClient } from './lib/api';
  import { IS_DEVICE_BUILD, IS_CAPACITOR, store } from './lib/store.svelte';
  import { initLang } from './lib/i18n';
  import Connect   from './pages/Connect.svelte';
  import Tune      from './pages/Tune.svelte';
  import Ota       from './pages/Ota.svelte';
  import Calibrate from './pages/Calibrate.svelte';
  import Live      from './pages/Live.svelte';
  import Brand     from './pages/Brand.svelte';
  import Screensaver from './pages/Screensaver.svelte';
  import Sys        from './pages/Sys.svelte';
  import Devices    from './pages/Devices.svelte';
  import GaugeSetup from './pages/GaugeSetup.svelte';
  import Looks      from './pages/Looks.svelte';
  import Feel       from './pages/Feel.svelte';
  import Pro        from './pages/Pro.svelte';
  import Diagnostics from './pages/Diagnostics.svelte';
  import EcuSetup from './pages/EcuSetup.svelte';
  import Analysis from './pages/Analysis.svelte';
  import Track from './pages/Track.svelte';
  import AntiSleep from './pages/AntiSleep.svelte';
  import Shortcuts from './pages/Shortcuts.svelte';
  import Drivetrain  from './pages/Drivetrain.svelte';
  import MonitorOta    from './pages/MonitorOta.svelte';
  import MonitorConfig from './pages/MonitorConfig.svelte';
  // AxisShell is the 889-line legacy JS shell (plain <script>, not TS). Converting it
  // to lang="ts" would cascade dozens of errors for zero runtime gain, so we accept
  // the implicit-any on this one import.
  // @ts-ignore — legacy JS component, no type declaration
  import AxisShell   from './pages/AxisShell.svelte';
  // Community (Supabase-backed leaderboards) intentionally NOT imported for the App
  // Store build — keeps accounts + Supabase out of the shipped bundle (privacy: Data
  // Not Collected). Re-add the import + the route below when it's fully baked.
  import Legal       from './pages/Legal.svelte';
  import Splash      from './pages/Splash.svelte';
  import BottomNav  from './lib/BottomNav.svelte';
  import AeroBg     from './lib/AeroBg.svelte';

  // Opening splash — the carbon-fibre wave + SN monogram, shown on every launch.
  let showSplash = $state(true);

  // Device build: the PWA is hosted by the firmware itself, so /api/info is
  // served from window.location.origin. Wire up a client immediately so the
  // Live page's polling kicks in without going through the Connect screen.
  onMount(() => {
    initLang();   // restore the saved UI language (default en) + set <html data-lang>
    // Only auto-instantiate when the bundle is actually being served by
    // firmware HTTP (real device embed). In Capacitor, window.location.
    // origin = capacitor://localhost — fetching that would 404 every
    // call; the Connect screen handles host entry / DEMO MODE there.
    if (IS_DEVICE_BUILD && !IS_CAPACITOR && !store.client) {
      store.client = new DeviceClient(window.location.origin);
    }
  });
</script>

{#if store.page !== 'axis' && store.page !== 'connect'}
  <!-- Frosted carbon-wave "ฝ้า" behind every sub-page (the AXIS shell paints its own;
       Connect has its own splash-style bg). Top-level + fixed so it reliably sits
       behind the page content (main is z-index:1 below). -->
  <AeroBg />
{/if}
<main class:bare={store.page === 'axis'}>
  {#if store.page === 'axis'}
    <AxisShell />
  {:else if store.page === 'connect'}
    <Connect />
  {:else if store.page === 'tune'}
    <Tune />
  {:else if store.page === 'ota'}
    <Ota />
  {:else if store.page === 'calibrate'}
    <Calibrate />
  {:else if store.page === 'live'}
    <Live />
  {:else if store.page === 'brand'}
    <Brand />
  {:else if store.page === 'screensaver'}
    <Screensaver />
  {:else if store.page === 'sys'}
    <Sys />
  {:else if store.page === 'devices'}
    <Devices />
  {:else if store.page === 'gaugesetup'}
    <GaugeSetup />
  {:else if store.page === 'looks'}
    <Looks />
  {:else if store.page === 'feel'}
    <Feel />
  {:else if store.page === 'pro'}
    <Pro />
  {:else if store.page === 'diag'}
    <Diagnostics />
  {:else if store.page === 'ecu'}
    <EcuSetup />
  {:else if store.page === 'analysis'}
    <Analysis />
  {:else if store.page === 'track'}
    <Track />
  {:else if store.page === 'antisleep'}
    <AntiSleep />
  {:else if store.page === 'shortcuts'}
    <Shortcuts />
  {:else if store.page === 'drivetrain'}
    <Drivetrain />
  {:else if store.page === 'monota'}
    <MonitorOta />
  {:else if store.page === 'monconfig'}
    <MonitorConfig />
  <!-- Community/Leaderboards hidden for the App Store submission (account/login not
       shipped yet → avoids a reviewer login-wall + the account-deletion requirement).
       Re-enable the import + this route when the community backend is fully baked. -->
  {:else if false}
    <!-- <Community /> -->
  {:else if store.page === 'legal'}
    <Legal />
  {/if}
</main>

<!-- Bottom tab bar: hidden on the Connect screen (no host yet so the
     destinations would all be useless), shown everywhere else. -->
{#if showSplash}
  <Splash onDone={() => (showSplash = false)} />
{/if}

{#if store.page === 'live' || store.page === 'looks' || store.page === 'feel' || store.page === 'pro'}
  <!-- Legacy buyer surface only. The SN AXIS shell has its own bottom nav, and the
       engineering pages it opens use their "‹ AXIS" back — so the old tab bar stays
       hidden across the whole shell-centric flow (no two nav systems on one screen). -->
  <BottomNav />
{/if}

<style>
  /* The AXIS shell paints its own full-bleed chrome + nav, so drop the
     page padding and the reserved BottomNav space for it. */
  main.bare { padding: 0; gap: 0; }
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;   /* sit ABOVE the fixed AeroBg (z-index:0) so content shows */
    z-index: 1;
    padding: var(--s-4);
    gap: var(--s-3);
    /* Reserve room for the fixed BottomNav so the last bit of page
       content isn't covered. ~44 px button + ~2 px border + safe-area
       inset on devices with a home indicator. */
    padding-bottom: calc(var(--s-4) + 56px + env(safe-area-inset-bottom, 0));
  }
</style>
