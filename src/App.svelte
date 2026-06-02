<script lang="ts">
  import { onMount } from 'svelte';
  import { DeviceClient } from './lib/api';
  import { IS_DEVICE_BUILD, IS_CAPACITOR, store } from './lib/store.svelte';
  import Connect   from './pages/Connect.svelte';
  import Dashboard from './pages/Dashboard.svelte';
  import Tune      from './pages/Tune.svelte';
  import Ota       from './pages/Ota.svelte';
  import Calibrate from './pages/Calibrate.svelte';
  import Live      from './pages/Live.svelte';
  import Brand     from './pages/Brand.svelte';
  import Screensaver from './pages/Screensaver.svelte';
  import Sys       from './pages/Sys.svelte';
  import BottomNav from './lib/BottomNav.svelte';

  // Device build: the PWA is hosted by the firmware itself, so /api/info is
  // served from window.location.origin. Wire up a client immediately so the
  // Live page's polling kicks in without going through the Connect screen.
  onMount(() => {
    // Only auto-instantiate when the bundle is actually being served by
    // firmware HTTP (real device embed). In Capacitor, window.location.
    // origin = capacitor://localhost — fetching that would 404 every
    // call; the Connect screen handles host entry / DEMO MODE there.
    if (IS_DEVICE_BUILD && !IS_CAPACITOR && !store.client) {
      store.client = new DeviceClient(window.location.origin);
    }
  });
</script>

<main>
  {#if store.page === 'connect'}
    <Connect />
  {:else if store.page === 'dashboard'}
    <Dashboard />
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
  {/if}
</main>

<!-- Bottom tab bar: hidden on the Connect screen (no host yet so the
     destinations would all be useless), shown everywhere else. -->
{#if store.page !== 'connect'}
  <BottomNav />
{/if}

<style>
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: var(--s-4);
    gap: var(--s-3);
    /* Reserve room for the fixed BottomNav so the last bit of page
       content isn't covered. ~44 px button + ~2 px border + safe-area
       inset on devices with a home indicator. */
    padding-bottom: calc(var(--s-4) + 56px + env(safe-area-inset-bottom, 0));
  }
</style>
