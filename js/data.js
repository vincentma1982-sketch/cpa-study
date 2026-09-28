/* ===== data.js：内容数据加载（网络优先，SW 兜底离线） ===== */
(function () {
  'use strict';
  const Data = {
    cache: {},
    async json(path) {
      if (this.cache[path]) return this.cache[path];
      const r = await fetch(path, { cache: 'no-cache' });
      if (!r.ok) throw new Error('数据加载失败: ' + path);
      const j = await r.json();
      this.cache[path] = j;
      return j;
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
