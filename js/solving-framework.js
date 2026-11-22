// Interactive demos for "Solving Any Coding Problem - A Mental Framework".
// Each <div class="sf" data-sf="name"> in the post is replaced by one demo.
(function () {
  'use strict';

  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function h(tag, props, kids) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        var value = props[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'html') node.innerHTML = value;
        else if (key === 'style') node.style.cssText = value;
        else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value === true ? '' : value);
      });
    }
    (kids || []).forEach(function (kid) {
      if (kid) node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return node;
  }

  function frame(root, title, sub) {
    root.textContent = '';
    root.appendChild(h('p', { class: 'sf-title', text: title }));
    if (sub) root.appendChild(h('p', { class: 'sf-sub', text: sub }));
    var body = h('div');
    var controls = h('div', { class: 'sf-controls' });
    var status = h('p', { class: 'sf-status', 'aria-live': 'polite' });
    root.appendChild(body);
    root.appendChild(controls);
    root.appendChild(status);
    return { body: body, controls: controls, status: status };
  }

  function legend(items) {
    return h('ul', { class: 'sf-legend' }, items.map(function (item) {
      return h('li', null, [h('span', { class: 'sf-swatch', style: 'background:' + item[0] }), item[1]]);
    }));
  }

  // Step / Play / Reset. `demo.step()` returns true while more steps remain.
  function stepper(root, slot, demo, interval) {
    var timer = null;
    var finished = false;
    var touched = false;
    var stepBtn = h('button', { class: 'sf-btn', type: 'button', text: 'Step' });
    var playBtn = h('button', { class: 'sf-btn sf-btn-primary', type: 'button', text: 'Play' });
    var resetBtn = h('button', { class: 'sf-btn', type: 'button', text: 'Reset' });
    [playBtn, stepBtn, resetBtn].forEach(function (btn) { slot.appendChild(btn); });

    function sync() {
      stepBtn.disabled = finished;
      playBtn.textContent = timer ? 'Pause' : (finished ? 'Replay' : 'Play');
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      sync();
    }
    function advance() {
      finished = !demo.step();
      if (finished) stop();
      sync();
    }
    function reset() {
      stop();
      finished = false;
      demo.reset();
      sync();
    }
    function play() {
      if (finished) reset();
      advance();
      if (!finished) timer = setInterval(advance, interval);
      sync();
    }

    stepBtn.addEventListener('click', function () { touched = true; stop(); advance(); });
    playBtn.addEventListener('click', function () { touched = true; if (timer) stop(); else play(); });
    resetBtn.addEventListener('click', function () { touched = true; reset(); });

    // Play once when the demo scrolls into view, unless the reader got there first.
    if (!REDUCED && 'IntersectionObserver' in window) {
      var watcher = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        watcher.disconnect();
        if (!touched && !timer && !finished) play();
      }, { threshold: 0.8 });
      watcher.observe(root);
    }

    sync();
    return { reset: reset, touch: function () { touched = true; } };
  }

  function commas(n) { return Math.round(n).toLocaleString('en-US'); }

  function power(log10) {
    if (log10 < 6) return commas(Math.pow(10, log10));
    if (log10 > 30) return 'more than 10<sup>30</sup>';
    var exp = Math.floor(log10);
    var mant = Math.pow(10, log10 - exp);
    if (mant >= 9.95) { mant = 1; exp += 1; }
    return (mant < 1.05 ? '' : mant.toFixed(1) + ' × ') + '10<sup>' + exp + '</sup>';
  }

  function duration(logSeconds) {
    if (logSeconds > 17.6) return 'longer than the age of the universe';
    var s = Math.pow(10, logSeconds);
    function unit(value, name) {
      var shown = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
      return shown + ' ' + name + (shown === 1 ? '' : 's');
    }
    if (s < 0.001) return 'instant';
    if (s < 1) return Math.round(s * 1000) + ' ms';
    if (s < 60) return unit(s, 'second');
    if (s < 3600) return unit(s / 60, 'minute');
    if (s < 86400) return unit(s / 3600, 'hour');
    if (s < 31557600) return unit(s / 86400, 'day');
    var y = s / 31557600;
    if (y < 1000) return unit(y, 'year');
    if (y < 1e6) return unit(y / 1e3, 'thousand year');
    if (y < 1e9) return unit(y / 1e6, 'million year');
    return unit(y / 1e9, 'billion year');
  }

  var demos = {};

  // ---------------------------------------------------------------- budget
  demos.budget = function (root) {
    var ui = frame(root, 'Will it pass?',
      'Pick the size of the input. Each bar is how many steps an idea of that complexity needs.');
    var stops = [5, 10, 15, 20, 25, 30, 50, 100, 500, 1e3, 5e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e12, 1e18];
    var limits = [1, 2, 5];
    var LOG2 = Math.log10(2);
    var SCALE = 18;

    function logFactorial(n) {
      if (n <= 170) {
        var sum = 0;
        for (var i = 2; i <= n; i++) sum += Math.log10(i);
        return sum;
      }
      return (n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n)) / Math.LN10;
    }
    function logLog(L) { return Math.log10(Math.max(1, L / LOG2)); }

    var kinds = [
      { name: 'O(log n)', cost: function (L) { return logLog(L); } },
      { name: 'O(√n)', cost: function (L) { return L / 2; } },
      { name: 'O(n)', cost: function (L) { return L; } },
      { name: 'O(n log n)', cost: function (L) { return L + logLog(L); } },
      { name: 'O(n²)', cost: function (L) { return 2 * L; } },
      { name: 'O(n³)', cost: function (L) { return 3 * L; } },
      { name: 'O(2ⁿ)', cost: function (L, n) { return n * LOG2; } },
      { name: 'O(n!)', cost: function (L, n) { return logFactorial(n); } }
    ];

    var state = { stop: 12, limit: 0 };
    var out = h('output', { for: 'sf-budget-n' });
    var slider = h('input', {
      type: 'range', id: 'sf-budget-n', min: 0, max: stops.length - 1, step: 1, value: state.stop,
      oninput: function () { state.stop = +slider.value; render(); }
    });
    var limitBtns = limits.map(function (seconds, i) {
      return h('button', {
        class: 'sf-btn', type: 'button', text: seconds + ' s',
        onclick: function () { state.limit = i; render(); }
      });
    });

    ui.body.appendChild(h('div', { class: 'sf-field' }, [
      h('label', { for: 'sf-budget-n', text: 'Input size n' }), slider, out
    ]));
    ui.body.appendChild(h('div', { class: 'sf-field' },
      [h('label', { text: 'Time limit' })].concat(limitBtns)));

    var rows = kinds.map(function (kind) {
      var fill = h('div', { class: 'sf-fill' });
      var mark = h('div', { class: 'sf-limit' });
      var verdict = h('div', { class: 'sf-verdict' });
      var row = h('div', { class: 'sf-budget-row' }, [
        h('div', { class: 'sf-budget-name', text: kind.name }),
        h('div', { class: 'sf-track' }, [fill, mark]),
        verdict
      ]);
      return { kind: kind, row: row, fill: fill, mark: mark, verdict: verdict };
    });
    ui.body.appendChild(h('div', { class: 'sf-budget-rows' }, rows.map(function (r) { return r.row; })));

    var limitLabel = h('span');
    ui.body.appendChild(h('div', { class: 'sf-axis' }, [
      h('span'),
      h('div', { class: 'sf-axis-scale' }, [
        h('span', { style: 'left:0', text: '1 step' }), limitLabel,
        h('span', { style: 'left:100%', html: '10<sup>18</sup>' })
      ]),
      h('span')
    ]));
    ui.body.appendChild(h('p', { class: 'sf-note',
      text: 'Bars use a log scale: each equal stretch is 10 times more work. The vertical line is what the time limit allows, at about 100 million simple steps per second.' }));

    function render() {
      var n = stops[state.stop];
      var L = Math.log10(n);
      var seconds = limits[state.limit];
      var budget = 8 + Math.log10(seconds);
      out.innerHTML = n < 1e7 ? commas(n) : '10<sup>' + Math.round(L) + '</sup>';
      slider.setAttribute('aria-valuetext', 'n = ' + (n < 1e7 ? commas(n) : '10 to the power ' + Math.round(L)));
      limitBtns.forEach(function (btn, i) { btn.setAttribute('aria-pressed', i === state.limit ? 'true' : 'false'); });
      limitLabel.style.left = (budget / SCALE * 100) + '%';
      limitLabel.textContent = 'limit';

      var pick = -1;
      var firstSlow = -1;
      rows.forEach(function (r, i) {
        var cost = r.kind.cost(L, n);
        var state_ = cost <= budget ? 'good' : (cost <= budget + 1 ? 'warn' : 'bad');
        if (state_ === 'good') pick = i;
        if (state_ !== 'good' && firstSlow < 0) firstSlow = i;
        r.cost = cost;
        r.fill.className = 'sf-fill is-' + state_;
        r.fill.style.width = (Math.min(Math.max(cost, 0.25), SCALE) / SCALE * 100) + '%';
        r.mark.style.left = (budget / SCALE * 100) + '%';
        var label = state_ === 'good' ? '✓ fits' : (state_ === 'warn' ? '! risky' : '✕ too slow');
        r.verdict.innerHTML = label + '<small class="sf-num">' +
          (cost > 30 ? '' : power(cost) + ' steps, ') + duration(cost - 8) + '</small>';
      });
      rows.forEach(function (r, i) { r.row.classList.toggle('is-pick', i === pick); });

      var size = 'n = ' + out.innerHTML + ' and a ' + seconds + ' second limit';
      if (firstSlow < 0) {
        ui.status.innerHTML = 'With ' + size + ', <b>everything fits, even O(n!)</b>. The intended solution is plain brute force.';
      } else if (pick < 0) {
        ui.status.innerHTML = 'With ' + size + ', nothing on this list fits. Look for a formula.';
      } else {
        ui.status.innerHTML = 'With ' + size + ', <b>' + rows[pick].kind.name + '</b> is the slowest idea that still fits. ' +
          rows[firstSlow].kind.name + ' would take ' + duration(rows[firstSlow].cost - 8) + '.';
      }
    }
    render();
  };

  // ---------------------------------------------------------------- binary search on the answer
  demos.bsearch = function (root) {
    var ui = frame(root, 'Binary search on the answer',
      'Four ropes. Cut them into equal pieces and get at least k pieces. What is the longest piece that works?');
    var ropes = [802, 743, 457, 539];
    var MAX = 802;
    var st;

    var out = h('output', { for: 'sf-bs-k' });
    var slider = h('input', {
      type: 'range', id: 'sf-bs-k', min: 1, max: 40, step: 1, value: 11,
      oninput: function () { ctl.touch(); ctl.reset(); }
    });
    ui.body.appendChild(h('div', { class: 'sf-field' }, [
      h('label', { for: 'sf-bs-k', text: 'Pieces needed, k' }), slider, out
    ]));

    var ropeRows = ropes.map(function (len) {
      var used = h('div', { class: 'sf-rope-used' });
      var bar = h('div', { class: 'sf-rope-bar', style: 'width:' + (len / MAX * 100) + '%' }, [used]);
      var count = h('div', { class: 'sf-rope-count sf-num' });
      return { len: len, used: used, count: count, row: h('div', { class: 'sf-rope' }, [h('div', null, [bar]), count]) };
    });
    ui.body.appendChild(h('div', { class: 'sf-ropes' }, ropeRows.map(function (r) { return r.row; })));

    var live = h('div', { class: 'sf-line-live' });
    var midMark = h('div', { class: 'sf-line-mid' });
    ui.body.appendChild(h('p', { class: 'sf-rowlabel', text: 'Piece lengths still in play' }));
    ui.body.appendChild(h('div', { class: 'sf-line' }, [live, midMark]));
    ui.body.appendChild(h('div', { class: 'sf-line-ends' }, [h('span', { text: '1' }), h('span', { text: String(MAX) })]));
    ui.body.appendChild(legend([
      ['var(--sf-a)', 'pieces cut, and lengths not ruled out yet'],
      ['var(--sf-b)', 'the length being tested']
    ]));

    function pieces(len) {
      return ropes.reduce(function (sum, r) { return sum + Math.floor(r / len); }, 0);
    }

    function render(message) {
      var cut = st.mid;
      out.textContent = String(st.k);
      ropeRows.forEach(function (r) {
        if (!cut) {
          r.used.style.width = '100%';
          r.used.style.background = '';
          r.count.textContent = r.len + ' long';
          return;
        }
        var n = Math.floor(r.len / cut);
        r.used.style.width = (n * cut / r.len * 100) + '%';
        r.used.style.background = (n > 1 && n <= 60)
          ? 'repeating-linear-gradient(90deg, var(--sf-a) 0, var(--sf-a) calc(100% / ' + n + ' - 2px), var(--sf-surface) calc(100% / ' + n + ' - 2px), var(--sf-surface) calc(100% / ' + n + '))'
          : '';
        r.count.textContent = n + (n === 1 ? ' piece' : ' pieces');
      });
      live.style.left = ((st.lo - 1) / (MAX - 1) * 100) + '%';
      live.style.width = ((st.hi - st.lo) / (MAX - 1) * 100) + '%';
      live.style.minWidth = '4px';
      midMark.style.display = cut ? '' : 'none';
      if (cut) midMark.style.left = ((cut - 1) / (MAX - 1) * 100) + '%';
      ui.status.innerHTML = message;
    }

    var demo = {
      reset: function () {
        st = { k: +slider.value, lo: 1, hi: MAX, mid: 0, checks: 0 };
        render('Any length from 1 to ' + MAX + ' could be the answer. Each check asks one yes or no question: ' +
          'can I get <b>' + st.k + '</b> pieces of this length?');
      },
      step: function () {
        var mid = Math.floor((st.lo + st.hi + 1) / 2);
        var got = pieces(mid);
        var ok = got >= st.k;
        var before = st.lo + ' to ' + st.hi;
        if (ok) st.lo = mid; else st.hi = mid - 1;
        st.mid = mid;
        st.checks += 1;
        var parts = ropes.map(function (r) { return Math.floor(r / mid); }).join(' + ');
        var message = 'Check ' + st.checks + ': length <b>' + mid + '</b> gives ' + parts + ' = ' + got + ' pieces. ' +
          (ok ? 'Enough, so every shorter length works too. Keep ' + mid + ' and look higher.'
              : 'Too few, so every longer length fails too. Throw away ' + mid + ' and above.') +
          ' Range was ' + before + ', now ' + st.lo + ' to ' + st.hi + '.';
        if (st.lo >= st.hi) {
          st.mid = st.lo;
          render(message);
          ui.status.innerHTML = 'Answer: <b>' + st.lo + '</b>, found with ' + st.checks +
            ' checks. Trying every length one by one would have taken ' + MAX + '.';
          return false;
        }
        render(message);
        return true;
      }
    };
    var ctl = stepper(root, ui.controls, demo, 1300);
    demo.reset();
  };

  // ---------------------------------------------------------------- sliding window
  demos.window = function (root) {
    var a = [4, 2, 1, 7, 3, 1, 2, 6, 1, 1, 3, 5];
    var LIMIT = 10;
    var n = a.length;
    var ui = frame(root, 'Two pointers: a window that only moves forward',
      'Find the longest run of neighbouring numbers whose sum is at most ' + LIMIT + '.');
    var st;

    var cells = a.map(function (v) { return h('div', { class: 'sf-cell', text: String(v) }); });
    var cellRow = h('div', { class: 'sf-cells', style: '--sf-n:' + n }, cells);
    var leftMark = h('div', { class: 'sf-marker', text: '▲ left' });
    var rightMark = h('div', { class: 'sf-marker', text: '▲ right' });
    ui.body.appendChild(cellRow);
    ui.body.appendChild(h('div', { class: 'sf-cells', style: '--sf-n:' + n }, [leftMark]));
    ui.body.appendChild(h('div', { class: 'sf-cells', style: '--sf-n:' + n }, [rightMark]));
    ui.body.appendChild(legend([
      ['var(--sf-a)', 'inside the window'],
      ['var(--sf-b)', 'window is over the limit'],
      ['var(--sf-c)', 'outline: best window so far']
    ]));

    function render(message) {
      var over = st.sum > LIMIT;
      cells.forEach(function (cell, i) {
        var inside = i >= st.l && i <= st.r;
        cell.className = 'sf-cell' + (inside ? (over ? ' is-b' : ' is-a') : '') +
          (st.best > 0 && i >= st.bestL && i < st.bestL + st.best ? ' is-best' : '');
      });
      leftMark.style.gridColumn = String(Math.min(st.l, n - 1) + 1);
      rightMark.style.gridColumn = String(Math.max(st.r, 0) + 1);
      rightMark.style.visibility = st.r < 0 ? 'hidden' : '';
      ui.status.innerHTML = message + ' <span class="sf-num">Pointer moves so far: <b>' + st.moves +
        '</b> (never more than ' + (2 * n) + '). Checking every window would mean ' + (n * (n + 1) / 2) + '.</span>';
    }

    var demo = {
      reset: function () {
        st = { l: 0, r: -1, sum: 0, best: 0, bestL: 0, moves: 0 };
        render('The window starts empty.');
      },
      step: function () {
        var message;
        if (st.sum > LIMIT) {
          st.sum -= a[st.l];
          message = 'Sum is over ' + LIMIT + ', so drop ' + a[st.l] + ' from the left. Sum is now <b>' + st.sum + '</b>.';
          st.l += 1;
        } else {
          st.r += 1;
          st.sum += a[st.r];
          message = 'Take ' + a[st.r] + ' on the right. Sum is now <b>' + st.sum + '</b>' +
            (st.sum > LIMIT ? ', which is too much.' : '.');
        }
        st.moves += 1;
        if (st.sum <= LIMIT && st.r - st.l + 1 > st.best) {
          st.best = st.r - st.l + 1;
          st.bestL = st.l;
          message += ' New best length: <b>' + st.best + '</b>.';
        }
        var more = !(st.sum <= LIMIT && st.r === n - 1);
        if (!more) message = 'Done. The longest window has length <b>' + st.best + '</b>. Neither pointer ever stepped backwards.';
        render(message);
        return more;
      }
    };
    stepper(root, ui.controls, demo, 700);
    demo.reset();
  };

  // ---------------------------------------------------------------- prefix sums + hash map
  demos.prefix = function (root) {
    var a = [3, 4, -7, 1, 3, 3, 1, -4];
    var K = 7;
    var n = a.length;
    var ui = frame(root, 'Prefix sums and a hash map',
      'Count the runs of neighbouring numbers that add up to exactly ' + K + '.');
    var st;

    var cells = a.map(function (v) { return h('div', { class: 'sf-cell', text: String(v) }); });
    var sums = a.map(function () { return h('div', { class: 'sf-cell is-empty' }); });
    var spans = h('div');
    var chips = h('div', { class: 'sf-chips' });
    ui.body.appendChild(h('p', { class: 'sf-rowlabel', text: 'The array' }));
    ui.body.appendChild(h('div', { class: 'sf-cells', style: '--sf-n:' + n }, cells));
    ui.body.appendChild(spans);
    ui.body.appendChild(h('p', { class: 'sf-rowlabel', text: 'Running total up to and including each position' }));
    ui.body.appendChild(h('div', { class: 'sf-cells', style: '--sf-n:' + n }, sums));
    ui.body.appendChild(h('p', { class: 'sf-rowlabel', text: 'Running totals seen so far (value, times seen)' }));
    ui.body.appendChild(chips);
    ui.body.appendChild(legend([
      ['var(--sf-b)', 'position being read'],
      ['var(--sf-a)', 'the earlier total it needs, and the runs that match']
    ]));

    function render(message, need, found) {
      cells.forEach(function (cell, i) { cell.className = 'sf-cell' + (i === st.i ? ' is-b' : ''); });
      sums.forEach(function (cell, i) {
        cell.className = 'sf-cell' + (i <= st.i ? (i === st.i ? '' : ' is-dim') : ' is-empty');
        cell.textContent = i <= st.i ? String(st.totals[i]) : '';
      });
      spans.textContent = '';
      (found || []).forEach(function (start) {
        spans.appendChild(h('div', { class: 'sf-cells', style: '--sf-n:' + n }, [
          h('div', { class: 'sf-span', style: 'grid-column:' + (start + 1) + ' / ' + (st.i + 2) })
        ]));
      });
      chips.textContent = '';
      st.order.forEach(function (value) {
        chips.appendChild(h('span', {
          class: 'sf-chip' + (value === need ? ' is-a' : '') + (value === st.added ? ' is-new' : ''),
          text: value + ' × ' + st.seen[value].length
        }));
      });
      ui.status.innerHTML = message + ' <span class="sf-num">Count so far: <b>' + st.count + '</b>.</span>';
    }

    var demo = {
      reset: function () {
        st = { i: -1, total: 0, totals: [], seen: { 0: [0] }, order: [0], count: 0, added: null };
        render('Before reading anything the running total is 0, so 0 goes in the map once.', null, []);
      },
      step: function () {
        st.i += 1;
        st.total += a[st.i];
        st.totals.push(st.total);
        var need = st.total - K;
        var found = st.seen[need] || [];
        st.count += found.length;
        var message = 'Running total is <b>' + st.total + '</b>. A run ending here sums to ' + K +
          ' only if it starts right after a total of ' + st.total + ' - ' + K + ' = <b>' + need + '</b>. ' +
          (found.length
            ? 'That total was seen ' + found.length + (found.length === 1 ? ' time' : ' times') + ', so ' +
              found.length + (found.length === 1 ? ' run ends' : ' runs end') + ' here.'
            : 'Never seen, so no run ends here.');
        if (!st.seen[st.total]) { st.seen[st.total] = []; st.order.push(st.total); }
        st.seen[st.total].push(st.i + 1);
        st.added = st.total;
        var more = st.i < n - 1;
        if (!more) message += ' Done in one pass.';
        render(message, need, found);
        return more;
      }
    };
    stepper(root, ui.controls, demo, 1500);
    demo.reset();
  };

  // ---------------------------------------------------------------- BFS wave
  demos.bfs = function (root) {
    var ROWS = 7, COLS = 11;
    var START = 3 * COLS + 1, GOAL = 3 * COLS + 9;
    var ui = frame(root, 'Breadth-first search: a wave that finds the shortest route',
      'Fewest moves from S to G, one square at a time, no diagonals. Click squares to build or remove walls.');
    var walls = {};
    var st;
    [1, 2, 3, 4, 5].forEach(function (r) { walls[r * COLS + 5] = true; });

    var cells = [];
    for (var i = 0; i < ROWS * COLS; i++) {
      (function (id) {
        cells.push(h('button', {
          class: 'sf-gcell', type: 'button',
          onclick: function () {
            if (id === START || id === GOAL) return;
            if (walls[id]) delete walls[id]; else walls[id] = true;
            ctl.touch();
            ctl.reset();
          }
        }));
      })(i);
    }
    ui.body.appendChild(h('div', { class: 'sf-grid', style: '--sf-n:' + COLS }, cells));
    ui.body.appendChild(legend([
      ['var(--sf-b)', 'the wave front'],
      ['var(--sf-a)', 'already reached (number = moves from S)'],
      ['var(--sf-muted)', 'wall'],
      ['var(--sf-c)', 'shortest route']
    ]));

    function neighbours(id) {
      var r = Math.floor(id / COLS), c = id % COLS, out = [];
      if (r > 0) out.push(id - COLS);
      if (r < ROWS - 1) out.push(id + COLS);
      if (c > 0) out.push(id - 1);
      if (c < COLS - 1) out.push(id + 1);
      return out;
    }

    function render(message) {
      cells.forEach(function (cell, id) {
        var d = st.dist[id];
        var cls = 'sf-gcell';
        var text = '';
        var name = 'row ' + (Math.floor(id / COLS) + 1) + ', column ' + (id % COLS + 1);
        if (walls[id]) { cls += ' is-wall'; name += ', wall'; }
        else if (d !== undefined) {
          cls += st.front.indexOf(id) >= 0 ? ' is-front' : ' is-seen';
          text = String(d);
          name += ', ' + d + ' moves from start';
        }
        if (st.path[id]) cls += ' is-path';
        if (id === START) { cls += ' is-end'; text = 'S'; name += ', start'; }
        if (id === GOAL) { cls += ' is-end'; if (d === undefined) text = 'G'; name += ', goal'; }
        cell.className = cls;
        cell.textContent = text;
        cell.setAttribute('aria-label', name);
      });
      ui.status.innerHTML = message;
    }

    var demo = {
      reset: function () {
        st = { dist: {}, front: [START], level: 0, path: {}, seen: 1 };
        st.dist[START] = 0;
        render('The wave starts at S. Every step it spreads to all squares exactly one move further out.');
      },
      step: function () {
        var next = [];
        st.front.forEach(function (id) {
          neighbours(id).forEach(function (nb) {
            if (walls[nb] || st.dist[nb] !== undefined) return;
            st.dist[nb] = st.level + 1;
            next.push(nb);
          });
        });
        st.level += 1;
        st.front = next;
        st.seen += next.length;
        if (st.dist[GOAL] !== undefined) {
          var at = GOAL;
          while (at !== START) {
            st.path[at] = true;
            at = neighbours(at).filter(function (nb) { return st.dist[nb] === st.dist[at] - 1; })[0];
          }
          st.path[START] = true;
          st.front = [];
          render('Reached G in <b>' + st.dist[GOAL] + ' moves</b>, and no shorter route can exist: the wave ' +
            'touched every square closer than that first. It looked at ' + st.seen + ' squares, each exactly once.');
          return false;
        }
        if (!next.length) {
          render('The wave has nowhere left to spread and never touched G. <b>No route exists.</b>');
          return false;
        }
        render('Wave ' + st.level + ': all <b>' + next.length + '</b> squares that are exactly ' + st.level +
          (st.level === 1 ? ' move' : ' moves') + ' from S.');
        return true;
      }
    };
    var ctl = stepper(root, ui.controls, demo, 450);
    demo.reset();
  };

  // ---------------------------------------------------------------- DP table
  demos.dp = function (root) {
    var ROWS = 5, COLS = 6;
    var LAST = ROWS * COLS - 1;
    var ui = frame(root, 'Dynamic programming: fill a table once',
      'Count the routes from the top-left square to the bottom-right, moving only right or down. Click squares to block them.');
    var blocked = {};
    var st;

    var cells = [];
    for (var i = 0; i <= LAST; i++) {
      (function (id) {
        cells.push(h('button', {
          class: 'sf-gcell', type: 'button',
          onclick: function () {
            if (id === 0 || id === LAST) return;
            if (blocked[id]) delete blocked[id]; else blocked[id] = true;
            ctl.touch();
            ctl.reset();
          }
        }));
      })(i);
    }
    ui.body.appendChild(h('div', { class: 'sf-grid', style: '--sf-n:' + COLS + ';max-width:22em' }, cells));
    ui.body.appendChild(legend([
      ['var(--sf-b)', 'square being filled'],
      ['var(--sf-a)', 'the two answers it reuses'],
      ['var(--sf-muted)', 'blocked']
    ]));

    // How many calls plain recursion makes for the same answer.
    function naiveCalls() {
      var calls = [];
      for (var id = 0; id <= LAST; id++) {
        var r = Math.floor(id / COLS), c = id % COLS;
        calls[id] = (id === 0 || blocked[id]) ? 1 : 1 + (r > 0 ? calls[id - COLS] : 0) + (c > 0 ? calls[id - 1] : 0);
      }
      return calls[LAST];
    }

    function render(message, sources) {
      cells.forEach(function (cell, id) {
        var cls = 'sf-gcell';
        var text = '';
        var name = 'row ' + (Math.floor(id / COLS) + 1) + ', column ' + (id % COLS + 1);
        if (blocked[id]) { cls += ' is-wall'; name += ', blocked'; }
        else if (id < st.next) {
          text = String(st.val[id]);
          name += ', ' + st.val[id] + ' routes';
          if (id === st.next - 1) cls += ' is-front';
          else if (sources && sources.indexOf(id) >= 0) cls += ' is-seen';
        }
        if (id === 0 || id === LAST) cls += ' is-end';
        cell.className = cls;
        cell.textContent = text;
        cell.setAttribute('aria-label', name);
      });
      ui.status.innerHTML = message;
    }

    var demo = {
      reset: function () {
        st = { next: 0, val: [] };
        render('Every square will hold one number: how many routes reach it. Each number is worked out once and then reused.');
      },
      step: function () {
        var id = st.next;
        var r = Math.floor(id / COLS), c = id % COLS;
        var message, sources = [];
        if (blocked[id]) {
          st.val[id] = 0;
          message = 'Blocked square: <b>0</b> routes go through it.';
        } else if (id === 0) {
          st.val[id] = 1;
          message = 'Base case: there is exactly <b>1</b> way to be at the start, which is to stand there.';
        } else {
          var up = r > 0 ? st.val[id - COLS] : 0;
          var left = c > 0 ? st.val[id - 1] : 0;
          if (r > 0 && !blocked[id - COLS]) sources.push(id - COLS);
          if (c > 0 && !blocked[id - 1]) sources.push(id - 1);
          st.val[id] = up + left;
          message = 'You can only arrive from above or from the left: ' + up + ' + ' + left + ' = <b>' + st.val[id] + '</b>.';
        }
        st.next += 1;
        if (id === LAST) {
          render('Answer: <b>' + commas(st.val[LAST]) + '</b> routes, from filling ' + (LAST + 1) +
            ' squares once each. Plain recursion reaches the same answer in <b>' + commas(naiveCalls()) +
            '</b> calls, because it keeps re-solving squares it has already solved.', sources);
          return false;
        }
        render(message, sources);
        return true;
      }
    };
    var ctl = stepper(root, ui.controls, demo, 260);
    demo.reset();
  };

  // ---------------------------------------------------------------- monotone stack
  demos.stack = function (root) {
    var a = [2, 5, 3, 1, 4, 6, 2];
    var n = a.length;
    var TOP = 6;
    var ui = frame(root, 'Monotone stack: next greater element',
      'For every bar, find the first taller bar to its right.');
    var st;

    var bars = a.map(function (v) {
      return h('div', { class: 'sf-bar', style: 'height:' + (v / TOP * 100) + '%', text: String(v) });
    });
    var answers = a.map(function () { return h('div', { class: 'sf-cell is-empty' }); });
    var chips = h('div', { class: 'sf-chips' });
    ui.body.appendChild(h('div', { class: 'sf-bars', style: '--sf-n:' + n }, bars));
    ui.body.appendChild(h('p', { class: 'sf-rowlabel', text: 'Answer for each bar' }));
    ui.body.appendChild(h('div', { class: 'sf-cells', style: '--sf-n:' + n }, answers));
    ui.body.appendChild(h('p', { class: 'sf-rowlabel', text: 'Stack: bars still waiting for something taller (newest on the right)' }));
    ui.body.appendChild(chips);
    ui.body.appendChild(legend([
      ['var(--sf-b)', 'bar arriving now'],
      ['var(--sf-a)', 'waiting on the stack']
    ]));

    function render(message, current) {
      bars.forEach(function (bar, i) {
        bar.className = 'sf-bar' + (i === current ? ' is-b' : (st.stack.indexOf(i) >= 0 ? ' is-a' : ''));
      });
      answers.forEach(function (cell, i) {
        var known = st.ans[i] !== undefined;
        cell.className = 'sf-cell' + (known ? '' : ' is-empty');
        cell.textContent = known ? String(st.ans[i]) : '';
      });
      chips.textContent = '';
      st.stack.forEach(function (i) { chips.appendChild(h('span', { class: 'sf-chip is-a', text: String(a[i]) })); });
      if (!st.stack.length) chips.appendChild(h('span', { class: 'sf-empty', text: 'empty' }));
      ui.status.innerHTML = message + ' <span class="sf-num">Pushes and pops so far: <b>' + st.ops +
        '</b> (never more than ' + (2 * n) + ').</span>';
    }

    var demo = {
      reset: function () {
        st = { i: 0, stack: [], ans: [], ops: 0 };
        render('Read the bars left to right. The stack remembers the bars that have not met a taller one yet.', -1);
      },
      step: function () {
        if (st.i >= n) {
          st.stack.forEach(function (i) { st.ans[i] = 'none'; });
          st.stack = [];
          render('No bars left to arrive, so whatever is still waiting has nothing taller to its right. Done.', -1);
          return false;
        }
        var top = st.stack[st.stack.length - 1];
        if (st.stack.length && a[top] < a[st.i]) {
          st.stack.pop();
          st.ans[top] = a[st.i];
          st.ops += 1;
          render('<b>' + a[st.i] + '</b> is taller than the waiting ' + a[top] + ', so ' + a[top] +
            ' has its answer and leaves the stack for good.', st.i);
          return true;
        }
        st.stack.push(st.i);
        st.ops += 1;
        var message = (st.stack.length > 1
          ? '<b>' + a[st.i] + '</b> is not taller than the ' + a[top] + ' on top, so it joins the wait.'
          : 'Nothing is waiting, so <b>' + a[st.i] + '</b> starts the wait.');
        st.i += 1;
        render(message, st.i - 1);
        return true;
      }
    };
    stepper(root, ui.controls, demo, 900);
    demo.reset();
  };

  // ---------------------------------------------------------------- recognition map filter
  demos.mapfilter = function (root) {
    var table = root.nextElementSibling;
    while (table && table.tagName !== 'TABLE') table = table.nextElementSibling;
    if (!table) { root.hidden = true; return; }
    var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
    var ui = frame(root, 'Search the map', 'Type a word from your problem, or tap a suggestion.');
    var input = h('input', {
      class: 'sf-filter-input', type: 'search', 'aria-label': 'Filter the recognition map',
      placeholder: 'shortest, subarray, range, count, string ...',
      oninput: function () { apply(); }
    });
    var quick = ['shortest', 'subarray', 'range', 'count', 'string', 'minimum', 'pairs', 'order'].map(function (word) {
      return h('button', {
        class: 'sf-chip sf-chip-btn', type: 'button', text: word,
        onclick: function () { input.value = word; apply(); }
      });
    });
    ui.body.appendChild(input);
    ui.body.appendChild(h('div', { class: 'sf-chips', style: 'margin-top:0.6em' }, quick));

    function apply() {
      var words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
      var shown = 0;
      rows.forEach(function (row) {
        var text = row.textContent.toLowerCase();
        var match = words.every(function (word) { return text.indexOf(word) >= 0; });
        row.hidden = !match;
        if (match) shown += 1;
      });
      ui.status.innerHTML = words.length
        ? (shown ? 'Showing <b>' + shown + '</b> of ' + rows.length + ' patterns.' : 'Nothing matches. Try a shorter word.')
        : 'All ' + rows.length + ' patterns shown.';
    }
    apply();
  };

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll('.sf[data-sf]'), function (root) {
      var demo = demos[root.getAttribute('data-sf')];
      if (!demo) return;
      try { demo(root); } catch (err) { if (window.console) console.error('solving-framework demo failed:', err); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
