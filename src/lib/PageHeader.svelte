<script lang="ts">
  // =====================================================================
  //  PageHeader — branded header used by every primary page (Live,
  //  Custom, Tune, Screen, OTA, Sys, Calibrate). Replaces the old
  //  "‹ DASHBOARD" + page-title pattern, since:
  //    · BottomNav already highlights the current page — a literal page
  //      label was redundant.
  //    · Dashboard the page was deprecated when Live became the home
  //      landing, so the back link pointed at a ghost.
  //
  //  The default `children` snippet is the right-side slot — Live uses
  //  it for the connection status pill; OTA could use it for a refresh
  //  button; pages that don't need anything on the right just omit it.
  //
  //  Logo source is /sn-logo.png — 256×256 PNG sitting in public/, so
  //  Vite ships it as-is at the site root for both PWA and Capacitor.
  // =====================================================================
  import type { Snippet } from 'svelte';
  let { children }: { children?: Snippet } = $props();
</script>

<header class="page-header">
  <img class="logo" src="/sn-logo.png" alt="SN Motorsports" />
  {#if children}
    <div class="right">{@render children()}</div>
  {/if}
</header>

<style>
  .page-header {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    margin-bottom: var(--s-2);
  }
  /* Logo height tuned so the right-side status pill sits visually
     centred against it. The PNG is square so width auto-fits. */
  .logo {
    height: 32px;
    width: auto;
    flex: 1;
    object-fit: contain;
    object-position: left center;
  }
  .right {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    flex-shrink: 0;
  }
</style>
