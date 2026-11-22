// Shared engine for the interactive demos in the algorithm posts.
// A post lists its demo scripts in front matter (demos: [...]); each script
// registers demos by name, and every <div class="sf" data-sf="name"> on the
// page is replaced by the matching demo.
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
      // Start when most of the demo is visible, or, for a demo taller than the
      // screen, when it fills most of the screen.
      var watcher = new IntersectionObserver(function (entries) {
        var e = entries[0];
        if (!e.isIntersecting) return;
        if (e.intersectionRatio < 0.75 && e.intersectionRect.height < window.innerHeight * 0.6) return;
        watcher.disconnect();
        if (!touched && !timer && !finished) play();
      }, { threshold: [0, 0.2, 0.4, 0.6, 0.75, 1] });
      watcher.observe(root);
    }

    sync();
    return { reset: reset, play: play, touch: function () { touched = true; } };
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


  var registry = {};

  function svg(tag, attrs, kids) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === 'text') node.textContent = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    (kids || []).forEach(function (kid) { if (kid) node.appendChild(kid); });
    return node;
  }

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll('.sf[data-sf]'), function (root) {
      var demo = registry[root.getAttribute('data-sf')];
      if (!demo || root.getAttribute('data-sf-ready')) return;
      root.setAttribute('data-sf-ready', '1');
      try { demo(root); } catch (err) { if (window.console) console.error('demo "' + root.getAttribute('data-sf') + '" failed:', err); }
    });
  }

  window.AlgoDemos = {
    REDUCED: REDUCED,
    h: h, svg: svg, frame: frame, legend: legend, stepper: stepper,
    commas: commas, power: power, duration: duration,
    // A post script can arrive after the page has finished parsing (deferred
    // scripts on a slow connection), so registering also boots any waiting demo.
    register: function (name, fn) {
      registry[name] = fn;
      if (document.readyState !== 'loading') boot();
    }
  };

  document.addEventListener('DOMContentLoaded', boot);
})();
