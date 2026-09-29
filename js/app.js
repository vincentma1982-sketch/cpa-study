/* ===== app.js：路由与启动 ===== */
(function () {
  'use strict';

  const App = {
    current: null,
    async route() {
      const hash = location.hash.replace(/^#/, '') || '/';
      const view = document.getElementById('view');
      const tab = (hash.split('/')[1] || 'home') || 'home';
      document.querySelectorAll('#tabbar a').forEach((a) => {
        a.classList.toggle('active', a.dataset.tab === tab || (tab === '' && a.dataset.tab === 'home'));
      });
      window.scrollTo(0, 0);
      try {
        if (hash === '/' || hash === '') await Views.home(view);
        else if (hash.startsWith('/ch/')) await Views.reader(view, hash.split('/')[2]);
        else if (hash === '/quiz') await Views.quizHome(view);
        else if (hash.startsWith('/quiz/run')) await Views.quizRun(view, new URLSearchParams(hash.split('?')[1] || ''));
        else if (hash === '/review') await Views.review(view);
        else if (hash === '/plan') await Views.plan(view);
        else if (hash === '/me') await Views.me(view);
        else await Views.home(view);
      } catch (e) {
        console.error(e);
        view.innerHTML = '<div class="empty">页面出错：' + U.esc(e.message) +
          '<br><br><button class="btn" onclick="location.reload()">刷新重试</button></div>';
      }
    },
    refresh() {
      // 云端拉取后刷新当前页
      this.route();
    },
    async boot() {
      if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        try {
          await navigator.serviceWorker.register('sw.js');
          // 新版本 SW 接管后自动刷新一次，避免新旧外壳/数据格式混用
          let reloaded = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (reloaded) return;
            reloaded = true;
            location.reload();
          });
        } catch (e) { console.warn('SW register fail', e); }
      }
      Sync.init();
      window.addEventListener('hashchange', () => this.route());
      await this.route();
    }
  };

  window.App = App;
  document.addEventListener('DOMContentLoaded', () => App.boot());
})();
