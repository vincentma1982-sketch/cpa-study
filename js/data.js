/* ===== data.js：内容数据加载（网络优先，SW 兜底离线） ===== */
(function () {
  'use strict';
  const Data = {
    cache: {},
    async json(path) {
      if (this.cache[path]) return this.cache[path];
      // 国内访问 github.io 偶发抖动：失败自动重试 3 次（间隔递增）
      let lastErr = null;
      for (let i = 0; i < 3; i++) {
        try {
          const r = await fetch(path, { cache: 'no-cache' });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const j = await r.json();
          this.cache[path] = j;
          return j;
        } catch (e) {
          lastErr = e;
          if (i < 2) await new Promise((res) => setTimeout(res, 800 * (i + 1)));
        }
      }
      throw new Error('数据加载失败: ' + path + '（' + (lastErr && lastErr.message || '网络异常') + '）');
    },
    index() { return this.json('data/index.json'); },
    chapters(sub) { return this.json('data/' + sub + '/chapters.json'); },
    chapter(sub, id) { return this.json('data/' + sub + '/' + id + '.json'); },
    formulas(sub) { return this.json('data/' + sub + '/formulas.json'); },
    quiz(sub) { return this.json('data/' + sub + '/quiz.json'); },
    plan() { return this.json('data/plan.json'); }
  };
  window.Data = Data;
})();
