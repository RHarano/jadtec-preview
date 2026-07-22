/**
 * JADTEC — フロントエンドの最小限のふるまい
 *
 * 方針:
 *  - 過度なアニメーション・自動再生は行わない
 *  - JSが無効でも内容は読める（プログレッシブエンハンスメント）
 *  - キーボード操作・スクリーンリーダーに対応する
 */
(function () {
  'use strict';

  /* ---------------------------------------------------------------
   * 1. ハンバーガーメニュー
   * ------------------------------------------------------------- */
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('global-nav');

  if (burger && nav) {
    var closeNav = function () {
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'メニューを開く');
      nav.classList.remove('is-open');
      document.body.style.overflow = '';
    };

    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      if (open) {
        closeNav();
      } else {
        burger.setAttribute('aria-expanded', 'true');
        burger.setAttribute('aria-label', 'メニューを閉じる');
        nav.classList.add('is-open');
        document.body.style.overflow = 'hidden'; // 背面のスクロールを止める
      }
    });

    // Escape で閉じる。フォーカスはボタンへ戻す。
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        closeNav();
        burger.focus();
      }
    });

    // リンクを踏んだら閉じる
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });

    // デスクトップ幅に戻ったら状態をリセット（開いたままスクロールが固まるのを防ぐ）
    var mq = window.matchMedia('(min-width: 1100px)');
    var onChange = function (e) { if (e.matches) closeNav(); };
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
  }

  /* ---------------------------------------------------------------
   * 2. 製図サンプル — カテゴリー絞り込み
   * ------------------------------------------------------------- */
  var filters = document.querySelectorAll('.filter');
  var gallery = document.getElementById('gallery');

  if (filters.length && gallery) {
    var items = Array.prototype.slice.call(gallery.querySelectorAll('li'));
    var status = document.getElementById('gallery-status');

    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.dataset.filter;

        filters.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });

        var shown = 0;
        items.forEach(function (li) {
          var match = cat === 'all' || li.dataset.category === cat;
          li.hidden = !match;
          if (match) shown++;
        });

        // 絞り込み結果を読み上げる（視覚以外でも結果が分かるように）
        if (status) {
          status.textContent = (cat === 'all' ? 'すべて' : btn.textContent.trim().replace(/^✓\s*/, '')) +
            'のサンプルを ' + shown + ' 件表示しています。';
        }
      });
    });
  }

  /* ---------------------------------------------------------------
   * 3. 図面サンプルの拡大表示（ライトボックス）
   * ------------------------------------------------------------- */
  var lb = document.getElementById('lightbox');

  if (lb) {
    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('.lightbox__cap');
    var lastFocused = null;
    var openList = [];
    var index = 0;

    var render = function () {
      var t = openList[index];
      if (!t) return;
      lbImg.src = t.dataset.full;
      lbImg.alt = t.dataset.alt || '';
      lbImg.hidden = false;
      lbCap.textContent = t.dataset.caption + '（' + (index + 1) + ' / ' + openList.length + '）';
    };

    var open = function (trigger) {
      // 現在表示中（絞り込み後）のサンプルだけを送り先にする
      openList = Array.prototype.slice
        .call(document.querySelectorAll('.shot__btn'))
        .filter(function (b) { return !b.closest('li').hidden; });
      index = openList.indexOf(trigger);
      lastFocused = trigger;
      render();
      lb.setAttribute('open', '');
      document.body.style.overflow = 'hidden';
      lb.querySelector('.lightbox__close').focus();
    };

    var close = function () {
      lb.removeAttribute('open');
      lbImg.hidden = true;
      lbImg.removeAttribute('src');   // src="" にすると再びページ自身を読みに行くため、属性ごと外す
      document.body.style.overflow = '';
      if (lastFocused) lastFocused.focus(); // 元のサムネイルへフォーカスを戻す
    };

    var step = function (d) {
      index = (index + d + openList.length) % openList.length;
      render();
    };

    document.addEventListener('click', function (e) {
      var t = e.target.closest('.shot__btn');
      if (t) { open(t); return; }
      if (e.target.closest('.lightbox__close') || e.target === lb) { close(); return; }
      if (e.target.closest('.lightbox__nav--prev')) { step(-1); return; }
      if (e.target.closest('.lightbox__nav--next')) { step(1); }
    });

    document.addEventListener('keydown', function (e) {
      if (!lb.hasAttribute('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
      // フォーカスをライトボックス内に閉じ込める
      if (e.key === 'Tab') {
        var f = lb.querySelectorAll('button');
        var first = f[0];
        var last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------------------------------------------------------------
   * 4. お問い合わせフォーム — 二重送信の防止
   * ------------------------------------------------------------- */
  document.querySelectorAll('form[data-once]').forEach(function (form) {
    form.addEventListener('submit', function () {
      var btn = form.querySelector('[type="submit"]');
      if (!btn) return;
      // ボタンを無効化する前に、値がPOSTされるよう遅延させる
      setTimeout(function () {
        btn.disabled = true;
        btn.textContent = '送信中…';
      }, 0);
    });
  });

  /* ---------------------------------------------------------------
   * 5. スクロール演出
   *
   * 設計方針（重要）:
   *  - 内容が「見えなくなる」ことは絶対に避ける。演出はあくまで飾り。
   *    IntersectionObserver に頼ると、環境によっては発火せず本文が
   *    opacity:0 のまま残る事故が起こり得る（実際にヘッドレス環境で再現した）。
   *    そのため、スクロール位置を実測して判定する確実な方式にしている。
   *  - さらに安全網として、読み込み後3秒で未表示の要素は強制的に表示する。
   *  - 「動きを減らす」設定では一切動かさない。
   *  - 一度表示した要素は二度と隠さない（再スクロールでチカチカしない）。
   * ------------------------------------------------------------- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var motion = document.documentElement.classList.contains('js-motion') && !reduce.matches;

  var REVEAL_SEL =
    '[data-reveal], .sec-head, .card, .reason, .fields li, .steps li, .shot,' +
    '.flow__item, .stats__item, .tbl, .note, .cta__box, .media__img, .media__body > p';

  var revealAll = function () {
    document.querySelectorAll(REVEAL_SEL).forEach(function (el) { el.classList.add('is-in'); });
    document.querySelectorAll('[data-count]').forEach(function (el) {
      el.firstChild.nodeValue = el.dataset.count;
    });
  };

  if (!motion) {
    // 動きを減らす設定。CSS側でも隠していないが、念のため確実に表示しておく。
    revealAll();
  } else {
    var revealTargets = Array.prototype.slice.call(document.querySelectorAll(REVEAL_SEL));
    var countTargets  = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));

    // 同じ行に並ぶものは少しずつ遅らせて、順に線が引かれていくように見せる
    revealTargets.forEach(function (el) {
      var i = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms');
    });

    var countUp = function (el) {
      var to = parseFloat(el.dataset.count);
      var t0 = null;
      var step = function (now) {
        if (t0 === null) t0 = now;
        var p = Math.min((now - t0) / 1100, 1);
        var eased = 1 - Math.pow(1 - p, 3);        // ease-out — 最後に静かに止まる
        el.firstChild.nodeValue = String(Math.round(to * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    var check = function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;

      revealTargets = revealTargets.filter(function (el) {
        var r = el.getBoundingClientRect();
        // 画面内に少しでも入ったら表示を始める。
        // しきい値を画面下端より上に置くと、「見えているのにまだ透明」という帯ができ、
        // 内容が読めない状態が生まれてしまうため、下端ちょうどで判定する。
        if (r.top < vh && r.bottom > 0) { el.classList.add('is-in'); return false; }
        if (r.bottom <= 0) { el.classList.add('is-in'); return false; }  // 既に通過済み
        return true;                                                      // まだ下にある
      });

      countTargets = countTargets.filter(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) { countUp(el); return false; }
        return true;
      });
    };

    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { check(); ticking = false; });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('load', onScroll);
    check();                                        // 初期表示ぶんを即座に判定

    // 安全網: 何があっても3秒後には全部表示する（内容が読めない事故を絶対に起こさない）
    setTimeout(revealAll, 3000);
  }

  /* ---------------------------------------------------------------
   * 6. ヘッダー（スクロールで引き締める）＋ 読み進み位置のバー
   * ------------------------------------------------------------- */
  var header = document.querySelector('.site-header');
  var bar = document.querySelector('.progress');

  if (header) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY || window.pageYOffset;
        header.classList.toggle('is-stuck', y > 40);
        if (bar && motion) {
          var max = document.documentElement.scrollHeight - window.innerHeight;
          bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------------------------------------------
   * 5-c. ビフォー／アフター 比較スライダー
   *  ドラッグ／スワイプ／矢印キーで境界を動かして2枚を見比べる。
   * ------------------------------------------------------------- */
  document.querySelectorAll('[data-compare]').forEach(function (box) {
    var range = box.querySelector('.compare__range');
    var setPos = function (v) {
      v = Math.max(0, Math.min(100, v));
      box.style.setProperty('--pos', v + '%');
      if (range) range.value = v;
    };
    var fromEvent = function (clientX) {
      var r = box.getBoundingClientRect();
      setPos((clientX - r.left) / r.width * 100);
    };
    var dragging = false;
    box.addEventListener('pointerdown', function (e) {
      dragging = true;
      try { box.setPointerCapture(e.pointerId); } catch (err) {}
      fromEvent(e.clientX); e.preventDefault();
    });
    box.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e.clientX); });
    box.addEventListener('pointerup', function () { dragging = false; });
    box.addEventListener('pointercancel', function () { dragging = false; });
    // マウス非pointer環境のフォールバック
    box.addEventListener('mousedown', function (e) { dragging = true; fromEvent(e.clientX); });
    window.addEventListener('mousemove', function (e) { if (dragging) fromEvent(e.clientX); });
    window.addEventListener('mouseup', function () { dragging = false; });
    // キーボード（隠しrange）
    if (range) range.addEventListener('input', function () { setPos(parseFloat(range.value)); });
  });

  /* ---------------------------------------------------------------
   * 6-a. 360度パノラマ・ビューア（外部ライブラリなし）
   *
   *  equirectangular画像を背景に敷き、ドラッグで背景位置を動かして
   *  「見渡す」体験にする。横は repeat-x で360度シームレスに一周。
   *  JSが動かない場合は <noscript> の通常画像が出るので、内容は必ず見える。
   * ------------------------------------------------------------- */
  document.querySelectorAll('.pano').forEach(function (pano) {
    var url = pano.dataset.pano;
    var fallback = pano.dataset.panoFallback;
    if (!url) return;

    // WebP対応を確認し、ダメなら jpg。読み込めたら背景に設定してドラッグ可能化。
    var img = new Image();
    img.onload = function () { activate(url); };
    img.onerror = function () { if (fallback) { var j = new Image(); j.onload = function(){ activate(fallback); }; j.src = fallback; } };
    img.src = url;

    function activate(src) {
      pano.style.backgroundImage = 'url("' + src + '")';
      pano.classList.add('is-ready');

      var x = 50, y = 50;          // 背景位置（%）。初期は中央。
      pano.style.backgroundPosition = x + '% ' + y + '%';

      var dragging = false, lastX = 0, lastY = 0;

      var apply = function () {
        // 縦は0〜100%でクランプ（上下の端を越えて空白が出ないように）。
        // 横は repeat-x なので何%でもシームレス。負の値も許容し、剰余で丸める。
        var yy = Math.max(0, Math.min(100, y));
        var xx = ((x % 100) + 100) % 100;
        pano.style.backgroundPosition = xx + '% ' + yy + '%';
      };

      var start = function (px, py) {
        dragging = true; lastX = px; lastY = py;
        pano.classList.add('is-grabbing', 'is-touched');
      };
      var move = function (px, py) {
        if (!dragging) return;
        // 画面幅に対する移動量を%に変換。感度は控えめに。
        x -= (px - lastX) / pano.clientWidth * 60;
        y -= (py - lastY) / pano.clientHeight * 50;
        lastX = px; lastY = py;
        apply();
      };
      var end = function () { dragging = false; pano.classList.remove('is-grabbing'); };

      // pointer と mouse/touch の両方に対応（環境差で確実に動くように）
      var supportsPointer = 'onpointerdown' in window;
      if (supportsPointer) {
        pano.addEventListener('pointerdown', function (e) {
          try { pano.setPointerCapture(e.pointerId); } catch (err) {}
          start(e.clientX, e.clientY); e.preventDefault();
        });
        window.addEventListener('pointermove', function (e) { move(e.clientX, e.clientY); });
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
      } else {
        pano.addEventListener('mousedown', function (e) { start(e.clientX, e.clientY); e.preventDefault(); });
        window.addEventListener('mousemove', function (e) { move(e.clientX, e.clientY); });
        window.addEventListener('mouseup', end);
        pano.addEventListener('touchstart', function (e) { var t=e.touches[0]; start(t.clientX, t.clientY); }, {passive:true});
        pano.addEventListener('touchmove', function (e) { var t=e.touches[0]; move(t.clientX, t.clientY); e.preventDefault(); }, {passive:false});
        pano.addEventListener('touchend', end);
      }

      // キーボード操作（矢印キー）。フォーカス可能なので視点を動かせる。
      pano.addEventListener('keydown', function (e) {
        var step = 6;
        if (e.key === 'ArrowLeft')  { x -= step; }
        else if (e.key === 'ArrowRight') { x += step; }
        else if (e.key === 'ArrowUp')    { y -= step; }
        else if (e.key === 'ArrowDown')  { y += step; }
        else { return; }
        e.preventDefault();
        pano.classList.add('is-touched');
        apply();
      });
    }
  });

  /* ---------------------------------------------------------------
   * 6-b. YouTube 参考動画 — クリックで初めて読み込むファサード
   *
   *  - 初期表示ではサムネイルのみ。押されて初めて YouTube を読み込む
   *    （表示速度＋クリックまで外部通信しないプライバシー配慮）
   *  - youtube-nocookie を使用
   *  - 360度動画は再生後、YouTubeプレイヤーが標準でドラッグ操作に対応
   * ------------------------------------------------------------- */
  document.querySelectorAll('.ytembed').forEach(function (box) {
    var btn = box.querySelector('.ytembed__btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var id = box.dataset.yt;
      var title = box.dataset.title || '';
      if (!id) return;
      var iframe = document.createElement('iframe');
      // rel=0: 関連動画を自社チャンネル内に限定 / autoplay=1: クリック後の再生
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
        '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
      iframe.title = title;
      iframe.loading = 'lazy';
      iframe.setAttribute('allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      box.innerHTML = '';
      box.appendChild(iframe);
      iframe.focus();
    });
  });

  /* ---------------------------------------------------------------
   * 7. 自己ホスト動画 — クリックで初めて読み込む（自動再生しない）
   *    大きなmp4を初期表示で読ませないことで表示速度を確保する。
   *    紹介動画・3DCGウォークスルーなど複数に対応。
   * ------------------------------------------------------------- */
  document.querySelectorAll('[data-video-play]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var wrap = btn.closest('.video-frame');
      var video = wrap.querySelector('video');
      if (!video) return;
      video.hidden = false;
      video.setAttribute('controls', '');
      btn.remove();
      video.play();
    });
  });
})();
