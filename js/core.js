/* ===== core.js：工具 / 状态存储 / 间隔重复 / 云同步 ===== */
(function () {
  'use strict';

  /* ---------- 工具 ---------- */
  const U = {
    $: (sel, root) => (root || document).querySelector(sel),
    $$: (sel, root) => Array.from((root || document).querySelectorAll(sel)),
    esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    },
    day(d) {
      const t = d ? new Date(d) : new Date();
      return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
    },
    today() { return U.day(); },
    fmt(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    },
    debounce(fn, ms) {
      let t = null;
      return function () { clearTimeout(t); const a = arguments, self = this; t = setTimeout(() => fn.apply(self, a), ms); };
    },
    toast(msg, ms) {
      const el = document.getElementById('toast');
      el.textContent = msg; el.hidden = false;
      clearTimeout(U._tt);
      U._tt = setTimeout(() => { el.hidden = true; }, ms || 2200);
    },
    copy(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      return Promise.resolve();
    }
  };

  /* ---------- 状态存储（localStorage 优先，云同步热备） ---------- */
  const KEY = 'cpaState.v1';
  function defaultData() {
    return {
      read: {},        // secId -> 完成时间戳
      quiz: {},        // qid -> {n, ok, last}
      srs: {},         // itemId -> {due, iv, ease, reps}  f:公式卡  q:错题
      planDone: {},    // weekId -> ts
      settings: { fontSize: 16, supabase: { url: '', anonKey: '' } },
      daily: {},       // 'YYYY-MM-DD' -> {read, quiz, review}
      lastOpen: 0
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        s.data = Object.assign(defaultData(), s.data || {});
        s.data.settings = Object.assign(defaultData().settings, s.data.settings || {});
        s.data.settings.supabase = Object.assign({ url: '', anonKey: '' }, s.data.settings.supabase || {});
        return s;
      }
    } catch (e) { console.warn('state load fail', e); }
    return { v: 1, user: null, updatedAt: 0, data: defaultData() };
  }

  const Store = {
    state: load(),
    save() {
      this.state.updatedAt = Date.now();
      try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) {}
      Sync.push();
      updateBadge();
    },
    /* 每日活跃度记录 */
    touch(kind) {
      const d = U.today();
      const cur = this.state.data.daily[d] || { read: 0, quiz: 0, review: 0 };
      cur[kind] = (cur[kind] || 0) + 1;
      this.state.data.daily[d] = cur;
      this.state.data.lastOpen = Date.now();
    },
    streak() {
      let n = 0;
      const d = new Date();
      // 今天没学不打断昨日连击
      if (!this.state.data.daily[U.day(d)]) d.setDate(d.getDate() - 1);
      while (this.state.data.daily[U.day(d)]) { n++; d.setDate(d.getDate() - 1); }
      return n;
    },
    markRead(secId) {
      if (!this.state.data.read[secId]) { this.state.data.read[secId] = Date.now(); this.touch('read'); this.save(); }
    },
    unmarkRead(secId) { delete this.state.data.read[secId]; this.save(); },
    recordQuiz(qid, ok) {
      const q = this.state.data.quiz[qid] || { n: 0, ok: 0, last: 0 };
      q.n += 1; if (ok) q.ok += 1; q.last = Date.now();
      this.state.data.quiz[qid] = q;
      this.touch('quiz');
      if (ok) { delete this.state.data.srs['q:' + qid]; }
      else SRS.schedule('q:' + qid);
      this.save();
    },
    resetQuiz(qid) {
      delete this.state.data.quiz[qid];
      delete this.state.data.srs['q:' + qid];
      this.save();
    },
    exportCode() {
      const json = JSON.stringify({ v: 1, exportedAt: Date.now(), data: this.state.data });
      return btoa(unescape(encodeURIComponent(json)));
    },
    importCode(code) {
      const json = decodeURIComponent(escape(atob(code.trim())));
      const obj = JSON.parse(json);
      if (!obj || !obj.data) throw new Error('同步码无效');
      this.state.data = mergeData(this.state.data, obj.data);
      this.save();
    }
  };

  /* 合并两个 data 对象：按各 map 内时间戳取较新者 */
  function mergeData(a, b) {
    const out = defaultData();
    const maps = ['read', 'quiz', 'srs', 'planDone', 'daily'];
    for (const k of maps) {
      out[k] = Object.assign({}, a[k] || {}, b[k] || {});
      if (k === 'quiz') { // 答题统计取答题次数较多的一方
        for (const id of Object.keys(out[k])) {
          const x = (a[k] || {})[id], y = (b[k] || {})[id];
          out[k][id] = (x && y && y.n > x.n) ? y : (x || y);
        }
      }
    }
    out.settings = (b.settings && b.settings._t > (a.settings && a.settings._t || 0)) ? b.settings : (a.settings || b.settings);
    out.settings = Object.assign(defaultData().settings, out.settings || {});
    out.settings.supabase = Object.assign({ url: '', anonKey: '' }, out.settings.supabase || {});
    out.lastOpen = Math.max(a.lastOpen || 0, b.lastOpen || 0);
    return out;
  }

  /* ---------- 间隔重复（SM-2 简化版） ---------- */
  const BASE_IV = [1, 3, 7, 16, 35, 75]; // 天
  const SRS = {
    schedule(itemId, grade) {
      // grade: 0=忘了 1=困难 2=记住 3=轻松
      const s = Store.state.data.srs;
      const it = s[itemId] || { iv: 0, ease: 2.2, reps: 0 };
      const DAY = 86400000;
      if (grade === 0) {
        it.reps = 0; it.iv = 0; it.due = Date.now() + 20 * 60000; // 20 分钟后重见
      } else {
        let step = BASE_IV[Math.min(it.reps, BASE_IV.length - 1)];
        if (grade === 1) { step = Math.max(1, Math.round(step * 0.55)); it.ease = Math.max(1.4, it.ease - 0.15); }
        if (grade === 3) { step = Math.round(step * 1.35); it.ease = Math.min(2.8, it.ease + 0.1); }
        it.iv = Math.max(it.iv, step);
        it.due = Date.now() + it.iv * DAY;
        it.reps += 1;
      }
      s[itemId] = it;
      Store.save();
    },
    due() {
      const now = Date.now();
      return Object.entries(Store.state.data.srs)
        .filter(([, it]) => it.due <= now)
        .map(([id]) => id);
    },
    dueCount() { return this.due().length; }
  };

  /* ---------- 云同步（Supabase，未配置时静默降级为本地 + 手动同步码） ---------- */
  const Sync = {
    client: null,
    get configured() {
      const sp = Store.state.data.settings.supabase;
      return !!(sp && sp.url && sp.anonKey && window.supabase);
    },
    init() {
      if (!this.configured) { updateBadge(); return; }
      const sp = Store.state.data.settings.supabase;
      try {
        this.client = window.supabase.createClient(sp.url, sp.anonKey);
        this.client.auth.onAuthStateChange((ev, session) => {
          if (session && session.user) {
            Store.state.user = { email: session.user.email, uid: session.user.id };
            this.pull().then(() => this.push());
          } else {
            Store.state.user = null;
          }
          updateBadge();
        });
        // 恢复已有会话
        this.client.auth.getSession().then(({ data }) => {
          if (data && data.session) {
            Store.state.user = { email: data.session.user.email, uid: data.session.user.id };
            this.pull().then(() => this.push());
          }
          updateBadge();
        });
      } catch (e) { console.warn('supabase init fail', e); }
      updateBadge();
    },
    async signUp(email, password) {
      if (!this.client) throw new Error('云同步未配置');
      const { error } = await this.client.auth.signUp({ email, password });
      if (error) throw error;
    },
    async signIn(email, password) {
      if (!this.client) throw new Error('云同步未配置');
      const { error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signOut() { if (this.client) await this.client.auth.signOut(); },
    push: U.debounce(async function () {
      if (!Sync.client || !Store.state.user || !navigator.onLine) return;
      try {
        await Sync.client.from('cpa_state').upsert({
          id: Store.state.user.uid,
          payload: Store.state.data,
          updated_at: new Date().toISOString()
        });
        updateBadge(true);
      } catch (e) { console.warn('push fail', e); }
    }, 3000),
    async pull() {
      if (!Sync.client || !Store.state.user) return;
      try {
        const { data, error } = await Sync.client.from('cpa_state').select('payload, updated_at').eq('id', Store.state.user.uid).maybeSingle();
        if (error) throw error;
        if (data && data.payload) {
          Store.state.data = mergeData(Store.state.data, data.payload);
          Store.saveLocal();
          if (window.App) window.App.refresh();
        }
      } catch (e) { console.warn('pull fail', e); }
    }
  };
  Store.saveLocal = function () {
    this.state.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) {}
    updateBadge();
  };

  function updateBadge(ok) {
    const b = document.getElementById('sync-badge');
    if (!b) return;
    const dot = document.getElementById('review-dot');
    const due = SRS.dueCount();
    if (dot) dot.hidden = due === 0;
    if (Store.state.user) {
      b.textContent = ok === true ? '已同步 ☁️' : '云同步';
      b.className = 'badge ' + (ok === true ? 'badge-on' : 'badge-busy');
    } else if (Sync.configured) {
      b.textContent = '未登录';
      b.className = 'badge badge-off';
    } else {
      b.textContent = '本地模式';
      b.className = 'badge badge-off';
    }
  }

  window.U = U;
  window.Store = Store;
  window.SRS = SRS;
  window.Sync = Sync;
})();
