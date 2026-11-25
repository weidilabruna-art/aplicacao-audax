/* Rubens Godoy — Sessão de Implementação · GSAP + (Three.js carregado só no desktop, depois do primeiro desenho) */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Botões "Aplicar" abrem o popup de formulário (4 etapas).
  // Destino das respostas (configure em <body>): data-endpoint="https://..." (POST JSON) e/ou data-whatsapp="5511999999999" (abre a conversa com as respostas).
  const dlg = $('#aplicar');
  const body = document.body;
  const open = (e) => { e && e.preventDefault(); if (dlg && !dlg.open) { dlg.showModal(); go(1, true); } };
  $$('[data-cta]').forEach((a) => a.addEventListener('click', open));
  if (location.hash === '#aplicar') open();

  // Duas telas: 1) perfil (nome, WhatsApp, Instagram, e-mail)  2) perguntas do curso, em campos compactos (estilo Foes).
  const panes = $$('.pane[data-pane]', dlg).filter((p) => p.dataset.pane !== 'done');
  let idx = 0;
  const form = dlg.querySelector('form');
  const active = () => panes;
  const next = $('#ap-next'), back = $('#ap-back'), err = $('#ap-err'), note = $('#ap-note');
  function show(i) {
    const list = active(); idx = Math.max(0, Math.min(i, list.length - 1)); const pane = list[idx];
    $$('.pane', dlg).forEach((p) => p.classList.toggle('is-on', p === pane));
    $('.apply__bar i', dlg).style.width = ((idx + 1) / list.length * 100) + '%';
    $('#ap-n').textContent = idx + 1; $('#ap-t').textContent = list.length; $('#ap-eyebrow').textContent = pane.dataset.eyebrow;
    back.hidden = idx === 0; const last = idx === list.length - 1;
    next.querySelector('.btn__label').textContent = last ? 'Enviar' : 'Continuar';
    next.hidden = false; err.hidden = true; pane.querySelector('input,select')?.focus({ preventScroll: true });
  }
  function go(n, reset) { if (reset) { form.reset(); dlg.classList.remove('is-done'); err.hidden = true; note.hidden = true; } show(n - 1); }
  const fmtPhone = (v) => { const d = v.replace(/\D/g, '').slice(0, 11); return d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length > 10 ? 7 : 6)}-${d.slice(d.length > 10 ? 7 : 6)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d; };
  form.querySelector('[name=whatsapp]').addEventListener('input', (e) => { e.target.value = fmtPhone(e.target.value); });
  form.querySelector('[name=instagram]').addEventListener('blur', (e) => { const v = e.target.value.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, ''); e.target.value = v && !v.startsWith('@') ? '@' + v : v; });
  function valid() {
    const pane = active()[idx];
    const get = (n) => (pane.querySelector(`[name=${n}]`)?.value || '').trim();
    if (pane.querySelector('[name=nome]')) {
      if (get('nome').split(/\s+/).length < 2 || get('nome').length < 5) return 'Digite seu nome e sobrenome.';
      if (get('whatsapp').replace(/\D/g, '').length < 10) return 'Digite o WhatsApp com DDD.';
      if (get('instagram').replace('@', '').length < 2) return 'Digite seu @ no Instagram.';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(get('email'))) return 'Digite um e-mail válido.';
      return '';
    }
    if (get('area').length < 3) return 'Conte em poucas palavras qual é a sua área.';
    for (const s of pane.querySelectorAll('select')) if (!s.value) return `Escolha uma opção em: ${s.dataset.label}`;
    return '';
  }
  async function send() {
    const data = Object.fromEntries(new FormData(form).entries());
    data.pagina = location.href; data.data = new Date().toISOString();
    let how = [];
    const ep = body.dataset.endpoint, wa = body.dataset.whatsapp;
    if (ep) { try { const r = await fetch(ep, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }); if (!r.ok) throw 0; how.push('endpoint'); } catch { err.textContent = 'Não consegui enviar agora. Tente de novo em instantes.'; err.hidden = false; return false; } }
    if (wa) { const linhas = [...form.querySelectorAll('[data-label]')].map((e) => `${e.dataset.label}: ${e.value}`); window.open(`https://wa.me/${wa}?text=${encodeURIComponent('Olá! Quero aplicar para a Sessão de Implementação.\n\n' + linhas.join('\n'))}`, '_blank', 'noopener'); how.push('whatsapp'); }
    window.dispatchEvent(new CustomEvent('aplicacao-enviada', { detail: data })); // ponto de ligação para Pixel/Analytics
    if (!how.length) { try { const k = 'aplicacoes-teste'; const a = JSON.parse(localStorage.getItem(k) || '[]'); a.push(data); localStorage.setItem(k, JSON.stringify(a)); } catch {} note.textContent = 'Modo de teste: as respostas ficaram só neste navegador. Falta configurar o destino (data-endpoint ou data-whatsapp).'; note.hidden = false; }
    return true;
  }
  async function advance() {
    const m = valid(); if (m) { err.textContent = m; err.hidden = false; return; }
    if (idx < active().length - 1) { show(idx + 1); return; }
    next.disabled = true; const ok = await send(); next.disabled = false; if (!ok) return;
    $$('.pane', dlg).forEach((p) => p.classList.toggle('is-on', p.dataset.pane === 'done')); dlg.classList.add('is-done');
  }
  next?.addEventListener('click', advance);
  back?.addEventListener('click', () => show(idx - 1));
  dlg?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'radio') { e.preventDefault(); advance(); } });
  dlg?.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });

  const ano = $('#ano'); if (ano) ano.textContent = new Date().getFullYear();

  // Menu ganha fundo ao rolar
  const nav = $('.nav');
  const onScroll = () => nav.classList.toggle('is-solid', scrollY > 60);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Botão magnético: o botão acompanha o mouse de leve (só com mouse, nunca no toque)
  if (!reduce && matchMedia('(hover: hover)').matches) {
    $$('[data-magnetic]').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mx', Math.max(-MAGNET.max, Math.min(MAGNET.max, (e.clientX - (r.left + r.width / 2)) * MAGNET.x)).toFixed(1) + 'px');
        b.style.setProperty('--my', Math.max(-MAGNET.max, Math.min(MAGNET.max, (e.clientY - (r.top + r.height / 2)) * MAGNET.y)).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
    });
  }

  // posiciona os marcos da curva sobre o próprio traço (vale também para quem usa "reduzir movimento")
  (() => { const gp = $('#gpath'); if (!gp) return; const L = gp.getTotalLength(); $$('.g-mark').forEach((m) => { const pt = gp.getPointAtLength(L * +m.dataset.at); m.setAttribute('transform', `translate(${pt.x} ${pt.y})`); }); })();

  // Progresso ligado à rolagem, calculado a cada quadro pela posição REAL do elemento na tela
  // (não depende de medidas feitas antes: continua certo se a fonte demorar, a janela mudar de tamanho ou o layout se mexer).
  const live = [];
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const scrubRect = (el, from, to, cb, useHeight = false) => { live.push({ el, from, to, cb, useH: useHeight, last: -1 }); queue(); };
  let tick = 0;
  const runLive = () => { tick = 0; const vh = innerHeight; for (const o of live) { const r = o.el.getBoundingClientRect(); const p = clamp01((o.from * vh - r.top) / ((o.from - o.to) * vh + (o.useH ? r.height : 0))); if (Math.abs(p - o.last) > 0.002) { o.last = p; o.cb(p, r, vh); } } };
  const queue = () => { if (!tick) tick = requestAnimationFrame(runLive); };
  addEventListener('scroll', queue, { passive: true }); addEventListener('resize', queue); addEventListener('load', queue);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { queue(); window.ScrollTrigger && window.ScrollTrigger.refresh(); });

  // Dispara uma vez quando o elemento entra na tela (IntersectionObserver: o navegador acompanha a posição real, mesmo que o layout mude)
  const onceVisible = (el, margin, cb) => { if (!el) return; if (!('IntersectionObserver' in window)) { cb(el); return; } const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { io.disconnect(); cb(el); } }, { rootMargin: `0px 0px -${margin}% 0px` }); io.observe(el); };

  // Tempos da entrada do topo (iguais ao protótipo do editor e a HERO-MEDIDAS.md)
  const INTRO = { y: 28, text: 0.9, stagger: 0.12, photo: 1.4, photoScale: 1.04, textAt: 0.15, bracketsAt: 0.8, ease: 'power3.out' };
  const MAGNET = { x: 0.12, y: 0.18, max: 12 }; // o botão acompanha o mouse no máximo 12 px (não sai da moldura)

  // GSAP: entrada do topo + revelações ao rolar
  const start = () => {
    if (!window.gsap) return;
    const { gsap } = window;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
    if (reduce) return;

    gsap.set('[data-reveal]', { opacity: 0, y: INTRO.y });

    if (!window.ScrollTrigger) { gsap.set('[data-reveal]', { opacity: 1, y: 0 }); return; }
    { let q = 0; $$('[data-reveal]').forEach((el) => onceVisible(el, 12, () => gsap.to(el, { opacity: 1, y: 0, duration: 0.8, delay: Math.min(0.3, (q++ % 4) * 0.1), ease: 'power3.out' }))); }

    // faixa de resultado: o número grande conta de zero; a curva de crescimento se desenha conforme se rola, e os marcos acendem quando a linha passa por eles
    const big = $('.stats__big [data-count]');
    if (big) { const fmt = (v) => { big.textContent = (big.dataset.prefix || '') + Math.round(v) + (big.dataset.suffix || ''); }; fmt(0); const o = { v: 0 };
      onceVisible($('.stats__lead'), 15, () => gsap.to(o, { v: +big.dataset.count, duration: 1.8, ease: 'power2.out', onUpdate: () => fmt(o.v) })); }
    const gp = $('#gpath');
    if (gp) {
      const marks = $$('.g-mark');
      gsap.set('.g-line', { strokeDashoffset: 1000 }); gsap.set('.g-area', { opacity: 0 });
      scrubRect($('.growth'), 0.8, 0.45, (p) => {
        gsap.set('.g-line', { strokeDashoffset: Math.round(1000 * (1 - p)) }); gsap.set('.g-area', { opacity: Math.min(1, p * 1.2) });
        marks.forEach((m) => m.classList.toggle('is-on', p >= +m.dataset.at - 0.02));
      }, true);
    }
    // escada: cada degrau sobe do chão (revelação por recorte, sem distorcer o texto), um depois do outro
    const steps = $$('.step');
    if (steps.length) {
      gsap.set(steps, { clipPath: 'inset(100% 0 0 0)', y: 24 });
      onceVisible($('.stairs'), 20, () => gsap.to(steps, { clipPath: 'inset(0% 0 0 0)', y: 0, duration: 0.9, stagger: 0.16, ease: 'power3.out', clearProps: 'clipPath,y' }));
    }
    // para quem: cada frase acende (--p de 0 a 1) enquanto sobe da parte baixa da tela até o centro
    $$('.who__item').forEach((it) => { it.style.setProperty('--p', 0); scrubRect(it, 0.78, 0.42, (p) => it.style.setProperty('--p', p.toFixed(3))); });
    // cenários B: ao entrar o cartão seguinte, o anterior encolhe e escurece (--s de 0 a 1)
    const cards = $$('.card');
    if (cards.length) {
      cards.forEach((c, i) => { const nx = cards[i + 1]; if (nx) scrubRect(nx, 0.8, 0.3, (p) => c.style.setProperty('--s', p.toFixed(3))); });
    }
    // linhas finas desenhando
    $$('.lines p, .rows li').forEach((el) => {
      gsap.fromTo(el, { '--w': 0 }, { '--w': 1, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    // foto de "Quem é" com leve paralaxe
    const ph = $('[data-parallax] img');
    if (ph) gsap.fromTo(ph, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });
    // fundo do topo respira
    gsap.to('.hero__glow', { opacity: 0.55, scale: 1.08, duration: 4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  };
  window.addEventListener('load', start);
  if (document.readyState === 'complete') start();

  // Anel 3D de fotos: só no desktop, sem "reduzir movimento", depois do primeiro desenho (não pesa o carregamento)
  const wantRing = matchMedia('(min-width: 900px)').matches && !reduce;
  if (wantRing) {
    const boot = () => import('./ring.bundle.js?v=20e1bf7b').then((m) => m.start($('#ring'), ['images/rubens-4.webp', 'images/rubens-1.webp', 'images/rubens-2.webp', 'images/rubens-5.webp', 'images/rubens-3.webp'])).catch(() => {});
    (window.requestIdleCallback || ((f) => setTimeout(f, 1200)))(boot, { timeout: 2500 });
  }
})();
