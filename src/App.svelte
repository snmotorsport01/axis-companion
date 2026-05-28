<script lang="ts">
  import { onMount } from 'svelte';
  import { DeviceClient } from './lib/api';
  import { IS_DEVICE_BUILD, store } from './lib/store.svelte';
  import Connect   from './pages/Connect.svelte';
  import Dashboard from './pages/Dashboard.svelte';
  import Tune      from './pages/Tune.svelte';
  import Ota       from './pages/Ota.svelte';
  import Calibrate from './pages/Calibrate.svelte';
  import Live      from './pages/Live.svelte';

  // Device build: the PWA is hosted by the firmware itself, so /api/info is
  // served from window.location.origin. Wire up a client immediately so the
  // Dashboard polling kicks in without going through the Connect screen.
  onMount(() => {
    if (IS_DEVICE_BUILD && !store.client) {
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
  {/if}
</main>

<style>
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: var(--s-4);
    gap: var(--s-3);
  }
</style>
