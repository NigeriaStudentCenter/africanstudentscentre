/* African Students Centre learning space.
   Lessons load from the course API only after a verified payment or university code. */
(function () {
  'use strict';
  const API = window.ASC_COURSE.api;
  const app = document.getElementById('app'), who = document.getElementById('who'), tutorEl = document.getElementById('tutor');
  const LS = {token: 'asc_token', learner: 'asc_learner', pending: 'asc_pending'};
  const state = {course: null, progress: null, outline: null, tutorReady: false, chats: {}};

  // ---------- helpers ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const token = () => localStorage.getItem(LS.token);
  const money = (amount, cur) => { try { return new Intl.NumberFormat('en-NG', {style: 'currency', currency: cur, maximumFractionDigits: 0}).format(amount); } catch { return cur + ' ' + amount; } };

  async function api(path, {method = 'GET', body, auth = true} = {}) {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (auth && token()) headers.Authorization = 'Bearer ' + token();
    let res;
    try { res = await fetch(API + path, {method, headers, body: body ? JSON.stringify(body) : undefined}); }
    catch { return {status: 0, body: {message: 'Could not reach the course server. Check your connection and try again.'}}; }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && auth && token() && path !== '/access/login') { signOut(false); }
    return {status: res.status, body: data};
  }

  function signOut(go = true) {
    localStorage.removeItem(LS.token); localStorage.removeItem(LS.learner);
    state.course = state.progress = null; closeTutor();
    if (go) { location.hash = ''; render(); }
  }

  function setWho() {
    const l = JSON.parse(localStorage.getItem(LS.learner) || 'null');
    if (!token() || !l) { who.innerHTML = '<a href="/training.html">Course outline</a>'; return; }
    who.innerHTML = `<span>${esc(l.name || l.email)}</span><button class="btn btn-outline btn-sm" id="signout">Sign out</button>`;
    $('#signout').onclick = () => signOut();
  }

  // ---------- gate: pay, confirm payment, or university code ----------
  async function renderGate(notice) {
    if (!state.outline) state.outline = await fetch('outline.json').then(r => r.json()).catch(() => null);
    const price = await api('/pay/price', {auth: false});
    const o = state.outline, p = price.status === 200 ? price.body : {ready: false};
    const stages = o ? o.stages.map(s => `<li><span><b>Stage ${s.n}: ${esc(s.title)}</b><br><span class="muted small">${esc(s.when)}</span></span><span>${s.modules.reduce((a, m) => a + m.minutes, 0) ? Math.round(s.modules.reduce((a, m) => a + m.minutes, 0) / 6) / 10 + ' hrs online' : 'Live check-ins'}</span></li>`).join('') : '';
    app.innerHTML = `
      <div class="grid2">
        <section>
          <span class="eyebrow">Completion-Readiness Programme</span>
          <h1>Prepare to get your visa, arrive on time and finish your degree.</h1>
          <p class="muted">Eight modules on the UK rules that matter most to international students, with examples, activities, assessments, a personal workbook and an AI tutor in every module. Live sessions with our team are included.</p>
          <ul class="stage-list">${stages}</ul>
          <h3>In every module</h3>
          <ul class="includes"><li>Overview of the law</li><li>Why the law exists</li><li>What you need to know</li><li>What to prepare and be able to do</li><li>Worked examples</li><li>Activities saved to your workbook</li><li>Marked assessment (pass mark ${o ? o.passMark : 80}%)</li><li>AI tutor for the module</li></ul>
        </section>
        <section class="card" aria-labelledby="access-h">
          <h2 id="access-h">Start the course</h2>
          ${notice ? `<div class="msg ${notice.ok ? 'ok' : 'err'}" role="status">${esc(notice.text)}</div>` : ''}
          <div class="tabs" role="tablist">
            <button role="tab" aria-selected="true" data-t="pay">Enrol and pay</button>
            <button role="tab" aria-selected="false" data-t="paid">I have paid</button>
            <button role="tab" aria-selected="false" data-t="code">University code</button>
          </div>
          <form id="f-pay" data-p="pay">
            ${p.ready ? `<p class="muted small">Course fee: <b style="color:var(--text)">${esc(money(p.amount, p.currency))}</b>, paid securely through Paystack. You get access as soon as payment is confirmed.</p>` : `<p class="msg err">Online payment is being set up. If your university gave you an access code, use the University code tab.</p>`}
            <label for="p-name">Full name</label><input id="p-name" name="name" autocomplete="name" required maxlength="80">
            <label for="p-email">Email</label><input id="p-email" name="email" type="email" autocomplete="email" required>
            <label for="p-uni">University you will attend <span class="muted">(optional)</span></label><input id="p-uni" name="university" maxlength="80">
            <p style="margin-top:1rem"><button class="btn btn-primary" ${p.ready ? '' : 'disabled'}>${p.ready ? 'Pay ' + esc(money(p.amount, p.currency)) + ' and start' : 'Payment not available yet'}</button></p>
            <p class="muted small">By enrolling you agree to our <a href="/privacy.html">privacy notice</a>. We store your name, email, progress, workbook answers and assessment results to run the course, and share progress with your university only if you joined through it.</p>
          </form>
          <form id="f-paid" data-p="paid" hidden>
            <p class="muted small">Use the email you paid with and the reference from your Paystack receipt email.</p>
            <label for="r-email">Email</label><input id="r-email" name="email" type="email" autocomplete="email" required>
            <label for="r-ref">Payment reference</label><input id="r-ref" name="reference" required autocomplete="off">
            <p style="margin-top:1rem"><button class="btn btn-primary">Sign in</button></p>
          </form>
          <form id="f-code" data-p="code" hidden>
            <p class="muted small">If your university has paid for your place, it will give you a code like ASC-XXXX-XXXX.</p>
            <label for="c-name">Full name</label><input id="c-name" name="name" autocomplete="name" required maxlength="80">
            <label for="c-email">Email</label><input id="c-email" name="email" type="email" autocomplete="email" required>
            <label for="c-code">Access code</label><input id="c-code" name="code" required autocomplete="off" placeholder="ASC-XXXX-XXXX" style="text-transform:uppercase">
            <p style="margin-top:1rem"><button class="btn btn-primary">Start the course</button></p>
          </form>
          <div id="gate-msg" role="alert"></div>
        </section>
      </div>`;
    app.querySelectorAll('[role=tab]').forEach(b => b.onclick = () => {
      app.querySelectorAll('[role=tab]').forEach(x => x.setAttribute('aria-selected', x === b));
      app.querySelectorAll('form[data-p]').forEach(f => f.hidden = f.dataset.p !== b.dataset.t);
      $('#gate-msg').innerHTML = '';
    });
    const fail = m => { $('#gate-msg').innerHTML = `<div class="msg err">${esc(m)}</div>`; };
    const busy = (f, on) => { const b = f.querySelector('button'); b.disabled = on; };
    $('#f-pay').onsubmit = async e => {
      e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f));
      busy(f, true);
      const r = await api('/pay/init', {method: 'POST', body: d, auth: false});
      if (r.status === 200 && r.body.url) { localStorage.setItem(LS.pending, JSON.stringify({email: d.email.trim(), name: d.name.trim()})); location.href = r.body.url; return; }
      busy(f, false); fail(r.body.message || 'Payment could not be started.');
    };
    $('#f-paid').onsubmit = async e => { e.preventDefault(); const f = e.target; busy(f, true); const ok = await signIn(Object.fromEntries(new FormData(f))); if (!ok) busy(f, false); };
    $('#f-code').onsubmit = async e => { e.preventDefault(); const f = e.target; busy(f, true); const ok = await signIn(Object.fromEntries(new FormData(f))); if (!ok) busy(f, false); };
  }

  async function signIn(body) {
    const r = await api('/access/login', {method: 'POST', body, auth: false});
    if (r.status === 200) {
      localStorage.setItem(LS.token, r.body.token); localStorage.setItem(LS.learner, JSON.stringify(r.body.learner));
      localStorage.removeItem(LS.pending);
      location.hash = '#/'; await render(); return true;
    }
    const m = $('#gate-msg'); if (m) m.innerHTML = `<div class="msg err">${esc(r.body.message || 'Sign-in failed. Please check your details.')}</div>`;
    return false;
  }

  // Paystack sends the learner back with ?reference=… after payment.
  async function handleReturn() {
    const q = new URLSearchParams(location.search), ref = q.get('reference') || q.get('trxref');
    if (!ref) return false;
    history.replaceState(null, '', location.pathname + location.hash);
    const pending = JSON.parse(localStorage.getItem(LS.pending) || 'null');
    if (!pending) { await renderGate({ok: true, text: 'Payment received. Enter the email you paid with to open the course.'}); $('[data-t=paid]').click(); $('#r-ref').value = ref; return true; }
    app.innerHTML = '<p class="loading">Confirming your payment…</p>';
    const r = await api('/access/login', {method: 'POST', body: {email: pending.email, name: pending.name, reference: ref}, auth: false});
    if (r.status === 200) {
      localStorage.setItem(LS.token, r.body.token); localStorage.setItem(LS.learner, JSON.stringify(r.body.learner)); localStorage.removeItem(LS.pending);
      location.hash = '#/'; return false;
    }
    await renderGate({ok: false, text: (r.body.message || 'We could not confirm the payment yet.') + ' If you were charged, use "I have paid" with the reference from your receipt.'});
    $('[data-t=paid]').click(); $('#r-email').value = pending.email; $('#r-ref').value = ref;
    return true;
  }

  // ---------- data ----------
  async function load() {
    if (state.course && state.progress) return true;
    const [c, p, t] = await Promise.all([api('/content'), api('/progress'), api('/tutor/status')]);
    if (c.status !== 200 || p.status !== 200) return false;
    state.course = c.body; state.progress = p.body; state.tutorReady = t.status === 200 && t.body.ready;
    return true;
  }
  const result = id => (state.progress.results || {})[id];
  const viewed = id => new Set((state.progress.viewed || {})[id] || []);
  function status(id) {
    const r = result(id);
    if (r && r.passed) return `<span class="pill ok">Passed · ${r.best}%</span>`;
    if (r) return `<span class="pill bad">Not passed yet · ${r.best}%</span>`;
    if (viewed(id).size) return '<span class="pill warn">In progress</span>';
    return '<span class="pill">Not started</span>';
  }

  // ---------- dashboard ----------
  function renderHome() {
    const c = state.course, ids = Object.keys(c.modules), passed = ids.filter(id => result(id) && result(id).passed).length;
    const l = JSON.parse(localStorage.getItem(LS.learner) || '{}');
    const stage1Done = c.stages[0].modules.every(id => result(id) && result(id).passed);
    app.innerHTML = `
      <span class="eyebrow">${esc(c.title)}</span>
      <h1>Welcome${l.name ? ', ' + esc(l.name.split(' ')[0]) : ''}.</h1>
      <p class="muted">${passed} of ${ids.length} modules passed${l.university ? ' · ' + esc(l.university) : ''}. Work through Stage 1 first: it prepares you for your visa application.</p>
      <div class="progress" aria-label="Course progress"><span style="width:${Math.round(100 * passed / ids.length)}%"></span></div>
      ${c.stages.map(s => `
        <section class="stage">
          <div class="stage-h"><h2><span>Stage ${s.n}</span>${esc(s.title)}</h2><span class="pill">${esc(s.when)}</span></div>
          ${s.n === 2 && !stage1Done ? '<p class="muted small">Recommended after you pass Stage 1 and get your visa. You can look ahead at any time.</p>' : ''}
          ${s.modules.length ? `<div class="mods">${s.modules.map(id => { const m = c.modules[id]; return `
            <a class="card mod" href="#/m/${id}/law">
              <div class="row"><span class="code">Module ${id.slice(1)} · ${m.minutes} min</span>${status(id)}</div>
              <h3>${esc(m.title)}</h3><p>${esc(m.summary)}</p>
            </a>`; }).join('')}</div>` : ''}
          <ul class="sessions">${s.sessions.map(x => `<li><strong>${esc(x.title)} · ${x.minutes} min</strong>${esc(x.detail)}</li>`).join('')}</ul>
        </section>`).join('')}
      <p class="muted small" style="margin-top:2rem">Live sessions are arranged by our team by email. Figures in the modules were checked on ${esc(c.checked)}. Rules change, so always confirm on GOV.UK.</p>
      <p class="no-print"><a class="btn btn-outline btn-sm" href="#/workbook">Open my full workbook</a></p>`;
  }

  // ---------- module player ----------
  function renderModule(id, sectionKey) {
    const c = state.course, m = c.modules[id];
    if (!m) { location.hash = '#/'; return; }
    const secs = c.sections, idx = Math.max(0, secs.findIndex(s => s.key === sectionKey)), sec = secs[idx];
    const seen = viewed(id);
    app.innerHTML = `
      <p class="crumb"><a href="#/">Dashboard</a> › Module ${id.slice(1)}</p>
      <span class="eyebrow">Module ${id.slice(1)} · ${m.minutes} minutes · Protects: ${esc(m.protects)}</span>
      <h1>${esc(m.title)}</h1>
      <div class="player">
        <nav class="side" aria-label="Module sections">
          ${secs.map((s, i) => `<button data-k="${s.key}" aria-current="${i === idx}"><span>${i + 1}. ${esc(s.label)}</span>${s.key === 'assessment' && result(id) && result(id).passed ? '<span class="tick">✓</span>' : (seen.has(s.key) ? '<span class="tick">•</span>' : '')}</button>`).join('')}
          <button class="btn btn-outline btn-sm tutor-btn" id="open-tutor" type="button">Ask the AI tutor</button>
        </nav>
        <article class="lesson" id="lesson" tabindex="-1">
          <h2>${esc(sec.label)}</h2>
          ${SECTION[sec.key](m, id)}
          <div class="nav-row no-print">
            ${idx > 0 ? `<a class="btn btn-outline" href="#/m/${id}/${secs[idx - 1].key}">← ${esc(secs[idx - 1].label)}</a>` : '<span></span>'}
            ${idx < secs.length - 1 ? `<a class="btn btn-primary" href="#/m/${id}/${secs[idx + 1].key}">${esc(secs[idx + 1].label)} →</a>` : `<a class="btn btn-primary" href="#/">Back to dashboard</a>`}
          </div>
        </article>
      </div>`;
    app.querySelectorAll('.side [data-k]').forEach(b => b.onclick = () => { location.hash = `#/m/${id}/${b.dataset.k}`; });
    $('#open-tutor').onclick = () => openTutor(id);
    const cur = app.querySelector('.side [aria-current=true]'); if (cur && window.innerWidth <= 900) cur.parentNode.scrollLeft = cur.offsetLeft - 16;
    WIRE[sec.key] && WIRE[sec.key](m, id);
    if (!seen.has(sec.key)) api('/progress/view', {method: 'POST', body: {module: id, section: sec.key}}).then(r => { if (r.status === 200) state.progress.viewed[id] = r.body.viewed; });
  }

  const list = (items, cls = '') => `<ul class="list ${cls}">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
  const wbText = (id, key) => ((state.progress.workbook || {})[id] || {})[key] || '';

  const SECTION = {
    law: m => `${m.law.intro.map(p => `<p>${esc(p)}</p>`).join('')}
      <div class="keypoints"><h3>Key points</h3>${list(m.law.points)}</div>
      <div class="sources"><b>Sources</b> (checked ${esc(state.course.checked)}; rules and amounts change, so always confirm on GOV.UK):
      <ul>${m.law.sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('')}</ul></div>`,
    why: m => m.why.map(p => `<p>${esc(p)}</p>`).join(''),
    know: m => `<p class="muted">Before you move on, make sure you know:</p>${list(m.know)}`,
    able: m => {
      const prep = m.able.filter(a => /^Prepare:/i.test(a)), can = m.able.filter(a => !/^Prepare:/i.test(a));
      return `<p class="muted">By the end of this module you should be able to:</p>${list(can, 'checks')}${prep.map(p => `<div class="prepare"><b>Get ready:</b> ${esc(p.replace(/^Prepare:\s*/i, ''))}</div>`).join('')}`;
    },
    examples: m => m.examples.map((e, i) => `<div class="card example"><h3>Example ${i + 1}: ${esc(e.title)}</h3>
      <p class="lbl">Scenario</p><p>${esc(e.scenario)}</p><p class="lbl">What this means</p><p>${esc(e.analysis)}</p></div>`).join('') +
      `<p class="muted small">These are fictional examples for learning. Ask the AI tutor for another example if you would like one.</p>`,
    activities: (m, id) => `<p class="muted">Your answers save to your workbook automatically. You can come back and edit them at any time.</p>` +
      m.activities.map(a => `<div class="card activity"><div class="row"><h3>${esc(a.title)}</h3><span class="pill">${a.minutes} min</span></div>
        <p>${esc(a.task)}</p><label for="wb-${a.key}">${esc(a.prompt)}</label>
        <textarea id="wb-${a.key}" data-wb="${a.key}" maxlength="6000">${esc(wbText(id, a.key))}</textarea><div class="save-state" data-s="${a.key}"></div></div>`).join(''),
    assessment: (m, id) => {
      const r = result(id);
      return `<p class="muted">${m.assessment.length} questions. Pass mark ${state.course.passMark}%. You can try again as many times as you need.${r ? ` Your best score so far: <b>${r.best}%</b>${r.passed ? ' (passed).' : '.'}` : ''}</p>
        <form id="quiz">${m.assessment.map((q, i) => `<div class="card q" data-q="${i}"><fieldset><legend>${i + 1}. ${esc(q.q)}</legend>
          ${q.options.map((o, j) => `<label class="opt"><input type="radio" name="q${i}" value="${j}" required> <span>${esc(o)}</span></label>`).join('')}</fieldset><div class="fb"></div></div>`).join('')}
          <div id="quiz-res" role="status"></div>
          <button class="btn btn-primary">Submit answers</button></form>`;
    },
    workbook: (m, id) => `<p class="muted">Everything you have written for this module. Changes save automatically.</p>` +
      m.activities.map(a => `<div class="activity"><label for="wb-${a.key}">${esc(a.title)}: ${esc(a.prompt)}</label>
        <textarea id="wb-${a.key}" data-wb="${a.key}" maxlength="6000">${esc(wbText(id, a.key))}</textarea><div class="save-state" data-s="${a.key}"></div></div>`).join('') +
      `<div class="activity"><label for="wb-reflection">Reflection: ${esc(m.reflection)}</label>
        <textarea id="wb-reflection" data-wb="reflection" maxlength="6000">${esc(wbText(id, 'reflection'))}</textarea><div class="save-state" data-s="reflection"></div></div>
      <p class="no-print"><button class="btn btn-outline btn-sm" type="button" onclick="window.print()">Print or save as PDF</button> <a class="btn btn-outline btn-sm" href="#/workbook">Full workbook (all modules)</a></p>`
  };

  function wireWorkbook(m, id) {
    app.querySelectorAll('textarea[data-wb]').forEach(t => {
      let timer;
      const save = async () => {
        const key = t.dataset.wb, s = app.querySelector(`[data-s="${key}"]`);
        if (t.value === wbText(id, key)) return;
        s.textContent = 'Saving…';
        const r = await api('/workbook', {method: 'POST', body: {module: id, key, text: t.value}});
        if (r.status === 200) { (state.progress.workbook[id] = state.progress.workbook[id] || {})[key] = t.value; s.textContent = 'Saved'; }
        else s.textContent = 'Not saved: ' + (r.body.message || 'please try again');
      };
      t.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(save, 1200); });
      t.addEventListener('blur', () => { clearTimeout(timer); save(); });
    });
  }

  const WIRE = {
    activities: wireWorkbook,
    workbook: wireWorkbook,
    assessment: (m, id) => {
      $('#quiz').onsubmit = async e => {
        e.preventDefault();
        const answers = m.assessment.map((q, i) => { const c = app.querySelector(`input[name=q${i}]:checked`); return c ? Number(c.value) : -1; });
        const out = $('#quiz-res');
        if (answers.includes(-1)) { out.innerHTML = '<div class="msg err">Please answer every question.</div>'; return; }
        const btn = e.target.querySelector('button'); btn.disabled = true;
        const r = await api('/assess', {method: 'POST', body: {module: id, answers}});
        btn.disabled = false;
        if (r.status !== 200) { out.innerHTML = `<div class="msg err">${esc(r.body.message || 'Could not submit. Please try again.')}</div>`; return; }
        state.progress.results[id] = r.body.result;
        r.body.feedback.forEach((f, i) => {
          const box = app.querySelector(`[data-q="${i}"]`); box.classList.remove('right', 'wrong'); box.classList.add(f.correct ? 'right' : 'wrong');
          box.querySelector('.fb').innerHTML = f.correct ? `<span style="color:var(--neon)">✓ Correct.</span>${f.explain ? ' ' + esc(f.explain) : ''}`
            : `<span style="color:var(--red)">✗ Not quite.</span> ${f.explain ? `The answer is "${esc(m.assessment[i].options[f.answer])}". ${esc(f.explain)}` : 'Look back at the lesson, or ask the AI tutor for a hint.'}`;
        });
        out.innerHTML = `<div class="score card"><b style="color:${r.body.passed ? 'var(--neon)' : 'var(--amber)'}">${r.body.score}%</b><div>${r.body.passed
          ? `<b>Passed.</b> Well done. Your workbook and result are saved.${nextModule(id) ? ` <a href="#/m/${nextModule(id)}/law">Start the next module →</a>` : ' You have finished all the modules.'}`
          : `<b>Not passed yet.</b> You need ${r.body.passMark}%. Review the sections for the questions marked ✗, then try again. The tutor's Hint mode can help.`}</div></div>`;
        out.scrollIntoView({behavior: 'smooth', block: 'center'});
      };
    }
  };
  const nextModule = id => { const ids = Object.keys(state.course.modules); return ids[ids.indexOf(id) + 1]; };

  // ---------- full workbook ----------
  function renderWorkbook() {
    const c = state.course;
    app.innerHTML = `<p class="crumb"><a href="#/">Dashboard</a> › Workbook</p><h1>My workbook</h1>
      <p class="muted no-print">All your activity answers and reflections. Use your browser's print option to save a PDF copy. Edit answers inside each module.</p>
      <p class="no-print"><button class="btn btn-outline btn-sm" onclick="window.print()">Print or save as PDF</button></p>
      ${Object.entries(c.modules).map(([id, m]) => `<section class="card" style="margin-top:1.25rem"><h2>Module ${id.slice(1)}: ${esc(m.title)}</h2>
        ${[...m.activities.map(a => [a.title + ': ' + a.prompt, wbText(id, a.key)]), ['Reflection: ' + m.reflection, wbText(id, 'reflection')]]
          .map(([q, a]) => `<h3 style="margin-top:1rem">${esc(q)}</h3><p style="white-space:pre-wrap">${a ? esc(a) : '<span class="muted">Not answered yet.</span>'}</p>`).join('')}
        <p class="no-print"><a href="#/m/${id}/workbook">Edit in Module ${id.slice(1)} →</a></p></section>`).join('')}`;
  }

  // ---------- AI tutor ----------
  const MODES = [['explain', 'Explain simply'], ['example', 'Give an example'], ['hint', 'Hint'], ['question', 'Practice question'], ['check', 'Check my answer']];
  function openTutor(id) {
    const m = state.course.modules[id], chat = state.chats[id] = state.chats[id] || {mode: 'explain', log: []};
    tutorEl.hidden = false;
    tutorEl.innerHTML = `<header><div><b>AI tutor</b><br><span class="muted small">Module ${id.slice(1)}: ${esc(m.title)}</span></div><button class="btn btn-outline btn-sm" id="t-close" aria-label="Close tutor">Close</button></header>
      <div class="modes" role="group" aria-label="Tutor mode">${MODES.map(([k, l]) => `<button type="button" data-m="${k}" aria-pressed="${chat.mode === k}">${l}</button>`).join('')}</div>
      <div class="log" id="t-log"></div>
      ${state.tutorReady ? '' : '<p class="msg err" style="margin:0 1.1rem">The tutor is not switched on yet. Please try again later.</p>'}
      <form id="t-form"><textarea id="t-in" placeholder="Ask about this module…" maxlength="2000" aria-label="Your question"></textarea><button class="btn btn-primary" ${state.tutorReady ? '' : 'disabled'}>Send</button></form>
      <p class="note">General information for learning, not immigration advice. The tutor won't give assessment answers. Don't share personal details.</p>`;
    const log = $('#t-log');
    const draw = () => {
      log.innerHTML = chat.log.length ? chat.log.map(x => `<div class="bubble ${x.role === 'user' ? 'user' : 'ai'}">${esc(x.content)}</div>`).join('')
        : `<div class="bubble ai">Hello! I can explain anything in "${esc(m.title)}", give you an example, set a practice question or check your answer. Choose a mode, then type your question.</div>`;
      log.scrollTop = log.scrollHeight;
    };
    draw();
    tutorEl.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { chat.mode = b.dataset.m; tutorEl.querySelectorAll('[data-m]').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#t-in').focus(); });
    $('#t-close').onclick = closeTutor;
    $('#t-in').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#t-form').requestSubmit(); } });
    $('#t-form').onsubmit = async e => {
      e.preventDefault();
      const input = $('#t-in'), text = input.value.trim(); if (!text) return;
      const history = chat.log.slice(-8);
      chat.log.push({role: 'user', content: text}); input.value = ''; draw();
      const btn = e.target.querySelector('button'); btn.disabled = true;
      log.insertAdjacentHTML('beforeend', '<div class="bubble ai muted" id="t-wait">Thinking…</div>'); log.scrollTop = log.scrollHeight;
      const r = await api('/tutor', {method: 'POST', body: {module: id, mode: chat.mode, message: text, history}});
      btn.disabled = false;
      chat.log.push({role: 'assistant', content: r.status === 200 ? r.body.answer : (r.body.message || 'The tutor could not answer just now. Please try again.')});
      draw();
    };
    $('#t-in').focus();
  }
  function closeTutor() { tutorEl.hidden = true; tutorEl.innerHTML = ''; }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !tutorEl.hidden) closeTutor(); });

  // ---------- router ----------
  async function render() {
    setWho();
    if (await handleReturn()) return;
    setWho();
    if (!token()) { closeTutor(); return renderGate(); }
    if (!await load()) { if (!token()) return renderGate({ok: false, text: 'Your session has ended. Please sign in again.'}); app.innerHTML = '<p class="msg err">The course could not be loaded. Please refresh the page.</p>'; return; }
    const h = location.hash.replace(/^#\/?/, '').split('/');
    if (h[0] === 'm' && h[1]) { renderModule(h[1], h[2] || 'law'); if (!tutorEl.hidden && !tutorEl.innerHTML.includes('Module ' + h[1].slice(1) + ':')) closeTutor(); }
    else if (h[0] === 'workbook') { closeTutor(); renderWorkbook(); }
    else { closeTutor(); renderHome(); }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);
  render();
})();
