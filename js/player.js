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
        kind: spec.kind, title: spec.title, max: spec.max, cols: spec.cols, noMarks: spec.noMarks, grid: sc.grid || spec.grid,
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
      }
    }, spec.interval || 700);
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

  // Graph: fixed layout, nodes and edges recoloured per frame.
  views.graph = function (stage, spec) {
    var g = spec.graph;
    var W = g.w || 600, H = g.h || 320;
    // On narrow screens the SVG shrinks, so grow nodes and text to stay readable.
    var avail = Math.min(stage.clientWidth || W, 640);
    var k = Math.max(1, Math.min(2.2, W / avail * 0.85));
    var R = (g.r || 18) * k;
    var plot = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'sf-graph', role: 'img', 'aria-label': spec.title });
    var defs = svg('defs');
    var arrow = svg('marker', { id: 'sf-arrow-' + Math.random().toString(36).slice(2), viewBox: '0 0 10 10', refX: 10, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, [svg('path', { d: 'M0 0L10 5L0 10z', style: 'fill: var(--sf-muted)' })]);
    defs.appendChild(arrow);
    plot.appendChild(defs);
    var pos = {};
    g.nodes.forEach(function (nd) { pos[nd.id] = nd; });
    var edgeEls = {}, nodeEls = {};
    var edgeLayer = svg('g'), nodeLayer = svg('g');
    g.edges.forEach(function (e) {
      var a = pos[e.u], b = pos[e.v];
      var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / len, uy = dy / len;
      var line = svg('line', { x1: a.x + ux * R, y1: a.y + uy * R, x2: b.x - ux * (R + (e.dir ? 3 : 0)), y2: b.y - uy * (R + (e.dir ? 3 : 0)), class: 'sf-edge', style: 'stroke-width:' + (2.5 * k) });
      if (e.dir) line.setAttribute('marker-end', 'url(#' + arrow.id + ')');
      var grp = svg('g', { class: 'sf-edge-g' }, [line]);
      if (e.w !== undefined && e.w !== null) {
        var mx = (a.x + b.x) / 2 - uy * 11 * k, my = (a.y + b.y) / 2 + ux * 11 * k;
        grp.appendChild(svg('text', { x: mx, y: my + 4 * k, class: 'sf-edge-w', 'text-anchor': 'middle', style: 'font-size:' + (12 * k) + 'px', text: String(e.w) }));
      }
      edgeLayer.appendChild(grp);
      edgeEls[e.u + '-' + e.v] = line;
      if (!e.dir) edgeEls[e.v + '-' + e.u] = line;
    });
    g.nodes.forEach(function (nd) {
      var circle = svg('circle', { cx: nd.x, cy: nd.y, r: R, class: 'sf-node' });
      var label = svg('text', { x: nd.x, y: nd.y + 5 * k, class: 'sf-node-label', 'text-anchor': 'middle', style: 'font-size:' + (14 * k) + 'px', text: nd.label !== undefined ? nd.label : nd.id });
      // Sub-labels (distances, values) sit to the right of the node, clear of edges going down.
      var sub = nd.sub === 'below'
        ? svg('text', { x: nd.x, y: nd.y + R + 15 * k, class: 'sf-node-sub', 'text-anchor': 'middle', style: 'font-size:' + (12.5 * k) + 'px' })
        : svg('text', { x: nd.x + R + 4 * k, y: nd.y + 4.5 * k, class: 'sf-node-sub', 'text-anchor': 'start', style: 'font-size:' + (12.5 * k) + 'px' });
      var grp = svg('g', { class: 'sf-node-g' }, [circle, label, sub]);
      nodeLayer.appendChild(grp);
      nodeEls[nd.id] = { g: grp, circle: circle, label: label, sub: sub, base: nd.label !== undefined ? nd.label : nd.id };
    });
    plot.appendChild(edgeLayer);
    plot.appendChild(nodeLayer);
    stage.appendChild(h('div', { class: 'sf-graph-wrap' }, [plot]));
    return function (fr) {
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
      });
    };
  };

  // Grid / table, e.g. a DP table.
  views.grid = function (stage, spec) {
    var first = spec.frames[0];
    var R = first.cells.length, C = first.cells[0].length;
    var g = spec.grid || {};
    var table = h('table', { class: 'sf-table' + (g.mono ? ' sf-mono' : '') });
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
    return function (fr) {
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
        var v = fr.cells[r][c];
        var t = fr.cellCls && fr.cellCls[r + ',' + c];
        var td = cells[r][c];
        td.textContent = v === null || v === undefined ? '' : String(v);
        td.style.background = t && TOKENS[t] ? TOKENS[t] : '';
        td.style.color = ink(t);
      }
    };
  };

  D.register('player', function (root) {
    var src = root.getAttribute('data-src');
    root.textContent = 'Loading…';
    fetch(src).then(function (r) { return r.json(); }).then(function (spec) { build(root, spec); }).catch(function (err) {
      root.textContent = 'This animation could not load.';
      if (window.console) console.error('player', src, err);
    });
  });
})();
