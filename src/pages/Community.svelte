<script lang="ts">
  // =====================================================================
  //  AXIS Community — Leaderboards (v1). Ported from founder-gauge
  //  (the sandbox) into SN AXIS. Browse-free / sign-in-to-contribute:
  //  sign in (email + password), a one-time profile (handle + car +
  //  marketing consent), pull your saved gauge times, post to the
  //  public per-car leaderboard. Shared Supabase backend + client.
  // =====================================================================
  import {
    signUpOrIn, currentSession, signOut, sendReset, updatePassword, onAuth,
    getMyProfile, saveProfile, submitTime, leaderboard, deleteAccount,
    RUN_KINDS, KIND_LABEL, type RunKind, type Profile, type TimeRow,
  } from '../lib/community/communityClient';
  import PageHeader from '../lib/PageHeader.svelte';
  import { store } from '../lib/store.svelte';
  import { t } from '../lib/i18n';
  import { onDestroy } from 'svelte';

  interface MyRecord { kind: RunKind; ms: number; trapKmh?: number; }

  type View = 'loading' | 'auth' | 'recovery' | 'profile' | 'ready';
  let view = $state<View>('loading');
  let busy = $state(false);
  let err  = $state<string | null>(null);
  let info = $state<string | null>(null);

  // auth inputs
  let email = $state('');
  let pass  = $state('');
  let newPass = $state('');

  // profile
  let profile = $state<Profile | null>(null);
  let handle = $state('');
  let car    = $state('');
  let consent = $state(false);

  // leaderboard
  let kind = $state<RunKind>('0-100');
  let board = $state<TimeRow[]>([]);
  let msg   = $state<string | null>(null);

  // my best times, auto-pulled from the connected gauge
  let myRecords = $state<MyRecord[]>([]);
  let timesLoading = $state(false);
  let posting = $state<string | null>(null);
  let confirmDel = $state(false);
  const monConnected = () => !!store.monClient;

  const fmt = (ms: number) => (ms / 1000).toFixed(2) + 's';

  async function loadMyTimes() {
    if (!store.monClient) { myRecords = []; return; }
    timesLoading = true;
    try {
      const t = await store.monClient.readAccelTimes();
      const sK: RunKind[] = ['0-100', '100-200', '200-300'];
      const dK: RunKind[] = ['60ft', '201m', '402m'];
      const recs: MyRecord[] = [];
      t.speed.forEach((e, i) => { if (e.ms != null) recs.push({ kind: sK[i], ms: e.ms }); });
      t.dist.forEach((e, i) => { if (e.ms != null) recs.push({ kind: dK[i], ms: e.ms, trapKmh: e.trapKmh }); });
      myRecords = recs;
    } catch (e) { myRecords = []; }
    finally { timesLoading = false; }
  }

  async function postRecord(r: MyRecord) {
    err = null; msg = null; posting = r.kind;
    try {
      await submitTime(profile!.handle, car, r.kind, r.ms);
      msg = t('community.info_posted', { label: KIND_LABEL[r.kind], time: fmt(r.ms) });
      kind = r.kind; await refresh();
    } catch (e) { err = String((e as Error).message ?? e); }
    finally { posting = null; }
  }

  async function boot() {
    try {
      const s = await currentSession();
      if (!s) { view = 'auth'; return; }
      profile = await getMyProfile();
      if (!profile) { view = 'profile'; return; }
      handle = profile.handle; car = profile.car ?? '';
      await refresh();
      view = 'ready';
      loadMyTimes();
    } catch (e) { err = String((e as Error).message ?? e); view = 'auth'; }
  }
  boot();
  const stop = onAuth((event) => { if (event === 'PASSWORD_RECOVERY') { view = 'recovery'; } });
  onDestroy(stop);

  async function doAuth() {
    err = null; info = null; busy = true;
    try {
      if (pass.length < 6) throw new Error(t('community.err_pass6'));
      await signUpOrIn(email, pass);
      pass = '';
      await boot();
    } catch (e) { err = String((e as Error).message ?? e); }
    finally { busy = false; }
  }

  async function doReset() {
    err = null; info = null;
    if (!email.includes('@')) { err = t('community.err_email'); return; }
    busy = true;
    try {
      await sendReset(email);
      info = t('community.info_reset', { email });
    } catch (e) { err = String((e as Error).message ?? e); }
    finally { busy = false; }
  }

  async function doSetNewPassword() {
    err = null; info = null; busy = true;
    try {
      if (newPass.length < 6) throw new Error(t('community.err_pass6'));
      await updatePassword(newPass);
      newPass = ''; info = t('community.info_pass_upd');
      await boot();
    } catch (e) { err = String((e as Error).message ?? e); }
    finally { busy = false; }
  }
  async function doSaveProfile() {
    err = null; busy = true;
    try {
      if (handle.trim().length < 2) throw new Error(t('community.err_handle'));
      profile = await saveProfile(handle, car, consent);
      await refresh(); view = 'ready';
      loadMyTimes();
    } catch (e) { err = String((e as Error).message ?? e); }
    finally { busy = false; }
  }
  async function refresh() { board = await leaderboard(kind, car || undefined); }
  async function onKind(k: RunKind) { kind = k; await refresh(); }
  async function doSignOut() { await signOut(); profile = null; email = ''; pass = ''; myRecords = []; confirmDel = false; view = 'auth'; }
  async function doDelete() {
    err = null; busy = true;
    try {
      await deleteAccount();
      profile = null; email = ''; pass = ''; myRecords = []; confirmDel = false; view = 'auth';
      info = t('community.info_deleted');
    } catch (e) { err = String((e as Error).message ?? e); }
    finally { busy = false; }
  }
</script>

<PageHeader title={t('community.title')} back="axis" backLabel="AXIS" />

<div class="wrap">
  <div class="lead">
    <span class="beta">BETA</span>
    <span class="sub">{t('community.sub')}</span>
  </div>

  {#if err}<p class="err">{err}</p>{/if}
  {#if info}<p class="ok">{info}</p>{/if}

  {#if view === 'loading'}
    <p class="dim">{t('community.loading')}</p>

  {:else if view === 'auth'}
    <p class="dim">{t('community.auth_intro')}</p>
    <input type="email" placeholder="you@email.com" bind:value={email} autocomplete="email" />
    <input type="password" placeholder={t('community.ph_password')} bind:value={pass} autocomplete="current-password" />
    <button class="primary" onclick={doAuth} disabled={busy || !email.includes('@') || pass.length < 6}>{t('community.continue')}</button>
    <div class="row-between">
      <span class="dim tiny">{t('community.new_here')}</span>
      <button class="link" onclick={doReset} disabled={busy}>{t('community.forgot')}</button>
    </div>

  {:else if view === 'recovery'}
    <p class="dim">{t('community.recovery_intro')}</p>
    <input type="password" placeholder={t('community.ph_newpass')} bind:value={newPass} autocomplete="new-password" />
    <button class="primary" onclick={doSetNewPassword} disabled={busy || newPass.length < 6}>{t('community.save_newpass')}</button>

  {:else if view === 'profile'}
    <p class="dim">{t('community.profile_intro')}</p>
    <label>{t('community.handle')}<input type="text" placeholder="e.g. snmotorsports" bind:value={handle} /></label>
    <label>{t('community.your_car')}<input type="text" placeholder="e.g. Volvo V60 T8" bind:value={car} /></label>
    <label class="check"><input type="checkbox" bind:checked={consent} /> {t('community.consent')}</label>
    <button class="primary" onclick={doSaveProfile} disabled={busy}>{t('community.save_continue')}</button>

  {:else if view === 'ready'}
    <div class="row-between">
      <span class="dim">{t('community.signed_in_as')} <b class="fg">{profile?.handle}</b>{#if car} · {car}{/if}</span>
      <button class="link" onclick={doSignOut}>{t('community.sign_out')}</button>
    </div>

    <!-- MY BEST TIMES — auto-pulled from the gauge -->
    <div class="row-between">
      <span class="section">{t('community.your_best')}</span>
      {#if monConnected()}<button class="link" onclick={loadMyTimes} disabled={timesLoading}>{timesLoading ? '…' : t('community.refresh')}</button>{/if}
    </div>

    {#if !monConnected()}
      <p class="dim">{t('community.connect_gauge')}</p>
    {:else if timesLoading && myRecords.length === 0}
      <p class="dim">{t('community.reading')}</p>
    {:else if myRecords.length === 0}
      <p class="dim">{t('community.no_runs')}</p>
    {:else}
      <div class="cards">
        {#each myRecords as r}
          <div class="tcard">
            <span class="tlabel">{KIND_LABEL[r.kind]}</span>
            <span class="ttime">{(r.ms / 1000).toFixed(2)}<small>s</small></span>
            {#if r.trapKmh}<span class="ttrap">TRAP {r.trapKmh} km/h</span>{/if}
            <button class="primary sm" onclick={() => postRecord(r)} disabled={posting === r.kind}>
              {posting === r.kind ? t('community.posting') : t('community.post')}
            </button>
          </div>
        {/each}
      </div>
    {/if}
    {#if msg}<p class="ok">{msg}</p>{/if}

    <!-- LEADERBOARD -->
    <span class="section" style="margin-top:6px;">{t('community.leaderboard')}{#if car} · {car}{/if}</span>
    <div class="kinds">
      {#each RUN_KINDS as k}
        <button class="chip" class:on={kind === k} onclick={() => onKind(k)}>{k}</button>
      {/each}
    </div>
    <div class="board">
      {#if board.length === 0}
        <p class="dim">{#if car}{t('community.no_times_car', { label: KIND_LABEL[kind], car })}{:else}{t('community.no_times', { label: KIND_LABEL[kind] })}{/if}</p>
      {:else}
        {#each board as t, i}
          <div class="brow" class:me={t.handle === profile?.handle}>
            <span class="rank" class:pod={i < 3}>{i + 1}</span>
            <span class="who">{t.handle}{#if t.car && !car} · <span class="dim">{t.car}</span>{/if}</span>
            <span class="time">{fmt(t.ms)}</span>
          </div>
        {/each}
      {/if}
    </div>

    <!-- ACCOUNT — delete (App Store 5.1.1(v)) -->
    <div class="danger-zone">
      {#if !confirmDel}
        <button class="link del" onclick={() => (confirmDel = true)}>{t('community.delete_account')}</button>
      {:else}
        <p class="dim tiny">{t('community.delete_warn')}</p>
        <div class="kinds">
          <button class="danger" onclick={doDelete} disabled={busy}>{busy ? t('community.deleting') : t('community.delete_confirm')}</button>
          <button class="chip" onclick={() => (confirmDel = false)}>{t('community.cancel')}</button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* dark frosted frame so text reads over the busy carbon-wave background
     (owner 2026-07-25: "หน้านี้ต้องมีกรอบฝ้ามืดให้ตัวหนังสืออ่านง่ายขึ้น") */
  .wrap { display: flex; flex-direction: column; gap: 12px;
    padding: 18px 16px 24px; margin: 2px 0 22px;
    background: rgba(9,10,13,.64);
    -webkit-backdrop-filter: blur(24px) saturate(1.1); backdrop-filter: blur(24px) saturate(1.1);
    border: 1px solid rgba(255,255,255,.07); border-radius: 18px;
    box-shadow: 0 18px 50px -28px rgba(0,0,0,.9); }
  .lead { display: flex; align-items: center; gap: 10px; }
  .beta { font-size: 10px; font-weight: 700; letter-spacing: .08em; color: #000; background: var(--accent);
          padding: 3px 9px; border-radius: 999px; font-family: var(--font-legend); }
  .sub { font-size: 12px; color: #c2c8d0; letter-spacing: .02em; }
  .dim { color: #b7bec7; font-size: 13px; margin: 0; line-height: 1.5; }
  .tiny { font-size: 11px; }
  .fg { color: var(--fg); }
  .err { color: var(--danger); font-size: 13px; margin: 0; }
  .ok  { color: var(--success); font-size: 13px; margin: 0; }
  input[type=email], input[type=text], input[type=password] { width: 100%; padding: 12px 13px; border-radius: var(--r-1);
    border: 1px solid var(--border-2); background: rgba(24,27,33,.5); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
    color: var(--fg); font-size: 15px; box-sizing: border-box; }
  input:focus { outline: none; border-color: var(--accent); }
  label { display: flex; flex-direction: column; gap: 5px; font-size: 13px; color: var(--muted); }
  label.check { flex-direction: row; align-items: center; gap: 8px; }
  button.primary { padding: 13px; border: 0; border-radius: var(--r-1); background: var(--accent);
    color: #000; font-weight: 700; font-size: 15px; cursor: pointer; min-height: var(--tap-min); }
  button.primary:disabled { opacity: .5; }
  button.primary.sm { padding: 10px 14px; font-size: 13px; width: 100%; margin-top: 4px; min-height: 0; }
  button.link { background: none; border: 0; color: var(--muted); font-size: 13px; cursor: pointer; align-self: flex-start; padding: 6px 0; }
  button.link:disabled { opacity: .5; }
  button.link.del { color: var(--faint); }
  button.danger { padding: 11px 16px; border: 1px solid var(--danger); border-radius: var(--r-1);
    background: rgba(201,88,74,.12); color: var(--danger); font-weight: 700; font-size: 13px; cursor: pointer; }
  button.danger:disabled { opacity: .5; }
  .row-between { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .section { font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted);
    font-family: var(--font-legend); }

  .cards { display: flex; flex-direction: column; gap: 10px; }
  .tcard { display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 16px 14px; border-radius: var(--r-2); background: var(--surface-2);
    border: 1px solid var(--border); }
  .tlabel { font-size: 12px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--accent);
    font-family: var(--font-legend); }
  .ttime { font-family: var(--font-device); font-size: 44px; font-weight: 800; line-height: 1; color: var(--fg); }
  .ttime small { font-size: 18px; font-weight: 600; color: var(--muted); margin-left: 2px; }
  .ttrap { font-size: 12px; color: var(--accent); font-weight: 600; }
  .kinds { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { padding: 8px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; background: var(--surface-2);
    color: var(--muted); border: 1px solid var(--border); cursor: pointer; min-height: 0; }
  .chip.on { background: var(--accent); color: #000; border-color: var(--accent); }
  .board { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
  .brow { display: flex; align-items: center; gap: 10px; padding: 11px 12px; border-radius: 10px; background: var(--surface-2);
    border: 1px solid var(--border); }
  .brow.me { border-color: var(--accent); background: var(--accent-glow); }
  .rank { width: 24px; text-align: center; color: var(--muted); font-size: 13px; font-weight: 700; font-family: var(--font-device); }
  .rank.pod { color: var(--accent); }
  .who { flex: 1; font-size: 14px; color: var(--fg); }
  .time { font-family: var(--font-device); font-weight: 700; color: var(--fg); }
  .danger-zone { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
</style>
