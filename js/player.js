// Step-through player for recorded algorithm traces.
//
// <div class="sf" data-sf="player" data-src="/data/<post>/<name>.json"></div>
//
// The JSON is produced by running the real algorithm (see tools/demos/), so
// every frame is the algorithm's actual state. Each frame is a full snapshot;
// elements persist between frames so changes animate instead of jumping.
//
// {
//   "title": "...", "sub": "...", "kind": "bars" | "array" | "graph" | "grid",
//   "interval": 700,
//   "legend": [["a", "text"], ...],          tokens: a b c muted good bad
//   "graph": { "w": 600, "h": 300, "nodes": [{ "id", "x", "y", "label" }],
//              "edges": [{ "u", "v", "w", "dir" }] },
//   "grid": { "rowLabels": [...], "colLabels": [...] },
//   "scenarios": [{ "name": "...", "frames": [ frame, ... ] }]   (or "frames" at top level)
// }
// frame: { "caption": "html",
//          "values": [...], "cls": { "i": token }, "marks": { "i": "label" },      bars / array
//          "nodes": { "id": { "cls", "sub" } }, "edges": { "u-v": token },         graph
//          "cells": [[...]], "cellCls": { "r,c": token },                          grid
//          "aux": [{ "label": "Stack", "items": [...], "cls": { "i": token } }],
//          "stats": [["Comparisons", 12], ...] }
(function () {
  'use strict';
  var D = window.AlgoDemos;
  var h = D.h, svg = D.svg, frame = D.frame, stepper = D.stepper;

  // Label colour on a filled token: dark ink, except on grey where the surface colour reads better.
  function ink(t) { return !t || !TOKENS[t] ? '' : t === 'muted' ? 'var(--sf-surface)' : 'var(--sf-ink)'; }

  var TOKENS = { a: 'var(--sf-a)', b: 'var(--sf-b)', c: 'var(--sf-c)', muted: 'var(--sf-muted)', good: 'var(--sf-good)', bad: 'var(--sf-bad)' };

  function build(root, spec) {
    var ui = frame(root, spec.title, spec.sub);
    var scenarios = spec.scenarios || [{ name: '', frames: spec.frames }];
    var st = { s: 0, f: 0 };
    var view;

    if (scenarios.length > 1) {
      var buttons = scenarios.map(function (sc, i) {
        return h('button', { class: 'sf-btn', type: 'button', text: sc.name, onclick: function () { ctl.touch(); st.s = i; mark(); mount(); ctl.reset(); } });
      });
      var mark = function () { buttons.forEach(function (b, i) { b.setAttribute('aria-pressed', i === st.s ? 'true' : 'false'); }); };
      ui.body.appendChild(h('div', { class: 'sf-field' }, [h('label', { text: spec.scenarioLabel || 'Input' })].concat(buttons)));
      mark();
    }

    var stage = h('div', { class: 'sf-stage' });
    var auxBox = h('div', { class: 'sf-aux' });
    var stats = h('div', { class: 'sf-stats sf-num' });
    ui.body.appendChild(stage);
    ui.body.appendChild(auxBox);
    ui.body.appendChild(stats);
    if (spec.legend) {
      ui.body.appendChild(D.legend(spec.legend.map(function (item) { return [TOKENS[item[0]] || item[0], item[1]]; })));
    }

    // A scenario may bring its own graph layout, so each one gets a fresh view.
    function mount() {
      var sc = scenarios[st.s];
      stage.textContent = '';
      view = views[spec.kind](stage, {
        kind: spec.kind, title: spec.title, max: spec.max, cols: spec.cols, noMarks: spec.noMarks, grid: sc.grid || spec.grid, plot: sc.plot || spec.plot,
        graph: sc.graph || spec.graph, frames: sc.frames,
        allFrames: scenarios.map(function (x) { return x.frames; })
      });
    }
    mount();

    function render() {
      var fr = scenarios[st.s].frames[st.f];
      view(fr);
      auxBox.textContent = '';
      (fr.aux || []).forEach(function (row) {
        var chips = h('div', { class: 'sf-chips' });
        (row.items || []).forEach(function (item, i) {
          var t = row.cls && row.cls[i];
          chips.appendChild(h('span', { class: 'sf-chip' + (t ? ' is-tok' : ''), style: t ? '--tok:' + TOKENS[t] : null, text: String(item) }));
        });
        if (!row.items || !row.items.length) chips.appendChild(h('span', { class: 'sf-empty', text: row.empty || 'empty' }));
        auxBox.appendChild(h('div', { class: 'sf-aux-row' }, [h('p', { class: 'sf-rowlabel', text: row.label }), chips]));
      });
      stats.textContent = '';
      (fr.stats || []).forEach(function (kv) {
        stats.appendChild(h('span', null, [kv[0] + ': ', h('b', { text: String(kv[1]) })]));
      });
      ui.status.innerHTML = fr.caption || '';
    }

    var ctl = stepper(root, ui.controls, {
      reset: function () { st.f = 0; render(); },
      step: function () {
        var frames = scenarios[st.s].frames;
        if (st.f >= frames.length - 1) st.f = 0;
        st.f += 1;
        render();
        return st.f < frames.length - 1;
      },
      back: spec.autoplay === false ? function () { if (st.f > 0) { st.f -= 1; render(); } } : null
    }, function () { return scenarios[st.s].interval || spec.interval || 700; }, { autoplay: spec.autoplay !== false });
    render();
  }

  var views = {};

  // Bars: heights are values; positions persist so swaps animate as height changes.
  views.bars = function (stage, spec) {
    var first = spec.frames[0];
    var n = first.values.length;
    var max = spec.max || Math.max.apply(null, spec.allFrames.reduce(function (all, frames) {
      return all.concat(frames[0].values);
    }, []));
    var bars = [], marks = [];
    var wrap = h('div', { class: 'sf-bars', style: '--sf-n:' + n });
    var markRow = h('div', { class: 'sf-cells sf-markrow', style: '--sf-n:' + n });
    for (var i = 0; i < n; i++) {
      bars.push(h('div', { class: 'sf-bar' }));
      marks.push(h('div', { class: 'sf-marker' }));
      wrap.appendChild(bars[i]);
      markRow.appendChild(marks[i]);
    }
    stage.appendChild(wrap);
    stage.appendChild(markRow);
    return function (fr) {
      bars.forEach(function (bar, i) {
        var v = fr.values[i];
        var t = fr.cls && fr.cls[i];
        bar.style.height = (Math.max(v, 0) / max * 100) + '%';
        bar.style.background = t ? TOKENS[t] : '';
        bar.style.color = ink(t);
        bar.textContent = n <= 16 ? String(v) : '';
        marks[i].textContent = (fr.marks && fr.marks[i]) || '';
      });
    };
  };

  // Array cells with optional pointer labels underneath.
  views.array = function (stage, spec) {
    var first = spec.frames[0];
    var n = first.values.length;
    var cols = spec.cols || n;
    var cells = [], marks = [];
    var row = h('div', { class: 'sf-cells', style: '--sf-n:' + cols });
    for (var i = 0; i < n; i++) { cells.push(h('div', { class: 'sf-cell' })); row.appendChild(cells[i]); }
    stage.appendChild(row);
    var markRow = null;
    if (!spec.noMarks) {
      markRow = h('div', { class: 'sf-cells sf-markrow', style: '--sf-n:' + cols });
      for (var j = 0; j < n; j++) { marks.push(h('div', { class: 'sf-marker' })); markRow.appendChild(marks[j]); }
      stage.appendChild(markRow);
    }
    return function (fr) {
      cells.forEach(function (cell, i) {
        var v = fr.values[i];
        var t = fr.cls && fr.cls[i];
        cell.className = 'sf-cell' + (v === null || v === '' ? ' is-empty' : '') + (t === 'gone' ? ' is-gone' : '');
        cell.style.background = t && TOKENS[t] ? TOKENS[t] : '';
        cell.style.color = ink(t);
        cell.textContent = v === null ? '' : String(v);
        if (marks[i]) marks[i].textContent = (fr.marks && fr.marks[i]) || '';
      });
    };
  };

  // Graph: nodes and edges recoloured per frame; nodes may also move (frame.pos).
  views.graph = function (stage, spec) {
    var g = spec.graph;
    var W = g.w || 600, H = g.h || 320;
    // On narrow screens the SVG shrinks, so grow nodes and text to stay readable.
    var avail = Math.min(stage.clientWidth || W, 640);
    var k = Math.max(1, Math.min(2.2, W / avail * 0.85));
    // ...but never so large that neighbouring nodes collide.
    var r0 = g.r || 18, minGap = Infinity;
    g.nodes.forEach(function (a, i) {
      g.nodes.forEach(function (b, j) {
        if (j > i) minGap = Math.min(minGap, Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)));
      });
    });
    if (minGap < Infinity) k = Math.max(1, Math.min(k, minGap * 0.4 / r0));
    var R = (g.r || 18) * k;
    // Enlarged nodes need room at the edges, so pad the canvas by the growth.
    var pad = (g.r || 18) * (k - 1) + 2;
    var plot = svg('svg', { viewBox: (-pad) + ' ' + (-pad) + ' ' + (W + 2 * pad) + ' ' + (H + 2 * pad), class: 'sf-graph', role: 'img', 'aria-label': spec.title });
    var defs = svg('defs');
    var arrow = svg('marker', { id: 'sf-arrow-' + Math.random().toString(36).slice(2), viewBox: '0 0 10 10', refX: 10, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, [svg('path', { d: 'M0 0L10 5L0 10z', style: 'fill: var(--sf-muted)' })]);
    defs.appendChild(arrow);
    plot.appendChild(defs);
    // Node positions can change per frame (frame.pos = { id: [x, y] }); nodes glide between them.
    var base = {}, cur = {};
    g.nodes.forEach(function (nd) { base[nd.id] = [nd.x, nd.y]; cur[nd.id] = [nd.x, nd.y]; });
    var edgeEls = {}, nodeEls = {}, edgeList = [];
    var edgeLayer = svg('g'), nodeLayer = svg('g');
    g.edges.forEach(function (e) {
      var line = svg('line', { class: 'sf-edge', style: 'stroke-width:' + (2.5 * k) });
      if (e.dir) line.setAttribute('marker-end', 'url(#' + arrow.id + ')');
      var grp = svg('g', { class: 'sf-edge-g' }, [line]);
      var wText = null;
      if (e.w !== undefined && e.w !== null) {
        wText = svg('text', { class: 'sf-edge-w', 'text-anchor': 'middle', style: 'font-size:' + (12 * k) + 'px', text: String(e.w) });
        grp.appendChild(wText);
      }
      edgeLayer.appendChild(grp);
      edgeEls[e.u + '-' + e.v] = line;
      if (!e.dir) edgeEls[e.v + '-' + e.u] = line;
      line._w = wText;
      line._base = e.w;
      edgeList.push({ e: e, line: line, w: wText });
    });
    g.nodes.forEach(function (nd) {
      var circle = svg('circle', { r: R, class: 'sf-node' });
      var label = svg('text', { class: 'sf-node-label', 'text-anchor': 'middle', style: 'font-size:' + (14 * k) + 'px', text: nd.label !== undefined ? nd.label : nd.id });
      // Sub-labels (distances, values) sit to the right of the node, clear of edges going down.
      var below = nd.sub === 'below';
      var sub = svg('text', { class: 'sf-node-sub', 'text-anchor': below ? 'middle' : 'start', style: 'font-size:' + (12.5 * k) + 'px' });
      var grp = svg('g', { class: 'sf-node-g' }, [circle, label, sub]);
      nodeLayer.appendChild(grp);
      nodeEls[nd.id] = { g: grp, circle: circle, label: label, sub: sub, below: below, base: nd.label !== undefined ? nd.label : nd.id };
    });
    function place() {
      edgeList.forEach(function (o) {
        var a = cur[o.e.u], b = cur[o.e.v];
        var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
        var ux = dx / len, uy = dy / len, tip = R + (o.e.dir ? 3 : 0);
        o.line.setAttribute('x1', a[0] + ux * R); o.line.setAttribute('y1', a[1] + uy * R);
        o.line.setAttribute('x2', b[0] - ux * tip); o.line.setAttribute('y2', b[1] - uy * tip);
        if (o.w) {
          o.w.setAttribute('x', (a[0] + b[0]) / 2 - uy * 11 * k);
          o.w.setAttribute('y', (a[1] + b[1]) / 2 + ux * 11 * k + 4 * k);
        }
      });
      Object.keys(nodeEls).forEach(function (id) {
        var el = nodeEls[id], p = cur[id];
        el.circle.setAttribute('cx', p[0]); el.circle.setAttribute('cy', p[1]);
        el.label.setAttribute('x', p[0]); el.label.setAttribute('y', p[1] + 5 * k);
        el.sub.setAttribute('x', el.below ? p[0] : p[0] + R + 4 * k);
        el.sub.setAttribute('y', el.below ? p[1] + R + 15 * k : p[1] + 4.5 * k);
      });
    }
    place();
    var anim = null;
    function moveTo(target) {
      var from = {}, moved = false;
      Object.keys(cur).forEach(function (id) {
        from[id] = cur[id].slice();
        if (from[id][0] !== target[id][0] || from[id][1] !== target[id][1]) moved = true;
      });
      // A glide still pending from an earlier frame must not carry on towards stale targets.
      if (anim) { cancelAnimationFrame(anim); anim = null; }
      if (!moved) return;
      var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var t0 = null, D = still ? 0 : 600;
      function step(now) {
        if (t0 === null) t0 = now;
        var t = D ? Math.min(1, (now - t0) / D) : 1;
        var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        Object.keys(cur).forEach(function (id) {
          cur[id] = [from[id][0] + (target[id][0] - from[id][0]) * ease, from[id][1] + (target[id][1] - from[id][1]) * ease];
        });
        place();
        anim = t < 1 ? requestAnimationFrame(step) : null;
      }
      anim = requestAnimationFrame(step);
    }
    plot.appendChild(edgeLayer);
    plot.appendChild(nodeLayer);
    stage.appendChild(h('div', { class: 'sf-graph-wrap' }, [plot]));
    return function (fr) {
      var target = {};
      Object.keys(base).forEach(function (id) { target[id] = (fr.pos && fr.pos[id]) || base[id]; });
      moveTo(target);
      Object.keys(nodeEls).forEach(function (id) {
        var info = (fr.nodes && fr.nodes[id]) || {};
        var el = nodeEls[id];
        el.circle.style.fill = info.cls ? TOKENS[info.cls] : '';
        el.circle.classList.toggle('is-ring', info.ring === true);
        el.label.style.fill = info.cls === 'muted' ? 'var(--sf-surface)' : info.cls ? 'var(--sf-ink)' : '';
        el.sub.textContent = info.sub !== undefined ? String(info.sub) : '';
        el.label.textContent = String(info.label !== undefined ? info.label : el.base);
        el.g.style.opacity = info.hide ? 0 : '';
      });
      var seen = [];
      Object.keys(edgeEls).forEach(function (k) {
        var line = edgeEls[k];
        if (seen.indexOf(line) >= 0) return;
        seen.push(line);
        var t = fr.edges && (fr.edges[k] || fr.edges[k.split('-').reverse().join('-')]);
        line.style.stroke = t && TOKENS[t] ? TOKENS[t] : '';
        line.classList.toggle('is-on', !!t && t !== 'gone' && t !== 'hide');
        line.style.strokeWidth = (line.classList.contains('is-on') ? 4.5 : 2.5) * k;
        line.classList.toggle('is-gone', t === 'gone');
        line.parentNode.style.opacity = t === 'hide' ? 0 : '';
        if (line._w) {
          var lbl = fr.edgeLabels && (fr.edgeLabels[k] !== undefined ? fr.edgeLabels[k] : fr.edgeLabels[k.split('-').reverse().join('-')]);
          line._w.textContent = String(lbl !== undefined ? lbl : line._base);
        }
      });
    };
  };

  // Plot: curves and points on shared axes.
  // spec.plot = { xmin, xmax, ymin, ymax, xlabel, ticks: [..] }
  // frame.curves = [{ tok, pts: [[x, y], ...], dash, w, cap, fill (opacity, for closed shapes) }]; frame.points = [{ x, y, mix, tok, r }]
  //   mix in [0, 1] blends series a (0) into series b (1).
  views.plot = function (stage, spec) {
    var p = spec.plot;
    // match the drawing width to the screen so text and dots keep their size on phones
    var W = Math.max(320, Math.min(600, stage.clientWidth || 600)), H = p.h || 260, L = 40, R = 14, T = 14, B = 30;
    if (p.bare) { L = 8; B = 8; T = 8; }            // no axes: a pure drawing area (geometry demos)
    var gutter = Math.max.apply(null, [0].concat((p.yticks || []).map(function (t) { return t[1].length * 6.5 + 10; })));
    R += gutter;   // y-guide labels sit to the right of the plot
    // equal: one unit is the same length on both axes, so circles stay round and rotations look like rotations
    if (p.equal) H = (W - L - R) * (p.ymax - (p.ymin || 0)) / (p.xmax - p.xmin) + T + B;
    var x = function (v) { return L + (v - p.xmin) / (p.xmax - p.xmin) * (W - L - R); };
    var y = function (v) { return T + (1 - (v - (p.ymin || 0)) / (p.ymax - (p.ymin || 0))) * (H - T - B); };
    var plot = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'sf-plot', role: 'img', 'aria-label': spec.title });
    var grid = svg('g', { class: 'sf-plot-grid' });
    if (!p.bare) grid.appendChild(svg('line', { x1: L, x2: W - R, y1: H - B, y2: H - B }));
    var labelLeft = W - R - (p.xlabel ? p.xlabel.length * 6.5 + 14 : 0);
    (p.ticks || []).forEach(function (t) {
      // a tick is a number, or [position, label]
      var tv = Array.isArray(t) ? t[0] : t, tl = Array.isArray(t) ? t[1] : String(t);
      if (x(tv) > labelLeft) return;   // keep clear of the axis label
      grid.appendChild(svg('text', { x: x(tv), y: H - B + 18, 'text-anchor': 'middle', text: tl }));
    });
    // spec.plot.yticks = [[value, label]]: faint horizontal guides, labelled inside the plot
    (p.yticks || []).forEach(function (t) {
      grid.appendChild(svg('line', { x1: L, x2: W - R, y1: y(t[0]), y2: y(t[0]), class: 'sf-plot-guide' }));
      grid.appendChild(svg('text', { x: W - R + 6, y: y(t[0]) + 4, text: t[1] }));
    });
    if (p.xlabel) grid.appendChild(svg('text', { x: W - R, y: H - 4, 'text-anchor': 'end', text: p.xlabel }));
    plot.appendChild(grid);
    var curveLayer = svg('g'), pointLayer = svg('g');
    plot.appendChild(curveLayer);
    plot.appendChild(pointLayer);
    stage.appendChild(h('div', { class: 'sf-plot-wrap' }, [plot]));
    var curves = [], points = [];
    function color(t) { return TOKENS[t] || t; }
    return function (fr) {
      (fr.curves || []).forEach(function (c, i) {
        if (!curves[i]) { curves[i] = svg('path', { class: 'sf-plot-line' }); curveLayer.appendChild(curves[i]); }
        curves[i].setAttribute('d', c.pts.map(function (pt, j) { return (j ? 'L' : 'M') + x(pt[0]).toFixed(1) + ' ' + y(pt[1]).toFixed(1); }).join(''));
        curves[i].style.stroke = color(c.tok);
        curves[i].style.strokeDasharray = c.dash ? '5 4' : '';
        curves[i].style.strokeWidth = c.w !== undefined ? c.w : '';
        curves[i].style.fill = c.fill ? color(c.tok) : '';
        curves[i].style.fillOpacity = c.fill || '';
        curves[i].style.strokeLinecap = c.cap || '';
        curves[i].style.display = '';
      });
      for (var i = (fr.curves || []).length; i < curves.length; i++) curves[i].style.display = 'none';
      (fr.points || []).forEach(function (pt, k) {
        if (!points[k]) { points[k] = svg('circle', { class: 'sf-plot-pt' }); pointLayer.appendChild(points[k]); }
        var el = points[k];
        el.setAttribute('cx', x(pt.x).toFixed(1));
        el.setAttribute('cy', y(pt.y === undefined ? 0 : pt.y).toFixed(1));
        el.setAttribute('r', pt.r || 5);
        el.style.fill = pt.mix !== undefined
          ? 'color-mix(in oklab, var(--sf-b) ' + Math.round(pt.mix * 100) + '%, var(--sf-a))'
          : color(pt.tok || 'muted');
        el.style.display = '';
      });
      for (var j = (fr.points || []).length; j < points.length; j++) points[j].style.display = 'none';
    };
  };

  // Grid / table, e.g. a DP table.
  views.grid = function (stage, spec) {
    var first = spec.frames[0];
    var R = first.cells.length, C = first.cells[0].length;
    var g = spec.grid || {};
    var table = h('table', { class: 'sf-table' + (g.mono ? ' sf-mono' : '') + (C >= 9 ? ' sf-dense' : '') });
    if (g.colLabels) {
      var hr = h('tr', null, [g.rowLabels ? h('th') : null].concat(g.colLabels.map(function (l) { return h('th', { text: String(l) }); })));
      table.appendChild(h('thead', null, [hr]));
    }
    var body = h('tbody');
    var cells = [];
    for (var r = 0; r < R; r++) {
      var tr = h('tr');
      if (g.rowLabels) tr.appendChild(h('th', { text: String(g.rowLabels[r]) }));
      cells.push([]);
      for (var c = 0; c < C; c++) { var td = h('td'); cells[r].push(td); tr.appendChild(td); }
      body.appendChild(tr);
    }
    table.appendChild(body);
    stage.appendChild(h('div', { class: 'sf-table-wrap' }, [table]));
    // grid.plain = ["r,c", ...]: cells that are labels on the worksheet, not values
    var plain = g.plain || [];
    return function (fr) {
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
        var v = fr.cells[r][c];
        var t = fr.cellCls && fr.cellCls[r + ',' + c];
        var td = cells[r][c];
        var isLabel = plain.indexOf(r + ',' + c) >= 0;
        td.classList.toggle('is-label', isLabel);
        if (isLabel && c > 0) {
          // headings over a matrix float, so a long label doesn't widen its column
          td.textContent = '';
          td.appendChild(h('span', { class: 'sf-float', text: v === null || v === undefined ? '' : String(v) }));
        } else {
          td.textContent = v === null || v === undefined ? '' : String(v);
        }
        // null is a spacer: no cell at all
        td.style.background = v === null ? 'transparent' : (t && TOKENS[t] ? TOKENS[t] : '');
        td.style.color = ink(t);
      }
    };
  };

  // A clickable decision guide: {title, sub, start, nodes: {id: {q, options: [{label, next}]} | {answer, why, link}}}
  function chooser(root, spec) {
    var ui = frame(root, spec.title, spec.sub);
    var trail = [];
    var box = h('div', { class: 'sf-chooser' });
    var crumbs = h('div', { class: 'sf-crumbs' });
    ui.body.appendChild(crumbs);
    ui.body.appendChild(box);
    var back = h('button', { class: 'sf-btn', type: 'button', text: 'Back', onclick: function () { trail.pop(); show(); } });
    var restart = h('button', { class: 'sf-btn', type: 'button', text: 'Start over', onclick: function () { trail = []; show(); } });
    ui.controls.appendChild(back);
    ui.controls.appendChild(restart);

    function show() {
      var id = trail.length ? trail[trail.length - 1].next : spec.start;
      var node = spec.nodes[id];
      box.textContent = '';
      crumbs.textContent = '';
      trail.forEach(function (t) { crumbs.appendChild(h('span', { class: 'sf-chip', text: t.label })); });
      back.disabled = !trail.length;
      restart.disabled = !trail.length;
      if (node.q) {
        box.appendChild(h('p', { class: 'sf-question', text: node.q }));
        var opts = h('div', { class: 'sf-options' });
        node.options.forEach(function (o) {
          opts.appendChild(h('button', { class: 'sf-btn sf-option', type: 'button', text: o.label, onclick: function () { trail.push(o); show(); } }));
        });
        box.appendChild(opts);
        ui.status.textContent = '';
      } else {
        box.appendChild(h('p', { class: 'sf-answer', html: node.answer }));
        ui.status.innerHTML = node.why + (node.link ? ' <a href="' + node.link + '">Read more</a>.' : '');
      }
    }
    show();
  }

  D.register('chooser', function (root) {
    var src = root.getAttribute('data-src');
    root.textContent = 'Loading…';
    fetch(src).then(function (r) { return r.json(); }).then(function (spec) { chooser(root, spec); }).catch(function (err) {
      root.textContent = 'This guide could not load.';
      if (window.console) console.error('chooser', src, err);
    });
  });

  D.register('player', function (root) {
    var src = root.getAttribute('data-src');
    root.textContent = 'Loading…';
    fetch(src).then(function (r) { return r.json(); }).then(function (spec) { build(root, spec); }).catch(function (err) {
      root.textContent = 'This animation could not load.';
      if (window.console) console.error('player', src, err);
    });
  });
})();
