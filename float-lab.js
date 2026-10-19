/*! float-lab.js — เปลือกแล็บร่วม: สื่อจำลองเต็มจอ + ปุ่มลอย */
(function () {
  const path = (location.pathname || '').toLowerCase();
  if (/cell-3d\.html$/.test(path) || /(?:^|\/)index\.html$/.test(path)) return;
  if (document.documentElement.classList.contains('lab-float')) return;
  if (!document.querySelector('.grid, .layout')) return;

  document.documentElement.classList.add('lab-float');

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

  function fab(icon, label, attrs) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lf-fab';
    if (attrs) Object.entries(attrs).forEach(([k, v]) => b.setAttribute(k, v));
    b.innerHTML = `<span class="fi" aria-hidden="true">${icon}</span><span class="fl">${label}</span>`;
    return b;
  }
  function fabLink(href, icon, label, aria) {
    const a = document.createElement('a');
    a.className = 'lf-fab';
    a.href = href;
    a.setAttribute('aria-label', aria || label);
    a.innerHTML = `<span class="fi" aria-hidden="true">${icon}</span><span class="fl">${label}</span>`;
    return a;
  }
  function pop(id, title, side) {
    const el = document.createElement('aside');
    el.className = `lf-pop ${side || 'left'} lf-glass`;
    el.id = id;
    el.hidden = true;
    el.setAttribute('aria-label', title);
    el.innerHTML = `<div class="lf-pop-head"><h2>${title}</h2><button type="button" class="lf-x" data-close aria-label="ปิด${title}">×</button></div>`;
    return el;
  }
  function moveKids(from, to) {
    if (!from) return;
    while (from.firstChild) to.appendChild(from.firstChild);
  }
  function fireResize() {
    window.dispatchEvent(new Event('resize'));
    $$('canvas').forEach(c => {
      try { c.dispatchEvent(new Event('resize')); } catch (_) {}
    });
  }

  const header = $('header');
  const grid = $('.grid');
  const layout = $('.layout');

  let titleText = 'ห้องแล็บชีววิทยา';
  let subText = 'สื่อจำลองเต็มจอ · ใช้ปุ่มลอยเปิดแผงควบคุม';
  if (header) {
    const h1 = $('h1', header);
    if (h1) titleText = h1.textContent.replace(/\s+/g, ' ').trim();
    const sub = $('.sub', header);
    if (sub) subText = sub.textContent.trim();
  }
  // แล็บแบบ .layout ใส่ชื่อบทไว้ในแผงซ้าย
  const sideH1 = $('.layout .left h1, .layout .panel.left h1');
  if (sideH1) {
    titleText = sideH1.textContent.replace(/\s+/g, ' ').trim();
    const eye = $('.layout .left .eyebrow, .layout .panel.left .eyebrow');
    if (eye) subText = eye.textContent.replace(/\s+/g, ' ').trim() + ' · สื่อจำลองเต็มจอ';
  }

  const stage = document.createElement('div');
  stage.className = 'lf-stage';

  const viewer = document.createElement('div');
  viewer.className = 'lf-viewer';
  viewer.id = 'lfViewer';

  const hud = document.createElement('div');
  hud.className = 'lf-hud';
  hud.hidden = true;

  const hint = document.createElement('div');
  hint.className = 'lf-hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.textContent = 'ลาก/คลิกบนสื่อจำลอง · เปิดแผงจากปุ่มลอยด้านซ้าย';

  const topLeft = document.createElement('div');
  topLeft.className = 'lf-float lf-top-left';
  topLeft.innerHTML = `<div class="lf-title lf-glass"><a href="index.html" aria-label="ไปหน้าแรก">⌂</a><div class="lf-titles"><h1></h1><p></p></div></div>`;
  topLeft.querySelector('h1').textContent = titleText;
  topLeft.querySelector('p').textContent = subText;

  const topRight = document.createElement('div');
  topRight.className = 'lf-float lf-top-right';
  topRight.appendChild(fabLink('index.html', '←', 'หน้าแรก', 'กลับหน้าแรก'));

  const fabCol = document.createElement('nav');
  fabCol.className = 'lf-float lf-fab-col';
  fabCol.setAttribute('aria-label', 'เปิดแผงข้อมูล');

  const toolbar = document.createElement('div');
  toolbar.className = 'lf-float lf-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'ควบคุมการจำลอง');

  const pops = [];

  function addPopButton(icon, label, popEl, aria) {
    const id = popEl.id;
    const b = fab(icon, label, {
      'data-pop': id,
      'aria-controls': id,
      'aria-expanded': 'false',
      'aria-label': aria || ('เปิด' + label)
    });
    fabCol.appendChild(b);
    pops.push(popEl);
    return b;
  }

  function openPop(id) {
    $$('[data-pop]', fabCol).forEach(b => {
      const on = b.getAttribute('data-pop') === id;
      b.setAttribute('aria-expanded', String(on));
      const p = document.getElementById(b.getAttribute('data-pop'));
      if (p) p.hidden = !on;
    });
  }
  function closePop(returnFocus) {
    const btn = $$('[data-pop]', fabCol).find(b => b.getAttribute('aria-expanded') === 'true');
    if (!btn) return false;
    openPop(null);
    if (returnFocus) btn.focus({ preventScroll: true });
    return true;
  }

  if (grid) {
    const left = $('.left', grid);
    const center = $('.center', grid);
    const right = $('.right', grid);

    const mainCanvas = $('#main', center) || $('canvas', center);
    const centerCard = mainCanvas ? mainCanvas.closest('.card') || center : center;

    // สื่อจำลอง: ย้าย canvas ออกมาเต็มจอ
    if (mainCanvas) viewer.appendChild(mainCanvas);

    // สถิติลอยใต้ภาพ · สมการย้ายไปแผงผลเพื่อไม่บังสื่อ
    $$('#stats, .stats', centerCard).forEach(el => {
      if (!hud.contains(el)) hud.appendChild(el);
    });
    const eqBits = $$('#eq, .eq', centerCard);
    if (hud.childElementCount) {
      hud.hidden = false;
      stage.classList.add('has-hud');
    }

    // แผงโหมด
    const modesCard = left && $('.modes', left);
    if (modesCard) {
      const p = pop('lfPopModes', 'โหมดการจำลอง', 'left');
      p.appendChild(modesCard);
      addPopButton('🧪', 'โหมด', p, 'เปิดเลือกโหมดการจำลอง');
      stage.appendChild(p);
    }

    // แผงควบคุมตัวแปร (การ์ดที่ยังเหลือในซ้าย ยกเว้นการ์ดปุ่มเล่น)
    if (left) {
      const ctrlPop = pop('lfPopControls', 'แผงควบคุม', 'left');
      const cards = $$(':scope > .card', left);
      cards.forEach(card => {
        if (card.classList.contains('modes')) return;
        const playBox = $('.btns', card);
        if (playBox && ($('#play', playBox) || $('#pause', playBox) || $('#reset', playBox))) {
          promoteTransport(playBox);
        }
        // การ์ดที่มีแต่ปุ่มเล่น (ไม่มีตัวแปร) ไม่ต้องใส่ในแผง
        if (!$('input, select, [data-m]', card) && playBox && !$('.switch', card)) return;
        ctrlPop.appendChild(card);
      });
      moveKids(left, ctrlPop);
      if (ctrlPop.childElementCount > 1) {
        addPopButton('🎛', 'ปรับค่า', ctrlPop, 'เปิดแผงควบคุมตัวแปร');
        stage.appendChild(ctrlPop);
      }
    }

    // แผงผล
    if (right) {
      const res = pop('lfPopResults', 'ผลและกราฟ', 'right');
      moveKids(right, res);
      eqBits.forEach(el => res.appendChild(el));
      addPopButton('📊', 'ผล', res, 'เปิดแผงผล กราฟ และบทวิเคราะห์');
      stage.appendChild(res);
    } else {
      eqBits.forEach(el => hud.appendChild(el));
      if (hud.childElementCount) { hud.hidden = false; stage.classList.add('has-hud'); }
    }

    $$('.lf-pop .btns, .lf-stage .btns').forEach(box => {
      if ($('#play', box) || $('#pause', box) || $('#reset', box)) promoteTransport(box);
    });

  } else if (layout) {
    const left = $('.left', layout) || $('.panel.left', layout);
    const center = $('.center', layout) || $('main', layout);
    const right = $('.right', layout) || $('.panel.right', layout);

    const cvwrap = $('.cvwrap', center);
    const canvas = $('#cv', center) || $('canvas', center);
    if (cvwrap) viewer.appendChild(cvwrap);
    else if (canvas) viewer.appendChild(canvas);

    ['#formula', '#stats', '.formula', '.stats'].forEach(sel => {
      $$(sel, center).forEach(el => {
        if (!hud.contains(el)) hud.appendChild(el);
      });
    });
    if (hud.childElementCount) {
      hud.hidden = false;
      stage.classList.add('has-hud');
    }

    if (left) {
      const p = pop('lfPopControls', 'โหมดและควบคุม', 'left');
      moveKids(left, p);
      // ปุ่มเล่นใน layout มักอยู่ใน #controls
      $$('.row .btn, .row .switch, #play, #pause, #reset', p).forEach(() => {});
      promoteLayoutTransport(p);
      addPopButton('🎛', 'ทดลอง', p, 'เปิดโหมดและแผงควบคุม');
      stage.appendChild(p);
    }
    if (right) {
      const p = pop('lfPopResults', 'ผล', 'right');
      moveKids(right, p);
      addPopButton('📊', 'ผล', p, 'เปิดแผงผลและบทวิเคราะห์');
      stage.appendChild(p);
    }
  }

  function promoteTransport(box) {
    if (!box || box.dataset.lfPromoted) return;
    box.dataset.lfPromoted = '1';
    const map = [
      ['#play', '▶', 'เล่น'],
      ['#pause', '⏸', 'หยุด'],
      ['#step', '⏭', 'ทีละขั้น'],
      ['#reset', '↺', 'รีเซ็ต']
    ];
    map.forEach(([sel, icon, label]) => {
      const src = $(sel, box);
      if (!src || toolbar.querySelector(`[data-src="${sel}"]`)) return;
      const b = fab(icon, label, {
        'data-src': sel,
        'aria-label': src.getAttribute('aria-label') || label
      });
      b.addEventListener('click', () => src.click());
      // sync disabled/label periodically light
      const sync = () => {
        b.disabled = !!src.disabled;
        const t = (src.textContent || '').trim();
        if (/▶|เล่น|เริ่ม|เล่นต่อ/.test(t)) { b.querySelector('.fi').textContent = '▶'; b.querySelector('.fl').textContent = 'เล่น'; }
        else if (/⏸|หยุด/.test(t) && sel === '#play') { b.querySelector('.fi').textContent = '⏸'; b.querySelector('.fl').textContent = 'หยุด'; }
      };
      src.addEventListener('click', () => setTimeout(sync, 0));
      const mo = new MutationObserver(sync);
      mo.observe(src, { attributes: true, childList: true, characterData: true, subtree: true });
      toolbar.appendChild(b);
      sync();
    });
    // ซ่อนเฉพาะปุ่มที่ promote แล้ว เหลือ toggle ในแผง
    map.forEach(([sel]) => {
      const src = $(sel, box);
      if (src) src.hidden = true;
    });
    if (![...box.children].some(ch => !ch.hidden)) box.hidden = true;
  }

  function promoteLayoutTransport(panel) {
    const candidates = $$('button.btn, button.switch', panel);
    const playish = candidates.filter(b => /เล่น|หยุด|รีเซ็ต|▶|⏸|↺|เริ่ม/.test(b.textContent));
    if (!playish.length) return;
    // สร้างแถบจากปุ่มที่พบในแถวควบคุม
    const row = playish[0].closest('.row') || playish[0].parentElement;
    if (row && !row.dataset.lfPromoted) {
      row.dataset.lfPromoted = '1';
      playish.forEach(src => {
        const t = src.textContent.trim();
        let icon = '●', label = t.slice(0, 10);
        if (/▶|เล่น|เริ่ม/.test(t)) { icon = '▶'; label = 'เล่น'; }
        else if (/⏸|หยุด/.test(t)) { icon = '⏸'; label = 'หยุด'; }
        else if (/รีเซ็ต|↺/.test(t)) { icon = '↺'; label = 'รีเซ็ต'; }
        else if (/หมุน|สลับ|แสดง/.test(t)) { icon = '👁'; label = t.replace(/\s+/g, '').slice(0, 8); }
        const b = fab(icon, label, { 'aria-label': t });
        b.addEventListener('click', () => src.click());
        const sync = () => {
          b.setAttribute('aria-pressed', src.classList.contains('on') ? 'true' : 'false');
          if (src.classList.contains('on')) b.setAttribute('aria-pressed', 'true');
        };
        src.addEventListener('click', () => setTimeout(sync, 0));
        toolbar.appendChild(b);
        sync();
      });
    }
  }

  // ประกอบ stage
  stage.append(viewer, hud, hint, topLeft, topRight, fabCol, toolbar);
  document.body.insertBefore(stage, document.body.firstChild);

  // events
  fabCol.addEventListener('click', e => {
    const b = e.target.closest('[data-pop]');
    if (!b) return;
    if (b.getAttribute('aria-expanded') === 'true') closePop();
    else openPop(b.getAttribute('data-pop'));
  });
  stage.addEventListener('click', e => {
    if (e.target.matches('[data-close], .lf-x')) closePop(true);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!closePop(true)) openPop(null);
    }
  });

  // รีไซส์ canvas หลัง layout
  requestAnimationFrame(() => {
    fireResize();
    setTimeout(fireResize, 100);
    setTimeout(fireResize, 400);
  });
  new ResizeObserver(() => fireResize()).observe(viewer);

  // ซ่อนโครงเดิมจากโฟลว์โฟกัส (CSS ซ่อนการแสดงผลแล้ว)
  [header, grid, layout].forEach(el => {
    if (!el) return;
    el.setAttribute('aria-hidden', 'true');
    try { el.inert = true; } catch (_) {}
  });
})();
