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
  /* sn-logo.png is a wide horizontal logotype (~16:1 aspect after the
     trim pass — the original Desktop PNG was a 4167² canvas with the
     text only in a thin strip). width:100% inside flex:1 makes the
     image stretch to fill the available row width; height:auto then
     follows the aspect ratio so the text reads at its natural shape,
     no empty pillar-boxing. Capping max-height keeps the header from
     ballooning on a hypothetical extra-wide viewport. */
  .logo {
    flex: 1;
    width: 100%;
    height: auto;
    max-height: 36px;
    object-fit: contain;
    object-position: left center;
    display: block;
    border: 0;
  }
  .right {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    flex-shrink: 0;
  }
</style>
