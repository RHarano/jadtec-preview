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
      lbImg.src = '';
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
   * 7. 紹介動画 — クリックで初めて読み込む（自動再生しない）
   *    23MBのmp4を初期表示で読ませないことで表示速度を確保する
   * ------------------------------------------------------------- */
  var videoBtn = document.querySelector('[data-video-play]');
  if (videoBtn) {
    videoBtn.addEventListener('click', function () {
      var wrap = videoBtn.closest('.video-frame');
      var video = wrap.querySelector('video');
      video.hidden = false;
      video.setAttribute('controls', '');
      videoBtn.remove();
      video.play();
    });
  }
})();
