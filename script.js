/* ============================================================================
   REDSTONE FAMILY LAWYERS — Master homepage (built on "Contemporary Counsel")
   Vanilla JS only. Every effect is transform/opacity/filter driven, every
   effect has a reduced-motion path, and nothing here gates page content:
   all copy is in the HTML at load and JS only changes how it arrives.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  /* Failsafe: no scripting error may ever leave page copy invisible. If
     anything throws, drop the .js hook so every reveal resolves to its
     final, fully-visible state. */
  window.addEventListener("error", function () { root.classList.remove("js"); });

  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mqFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var reduced = function () { return mqReduce.matches; };

  /* ------------------------------------------------ small shared helpers */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  var rafPending = false;
  var scrollTasks = [];
  function onScrollFrame(fn) { scrollTasks.push(fn); }
  function pumpScroll() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      for (var i = 0; i < scrollTasks.length; i++) scrollTasks[i]();
    });
  }
  window.addEventListener("scroll", pumpScroll, { passive: true });
  window.addEventListener("resize", pumpScroll, { passive: true });

  /* Shared entrance observer — fires once the element is meaningfully in
     view (negative bottom rootMargin, threshold 0), never at first pixel. */
  function makeEntrance(selector, cb) {
    var nodes = $$(selector);
    if (!nodes.length) return;
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("is-in"); if (cb) cb(n); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        if (cb) cb(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -15% 0px", threshold: 0 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ====================================================== 1. STICKY HEADER */
  var header = $("#siteheader");
  var callbarOn = false;

  function headerState() {
    var y = window.pageYOffset || root.scrollTop;
    header.dataset.state = y > 48 ? "scrolled" : "top";
    if (y > 520) { document.body.classList.add("show-totop"); }
    else { document.body.classList.remove("show-totop"); }
  }
  onScrollFrame(headerState);
  headerState();

  /* The click-to-call bar is persistent, not scroll-gated — it simply
     animates in once so it never jumps during first paint. */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      document.body.classList.add("show-callbar");
      callbarOn = true;
    });
  });

  /* ============================================ 2. NAV GLIDING INDICATOR */
  var primenav = $(".primenav");
  var glide = $(".primenav__glide");

  function moveGlide(el) {
    if (!glide || !primenav) return;
    var navBox = primenav.getBoundingClientRect();
    var box = el.getBoundingClientRect();
    glide.style.setProperty("--gx", (box.left - navBox.left) + "px");
    glide.style.setProperty("--gw", box.width);
    primenav.classList.add("is-glowing");
  }
  function hideGlide() { if (primenav) primenav.classList.remove("is-glowing"); }

  if (primenav) {
    $$(".primenav__link", primenav).forEach(function (link) {
      link.addEventListener("mouseenter", function () { moveGlide(link); });
      link.addEventListener("focus", function () { moveGlide(link); });
    });
    primenav.addEventListener("mouseleave", hideGlide);
    primenav.addEventListener("focusout", function (e) {
      if (!primenav.contains(e.relatedTarget)) hideGlide();
    });
  }

  /* =================================================== 3. MEGA MENU PANELS */
  var megaItems = $$(".primenav__item--has-menu");
  var hoverTimer = null;

  function closeAllMega(except) {
    megaItems.forEach(function (item) {
      if (item === except) return;
      item.classList.remove("is-open");
      var t = $(".primenav__trigger", item);
      if (t) t.setAttribute("aria-expanded", "false");
    });
  }
  function openMega(item) {
    closeAllMega(item);
    item.classList.add("is-open");
    $(".primenav__trigger", item).setAttribute("aria-expanded", "true");
  }
  function closeMega(item) {
    item.classList.remove("is-open");
    $(".primenav__trigger", item).setAttribute("aria-expanded", "false");
  }

  megaItems.forEach(function (item) {
    var trigger = $(".primenav__trigger", item);

    trigger.addEventListener("click", function () {
      if (item.classList.contains("is-open")) closeMega(item);
      else openMega(item);
    });

    /* hover-intent: a short delay so the panel never flickers open as the
       cursor merely passes by on its way somewhere else */
    item.addEventListener("mouseenter", function () {
      if (!mqFinePointer.matches) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { openMega(item); }, 110);
    });
    item.addEventListener("mouseleave", function () {
      if (!mqFinePointer.matches) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { closeMega(item); }, 160);
    });
    item.addEventListener("focusout", function (e) {
      if (!item.contains(e.relatedTarget)) closeMega(item);
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var open = document.querySelector(".primenav__item--has-menu.is-open");
    if (open) {
      closeMega(open);
      $(".primenav__trigger", open).focus();
    }
  });
  document.addEventListener("click", function (e) {
    if (!e.target || !e.target.closest) return;
    if (!e.target.closest(".primenav__item--has-menu")) closeAllMega(null);
  });

  /* ------------------------------ 3b. MEGA PANEL CRAFT (glide + preview) */
  $$(".mega").forEach(function (panel) {
    var item = panel.closest(".primenav__item");
    var trigger = item ? $(".primenav__trigger", item) : null;
    var body = $(".mega__body", panel);
    var glideEl = $(".mega__glide", panel);
    var photos = $$(".mega__photos > img, .mega__strip > img", panel);
    var caption = $(".mega__caption", panel);
    var capIdx = caption ? $(".mega__caption-idx", caption) : null;
    var capName = caption ? $(".mega__caption-name", caption) : null;
    var hydrated = false;
    var swapTimer = null;

    /* preview imagery is only fetched the first time the panel is wanted,
       so the menu never costs the page's first load anything */
    function hydrate() {
      if (hydrated) return;
      hydrated = true;
      photos.forEach(function (img) {
        var src = img.getAttribute("data-src");
        if (src) { img.src = src; img.removeAttribute("data-src"); }
      });
    }
    if (item) item.addEventListener("mouseenter", hydrate);
    if (trigger) {
      trigger.addEventListener("focus", hydrate);
      trigger.addEventListener("click", hydrate);
    }

    /* offset geometry, so the rows' cascade-in transform can't skew it */
    function offsetIn(el, ancestor) {
      var x = 0, y = 0;
      while (el && el !== ancestor) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
      return { x: x, y: y };
    }

    function glideTo(link) {
      if (!glideEl || !body) return;
      var o = offsetIn(link, body);
      var t = "translate3d(" + o.x + "px," + o.y + "px,0) scale(" +
        (link.offsetWidth / 100).toFixed(3) + "," + (link.offsetHeight / 100).toFixed(3) + ")";
      if (glideEl.classList.contains("is-on")) { glideEl.style.transform = t; return; }
      /* first arrival: appear in place rather than swooping in from a corner */
      glideEl.style.transition = "none";
      glideEl.style.transform = t;
      void glideEl.offsetWidth;
      glideEl.style.transition = "";
      glideEl.classList.add("is-on");
    }

    function preview(link) {
      var key = link.getAttribute("data-photo");
      if (!key || !photos.length) return;
      photos.forEach(function (img) { img.classList.toggle("is-on", img.getAttribute("data-key") === key); });
      if (!caption) return;
      var idx = $(".mega__idx", link);
      var name = $(".mega__name", link);
      if (capName.textContent === name.textContent) return;
      clearTimeout(swapTimer);
      if (reduced()) { capIdx.textContent = idx.textContent; capName.textContent = name.textContent; return; }
      caption.classList.add("is-swapping");
      swapTimer = setTimeout(function () {
        capIdx.textContent = idx.textContent;
        capName.textContent = name.textContent;
        caption.classList.remove("is-swapping");
      }, 190);
    }

    $$(".mega__link", panel).forEach(function (link) {
      function activate() { glideTo(link); preview(link); }
      link.addEventListener("mouseenter", activate);
      link.addEventListener("focus", activate);
    });
    if (body) body.addEventListener("mouseleave", function () { glideEl && glideEl.classList.remove("is-on"); });
  });

  /* ====================================================== 4. MOBILE SHEET */
  var sheet = $("#mobilesheet");
  var burger = $(".burger");
  var sheetClose = $(".mobilesheet__close");
  var lastFocus = null;

  function setSheet(open) {
    if (!sheet) return;
    sheet.dataset.open = open ? "true" : "false";
    sheet.setAttribute("aria-hidden", open ? "false" : "true");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Close Menu" : "Open Menu");
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      lastFocus = document.activeElement;
      /* stagger the links in once the panel itself has landed */
      $$(".msheet-link, .msheet-sub, .msheet-group", sheet).forEach(function (n, i) {
        n.style.transitionDelay = reduced() ? "0ms" : (120 + i * 22) + "ms";
      });
      setTimeout(function () { sheetClose.focus(); }, 60);
    } else {
      $$(".msheet-link, .msheet-sub, .msheet-group", sheet).forEach(function (n) {
        n.style.transitionDelay = "0ms";
      });
      if (lastFocus) lastFocus.focus();
    }
  }

  if (burger) burger.addEventListener("click", function () {
    setSheet(sheet.dataset.open !== "true");
  });
  if (sheetClose) sheetClose.addEventListener("click", function () { setSheet(false); });

  if (sheet) {
    sheet.addEventListener("click", function (e) {
      var link = e.target.closest("a[href]");
      if (link) setSheet(false);
    });
    document.addEventListener("keydown", function (e) {
      if (sheet.dataset.open !== "true") return;
      if (e.key === "Escape") { setSheet(false); return; }
      if (e.key !== "Tab") return;
      var focusables = $$('a[href], button:not([disabled])', sheet)
        .filter(function (n) { return n.offsetParent !== null; });
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ================================ 5. ENTRANCES (reveals + kinetic lines) */
  makeEntrance("[data-reveal]");
  makeEntrance("[data-lines]:not(.hero__title)");
  makeEntrance(".founder");
  makeEntrance(".spread__media");
  makeEntrance(".statement");
  makeEntrance(".whyus__portrait");
  makeEntrance(".servepanel");
  makeEntrance(".closing");

  /* ordered stagger inside grouped sets */
  [".bento", ".pillars", ".climb__steps", ".towns"].forEach(function (sel) {
    var wrap = $(sel);
    if (!wrap) return;
    $$("[data-reveal]", wrap).forEach(function (n, i) {
      n.style.setProperty("--d", (i * 110) + "ms");
    });
  });

  /* each spread reads as one unit: the slab uncovers, the copy follows it */
  $$(".spread__body").forEach(function (n) { n.style.setProperty("--d", "180ms"); });

  /* ======================================== 6. ROLLING ODOMETER NUMERALS */
  $$(".odo").forEach(function (odo) {
    var value = odo.getAttribute("data-odo") || "";
    var vis = $(".odo__vis", odo);
    if (!vis) return;

    var strips = [];
    for (var i = 0; i < value.length; i++) {
      var ch = value.charAt(i);
      if (ch >= "0" && ch <= "9") {
        var cell = document.createElement("span");
        cell.className = "odo__d";
        var strip = document.createElement("span");
        strip.className = "odo__strip";
        for (var d = 0; d < 10; d++) {
          var s = document.createElement("span");
          s.textContent = String(d);
          strip.appendChild(s);
        }
        cell.appendChild(strip);
        vis.appendChild(cell);
        strips.push({ el: strip, digit: parseInt(ch, 10) });
      } else {
        var sep = document.createElement("span");
        sep.className = "odo__sep";
        sep.textContent = ch;
        vis.appendChild(sep);
      }
    }
    /* "$" sits ahead of the rolling digits, static */
    var dollar = document.createElement("span");
    dollar.className = "odo__sep";
    dollar.textContent = "$";
    vis.insertBefore(dollar, vis.firstChild);

    function settle() {
      strips.forEach(function (s, i) {
        s.el.style.setProperty("--rd", reduced() ? "0ms" : (i * 90) + "ms");
        s.el.style.setProperty("--roll", (-s.digit * 10) + "%");
      });
    }

    if (!("IntersectionObserver" in window) || reduced()) { settle(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        settle();
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -20% 0px", threshold: 0 });
    io.observe(odo);
  });

  /* ================================= 7. SERVICES DOCKET — gliding indicator */
  var docketNav = $(".docketnav");
  if (docketNav) {
    var docketLinks = $$(".docketnav__list a", docketNav);
    var docketGlide = $(".docketnav__glide", docketNav);
    var docketList = $(".docketnav__list", docketNav);

    function markDocket(id) {
      var active = null;
      docketLinks.forEach(function (a) {
        var on = a.getAttribute("data-docket") === id;
        a.classList.toggle("is-current", on);
        if (on) active = a;
      });
      if (active && docketGlide && docketList) {
        docketGlide.style.setProperty("--dy", active.offsetTop + "px");
        docketGlide.style.setProperty("--dh", active.offsetHeight);
      }
      /* phone/tablet chip strip: slide it so the lit chip is always in view */
      if (active && docketList && docketList.scrollWidth > docketList.clientWidth + 2) {
        var lr = docketList.getBoundingClientRect();
        var ar = active.getBoundingClientRect();
        if (ar.left < lr.left + 8 || ar.right > lr.right - 8) {
          docketList.scrollTo({
            left: docketList.scrollLeft + (ar.left - lr.left) - 16,
            behavior: reduced() ? "auto" : "smooth"
          });
        }
      }
    }

    var spreads = $$("[data-spread]");
    if (spreads.length && "IntersectionObserver" in window) {
      var visible = {};
      var spreadIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          visible[e.target.getAttribute("data-spread")] = e.isIntersecting ? e.intersectionRatio : 0;
        });
        var best = null, bestVal = 0;
        Object.keys(visible).forEach(function (k) {
          if (visible[k] > bestVal) { bestVal = visible[k]; best = k; }
        });
        if (best) markDocket(best);
      }, { rootMargin: "-25% 0px -45% 0px", threshold: [0, 0.25, 0.6, 1] });
      spreads.forEach(function (s) { spreadIO.observe(s); });
    }
    markDocket("separation-divorce");
    window.addEventListener("resize", function () {
      var cur = $(".docketnav__list a.is-current", docketNav);
      if (cur) markDocket(cur.getAttribute("data-docket"));
    }, { passive: true });
  }

  /* ================================== 8. PROCESS — THE CLIMB (scrubbed) */
  /* The stepped track is plotted from the plates' real positions, so it
     always runs station to station however the copy wraps. The SVG viewBox
     is sized to the element in CSS pixels, making path units 1:1 with the
     box; the marker is then positioned straight from getPointAtLength. */
  var climb = $("[data-climb]");
  if (climb) {
    var track = $(".climb__track", climb);
    var trackBase = $(".climb__base", climb);
    var trackLine = $(".climb__line", climb);
    var marker = $(".climb__marker", climb);
    var rungs = $$(".rung", climb);
    var plates = rungs.map(function (r) { return $(".rung__plate", r); });
    var climbWide = window.matchMedia("(min-width: 1000px)");
    var trackLen = 0;
    var stops = [];      /* path length at which each station's tread begins */
    var ys = [];         /* each plate's centre line, in the climb's own box */
    var EYE = 0.58;      /* the reader's eye line, as a fraction of the viewport */
    var LEAD = 140;      /* px of scroll over which the line draws in to plate one */
    var TAIL = 180;      /* px of scroll over which it runs out past plate four */

    /* offset geometry ignores transforms, so the rungs' entrance rise and
       the plates' resting scale never skew the plotted track */
    function offsetWithin(el, ancestor) {
      var x = 0, y = 0;
      while (el && el !== ancestor) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
      return { x: x, y: y };
    }

    function plotClimb() {
      if (!climbWide.matches) {
        climb.classList.remove("has-track");
        trackLen = 0;
        return;
      }
      var w = climb.offsetWidth, h = climb.offsetHeight;
      track.setAttribute("viewBox", "0 0 " + w + " " + h);

      /* A true staircase: each tread runs level out of its plate, above that
         step's copy, to the edge of its column; the riser then drops down the
         column gap to the next plate. The line never crosses a word. */
      var d = "", acc = 0, px = 0, py = 0;
      stops = [];
      ys = [];
      plates.forEach(function (p, i) {
        var o = offsetWithin(p, climb);
        var l = o.x;
        var y = o.y + p.offsetHeight / 2;
        var rung = rungs[i];
        var edge = i === plates.length - 1 ? w : offsetWithin(rung, climb).x + rung.offsetWidth;
        if (i === 0) { d = "M0 " + y.toFixed(1); px = 0; py = y; }
        acc += Math.sqrt((l - px) * (l - px) + (y - py) * (y - py));   /* riser */
        d += " L" + l.toFixed(1) + " " + y.toFixed(1);
        stops.push(acc);
        ys.push(y);
        acc += (edge - l);                                              /* tread */
        d += " H" + edge.toFixed(1);
        px = edge; py = y;
      });

      trackBase.setAttribute("d", d);
      trackLine.setAttribute("d", d);
      trackLen = acc;
      trackLine.style.strokeDasharray = trackLen.toFixed(1);
      climb.classList.add("has-track");
      scrubClimb();
    }

    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

    /* Map the eye line (in the climb's own coordinates) to a length along the
       track, station by station: as the eye line travels from plate i's centre
       to plate i+1's, the drawn line covers plate i's tread plus the diagonal
       down to plate i+1. So each plate lights exactly as it crosses the eye
       line, and the marker stays level with where the reader is looking. */
    function lengthAtEye(eyeY) {
      var n = ys.length;
      if (!n) return 0;
      if (eyeY <= ys[0]) return stops[0] * clamp01((eyeY - (ys[0] - LEAD)) / LEAD);
      for (var i = 0; i < n - 1; i++) {
        if (eyeY <= ys[i + 1]) {
          var f = (eyeY - ys[i]) / Math.max(1, ys[i + 1] - ys[i]);
          return stops[i] + f * (stops[i + 1] - stops[i]);
        }
      }
      return stops[n - 1] + (trackLen - stops[n - 1]) * clamp01((eyeY - ys[n - 1]) / TAIL);
    }

    function scrubClimb() {
      var vh = window.innerHeight;
      var r = climb.getBoundingClientRect();
      var eyeY = vh * EYE - r.top;       /* eye line, relative to the climb */

      if (climbWide.matches && trackLen) {
        var at = reduced() ? trackLen : lengthAtEye(eyeY);
        trackLine.style.strokeDashoffset = (trackLen - at).toFixed(1);
        var pt = trackLine.getPointAtLength(at);
        marker.style.transform = "translate3d(" + pt.x.toFixed(1) + "px," + pt.y.toFixed(1) + "px,0)";
        climb.classList.toggle("is-live", at > 0.5 && at < trackLen - 0.5);
        rungs.forEach(function (rg, i) { rg.classList.toggle("is-reached", at >= stops[i] - 1); });
      } else {
        /* phone/tablet rail: fills to the eye line; each rung lights as its
           plate crosses it */
        climb.style.setProperty("--p", (reduced() ? 1 : clamp01(eyeY / Math.max(1, r.height))).toFixed(3));
        rungs.forEach(function (rg) {
          var b = rg.getBoundingClientRect();
          rg.classList.toggle("is-reached", reduced() || b.top + 22 < vh * EYE);
        });
      }
    }

    onScrollFrame(scrubClimb);
    window.addEventListener("resize", plotClimb, { passive: true });
    window.addEventListener("load", plotClimb);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(plotClimb);
    if (climbWide.addEventListener) climbWide.addEventListener("change", plotClimb);
    plotClimb();
    scrubClimb();
  }

  /* ====================================================== 9. PARALLAX DRIFT */
  var parallaxNodes = $$("[data-parallax]");
  var parallaxActive = [];

  if (parallaxNodes.length && "IntersectionObserver" in window) {
    var pIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var el = e.target;
        var idx = parallaxActive.indexOf(el);
        if (e.isIntersecting && idx === -1) parallaxActive.push(el);
        else if (!e.isIntersecting && idx > -1) parallaxActive.splice(idx, 1);
      });
      pumpScroll();
    }, { rootMargin: "20% 0px 20% 0px", threshold: 0 });
    parallaxNodes.forEach(function (n) { pIO.observe(n); });
  }

  onScrollFrame(function () {
    if (reduced() || window.innerWidth < 760) return;
    var vh = window.innerHeight;
    for (var i = 0; i < parallaxActive.length; i++) {
      var el = parallaxActive[i];
      var f = parseFloat(el.getAttribute("data-parallax")) || 0.08;
      var box = el.getBoundingClientRect();
      var centreDelta = (box.top + box.height / 2) - vh / 2;
      var shift = -centreDelta * f;
      el.style.transform = "translate3d(0," + shift.toFixed(2) + "px,0)";
    }
  });

  /* ========================================================== 11. FAQ */
  var accordion = $("[data-accordion]");
  if (accordion) {
    var counter = $("[data-faq-counter]");
    var buttons = $$(".qa__btn", accordion);

    function setCounter(text) {
      if (!counter || counter.textContent === text) return;
      if (reduced()) { counter.textContent = text; return; }
      counter.classList.add("is-swapping");
      setTimeout(function () {
        counter.textContent = text;
        counter.classList.remove("is-swapping");
      }, 200);
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var qa = btn.closest(".qa");
        var isOpen = qa.classList.contains("is-open");

        buttons.forEach(function (b) {
          var item = b.closest(".qa");
          item.classList.remove("is-open");
          b.setAttribute("aria-expanded", "false");
        });

        if (!isOpen) {
          qa.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
          setCounter(btn.getAttribute("data-qa"));
        }
      });
    });

    makeEntrance(".qa");
    $$(".qa", accordion).forEach(function (n, i) {
      n.style.setProperty("--d", (i * 90) + "ms");
    });
  }

  /* ======================================= 12. CURSOR SPOTLIGHT + MAGNETIC */
  if (mqFinePointer.matches) {
    $$("[data-spotlight]").forEach(function (el) {
      var raf = null;
      el.addEventListener("pointermove", function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          var box = el.getBoundingClientRect();
          el.style.setProperty("--sx", (((e.clientX - box.left) / box.width) * 100).toFixed(1) + "%");
          el.style.setProperty("--sy", (((e.clientY - box.top) / box.height) * 100).toFixed(1) + "%");
        });
      });
    });

    if (!reduced()) {
      $$(".btn").forEach(function (btn) {
        var raf = null;
        btn.addEventListener("pointermove", function (e) {
          if (raf) return;
          raf = requestAnimationFrame(function () {
            raf = null;
            var box = btn.getBoundingClientRect();
            var mx = ((e.clientX - box.left) / box.width - 0.5) * 6;
            var my = ((e.clientY - box.top) / box.height - 0.5) * 4;
            btn.style.setProperty("--mx", mx.toFixed(2) + "px");
            btn.style.setProperty("--my", my.toFixed(2) + "px");
          });
        });
        btn.addEventListener("pointerleave", function () {
          btn.style.setProperty("--mx", "0px");
          btn.style.setProperty("--my", "0px");
        });
      });
    }
  }

  /* ================================================== 13. BACK TO TOP */
  var toTop = $("[data-totop]");
  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
      var brand = $(".brand");
      if (brand) brand.focus({ preventScroll: true });
    });
  }

  /* Anchor links inside the page get focus moved to the target for keyboard
     and screen-reader users, since a smooth scroll alone doesn't move focus. */
  document.addEventListener("click", function (e) {
    if (!e.target || !e.target.closest) return;
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href");
    if (!id || id === "#") return;
    var target = document.querySelector(id);
    if (!target) return;
    setTimeout(function () {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }, reduced() ? 0 : 520);
  });

})();
