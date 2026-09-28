/* ===== views.js：全部页面视图 ===== */
(function () {
  'use strict';
  const Views = {};
  const FM = 'fm'; // 当前已就绪科目：财务成本管理

  /* ---------- 通用 ---------- */
  function blockHtml(b) {
    const e = U.esc;
    switch (b.t) {
      case 'p': return '<p class="block-p">' + e(b.h) + '</p>';
      case 'ul': return '<ul class="block-ul">' + b.items.map((i) => '<li>' + e(i) + '</li>').join('') + '</ul>';
      case 'ol': return '<ol class="block-ol">' + b.items.map((i) => '<li>' + e(i) + '</li>').join('') + '</ol>';
      case 'kp': return '<div class="kp"><span class="kp-tag">考点</span>' + e(b.h) + '</div>';
      case 'formula': return '<div class="formula">' + e(b.h) + (b.note ? '<span class="fnote">' + e(b.note) + '</span>' : '') + '</div>';
      case 'tip': return '<div class="tip"><span class="tip-tag">💡 提示</span> ' + e(b.h) + '</div>';
      case 'trap': return '<div class="trap"><span class="trap-tag">⚠️ 易错</span> ' + e(b.h) + '</div>';
      case 'mnem': return '<div class="mnem"><span class="mnem-tag">🧠 口诀</span> ' + e(b.h) + '</div>';
      case 'table':
        return '<table class="data"><thead><tr>' + b.head.map((h) => '<th>' + e(h) + '</th>').join('') +
          '</tr></thead><tbody>' + b.rows.map((r) => '<tr>' + r.map((c) => '<td>' + e(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
      case 'example': {
        const steps = b.steps && b.steps.length
          ? '<ol class="steps">' + b.steps.map((s) => '<li>' + e(s) + '</li>').join('') + '</ol>' : '';
        const ans = (b.a || steps)
          ? '<div class="example-a" hidden><b>解析</b>' + steps + (b.a ? '<p style="margin:6px 0 0">' + e(b.a) + '</p>' : '') + '</div>' : '';
        const btn = ans ? '<button class="btn btn-ghost btn-sm ex-toggle">显示解析</button>' : '';
        return '<div class="example"><div class="example-title">🎯 例：' + e(b.title) + '</div>' +
          '<div class="example-q">' + e(b.q) + '</div>' + btn + ans + '</div>';
      }
      default: return '';
    }
  }
  function bindBlocks(root) {
    U.$$('.ex-toggle', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        const a = btn.parentElement.querySelector('.example-a');
        if (!a) return;
        a.hidden = !a.hidden;
        btn.textContent = a.hidden ? '显示解析' : '收起解析';
      });
    });
  }

  /* ---------- 首页 ---------- */
  Views.home = async function (view) {
    const idx = await Data.index();
    const chs = await Data.chapters(FM);
    const read = Store.state.data.read;
    const quizStats = Store.state.data.quiz;
    const totalQ = Object.keys(quizStats).length;
    const okQ = Object.values(quizStats).reduce((s, q) => s + q.ok, 0);
    const nQ = Object.values(quizStats).reduce((s, q) => s + q.n, 0);

    const readyChs = chs.chapters.filter((c) => c.status === 'ready');
    const readSecs = readyChs.reduce((s, c) => s + c.sections.filter((id) => read[id]).length, 0);
    const totalSecs = readyChs.reduce((s, c) => s + c.sections.length, 0);
    const doneChs = readyChs.filter((c) => c.sections.every((id) => read[id])).length;

    let h = '<h2 class="view-title">2027 考期 · ' + U.esc(idx.subjects[0].name) + '</h2>';
    h += '<div class="stat-grid">' +
      '<div class="stat"><b>' + doneChs + '/' + readyChs.length + '</b><span>章节完成</span></div>' +
      '<div class="stat"><b>' + (totalSecs ? Math.round(readSecs / totalSecs * 100) : 0) + '%</b><span>知识点进度</span></div>' +
      '<div class="stat"><b>' + Store.streak() + '天</b><span>连续学习</span></div>' +
      '<div class="stat"><b>' + totalQ + '</b><span>做过题目</span></div>' +
      '<div class="stat"><b>' + (nQ ? Math.round(okQ / nQ * 100) : 0) + '%</b><span>累计正确率</span></div>' +
      '<div class="stat"><b>' + SRS.dueCount() + '</b><span>待复习</span></div>' +
      '</div>';

    for (const c of chs.chapters) {
      const done = c.sections.filter((id) => read[id]).length;
      const pct = c.sections.length ? Math.round(done / c.sections.length * 100) : 0;
      h += '<a href="#/ch/' + c.id + '" class="card ch-item" style="text-decoration:none;color:inherit">' +
        '<div class="ch-no">' + (c.no < 10 ? '0' + c.no : c.no) + '</div>' +
        '<div class="ch-main"><div class="ch-title">' + U.esc(c.title) + '</div>' +
        '<div class="ch-meta">权重 ' + c.weight + ' · 建议 ' + c.est + (c.sections.length ? ' · 知识点 ' + done + '/' + c.sections.length : '') + '</div>' +
        (c.status === 'ready' ? '<div class="pbar"><i style="width:' + pct + '%"></i></div>' : '') +
        '</div>' +
        '<span class="ch-status' + (c.status === 'ready' ? '' : ' pending') + '">' + (c.status === 'ready' ? '学习' : '制作中') + '</span></a>';
    }

    h += '<div class="card small muted">📌 科目规划：<b>2027 考会计 + 财管 + 战略</b>。财管已就绪，会计/战略内容将按计划陆续上线（见"计划"页）。</div>';
    view.innerHTML = h;
  };

  /* ---------- 阅读器 ---------- */
  Views.reader = async function (view, chId) {
    const ch = await Data.chapter(FM, chId);
    const read = Store.state.data.read;
    let h = '<a class="back" href="#/">← 返回目录</a>' +
      '<h2 class="view-title">第' + ch.no + '章 ' + U.esc(ch.title) + '</h2>' +
      (ch.intro ? '<div class="card small">' + U.esc(ch.intro) + '</div>' : '');

    for (const sec of ch.sections) {
      const done = !!read[sec.id];
      h += '<div class="reader-sec' + (done ? ' done' : '') + '" id="sec-' + sec.id + '"><h2>' + U.esc(sec.title) + '</h2></div>';
      h += sec.blocks.map(blockHtml).join('');
    }
    h += '<div class="card small muted" style="text-align:center">—— 本章完 · 进度已自动保存 ——</div>';
    view.innerHTML = h;
    bindBlocks(view);

    // 滚动到可视区的小节自动标记已读
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const id = en.target.id.replace('sec-', '');
          if (!Store.state.data.read[id]) {
            en.target.classList.add('done');
            Store.markRead(id);
          }
        }
      });
    }, { threshold: 0.4 });
    U.$$('.reader-sec', view).forEach((el) => io.observe(el));
  };

  /* ---------- 题库首页 ---------- */
  Views.quizHome = async function (view) {
    const chs = await Data.chapters(FM);
    const quiz = await Data.quiz(FM);
    const cnt = {};
    quiz.questions.forEach((q) => { cnt[q.ch] = (cnt[q.ch] || 0) + 1; });
    const due = SRS.dueCount();
    const stats = Store.state.data.quiz;

    let h = '<h2 class="view-title">题库练习</h2>';
    h += '<div class="card">' +
      '<h3>🧪 错题重练（间隔复习队列）</h3>' +
      '<div class="small muted">按遗忘曲线自动安排，到点才会出现。</div>' +
      '<div class="btn-row"><a class="btn ' + (due ? '' : 'btn-ghost') + '" href="#/quiz/run?mode=wrong">' + (due ? '开始复习（' + due + ' 题）' : '今日无待复习') + '</a></div>' +
      '</div>';
    h += '<div class="card">' +
      '<h3>⚡ 随机快练</h3><div class="small muted">跨章节抽 10 题，保持题感。</div>' +
      '<div class="btn-row"><a class="btn btn-ghost" href="#/quiz/run?mode=random">来 10 题</a></div></div>';
    h += '<div class="card"><h3>📚 章节练习</h3>';
    for (const c of chs.chapters) {
      const n = cnt[c.id] || 0;
      if (!n) continue;
      const doneIds = quiz.questions.filter((q) => q.ch === c.id && stats[q.id]);
      const okN = doneIds.reduce((s, q) => s + (stats[q.id] && stats[q.id].ok ? 1 : 0), 0);
      h += '<a href="#/quiz/run?mode=ch&ch=' + c.id + '" class="ch-item" style="text-decoration:none;color:inherit;border-bottom:1px solid var(--line)">' +
        '<div class="ch-main"><div class="ch-title small">' + c.no + '. ' + U.esc(c.title) + '</div>' +
        '<div class="ch-meta">' + n + ' 题 · 已做 ' + doneIds.length + ' · 答对 ' + okN + '</div></div>' +
        '<span class="ch-status">练习</span></a>';
    }
    h += '</div>';
    view.innerHTML = h;
  };

  /* ---------- 做题 ---------- */
  Views.quizRun = async function (view, params) {
    const mode = params.get('mode') || 'ch';
    const quiz = await Data.quiz(FM);
    const all = quiz.questions;
    let list = [];
    if (mode === 'ch') {
      const ch = params.get('ch');
      list = all.filter((q) => q.ch === ch);
    } else if (mode === 'wrong') {
      const ids = new Set(SRS.due().filter((i) => i.startsWith('q:')).map((i) => i.slice(2)));
      list = all.filter((q) => ids.has(q.id));
    } else {
      list = all.slice().sort(() => Math.random() - 0.5).slice(0, 10);
    }
    if (!list.length) { view.innerHTML = '<a class="back" href="#/quiz">← 返回题库</a><div class="empty">没有可练习的题目</div>'; return; }

    let cur = 0, rightN = 0, wrongIds = [];
    const sel = new Set();

    function renderQ() {
      const q = list[cur];
      sel.clear();
      const multi = q.type === 'multi';
      let h = '<a class="back" href="#/quiz">← 退出</a>' +
        '<div class="quiz-meta">第 ' + (cur + 1) + ' / ' + list.length + ' 题 · ' + (multi ? '多选题' : '单选题') + ' · ' + U.esc(q.kp || '') + '</div>' +
        '<div class="quiz-stem">' + U.esc(q.stem) + '</div>';
      q.opts.forEach((o, i) => {
        h += '<div class="opt" data-i="' + i + '"><span class="opt-key">' + 'ABCDEF'[i] + '</span><span>' + U.esc(o) + '</span></div>';
      });
      h += '<div id="quiz-foot"></div>';
      view.innerHTML = h;

      const foot = U.$('#quiz-foot', view);
      const opts = U.$$('.opt', view);
      let submitted = false;

      function submit() {
        if (submitted) return;
        submitted = true;
        const ansSet = new Set(q.ans);
        const correct = sel.size === ansSet.size && [...sel].every((i) => ansSet.has(i));
        opts.forEach((el, i) => {
          if (ansSet.has(i)) el.classList.add('right');
          else if (sel.has(i)) el.classList.add('wrong');
        });
        Store.recordQuiz(q.id, correct);
        if (correct) rightN++; else { wrongIds.push(q.id); SRS.schedule('q:' + q.id, 0); }
        let f = '<div class="explain"><b>' + (correct ? '✅ 回答正确' : '❌ 回答错误，正确选项：' + q.ans.map((i) => 'ABCDEF'[i]).join('')) + '</b><br>' + U.esc(q.exp) + '</div>';
        if (correct) {
          f += '<div class="small muted" style="margin-bottom:8px">心里没底？可以加入复习队列巩固：</div>' +
            '<div class="btn-row"><button class="btn btn-ghost btn-sm" id="q-hard">加入复习</button>' +
            '<button class="btn" id="q-next">' + (cur + 1 < list.length ? '下一题' : '查看结果') + '</button></div>';
        } else {
          f += '<div class="grade-row"><button class="btn btn-ghost" data-g="0">完全忘了</button>' +
            '<button class="btn btn-ghost" data-g="1">有点模糊</button>' +
            '<button class="btn" data-g="2">下次不会错</button></div>';
        }
        foot.innerHTML = f;
        U.$('#q-next', foot) && U.$('#q-next', foot).addEventListener('click', next);
        U.$('#q-hard', foot) && U.$('#q-hard', foot).addEventListener('click', (e) => {
          SRS.schedule('q:' + q.id, 1);
          e.target.textContent = '已加入 ✓'; e.target.disabled = true;
        });
        U.$$('.grade-row [data-g]', foot).forEach((b) => b.addEventListener('click', () => {
          // 答错时已按"忘了"入队，这里按自评难度重排
          SRS.schedule('q:' + q.id, +b.dataset.g);
          next();
        }));
        window.scrollTo(0, document.body.scrollHeight);
      }

      opts.forEach((el) => {
        el.addEventListener('click', () => {
          if (submitted) return;
          const i = +el.dataset.i;
          if (multi) {
            if (sel.has(i)) { sel.delete(i); el.classList.remove('sel'); }
            else { sel.add(i); el.classList.add('sel'); }
            renderFootBtn();
          } else {
            sel.clear(); sel.add(i);
            opts.forEach((o) => o.classList.remove('sel'));
            el.classList.add('sel');
            setTimeout(submit, 180);
          }
        });
      });
      function renderFootBtn() {
        foot.innerHTML = '<button class="btn btn-block" id="q-ok" ' + (sel.size ? '' : 'disabled') + '>确认答案</button>';
        U.$('#q-ok', foot).addEventListener('click', submit);
      }
      if (multi) renderFootBtn();

      function next() {
        cur++;
        if (cur < list.length) renderQ();
        else renderEnd();
      }
    }

    function renderEnd() {
      const pct = Math.round(rightN / list.length * 100);
      let h = '<h2 class="view-title">本组成绩</h2><div class="card" style="text-align:center">' +
        '<div style="font-size:2.4rem;font-weight:800;color:' + (pct >= 80 ? 'var(--ok)' : pct >= 60 ? 'var(--warn)' : 'var(--bad)') + '">' + pct + '</div>' +
        '<div class="muted">答对 ' + rightN + ' / ' + list.length + '</div></div>';
      if (wrongIds.length) {
        h += '<div class="card"><h3>本次错题（已进复习队列）</h3><div class="small muted">' +
          wrongIds.map((id) => { const q = list.find((x) => x.id === id); return q ? '· ' + U.esc(q.kp || q.stem.slice(0, 30)) : ''; }).join('<br>') +
          '</div></div>';
      }
      h += '<div class="btn-row"><a class="btn" href="#/quiz">返回题库</a><a class="btn btn-ghost" href="#/review">去复习队列</a></div>';
      view.innerHTML = h;
    }

    renderQ();
  };

  /* ---------- 复习 ---------- */
  Views.review = async function (view) {
    const formulas = await Data.formulas(FM);
    const quiz = await Data.quiz(FM);
    const due = SRS.due();
    const qmap = {};
    quiz.questions.forEach((q) => { qmap[q.id] = q; });

    let h = '<h2 class="view-title">间隔复习</h2>';
    h += '<div class="card"><h3>📥 今日待复习：' + due.length + ' 项</h3>';
    if (!due.length) h += '<div class="small muted">队列清空，去题库做几组新题吧。答错的题会自动按 20分钟→1天→3天→7天… 的节奏回来找你。</div>';
    h += '</div>';

    // 待复习队列（逐条渲染，答完即时移除）
    const queueEl = document.createElement('div');
    h += '<div id="due-queue"></div>';
    h += '<div class="card"><h3>🃏 公式卡速记</h3><div class="small muted">点卡片翻面；按掌握程度评分，安排下次复习。</div>' +
      '<label class="f">选择范围</label><select id="f-ch" class="f">' +
      '<option value="all">全部章节</option>' + formulas.decks.map((d) => '<option value="' + d.ch + '">第' + d.ch + '章 ' + U.esc(d.name) + '</option>').join('') +
      '</select><div id="f-slot"></div></div>';
    view.innerHTML = h;

    const dq = U.$('#due-queue', view);
    function renderDue() {
      const items = SRS.due();
      if (!items.length) { dq.innerHTML = ''; return; }
      const item = items[0];
      let html = '';
      if (item.startsWith('f:')) {
        const f = formulas.cards.find((c) => 'f:' + c.id === item);
        html = f ? dueCardHtml(f.name, f.tex, f.tip) : '';
      } else {
        const q = qmap[item.slice(2)];
        html = q ? dueCardHtml(q.kp || '错题', q.stem + '<br><br>正确答案：' + q.ans.map((i) => 'ABCDEF'[i] + '. ' + U.esc(q.opts[i])).join('；') + '<br><span style="opacity:.85">' + U.esc(q.exp) + '</span>', '') : '';
      }
      dq.innerHTML = '<div class="card">' + html +
        '<div class="grade-row" style="margin-top:10px">' +
        '<button class="btn btn-ghost" data-g="0">忘了</button>' +
        '<button class="btn btn-ghost" data-g="1">困难</button>' +
        '<button class="btn btn-ghost" data-g="2">良好</button>' +
        '<button class="btn" data-g="3">轻松</button></div></div>';
      U.$$('[data-g]', dq).forEach((b) => b.addEventListener('click', () => {
        SRS.schedule(item, +b.dataset.g);
        renderDue();
      }));
    }
    function dueCardHtml(title, body, tip) {
      return '<div style="font-weight:700;margin-bottom:6px">' + U.esc(title) + '</div>' +
        '<div class="small" style="font-family:inherit">' + body + '</div>' +
        (tip ? '<div class="small muted" style="margin-top:6px">' + U.esc(tip) + '</div>' : '');
    }
    renderDue();

    // 公式卡
    const slot = U.$('#f-slot', view);
    let deck = [];
    function loadDeck() {
      const v = U.$('#f-ch', view).value;
      deck = (v === 'all' ? formulas.cards : formulas.cards.filter((c) => String(c.ch) === v)).slice();
      deckIdx = 0;
      renderCard();
    }
    let deckIdx = 0;
    function renderCard() {
      if (!deck.length) { slot.innerHTML = '<div class="empty">该范围暂无公式卡</div>'; return; }
      const c = deck[deckIdx];
      slot.innerHTML = '<div class="fcard" id="fc"><div class="fcard-inner">' +
        '<div class="fcard-face fcard-front"><div class="fcard-name">' + U.esc(c.name) + '</div><div class="small muted" style="margin-top:8px">点我翻面</div></div>' +
        '<div class="fcard-face fcard-back"><div class="fcard-formula">' + U.esc(c.tex) + '</div>' +
        (c.tip ? '<div class="fcard-tip">' + U.esc(c.tip) + '</div>' : '') + '</div></div></div>' +
        '<div class="grade-row">' +
        '<button class="btn btn-ghost btn-sm" data-g="0">忘了</button>' +
        '<button class="btn btn-ghost btn-sm" data-g="1">困难</button>' +
        '<button class="btn btn-ghost btn-sm" data-g="2">良好</button>' +
        '<button class="btn btn-sm" data-g="3">轻松</button></div>' +
        '<div class="small muted" style="text-align:center;margin-top:6px">' + (deckIdx + 1) + ' / ' + deck.length + '</div>';
      U.$('#fc', slot).addEventListener('click', () => U.$('#fc', slot).classList.toggle('flip'));
      U.$$('[data-g]', slot).forEach((b) => b.addEventListener('click', () => {
        SRS.schedule('f:' + c.id, +b.dataset.g);
        Store.touch('review');
        deckIdx = (deckIdx + 1) % deck.length;
        renderCard();
      }));
    }
    U.$('#f-ch', view).addEventListener('change', loadDeck);
    loadDeck();
  };

  /* ---------- 学习计划 ---------- */
  Views.plan = async function (view) {
    const plan = await Data.plan();
    const done = Store.state.data.planDone;
    const today = U.today();
    let h = '<h2 class="view-title">备考路线图</h2>' +
      '<div class="card small">' + U.esc(plan.overview) + '</div>';
    for (const ph of plan.phases) {
      h += '<div class="phase"><h3>' + U.esc(ph.name) + '</h3><div class="small muted">' + U.esc(ph.range) + ' · ' + U.esc(ph.goal) + '</div></div>';
      for (const w of ph.weeks) {
        const isDone = !!done[w.id];
        const isNow = w.start <= today && today <= w.end;
        h += '<div class="week-row">' +
          '<label style="display:flex;gap:8px;align-items:flex-start;flex:1">' +
          '<input type="checkbox" data-w="' + w.id + '" ' + (isDone ? 'checked' : '') + ' style="margin-top:5px;width:16px;height:16px">' +
          '<span class="week-task' + (isDone ? ' done' : '') + '">' + (isNow ? '👉 ' : '') + U.esc(w.label) + '</span></label>' +
          '<span class="week-no">' + U.esc(w.end.slice(5).replace('-', '/')) + '止</span></div>';
      }
    }
    h += '<div class="card small muted" style="margin-top:14px">⏰ 里程碑：' + plan.milestones.map((m) => U.esc(m)).join('；') + '</div>';
    view.innerHTML = h;
    U.$$('input[data-w]', view).forEach((cb) => cb.addEventListener('change', () => {
      if (cb.checked) { Store.state.data.planDone[cb.dataset.w] = Date.now(); Store.touch('read'); }
      else delete Store.state.data.planDone[cb.dataset.w];
      Store.save();
      cb.closest('label').querySelector('.week-task').classList.toggle('done', cb.checked);
    }));
  };

  /* ---------- 我的 / 设置 ---------- */
  Views.me = async function (view) {
    const st = Store.state;
    const sp = st.data.settings.supabase;
    let h = '<h2 class="view-title">我的</h2>';

    h += '<div class="card"><h3>☁️ 云端同步</h3>';
    if (!Sync.configured) {
      h += '<div class="small muted" style="margin-bottom:8px">配置后进度自动保存到云端，换手机不丢。两步：<br>① 注册 <b>supabase.com</b> 免费项目；<br>② 在 SQL Editor 执行建表语句（见下方），把 Project URL 和 anon public key 填进来。</div>' +
        '<label class="f">Project URL</label><input class="f" id="sp-url" placeholder="https://xxxx.supabase.co" value="' + U.esc(sp.url) + '">' +
        '<label class="f">Anon Public Key</label><input class="f" id="sp-key" placeholder="eyJhbGciOi..." value="' + U.esc(sp.anonKey) + '">' +
        '<details class="small" style="margin:8px 0"><summary style="cursor:pointer;color:var(--brand)">查看建表 SQL（复制到 Supabase SQL Editor 执行）</summary>' +
        '<pre class="formula" style="text-align:left;white-space:pre-wrap;font-size:.75rem">create table cpa_state (\n  id uuid primary key references auth.users,\n  payload jsonb not null default \'{}\'::jsonb,\n  updated_at timestamptz not null default now()\n);\nalter table cpa_state enable row level security;\ncreate policy "own only" on cpa_state\n  for all using (auth.uid() = id) with check (auth.uid() = id);</pre></details>' +
        '<button class="btn btn-block" id="sp-save">保存并启用云同步</button>';
    } else if (!st.user) {
      h += '<div class="small muted" style="margin-bottom:8px">云同步已配置，登录后自动同步。</div>' +
        '<label class="f">邮箱</label><input class="f" id="em" type="email" placeholder="you@example.com">' +
        '<label class="f">密码（至少 6 位，新用户将自动注册）</label><input class="f" id="pw" type="password" placeholder="••••••••">' +
        '<div class="btn-row"><button class="btn" id="login">登录 / 注册</button></div>';
    } else {
      h += '<div class="small" style="margin-bottom:8px">当前账号：<b>' + U.esc(st.user.email) + '</b></div>' +
        '<div class="btn-row"><button class="btn btn-ghost btn-sm" id="sync-now">立即同步</button>' +
        '<button class="btn btn-ghost btn-sm" id="logout">退出登录</button></div>';
    }
    h += '</div>';

    h += '<div class="card"><h3>📦 手动同步码（备用）</h3>' +
      '<div class="small muted" style="margin-bottom:8px">不依赖云端：把同步码发给微信"文件传输助手"，在新设备粘贴即可恢复全部进度。</div>' +
      '<div class="btn-row"><button class="btn btn-ghost btn-sm" id="exp-code">导出同步码</button>' +
      '<button class="btn btn-ghost btn-sm" id="imp-code">导入同步码</button></div>' +
      '<textarea class="f" id="code-box" placeholder="同步码 / 粘贴此处导入" style="font-size:.7rem;font-family:monospace" rows="3"></textarea></div>';

    h += '<div class="card"><h3>🔠 字号</h3><div class="btn-row">' +
      '<button class="btn btn-ghost btn-sm" id="fs-dec">A−</button>' +
      '<button class="btn btn-ghost btn-sm" id="fs-inc">A＋</button></div></div>';

    h += '<div class="card small muted">CPA 备考学习站 v1 · 财管内容按 2026 考纲体系编写，新教材发布后自动更新</div>';
    view.innerHTML = h;

    document.documentElement.style.fontSize = (st.data.settings.fontSize || 16) + 'px';

    const bind = (id, fn) => { const el = U.$('#' + id, view); if (el) el.addEventListener('click', fn); };
    bind('sp-save', () => {
      st.data.settings.supabase.url = U.$('#sp-url', view).value.trim();
      st.data.settings.supabase.anonKey = U.$('#sp-key', view).value.trim();
      st.data.settings._t = Date.now();
      Store.saveLocal();
      U.toast('已保存，正在初始化云同步…');
      setTimeout(() => location.reload(), 600);
    });
    bind('login', async () => {
      const em = U.$('#em', view).value.trim(), pw = U.$('#pw', view).value;
      try {
        await Sync.signIn(em, pw);
        U.toast('登录成功');
      } catch (e1) {
        try { await Sync.signUp(em, pw); U.toast('注册成功，请查收确认邮件（如要求）'); }
        catch (e2) { U.toast('失败：' + (e2.message || e1.message)); }
      }
    });
    bind('sync-now', async () => { await Sync.pull(); U.toast('已同步'); });
    bind('logout', async () => { await Sync.signOut(); Store.state.user = null; Store.saveLocal(); Views.me(view); });
    bind('exp-code', async () => {
      const code = Store.exportCode();
      U.$('#code-box', view).value = code;
      await U.copy(code);
      U.toast('同步码已复制到剪贴板');
    });
    bind('imp-code', () => {
      try { Store.importCode(U.$('#code-box', view).value); U.toast('导入成功'); setTimeout(() => App.route(), 500); }
      catch (e) { U.toast('导入失败：' + e.message); }
    });
    bind('fs-inc', () => { st.data.settings.fontSize = Math.min(22, (st.data.settings.fontSize || 16) + 1); Store.saveLocal(); document.documentElement.style.fontSize = st.data.settings.fontSize + 'px'; });
    bind('fs-dec', () => { st.data.settings.fontSize = Math.max(13, (st.data.settings.fontSize || 16) - 1); Store.saveLocal(); document.documentElement.style.fontSize = st.data.settings.fontSize + 'px'; });
  };

  window.Views = Views;
})();
