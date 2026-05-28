<script lang="ts">
  import { store } from './lib/store.svelte';
  import Connect from './pages/Connect.svelte';
  import Dashboard from './pages/Dashboard.svelte';
</script>

<main>
  {#if store.page === 'connect'}
    <Connect />
  {:else if store.page === 'dashboard'}
    <Dashboard />
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
