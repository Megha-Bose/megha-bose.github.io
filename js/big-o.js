// Demos for "Big-O - Why the Right Algorithm Beats Faster Hardware".
(function () {
  'use strict';
  var D = window.AlgoDemos;
  var h = D.h, svg = D.svg, frame = D.frame, legend = D.legend, stepper = D.stepper;
  var commas = D.commas, duration = D.duration;
  var demos = {};

  // 10^x as text, exact for small numbers, scientific beyond a million.
  function big(log10) {
    if (log10 < 6) return commas(Math.pow(10, log10));
    var exp = Math.floor(log10);
    var mant = Math.pow(10, log10 - exp);
    if (mant >= 9.95) { mant = 1; exp += 1; }
    return (mant < 1.05 ? '' : mant.toFixed(1) + ' × ') + '10<sup>' + commas(exp) + '</sup>';
  }

  function slider(id, label, min, max, value, onInput) {
    var out = h('output', { for: id });
    var input = h('input', { type: 'range', id: id, min: min, max: max, step: 1, value: value });
    input.addEventListener('input', function () { onInput(+input.value); });
    return { input: input, out: out, row: h('div', { class: 'sf-field' }, [h('label', { for: id, text: label }), input, out]) };
  }

  function choices(label, items, onPick) {
    var buttons = items.map(function (item, i) {
      return h('button', { class: 'sf-btn', type: 'button', text: item, onclick: function () { onPick(i); } });
    });
    return {
      row: h('div', { class: 'sf-field' }, (label ? [h('label', { text: label })] : []).concat(buttons)),
      set: function (index) { buttons.forEach(function (b, i) { b.setAttribute('aria-pressed', i === index ? 'true' : 'false'); }); }
    };
  }

  // ---------------------------------------------------------------- hardware vs algorithm
  demos.hwrace = function (root) {
    var ui = frame(root, 'A faster computer, or a better algorithm?',
      'Sort n items. The supercomputer uses a simple O(n²) method. The laptop uses an O(n log n) one.');
    var stops = [10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9];
    var speeds = [10, 1000, 100000];
    var LAPTOP = 8;                      // log10 of steps per second
    var MIN = -9, MAX = 13;              // bar scale in log10 seconds
    var st = { stop: 2, speed: 1 };

    var size = slider('sf-hw-n', 'Items to sort, n', 0, stops.length - 1, st.stop, function (v) { ctl.touch(); st.stop = v; render(); });
    var speed = choices('Supercomputer is', speeds.map(function (s) { return commas(s) + '× faster'; }),
      function (i) { ctl.touch(); st.speed = i; render(); });
    ui.body.appendChild(size.row);
    ui.body.appendChild(speed.row);

    function lane(name, sub, color) {
      var fill = h('div', { class: 'sf-race-fill', style: 'background:' + color });
      var time = h('div', { class: 'sf-race-time sf-num' });
      var row = h('div', { class: 'sf-race' }, [
        h('div', { class: 'sf-race-name' }, [h('b', { text: name }), h('small', { text: sub })]),
        h('div', { class: 'sf-track sf-track-tall' }, [fill]),
        time
      ]);
      return { row: row, fill: fill, time: time };
    }
    var sup = lane('Supercomputer', 'O(n²)', 'var(--sf-a)');
    var lap = lane('Laptop', 'O(n log n)', 'var(--sf-b)');
    ui.body.appendChild(h('div', { class: 'sf-races' }, [sup.row, lap.row]));
    ui.body.appendChild(h('p', { class: 'sf-note', text: 'Bars use a log scale, so each equal stretch is 10 times longer. The laptop does 100 million steps a second.' }));

    function seconds(ops, log10speed) { return Math.log10(ops) - log10speed; }
    function crossover(speedup) {
      var n = 2;
      while (n / Math.log2(n) < speedup) n *= 1.02;
      return n;
    }

    function render() {
      var n = stops[st.stop];
      var S = speeds[st.speed];
      size.out.innerHTML = n < 1e7 ? commas(n) : '10<sup>' + Math.round(Math.log10(n)) + '</sup>';
      speed.set(st.speed);
      var a = seconds(n * n, LAPTOP + Math.log10(S));
      var b = seconds(n * Math.log2(n), LAPTOP);
      [[sup, a], [lap, b]].forEach(function (pair) {
        var w = (Math.min(Math.max(pair[1], MIN), MAX) - MIN) / (MAX - MIN) * 100;
        pair[0].fill.style.width = Math.max(w, 1.5) + '%';
        pair[0].time.textContent = duration(pair[1]);
      });
      var cross = crossover(S);
      var crossText = cross < 1e7 ? commas(cross) : big(Math.log10(cross));
      var lead;
      if (Math.abs(a - b) < 0.05) lead = 'They finish together.';
      else if (a < b) lead = '<b>The supercomputer wins</b>, for now.';
      else lead = '<b>The laptop wins</b>, ' + (b < 0 && a < 0 ? 'though both are instant to a human.' : 'and the gap only grows from here.');
      ui.status.innerHTML = lead + ' Being ' + commas(S) + '× faster buys the O(n²) method a lead only up to about <b>n = ' + crossText + '</b>. Past that, the better algorithm wins at every size.';
    }

    var ctl = stepper(root, ui.controls, {
      reset: function () { st.stop = 0; size.input.value = 0; render(); },
      step: function () {
        if (st.stop >= stops.length - 1) st.stop = -1;      // replay from the smallest n
        st.stop += 1; size.input.value = st.stop; render();
        return st.stop < stops.length - 1;
      }
    }, 900);
    render();
  };

  // ---------------------------------------------------------------- phone book race
  demos.phonebook = function (root) {
    var N = 64;
    var ui = frame(root, 'Two ways to look up a name',
      'A sorted list of 64 entries. Left: read from the start. Right: open the middle and throw away the half that cannot contain it.');
    var values = [];
    for (var i = 0; i < N; i++) values.push(3 + i * 3 + (i % 3));
    var st;

    var targetBtn = h('button', { class: 'sf-btn', type: 'button', text: 'New target', onclick: function () { ctl.touch(); pick(); ctl.reset(); } });
    var targetOut = h('output');
    ui.body.appendChild(h('div', { class: 'sf-field' }, [h('label', { text: 'Looking for' }), targetOut, targetBtn]));

    function board(title) {
      var count = h('span', { class: 'sf-num' });
      var cells = values.map(function (v) { return h('div', { class: 'sf-cell sf-cell-sm', text: String(v) }); });
      var wrap = h('div', { class: 'sf-board' }, [
        h('p', { class: 'sf-rowlabel' }, [title + ' - steps: ', count]),
        h('div', { class: 'sf-cells', style: '--sf-n:8' }, cells)
      ]);
      return { wrap: wrap, cells: cells, count: count };
    }
    var lin = board('Read in order');
    var bin = board('Halve each time');
    ui.body.appendChild(h('div', { class: 'sf-pair' }, [lin.wrap, bin.wrap]));
    ui.body.appendChild(legend([
      ['var(--sf-b)', 'entry being checked'],
      ['var(--sf-a)', 'found'],
      ['var(--sf-raised)', 'still possible']
    ]));

    var scale = h('div', { class: 'sf-scale' });
    ui.body.appendChild(h('p', { class: 'sf-rowlabel', text: 'Worst-case steps as the list grows' }));
    ui.body.appendChild(scale);
    [[64, 'sixty-four'], [1e3, 'a thousand'], [1e6, 'a million'], [1e9, 'a billion']].forEach(function (row) {
      var n = row[0];
      scale.appendChild(h('div', { class: 'sf-scale-row' }, [
        h('span', { class: 'sf-scale-n sf-num', text: commas(n) }),
        h('span', { class: 'sf-scale-v sf-num' }, [h('b', { text: commas(n) }), ' vs ', h('b', { text: String(Math.ceil(Math.log2(n + 1))) })])
      ]));
    });

    function pick() {
      var t;
      do { t = values[Math.floor(Math.random() * N)]; } while (st && t === st.target);
      st = { target: t };
    }

    function render(message) {
      targetOut.textContent = String(st.target);
      lin.count.textContent = String(st.li);
      bin.count.textContent = String(st.bsteps);
      lin.cells.forEach(function (cell, i) {
        var cls = 'sf-cell sf-cell-sm';
        if (st.lfound && i === st.lpos) cls += ' is-a';
        else if (i === st.lpos) cls += ' is-b';
        else if (i < st.lpos) cls += ' is-gone';
        cell.className = cls;
      });
      bin.cells.forEach(function (cell, i) {
        var cls = 'sf-cell sf-cell-sm';
        if (st.bfound && i === st.mid) cls += ' is-a';
        else if (i === st.mid) cls += ' is-b';
        else if (i < st.lo || i > st.hi) cls += ' is-gone';
        cell.className = cls;
      });
      ui.status.innerHTML = message;
    }

    var demo = {
      reset: function () {
        st = { target: st.target, li: 0, lpos: -1, lfound: false, lo: 0, hi: N - 1, mid: -1, bsteps: 0, bfound: false };
        render('Both start knowing nothing. Press Play to race them.');
      },
      step: function () {
        if (!st.lfound) {
          st.lpos += 1; st.li += 1;
          if (values[st.lpos] === st.target) st.lfound = true;
        }
        if (!st.bfound) {
          if (st.mid >= 0) {
            if (values[st.mid] < st.target) st.lo = st.mid + 1; else st.hi = st.mid - 1;
          }
          st.mid = Math.floor((st.lo + st.hi) / 2);
          st.bsteps += 1;
          if (values[st.mid] === st.target) st.bfound = true;
        }
        var message;
        if (st.bfound && st.lfound) {
          message = 'Halving found it in <b>' + st.bsteps + '</b> steps, reading in order took <b>' + st.li + '</b>. For a list of 64, halving never needs more than 7.';
        } else if (st.bfound) {
          message = 'Halving is done in <b>' + st.bsteps + '</b> steps. Reading in order is still going: step ' + st.li + '.';
        } else {
          message = 'Step ' + st.li + '. Halving has ruled out ' + (N - (st.hi - st.lo + 1)) + ' of 64 entries; reading in order has ruled out ' + (st.lpos) + '.';
        }
        render(message);
        return !(st.bfound && st.lfound);
      }
    };
    pick();
    var ctl = stepper(root, ui.controls, demo, 260);
    demo.reset();
  };

  // ---------------------------------------------------------------- drop the clutter
  demos.clutter = function (root) {
    var ui = frame(root, 'Which part of 3n² + 7n + 12 matters?',
      'Each segment is one term\'s share of the total work. Grow n and watch one term take over.');
    var stops = [1, 2, 5, 10, 30, 100, 1e3, 1e4, 1e6];
    var st = { stop: 4 };
    var size = slider('sf-cl-n', 'Input size n', 0, stops.length - 1, st.stop, function (v) { st.stop = v; render(); });
    ui.body.appendChild(size.row);

    var terms = [
      { name: '3n²', color: 'var(--sf-a)', f: function (n) { return 3 * n * n; } },
      { name: '7n', color: 'var(--sf-b)', f: function (n) { return 7 * n; } },
      { name: '12', color: 'var(--sf-c)', f: function () { return 12; } }
    ];
    var segs = terms.map(function (t) { return h('div', { class: 'sf-stack-seg', style: 'background:' + t.color }); });
    ui.body.appendChild(h('div', { class: 'sf-stack' }, segs));
    var rows = terms.map(function (t) {
      var val = h('span', { class: 'sf-num' });
      var pct = h('b', { class: 'sf-num' });
      return { val: val, pct: pct, el: h('li', null, [h('span', { class: 'sf-swatch', style: 'background:' + t.color }), h('span', { class: 'sf-term', text: t.name }), val, pct]) };
    });
    ui.body.appendChild(h('ul', { class: 'sf-terms' }, rows.map(function (r) { return r.el; })));

    function render() {
      var n = stops[st.stop];
      size.out.textContent = commas(n);
      var parts = terms.map(function (t) { return t.f(n); });
      var total = parts.reduce(function (a, b) { return a + b; }, 0);
      parts.forEach(function (p, i) {
        var share = p / total * 100;
        segs[i].style.width = share + '%';
        rows[i].val.textContent = commas(p);
        rows[i].pct.textContent = (share < 0.1 && share > 0 ? '< 0.1' : share.toFixed(share < 10 ? 1 : 0)) + '%';
      });
      var top = parts.indexOf(Math.max.apply(null, parts));
      var share = parts[0] / total * 100;
      ui.status.innerHTML = top === 0
        ? 'At n = ' + commas(n) + ', <b>3n² is ' + (share > 99.95 ? 'over 99.9' : share.toFixed(1)) + '%</b> of the work. Keep only it, drop the 3 as well, and you have O(n²).'
        : 'At n = ' + commas(n) + ', <b>' + terms[top].name + '</b> is the biggest term. For inputs this small the clutter really does matter, which is why Big-O only talks about large n.';
    }
    render();
  };

  // ---------------------------------------------------------------- doubling
  demos.doubling = function (root) {
    var ui = frame(root, 'What happens when the input doubles?',
      'The quickest way to feel a complexity class. Press Double and watch what each one does to the work.');
    var LOG2 = Math.log10(2);
    var classes = [
      { name: 'O(1)', cost: function () { return 0; }, says: 'no change' },
      { name: 'O(log n)', cost: function (k) { return Math.log10(k); }, says: 'one more step' },
      { name: 'O(n)', cost: function (k) { return k * LOG2; }, says: '×2' },
      { name: 'O(n log n)', cost: function (k) { return k * LOG2 + Math.log10(k); }, says: 'a bit over ×2' },
      { name: 'O(n²)', cost: function (k) { return 2 * k * LOG2; }, says: '×4' },
      { name: 'O(2ⁿ)', cost: function (k) { return Math.pow(2, k) * LOG2; }, says: 'squared' }
    ];
    var MAXLOG = 18;
    var st;

    var rows = classes.map(function (c) {
      var fill = h('div', { class: 'sf-fill' });
      var value = h('div', { class: 'sf-verdict sf-num' });
      var row = h('div', { class: 'sf-budget-row' }, [
        h('div', { class: 'sf-budget-name', text: c.name }),
        h('div', { class: 'sf-track' }, [fill]),
        value
      ]);
      return { c: c, fill: fill, value: value, row: row };
    });
    var nOut = h('b', { class: 'sf-num' });
    ui.body.appendChild(h('p', { class: 'sf-rowlabel' }, ['n = ', nOut]));
    ui.body.appendChild(h('div', { class: 'sf-budget-rows' }, rows.map(function (r) { return r.row; })));
    ui.body.appendChild(h('p', { class: 'sf-note', text: 'Steps on a log scale. A bar that runs off the end has passed 10¹⁸, a billion billion.' }));

    function render(changed) {
      var k = st.k;
      nOut.innerHTML = k <= 20 ? commas(Math.pow(2, k)) : '2<sup>' + k + '</sup>';
      rows.forEach(function (r) {
        var cost = r.c.cost(k);
        var w = Math.min(cost, MAXLOG) / MAXLOG * 100;
        r.fill.style.width = Math.max(w, 1) + '%';
        r.fill.className = 'sf-fill ' + (cost <= 8 ? 'is-good' : cost <= 12 ? 'is-warn' : 'is-bad');
        var shown = cost > 300 ? 'more than 10<sup>300</sup>' : big(cost);
        r.value.innerHTML = shown + (cost < 0.01 ? ' step' : ' steps') + (changed ? '<small>' + r.c.says + '</small>' : '');
      });
    }

    var demo = {
      reset: function () {
        st = { k: 3 };
        render(false);
        ui.status.innerHTML = 'Start with n = 8. Every class is cheap at this size.';
      },
      step: function () {
        st.k += 1;
        render(true);
        var msg = 'n doubled to ' + nOut.innerHTML + '. O(n²) grew ×4. ';
        if (st.k < 6) msg += 'O(2ⁿ) squared itself, and it is already the most expensive line.';
        else if (st.k < 9) msg += 'O(2ⁿ) squared itself again: it is now off the chart.';
        else msg += 'O(log n) went up by one step, as it does every single time.';
        ui.status.innerHTML = msg;
        return st.k < 20;
      }
    };
    var ctl = stepper(root, ui.controls, demo, 1100);
    ui.controls.firstChild.nextSibling.textContent = 'Double n';
    demo.reset();
  };

  // ---------------------------------------------------------------- formal definition
  demos.bigodef = function (root) {
    var ui = frame(root, 'Find the c and n₀ that prove f(n) = O(n²)',
      'f(n) = 3n² + 7n + 12. The definition asks for a multiplier c and a starting point n₀ after which c·n² stays on top for good.');
    var st = { c: 8, n0: 6 };                 // c stored in halves
    var cs = slider('sf-def-c', 'Multiplier c', 2, 12, st.c, function (v) { st.c = v; render(); });
    var ns = slider('sf-def-n0', 'Start n₀', 0, 20, st.n0, function (v) { st.n0 = v; render(); });
    ui.body.appendChild(cs.row);
    ui.body.appendChild(ns.row);

    var W = Math.max(300, Math.min(600, (root.clientWidth || 600) - 36)), H = W < 460 ? 250 : 300, L = 44, R = 14, T = 14, B = 34;
    var XMAX = 20, YMAX = 2000;
    function x(n) { return L + n / XMAX * (W - L - R); }
    function y(v) { return T + (1 - Math.min(v, YMAX) / YMAX) * (H - T - B); }
    function f(n) { return 3 * n * n + 7 * n + 12; }

    var plot = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'sf-plot', role: 'img', 'aria-label': 'Plot of f(n) and c times n squared for n from 0 to 20' });
    var grid = svg('g', { class: 'sf-plot-grid' });
    [0, 500, 1000, 1500, 2000].forEach(function (v) {
      grid.appendChild(svg('line', { x1: L, x2: W - R, y1: y(v), y2: y(v) }));
      grid.appendChild(svg('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end', text: commas(v) }));
    });
    (W < 460 ? [0, 10, 20] : [0, 5, 10, 15, 20]).forEach(function (n) {
      grid.appendChild(svg('text', { x: x(n), y: H - B + 18, 'text-anchor': 'middle', text: String(n) }));
    });
    grid.appendChild(svg('text', { x: W - R, y: H - 4, 'text-anchor': 'end', text: 'n' }));
    var ignored = svg('rect', { class: 'sf-plot-ignored', y: T, height: H - T - B, x: L });
    var ignoredLabel = svg('text', { class: 'sf-plot-label', y: T + 16, text: 'ignored' });
    var cg = svg('path', { class: 'sf-plot-line', stroke: 'var(--sf-b)' });
    var fl = svg('path', { class: 'sf-plot-line', stroke: 'var(--sf-a)' });
    var bad = svg('g');
    var cgLabel = svg('text', { class: 'sf-plot-label sf-plot-series', fill: 'var(--sf-b)' });
    var fLabel = svg('text', { class: 'sf-plot-label sf-plot-series', fill: 'var(--sf-a)', text: 'f(n)' });
    var hoverLine = svg('line', { class: 'sf-plot-hover', y1: T, y2: H - B, visibility: 'hidden' });
    var hit = svg('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent' });
    [grid, ignored, ignoredLabel, cg, fl, bad, cgLabel, fLabel, hoverLine, hit].forEach(function (n) { plot.appendChild(n); });

    var tip = h('div', { class: 'sf-tip', hidden: true });
    ui.body.appendChild(h('div', { class: 'sf-plot-wrap' }, [plot, tip]));
    ui.body.appendChild(legend([
      ['var(--sf-a)', 'f(n) = 3n² + 7n + 12'],
      ['var(--sf-b)', 'c · n²'],
      ['var(--sf-bad)', 'a point where the definition fails']
    ]));

    function path(fn) {
      var d = '';
      for (var n = 0; n <= XMAX; n += 0.25) d += (d ? 'L' : 'M') + x(n).toFixed(1) + ' ' + y(fn(n)).toFixed(1);
      return d;
    }

    function render() {
      var c = st.c / 2, n0 = st.n0;
      cs.out.textContent = String(c);
      ns.out.textContent = String(n0);
      fl.setAttribute('d', path(f));
      cg.setAttribute('d', path(function (n) { return c * n * n; }));
      ignored.setAttribute('width', x(n0) - L);
      ignoredLabel.setAttribute('x', L + 6);
      ignoredLabel.style.visibility = n0 >= 3 ? '' : 'hidden';
      var end = Math.min(XMAX, Math.sqrt(YMAX / c) * 0.98);
      cgLabel.textContent = c + '·n²';
      cgLabel.setAttribute('x', x(end) - 6);
      cgLabel.setAttribute('y', y(c * end * end) - 6);
      cgLabel.setAttribute('text-anchor', 'end');
      var fEnd = Math.min(XMAX, 25.3);
      fLabel.setAttribute('x', x(fEnd) - 4);
      fLabel.setAttribute('y', y(f(fEnd)) + 22);
      fLabel.setAttribute('text-anchor', 'end');

      bad.textContent = '';
      var fails = [];
      for (var n = Math.max(n0, 1); n <= XMAX; n++) {
        if (f(n) > c * n * n) {
          fails.push(n);
          bad.appendChild(svg('circle', { cx: x(n), cy: y(f(n)), r: 4.5, class: 'sf-plot-bad' }));
        }
      }
      // where does c·n² overtake f for good?
      var a = c - 3;
      var cross = a > 0 ? (7 + Math.sqrt(49 + 48 * a)) / (2 * a) : Infinity;
      var need = Math.ceil(cross);
      if (a <= 0) {
        ui.status.innerHTML = 'With c = ' + c + ', <b>no n₀ works</b>: f(n) is 3n² plus more, so it always stays above ' + c + 'n². c has to be bigger than 3.';
      } else if (!fails.length) {
        ui.status.innerHTML = '<b>Proved.</b> From n₀ = ' + n0 + ' on, f(n) never rises above ' + c + '·n² again' +
          (n0 > need ? ', and n₀ could be as small as ' + need + '.' : '.') + ' So f(n) = O(n²).';
      } else {
        ui.status.innerHTML = 'Not yet: f(n) is above ' + c + '·n² at n = ' + fails.slice(0, 4).join(', ') + (fails.length > 4 ? ', ...' : '') +
          '. With c = ' + c + ' you need n₀ of at least <b>' + need + '</b>' + (need > XMAX ? ', beyond this chart' : '') + '.';
      }
    }

    function hover(evt) {
      var box = plot.getBoundingClientRect();
      var px = (evt.clientX - box.left) / box.width * W;
      var n = Math.round(Math.max(0, Math.min(XMAX, (px - L) / (W - L - R) * XMAX)));
      var c = st.c / 2;
      hoverLine.setAttribute('x1', x(n)); hoverLine.setAttribute('x2', x(n));
      hoverLine.setAttribute('visibility', 'visible');
      tip.hidden = false;
      tip.innerHTML = '<b>n = ' + n + '</b><br>f(n) = ' + commas(f(n)) + '<br>' + c + '·n² = ' + commas(c * n * n) +
        (n < st.n0 ? '<br><i>before n₀, ignored</i>' : (f(n) > c * n * n ? '<br><i>f is on top: fails</i>' : '<br><i>c·n² on top: fine</i>'));
      var left = x(n) / W * box.width;
      tip.style.left = Math.min(Math.max(left + 12, 0), box.width - 150) + 'px';
    }
    hit.addEventListener('pointermove', hover);
    hit.addEventListener('pointerdown', hover);
    hit.addEventListener('pointerleave', function () { hoverLine.setAttribute('visibility', 'hidden'); tip.hidden = true; });
    render();
  };

  // ---------------------------------------------------------------- amortized dynamic array
  demos.amortized = function (root) {
    var MAXN = 33;
    var ui = frame(root, 'A growing array: rare expensive steps, cheap on average',
      'When the array is full it moves into a new one twice the size, copying everything across. Most pushes cost 1. A few cost a lot.');
    var st;
    var cells = h('div', { class: 'sf-cells sf-cells-wrap', style: '--sf-n:16' });
    var cap = h('b', { class: 'sf-num' });
    ui.body.appendChild(h('p', { class: 'sf-rowlabel' }, ['The array (capacity ', cap, ')']));
    ui.body.appendChild(cells);
    var cols = h('div', { class: 'sf-cols', style: '--sf-n:' + MAXN });
    var avgLine = h('div', { class: 'sf-cols-avg' });
    ui.body.appendChild(h('p', { class: 'sf-rowlabel', text: 'Cost of each push, in steps' }));
    ui.body.appendChild(h('div', { class: 'sf-cols-wrap' }, [cols, avgLine]));
    ui.body.appendChild(legend([
      ['var(--sf-a)', 'a cheap push: just write the value'],
      ['var(--sf-b)', 'a push that had to copy everything first'],
      ['var(--sf-c)', 'line: average cost per push so far']
    ]));
    var colEls = [];
    for (var i = 0; i < MAXN; i++) {
      var col = h('div', { class: 'sf-col' });
      colEls.push(col);
      cols.appendChild(col);
    }
    var PEAK = 33;

    function render(message, copied) {
      cap.textContent = String(st.cap);
      cells.textContent = '';
      for (var i = 0; i < st.cap; i++) {
        var cls = 'sf-cell sf-cell-sm';
        if (i < st.n) cls += (i === st.n - 1 ? ' is-b' : (copied && i < st.n - 1 ? ' is-copied' : ' is-a'));
        else cls += ' is-empty';
        cells.appendChild(h('div', { class: cls, text: i < st.n ? String(i + 1) : '' }));
      }
      colEls.forEach(function (col, i) {
        var c = st.costs[i];
        col.style.height = c ? (c / PEAK * 100) + '%' : '0';
        col.className = 'sf-col' + (c > 1 ? ' is-b' : c ? ' is-a' : '');
        col.title = c ? 'push ' + (i + 1) + ': ' + c + (c === 1 ? ' step' : ' steps') : '';
      });
      var avg = st.n ? st.total / st.n : 0;
      avgLine.style.bottom = (avg / PEAK * 100) + '%';
      avgLine.style.visibility = st.n ? '' : 'hidden';
      ui.status.innerHTML = message + (st.n ? ' <span class="sf-num">Total work: <b>' + st.total + '</b> steps for ' + st.n +
        ' pushes, an average of <b>' + avg.toFixed(2) + '</b>. It never goes above 3.</span>' : '');
    }

    var demo = {
      reset: function () {
        st = { n: 0, cap: 1, total: 0, costs: [] };
        render('An empty array with room for one value.');
      },
      step: function () {
        var cost = 1, copied = false, message;
        if (st.n === st.cap) {
          cost += st.n;
          copied = true;
          message = 'Full. Make a new array of size <b>' + (st.cap * 2) + '</b>, copy all ' + st.n + ' values (' + st.n + ' steps), then write: <b>' + cost + ' steps</b>.';
          st.cap *= 2;
        } else {
          message = 'Room available, so the push costs <b>1 step</b>.';
        }
        st.costs.push(cost);
        st.total += cost;
        st.n += 1;
        render(message, copied);
        return st.n < MAXN;
      }
    };
    stepper(root, ui.controls, demo, 420);
    demo.reset();
  };

  // ---------------------------------------------------------------- recursion tree / master theorem
  demos.mastertree = function (root) {
    var ui = frame(root, 'Where does the work go? The recursion tree',
      'T(n) = a·T(n/b) + nᶜ. Each row is one level of the recursion: how many calls it makes, and how much work the whole level does.');
    var presets = [
      { name: 'Merge sort', a: 2, b: 2, c: 1 },
      { name: 'Binary search', a: 1, b: 2, c: 0 },
      { name: 'Karatsuba', a: 3, b: 2, c: 1 },
      { name: 'Strassen', a: 7, b: 2, c: 2 },
      { name: 'Root-heavy', a: 2, b: 4, c: 1 }
    ];
    var LEVELS = 5;
    var MAXDOTS = 32;
    var st = { a: 2, b: 2, c: 1, shown: LEVELS + 1, preset: 0 };

    var pre = choices('', presets.map(function (p) { return p.name; }), function (i) {
      ctl.touch(); st.preset = i; st.a = presets[i].a; st.b = presets[i].b; st.c = presets[i].c; syncSliders(); replay();
    });
    ui.body.appendChild(pre.row);
    var sa = slider('sf-mt-a', 'a, calls each call makes', 1, 8, st.a, function (v) { ctl.touch(); st.a = v; st.preset = -1; showAll(); });
    var sb = slider('sf-mt-b', 'b, how much smaller each is', 2, 4, st.b, function (v) { ctl.touch(); st.b = v; st.preset = -1; showAll(); });
    var sc = slider('sf-mt-c', 'c, each call does nᶜ work', 0, 3, st.c, function (v) { ctl.touch(); st.c = v; st.preset = -1; showAll(); });
    [sa, sb, sc].forEach(function (x) { ui.body.appendChild(x.row); });

    var formula = h('p', { class: 'sf-formula sf-num' });
    ui.body.appendChild(formula);

    // Rows are built once and only updated, so bars glide when anything changes.
    var rows = [];
    var tree = h('div', { class: 'sf-tree' });
    for (var k = 0; k <= LEVELS; k++) {
      var dots = [];
      var dotBox = h('div', { class: 'sf-tree-dots' });
      for (var d = 0; d < MAXDOTS; d++) { var dot = h('span', { class: 'sf-tree-dot' }); dots.push(dot); dotBox.appendChild(dot); }
      var more = h('span', { class: 'sf-tree-more' });
      dotBox.appendChild(more);
      var name = h('b', { text: 'Level ' + k });
      var info = h('small', { class: 'sf-num' });
      var fill = h('div', { class: 'sf-fill' });
      var amount = h('span', { class: 'sf-tree-amount sf-num' });
      var row = h('div', { class: 'sf-tree-row' }, [
        h('div', { class: 'sf-tree-label' }, [name, info]),
        dotBox,
        h('div', { class: 'sf-tree-work' }, [h('div', { class: 'sf-track' }, [fill]), amount])
      ]);
      rows.push({ row: row, dots: dots, more: more, info: info, fill: fill, amount: amount });
      tree.appendChild(row);
    }
    ui.body.appendChild(tree);
    ui.body.appendChild(legend([
      ['var(--sf-muted)', 'one dot per call'],
      ['var(--sf-a)', 'total work done by that level'],
      ['var(--sf-b)', 'the level that does the most']
    ]));

    function syncSliders() { sa.input.value = st.a; sb.input.value = st.b; sc.input.value = st.c; }
    function showAll() { ctl.reset(); st.shown = LEVELS + 1; render(); }
    function replay() { ctl.reset(); ctl.play(); }

    function times(x) {
      if (x >= 1000) return commas(x) + '×';
      if (x >= 10) return Math.round(x) + '×';
      return (+x.toFixed(2)) + '×';
    }

    function render() {
      pre.set(st.preset);
      sa.out.textContent = String(st.a); sb.out.textContent = String(st.b); sc.out.textContent = String(st.c);
      var a = st.a, b = st.b, c = st.c;
      var r = a / Math.pow(b, c);
      var work = c === 0 ? '1' : c === 1 ? 'n' : 'n<sup>' + c + '</sup>';
      formula.innerHTML = 'T(n) = ' + (a === 1 ? '' : a) + 'T(n/' + b + ') + ' + work +
        ' &nbsp;·&nbsp; each level does <b>' + times(r) + '</b> the work of the level above';

      var works = [];
      for (var k = 0; k <= LEVELS; k++) works.push(Math.pow(r, k));
      var maxw = Math.max.apply(null, works);
      rows.forEach(function (row, k) {
        var count = Math.pow(a, k);
        var visible = k < st.shown;
        row.row.classList.toggle('is-hidden', !visible);
        row.dots.forEach(function (dot, i) { dot.style.display = i < Math.min(count, MAXDOTS) ? '' : 'none'; });
        row.more.textContent = count > MAXDOTS ? '+' + commas(count - MAXDOTS) : '';
        row.info.textContent = commas(count) + (count === 1 ? ' call' : ' calls') + ' of size n/' + commas(Math.pow(b, k));
        var top = Math.abs(works[k] - maxw) < 1e-9 * maxw;
        row.fill.className = 'sf-fill' + (top ? ' is-top' : '');
        row.fill.style.width = (visible ? Math.max(works[k] / maxw * 100, 1) : 0) + '%';
        row.amount.innerHTML = visible ? (k === 0 ? work : times(works[k]) + ' ' + work) : '';
      });

      var crit = +(Math.log(a) / Math.log(b)).toFixed(3);
      var verdict;
      if (st.shown === 0) verdict = 'Press Play to build the tree one level at a time, starting from the first call.';
      else if (st.shown <= LEVELS) verdict = 'Level ' + (st.shown - 1) + ': ' + commas(Math.pow(a, st.shown - 1)) + (Math.pow(a, st.shown - 1) === 1 ? ' call doing ' : ' calls, together doing ') + times(works[st.shown - 1]) + ' the root\'s work.';
      else if (Math.abs(r - 1) < 1e-9) verdict = '<b>Every level does the same work</b>, and there are about log n levels, so T(n) = Θ(' + (c === 0 ? '' : c === 1 ? 'n ' : 'n<sup>' + c + '</sup> ') + 'log n). Master Theorem case 2.';
      else if (r < 1) verdict = '<b>The root does the most</b> and each level below does less, so the root\'s work decides it: T(n) = Θ(' + work + '). Case 3.';
      else verdict = '<b>The leaves do the most</b> and each level does more than the last, so the leaves decide it: T(n) = Θ(n<sup>' + crit + '</sup>), where ' + crit + ' = log<sub>' + b + '</sub> ' + a + '. Case 1.';
      ui.status.innerHTML = verdict;
    }

    var ctl = stepper(root, ui.controls, {
      reset: function () { st.shown = 0; render(); },
      step: function () {
        if (st.shown > LEVELS) st.shown = 0;                 // replay from the root
        st.shown += 1; render(); return st.shown <= LEVELS;
      }
    }, 700);
    st.shown = LEVELS + 1;
    render();
  };

  Object.keys(demos).forEach(function (name) { D.register(name, demos[name]); });
})();
