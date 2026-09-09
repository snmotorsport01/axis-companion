<script lang="ts">
  // =====================================================================
  //  PageHeader — branded header used by every primary page (Live,
  //  Custom, Tune, Screen, OTA, Sys, Calibrate). Replaces the old
  //  "‹ DASHBOARD" + page-title pattern, since:
  //    · BottomNav already highlights the current page — a literal page
  //      label was redundant.
  //    · Dashboard the page was removed when Live became the home
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
  import { store, type Page } from './store.svelte';
  // Optional sub-head: a back chevron (to `back`) + a page title. Used by
  // pages opened from the Pro door (Tune/Sys/Devices) so they aren't
  // title-less, back-less dead-ends.
  let { children, title, back, backLabel = 'Back' }:
    { children?: Snippet; title?: string; back?: Page; backLabel?: string } = $props();
</script>

<header class="page-header">
  <div class="brand">
    <img class="mono" src="/sn-monogram.png" alt="SN" />
    <span class="wm">AXIS</span>
  </div>
  {#if children}
    <div class="right">{@render children()}</div>
  {/if}
</header>
{#if back || title}
  <div class="page-subhead">
    {#if back}
      <button class="ph-back" onclick={() => (store.page = back)}>‹ {backLabel}</button>
    {/if}
    {#if title}<h2 class="ph-title">{title}</h2>{/if}
  </div>
{/if}

<style>
  .page-header {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    margin-bottom: var(--s-2);
  }
  /* sn-logo.png is a wide horizontal logotype (~16:1 aspect after the
     trim pass — the original Desktop PNG was a 4167² canvas with the
     text only in a thin strip). The first pass used flex:1 + width
     100% which made the IMG element greedy enough to push the status
     pill off the right edge of the screen.
     New rules:
       · height fixed (24 px), width:auto follows the aspect → image
         renders at natural shape with no pillar-boxing.
       · max-width 100% so it never overflows the parent if the slot
         is narrower than the natural ~395 px (object-fit contain then
         scales the rendered image down proportionally).
       · flex:0 1 auto — don't grow into the status's space; do allow
         shrinking if absolutely needed.
       · status side gets margin-left:auto + flex-shrink:0 so it
         claims its own width first. */
  /* Compact AXIS lockup — mirrors the shell's top-bar brand (monogram + Psionic
     wordmark) so a Pro/Update sub-page reads as the SAME app, not the old wide
     "SN MOTORSPORTS" logotype (owner 2026-07-24). */
  .brand { display: flex; align-items: center; gap: 8px; flex: 0 1 auto; min-width: 0; }
  .brand .mono { height: 20px; width: auto; object-fit: contain; display: block; border: 0; }
  .brand .wm {
    font-family: 'Psionic', sans-serif; font-size: 13px; letter-spacing: .2em;
    color: var(--fg); white-space: nowrap;
  }
  .right {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    flex-shrink: 0;
    margin-left: auto;
  }
  /* Match the AXIS shell header language (psionic + gold) so a page opened from the
     Pro/Update door doesn't read as a different, older app (owner 2026-07-24). */
  .page-subhead { display: flex; align-items: baseline; gap: var(--s-3); margin-bottom: var(--s-3); }
  .ph-back {
    background: none; border: 0; color: #cea24a;
    font-family: 'Psionic', var(--font-mono); font-size: 11px; letter-spacing: .18em;
    text-transform: uppercase; padding: 0; cursor: pointer; flex-shrink: 0;
  }
  .ph-title { margin: 0; font-family: 'Psionic', sans-serif; font-size: 18px; letter-spacing: .04em; }
</style>
