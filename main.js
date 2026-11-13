(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* Tema */
  function isDark() {
    return root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function paintTheme() { $('#theme use').setAttribute('href', isDark() ? '#i-sun' : '#i-moon'); }
  $('#theme').addEventListener('click', function () {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    store.set('theme', root.dataset.theme);
    paintTheme();
  });
  paintTheme();

  /* Progreso, botón volver arriba y sección activa */
  var bar = $('#bar'), topBtn = $('#top'), ticking = false;
  function onScroll() {
    var h = root.scrollHeight - innerHeight;
    bar.style.width = (h > 0 ? scrollY / h * 100 : 0) + '%';
    topBtn.hidden = scrollY < 600;
    ticking = false;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  topBtn.addEventListener('click', function () { scrollTo({ top: 0 }); });

  var links = $$('.links a');
  var spy = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(function (s) { spy.observe(s); });

  /* Aparición progresiva */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('show'); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  $$('.reveal').forEach(function (el) { io.observe(el); });

  /* Acordeón */
  var accs = $$('.acc');
  function setAcc(acc, open) {
    var btn = $('button', acc), p = $('.panel', acc);
    acc.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
    p.style.maxHeight = open ? p.scrollHeight + 'px' : 0;
  }
  accs.forEach(function (acc) {
    $('button', acc).addEventListener('click', function () { setAcc(acc, !acc.classList.contains('open')); });
  });
  var all = $('#toggleAll'), allOpen = false;
  all.addEventListener('click', function () {
    allOpen = !allOpen;
    accs.forEach(function (a) { setAcc(a, allOpen); });
    all.textContent = allOpen ? 'Contraer todo' : 'Expandir todo';
  });
  addEventListener('resize', function () {
    accs.forEach(function (a) { if (a.classList.contains('open')) $('.panel', a).style.maxHeight = $('.panel', a).scrollHeight + 'px'; });
  });

  /* Pestañas con teclado */
  var tabs = $$('.tab');
  function selTab(i) {
    tabs.forEach(function (t, j) {
      var on = i === j;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    tabs[i].focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selTab(i); });
    t.addEventListener('keydown', function (e) {
      var n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (n === undefined) return;
      e.preventDefault();
      selTab((n + tabs.length) % tabs.length);
    });
  });

  /* Calculadora de tiempo en pantalla */
  var hrs = $('#hours');
  function calc() {
    var h = parseFloat(hrs.value), year = h * 365;
    $('#hoursOut').textContent = h.toLocaleString('es-AR');
    $('#rYear').textContent = Math.round(year).toLocaleString('es-AR');
    $('#rDays').textContent = (year / 24).toFixed(1).replace('.', ',');
    $('#rPct').textContent = Math.round(h / 16 * 100) + '%';
  }
  hrs.addEventListener('input', calc);
  calc();

  /* Autoevaluación */
  var Q = [
    'Reviso el celular apenas me despierto o justo antes de dormir.',
    'Me distraigo con el teléfono mientras estudio.',
    'Uso la IA para copiar respuestas sin leerlas.',
    'Duermo menos de lo que necesito por estar con pantallas.',
    'Prefiero escribir antes que hablar con quien tengo al lado.'
  ];
  var opts = ['Nunca', 'A veces', 'Siempre'], quiz = $('#quiz'), out = $('#quizOut');
  Q.forEach(function (q, i) {
    var f = document.createElement('fieldset');
    f.innerHTML = '<legend>' + q + '</legend>' + opts.map(function (o, v) {
      return '<label><input type="radio" name="q' + i + '" value="' + v + '"> ' + o + '</label>';
    }).join('');
    quiz.appendChild(f);
  });
  var sub = document.createElement('button');
  sub.type = 'submit'; sub.className = 'btn sm'; sub.textContent = 'Ver resultado';
  quiz.appendChild(sub);
  quiz.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = $$('input:checked', quiz);
    if (n.length < Q.length) { out.hidden = false; out.textContent = 'Respondé las ' + Q.length + ' preguntas para ver el resultado.'; return; }
    var s = n.reduce(function (a, i) { return a + +i.value; }, 0);
    out.hidden = false;
    out.textContent = s <= 3 ? 'Uso equilibrado. Conviene mantener estos hábitos.'
      : s <= 7 ? 'Uso moderado con puntos a mejorar. Probá fijar horarios sin pantallas.'
      : 'Uso intensivo. Considerá pausas programadas y dejar el teléfono fuera del dormitorio.';
  });

  /* Temporizador de enfoque */
  var ring = $('#tRing'), tt = $('#tTime'), len = $('#tLen'), go = $('#tGo'), C = 2 * Math.PI * 52;
  var total, left, id = null;
  function fmt(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function paint() { tt.textContent = fmt(left); ring.style.strokeDashoffset = C * (1 - left / total); }
  function reset() { clearInterval(id); id = null; total = left = +len.value * 60; go.textContent = 'Iniciar'; document.title = baseTitle; paint(); }
  var baseTitle = document.title;
  go.addEventListener('click', function () {
    if (id) { clearInterval(id); id = null; go.textContent = 'Continuar'; return; }
    go.textContent = 'Pausar';
    id = setInterval(function () {
      left--; paint(); document.title = fmt(left) + ' | ' + baseTitle;
      if (left <= 0) { reset(); tt.textContent = 'Listo'; }
    }, 1000);
  });
  $('#tReset').addEventListener('click', reset);
  len.addEventListener('change', reset);
  reset();
})();
