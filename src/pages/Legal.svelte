<script lang="ts">
  // Privacy Policy + Terms of Use — shown in-app and required for App Store review.
  // Content reflects what the app ACTUALLY does: talks to AXIS hardware over
  // Bluetooth, reads vehicle data locally, no account, no analytics, and NEVER
  // reads/stores/transmits the VIN or GPS/location (standing project constraint).
  import PageHeader from '../lib/PageHeader.svelte';
  import { store } from '../lib/store.svelte';
  import { t } from '../lib/i18n';

  const UPDATED = '24 July 2026';
  const CONTACT = 'info@sn-motorsports.com';   // official SN Motorsports support address (owner 2026-07-26)
  let tab: 'privacy' | 'terms' = $state('privacy');
</script>

<PageHeader title={t('legal.title')} back="axis" backLabel="AXIS" />

<div class="legal">
  <div class="segtabs">
    <button class:on={tab === 'privacy'} onclick={() => (tab = 'privacy')}>{t('legal.tab_privacy')}</button>
    <button class:on={tab === 'terms'} onclick={() => (tab = 'terms')}>{t('legal.tab_terms')}</button>
  </div>

  {#if tab === 'privacy'}
    <div class="card doc">
      <p class="upd">{t('legal.last_updated', { date: UPDATED })}</p>
      <h3>{t('legal.privacy_h')}</h3>
      <p>{t('legal.privacy_intro')}</p>

      <h4>{t('legal.what_h')}</h4>
      <p>{t('legal.what_p')}</p>

      <h4>{t('legal.never_h')}</h4>
      <p>{@html t('legal.never_p')}</p>

      <h4>{t('legal.bt_h')}</h4>
      <p>{t('legal.bt_p')}</p>

      <h4>{t('legal.fw_h')}</h4>
      <p>{t('legal.fw_p')}</p>

      <h4>{t('legal.community_h')}</h4>
      <p>{t('legal.community_p')}</p>

      <h4>{t('legal.children_h')}</h4>
      <p>{t('legal.children_p')}</p>

      <h4>{t('legal.changes_h')}</h4>
      <p>{t('legal.changes_p')} <span class="mono accent">{CONTACT}</span>.</p>
    </div>
  {:else}
    <div class="card doc">
      <p class="upd">{t('legal.last_updated', { date: UPDATED })}</p>
      <h3>{t('legal.terms_h')}</h3>
      <p>{t('legal.terms_intro')}</p>

      <h4>{t('legal.intended_h')}</h4>
      <p>{t('legal.intended_p')}</p>

      <h4>{t('legal.safe_h')}</h4>
      <p>{t('legal.safe_p')}</p>

      <h4>{t('legal.vehicle_h')}</h4>
      <p>{t('legal.vehicle_p')}</p>

      <h4>{t('legal.warranty_h')}</h4>
      <p>{t('legal.warranty_p')}</p>

      <h4>{t('legal.ip_h')}</h4>
      <p>{t('legal.ip_p')}</p>

      <h4>{t('legal.contact_h')}</h4>
      <p>{t('legal.contact_p')} <span class="mono accent">{CONTACT}</span>.</p>
    </div>
  {/if}
</div>

<style>
  .legal { display: flex; flex-direction: column; gap: var(--s-3); }
  .segtabs { display: flex; gap: 6px; }
  .segtabs button {
    flex: 1; min-height: 40px; font-family: 'Psionic', sans-serif; font-size: 11px;
    letter-spacing: .12em; text-transform: uppercase;
  }
  .segtabs button.on { color: #15140f; background: var(--accent); border-color: var(--accent); }
  .doc h3 { font-family: 'Psionic', sans-serif; font-size: 17px; letter-spacing: .04em;
    text-transform: none; color: var(--fg); margin: 2px 0 10px; }
  .doc h4 { margin: 16px 0 4px; font-size: 13px; font-weight: 600; color: var(--fg);
    letter-spacing: 0; text-transform: none; }
  .doc p { font-size: 13.5px; line-height: 1.6; color: var(--fg-2, #b9c0c9); margin: 0; }
  .doc p b { color: var(--fg); }
  .doc .upd { font-size: 11px; color: var(--faint); letter-spacing: .04em; margin-bottom: 8px; }
</style>
