/* ============================================
   知行 · 个人学习工具箱 —— 脚本
   说明：本文件只负责交互逻辑。
   已完成：顶部导航切换、任务管理与 localStorage 持久化、首页仪表盘统计、专注计时器、学习资源库。
   ============================================ */

/* ===== 常量与状态 ===== */

// localStorage 中保存任务数据所用的键名
const STORAGE_KEY = 'zhixing-tasks';

// 内存中的任务数据（唯一数据源，所有增删改都基于它）
let tasks = [];

// 当前筛选状态：'all' | 'pending' | 'completed'
let currentFilter = 'all';

/* ===== 计时器常量与状态 ===== */

const DEFAULT_FOCUS_MINUTES = 25; // 默认专注时长（分钟）
const DEFAULT_BREAK_MINUTES = 5;  // 默认休息时长（分钟）
const TIMER_SETTINGS_KEY = 'studyCompanionTimerSettings'; // 时长配置的 localStorage 键

// 当前已应用的专注 / 休息时长（分钟）
let currentFocusMinutes = DEFAULT_FOCUS_MINUTES;
let currentBreakMinutes = DEFAULT_BREAK_MINUTES;

// 当前计时模式：'focus' | 'break'
let timerMode = 'focus';
// 当前剩余秒数
let timerRemaining = DEFAULT_FOCUS_MINUTES * 60;
// 定时器标识（setInterval 返回的 id）
let timerId = null;
// 预计结束时间（基于 Date.now() 的毫秒时间戳）
let timerEndTime = null;

/* ===== 学习资源数据 ===== */

// 静态资源数据：不接入后端 / 数据库 / API，也不存 localStorage。
const RESOURCES = [
  {
    title: '中国大学 MOOC',
    category: '数学',
    description: '国家级在线课程平台，含高等数学、数学分析等大学课程。',
    url: 'https://www.icourse163.org/'
  },
  {
    title: '国家高等教育智慧教育平台',
    category: '数学',
    description: '教育部主导的大学课程平台，覆盖工科数学、数学分析等课程。',
    url: 'https://higher.smartedu.cn/'
  },
  {
    title: 'Gitee',
    category: '编程',
    description: '国内代码托管与开源协作平台。',
    url: 'https://gitee.com/'
  },
  {
    title: '博客园',
    category: '编程',
    description: '老牌中文开发者技术博客社区。',
    url: 'https://www.cnblogs.com/'
  },
  {
    title: 'CSDN',
    category: '编程',
    description: '国内知名的 IT 技术社区与博客平台。',
    url: 'https://www.csdn.net/'
  },
  {
    title: '稀土掘金',
    category: '编程',
    description: '面向开发者的技术内容与分享社区。',
    url: 'https://juejin.cn/'
  },
  {
    title: '菜鸟教程',
    category: '编程',
    description: '零基础入门的前后端编程教程网站。',
    url: 'https://www.runoob.com/'
  },
  {
    title: '洛谷',
    category: '编程',
    description: '在线评测与算法竞赛训练平台，适合 OI / ACM 练习。',
    url: 'https://www.luogu.com.cn/'
  },
  {
    title: '百度',
    category: '其他',
    description: '常用的中文搜索引擎。',
    url: 'https://www.baidu.com/'
  },
  {
    title: '中国知网',
    category: '其他',
    description: '中文学术文献与论文检索平台。',
    url: 'https://www.cnki.net/'
  },
  {
    title: '机器之心',
    category: '其他',
    description: '聚焦人工智能与机器学习的专业媒体。',
    url: 'https://www.jiqizhixin.com/'
  },
  {
    title: '量子位',
    category: '其他',
    description: '关注 AI 与前沿科技的技术资讯媒体。',
    url: 'https://www.qbitai.com/'
  }
];

// 网站收藏夹的 localStorage 键
const WEBSITES_KEY = 'zhixing-websites';

// 网站支持的实际分类（"全部分类"仅用于筛选，不作为实际分类保存）
const WEBSITE_CATEGORIES = ['数学', '编程', '英语', '其他'];

// 当前真正使用的网站列表（唯一数据源；RESOURCES 仅作为首次使用的默认种子）
let websites = [];

/* ===== 学习资料（IndexedDB）常量与状态 ===== */

const MATERIALS_DB_NAME = 'zhixing-study-materials'; // IndexedDB 数据库名
const MATERIALS_STORE = 'materials';                 // object store 名
const MAX_MATERIAL_SIZE = 20 * 1024 * 1024;          // 单文件最大 20MB
const ALLOWED_MATERIAL_EXTS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'md', 'png', 'jpg', 'jpeg', 'webp', 'gif'];
const BLOCKED_MATERIAL_MIME = ['text/html', 'application/xhtml+xml', 'image/svg+xml', 'application/javascript', 'text/javascript'];

// 当前学习资料列表（仅元数据；文件本体保存在 IndexedDB）
let materials = [];
// 数据库连接缓存（只打开一次）
let materialsDB = null;
// 当前预览使用的临时 object URL
let currentPreviewUrl = null;

/* ===== DOM 引用 ===== */

const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');
const filterBtns = document.querySelectorAll('.filter-btn');
const inputHint = document.getElementById('task-input-hint');

// 首页仪表盘统计元素
const statTotal = document.getElementById('stat-total');
const statCompleted = document.getElementById('stat-completed');
const progressText = document.getElementById('progress-text');
const progressRing = document.getElementById('progress-ring');

// 首页仪表盘新增元素
const todoPreviewList = document.getElementById('todo-preview-list');
const resourcePreviewList = document.getElementById('resource-preview-list');

// 专注计时器元素
const timerDisplay = document.getElementById('timer-display');
const timerStartBtn = document.getElementById('timer-start');
const timerPauseBtn = document.getElementById('timer-pause');
const timerResumeBtn = document.getElementById('timer-resume');
const timerResetBtn = document.getElementById('timer-reset');
const timerModeBtns = document.querySelectorAll('.mode-btn');
const timerStatus = document.getElementById('timer-status');

// 计时器时长设置元素
const focusInput = document.getElementById('focus-minutes');
const breakInput = document.getElementById('break-minutes');
const applySettingsBtn = document.getElementById('apply-timer-settings');
const resetSettingsBtn = document.getElementById('reset-timer-settings');
const timerSettingsMessage = document.getElementById('timer-settings-message');

// 学习资源库元素
const resourceSearch = document.getElementById('resource-search');
const resourceCategory = document.getElementById('resource-category');
const resourceList = document.getElementById('resource-list');

// 添加 / 管理网站元素
const showAddWebsiteBtn = document.getElementById('show-add-website');
const addWebsiteForm = document.getElementById('add-website-form');
const websiteTitleInput = document.getElementById('website-title');
const websiteUrlInput = document.getElementById('website-url');
const websiteCategoryInput = document.getElementById('website-category');
const websiteDescInput = document.getElementById('website-desc');
const saveWebsiteBtn = document.getElementById('save-website');
const cancelWebsiteBtn = document.getElementById('cancel-website');
const websiteFormHint = document.getElementById('website-form-hint');

// 学习资料元素
const resourceTabs = document.querySelectorAll('.resource-tab');
const websitePanel = document.getElementById('panel-websites');
const materialsPanel = document.getElementById('panel-materials');
const materialSearch = document.getElementById('material-search');
const materialCategory = document.getElementById('material-category');
const materialUploadCategory = document.getElementById('material-upload-category');
const materialFileInput = document.getElementById('material-file-input');
const uploadMaterialBtn = document.getElementById('upload-material-btn');
const materialMessage = document.getElementById('material-message');
const materialList = document.getElementById('material-list');
const previewModal = document.getElementById('preview-modal');
const previewModalTitle = document.getElementById('preview-modal-title');
const previewModalBody = document.getElementById('preview-modal-body');
const previewModalClose = document.getElementById('preview-modal-close');

/* ===== localStorage 读写 ===== */

// 从 localStorage 读取任务数据。
// 对"没有数据 / 解析失败 / 格式不对"的情况都做了兜底，最终一定返回数组。
function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  let parsed = [];

  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = [];
    }
  }

  if (!Array.isArray(parsed)) {
    parsed = [];
  }

  tasks = parsed.filter(isValidTask).map(normalizeTask);
  return tasks;
}

// 把当前任务数据写回 localStorage。
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/* ===== 数据校验与工具 ===== */

// 判断一条数据是否是合法任务（对象 + title 为非空字符串）。
function isValidTask(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    typeof item.title === 'string' &&
    item.title.trim() !== ''
  );
}

// 把一条数据规范化为 { id, title, completed }，缺的字段补上默认值。
function normalizeTask(item) {
  return {
    id: typeof item.id === 'string' ? item.id : generateId(),
    title: item.title.trim(),
    completed: item.completed === true
  };
}

// 生成一个简单且足够唯一的 id。
function generateId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// 用标题创建一个新任务对象。
function createTask(title) {
  return {
    id: generateId(),
    title: title,
    completed: false
  };
}

/* ===== 任务操作 ===== */

// 新增任务：校验输入 → 加入数据 → 保存 → 重新渲染 → 清空输入框。
function addTask() {
  const title = taskInput.value.trim();

  if (title === '') {
    showInputHint('任务内容不能为空，请输入后再添加');
    return;
  }

  tasks.push(createTask(title));
  saveTasks();
  taskInput.value = '';
  showInputHint('');
  renderTasks();
  updateDashboard();
}

// 切换某条任务的完成状态。
function toggleTask(id) {
  const task = tasks.find(function (item) {
    return item.id === id;
  });
  if (!task) {
    return;
  }
  task.completed = !task.completed;
  saveTasks();
  renderTasks();
  updateDashboard();
}

// 删除某条任务。
function deleteTask(id) {
  tasks = tasks.filter(function (item) {
    return item.id !== id;
  });
  saveTasks();
  renderTasks();
  updateDashboard();
}

/* ===== 渲染 ===== */

// 根据当前筛选状态，取出要显示的任务。
function getFilteredTasks() {
  if (currentFilter === 'pending') {
    return tasks.filter(function (item) {
      return !item.completed;
    });
  }
  if (currentFilter === 'completed') {
    return tasks.filter(function (item) {
      return item.completed;
    });
  }
  return tasks.slice();
}

// 把任务列表渲染到页面上，并处理空状态。
function renderTasks() {
  const filtered = getFilteredTasks();
  taskList.innerHTML = '';

  // 空状态：完全没任务 和 筛选后为空，给出不同提示。
  if (filtered.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = tasks.length === 0
      ? '还没有任务，先添加一个吧！'
      : '当前筛选下暂无任务';
    taskList.appendChild(empty);
    return;
  }

  filtered.forEach(function (task) {
    taskList.appendChild(createTaskElement(task));
  });
}

// 为一条任务创建对应的列表项 DOM。
// 用户输入的任务标题一律用 textContent 写入，避免被当作 HTML 执行。
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = 'task-item' + (task.completed ? ' completed' : '');
  li.dataset.id = task.id;

  // 完成状态切换按钮
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'task-check';
  toggleBtn.setAttribute('aria-label', task.completed ? '取消完成' : '标记完成');
  toggleBtn.textContent = task.completed ? '✓' : '';

  // 任务文字
  const text = document.createElement('span');
  text.className = 'task-text';
  text.textContent = task.title;

  // 删除按钮
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'task-delete';
  deleteBtn.textContent = '删除';

  li.appendChild(toggleBtn);
  li.appendChild(text);
  li.appendChild(deleteBtn);
  return li;
}

/* ===== 首页仪表盘统计 ===== */

// 进度圆环半径 42，对应圆周长（用于 stroke-dashoffset 计算）。
const RING_CIRCUMFERENCE = 2 * Math.PI * 42;

// 根据 tasks 数组计算并更新首页的三个统计数字和进度条。
function updateDashboard() {
  const total = tasks.length;
  const completed = tasks.filter(function (task) {
    return task.completed;
  }).length;
  const percentage = total === 0 ? 0 : Math.round(completed / total * 100);

  statTotal.textContent = total;
  statCompleted.textContent = completed;
  progressText.textContent = percentage + '%';
  progressRing.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - percentage / 100));

  // 同步刷新首页的待办任务预览
  renderTodoPreview();
}

// 刷新首页"待办任务"预览：复用 tasks 数组，最多显示 4 条未完成任务。
function renderTodoPreview() {
  const pending = tasks.filter(function (task) {
    return !task.completed;
  }).slice(0, 4);

  todoPreviewList.innerHTML = '';

  if (pending.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = '暂无待办任务，休息一下吧！';
    todoPreviewList.appendChild(empty);
    return;
  }

  pending.forEach(function (task) {
    const li = document.createElement('li');
    li.className = 'todo-item';

    const check = document.createElement('span');
    check.className = 'todo-check';

    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = task.title;

    li.appendChild(check);
    li.appendChild(text);
    todoPreviewList.appendChild(li);
  });
}

// 刷新首页"学习资源推荐"：复用 RESOURCES 数据，每个分类取第一条，展示 3 个分类。
function renderResourcePreview() {
  const preview = [];
  ['数学', '编程', '其他'].forEach(function (cat) {
    const found = RESOURCES.find(function (resource) {
      return resource.category === cat;
    });
    if (found) {
      preview.push(found);
    }
  });
  resourcePreviewList.innerHTML = '';

  if (preview.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = '暂无推荐资源';
    resourcePreviewList.appendChild(empty);
    return;
  }

  preview.forEach(function (resource) {
    resourcePreviewList.appendChild(createResourcePreviewItem(resource));
  });
}

// 根据分类返回对应的图形标识与样式。
function getResourceBadge(category) {
  if (category === '数学') {
    return { symbol: 'π', cls: 'badge-math' };
  }
  if (category === '编程') {
    return { symbol: '</>', cls: 'badge-code' };
  }
  if (category === '英语') {
    return { symbol: 'Aa', cls: 'badge-english' };
  }
  return { symbol: '★', cls: 'badge-other' };
}

// 为一条资源创建首页推荐条目。
function createResourcePreviewItem(resource) {
  const li = document.createElement('li');
  li.className = 'resource-preview-item';

  const badge = getResourceBadge(resource.category);

  const badgeEl = document.createElement('span');
  badgeEl.className = 'resource-preview-badge ' + badge.cls;
  badgeEl.textContent = badge.symbol;

  const body = document.createElement('div');
  body.className = 'resource-preview-body';

  const link = document.createElement('a');
  link.className = 'resource-preview-link';
  link.href = resource.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = resource.title;

  const category = document.createElement('span');
  category.className = 'resource-preview-category';
  category.textContent = resource.category;

  body.appendChild(link);
  body.appendChild(category);

  li.appendChild(badgeEl);
  li.appendChild(body);
  return li;
}

/* ===== 筛选 ===== */

// 切换筛选状态，并更新筛选按钮的高亮。
function setFilter(filter) {
  currentFilter = filter;
  filterBtns.forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
  });
  renderTasks();
}

/* ===== 输入提示 ===== */

// 显示或隐藏输入框下方的提示文字。
function showInputHint(message) {
  if (message) {
    inputHint.textContent = message;
    inputHint.hidden = false;
    taskInput.classList.add('input-error');
  } else {
    inputHint.textContent = '';
    inputHint.hidden = true;
    taskInput.classList.remove('input-error');
  }
}

/* ===== 专注计时器 ===== */

// 把剩余秒数格式化为 mm:ss。
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

// 返回指定模式的完整时长（秒），读取当前已应用的时长。
function getModeSeconds(mode) {
  return mode === 'break' ? currentBreakMinutes * 60 : currentFocusMinutes * 60;
}

// 更新计时数字显示。
function updateTimerDisplay() {
  timerDisplay.textContent = formatTime(timerRemaining);
}

// 更新模式切换按钮的高亮与标签文字。
function updateModeButtons() {
  timerModeBtns.forEach(function (btn) {
    const mode = btn.getAttribute('data-mode');
    btn.classList.toggle('active', mode === timerMode);
    btn.textContent = mode === 'focus'
      ? '专注 · ' + currentFocusMinutes + ' 分钟'
      : '休息 · ' + currentBreakMinutes + ' 分钟';
  });
}

// 更新四个操作按钮的可用状态。
function updateTimerButtons() {
  const full = getModeSeconds(timerMode);
  const running = timerId !== null;

  // 开始：仅处于"完整初始状态"时可用
  timerStartBtn.disabled = running || timerRemaining <= 0 || timerRemaining !== full;
  // 暂停：仅运行中可用
  timerPauseBtn.disabled = !running;
  // 继续：仅处于"暂停状态"（有剩余但未到完整时长）时可用
  timerResumeBtn.disabled = running || timerRemaining <= 0 || timerRemaining === full;
  // 重置：始终可用
  timerResetBtn.disabled = false;
}

// 统一的定时器启动入口：所有"开始/继续"都经过这里，保证只有一个 setInterval。
function startTicking() {
  if (timerId !== null) {
    return;
  }
  timerEndTime = Date.now() + timerRemaining * 1000;
  timerId = setInterval(tick, 250);
  updateTimerButtons();
}

// 统一的停止入口：清除定时器和结束时间状态。
function stopTicking() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  timerEndTime = null;
}

// 每次定时回调：根据 Date.now() 与预计结束时间重新计算剩余秒数。
function tick() {
  // 防御：计时器已停止或结束时间已清空时，忽略旧的回调，避免误触发完成提示。
  if (timerId === null || timerEndTime === null) {
    return;
  }

  const remaining = Math.ceil((timerEndTime - Date.now()) / 1000);

  if (remaining <= 0) {
    timerRemaining = 0;
    finishTimer();
    return;
  }
  timerRemaining = remaining;
  updateTimerDisplay();
}

// 开始：从当前模式完整时长开始倒计时。
function startTimer() {
  const full = getModeSeconds(timerMode);
  if (timerRemaining <= 0 || timerRemaining !== full) {
    return;
  }
  startTicking();
}

// 暂停：结算并保留实际剩余时间，停止计时。
function pauseTimer() {
  if (timerId === null) {
    return;
  }
  const remaining = Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000));
  timerRemaining = remaining;
  stopTicking();
  updateTimerDisplay();
  updateTimerButtons();
}

// 继续：仅从暂停后的剩余时间继续。
function resumeTimer() {
  const full = getModeSeconds(timerMode);
  if (timerRemaining <= 0 || timerRemaining === full) {
    return;
  }
  startTicking();
}

// 重置：停止计时，恢复当前模式的完整时长。
function resetTimer() {
  stopTicking();
  timerRemaining = getModeSeconds(timerMode);
  showTimerStatus('');
  updateTimerDisplay();
  updateTimerButtons();
}

// 切换专注 / 休息模式。
function switchMode(mode) {
  if (mode === timerMode) {
    return;
  }
  stopTicking();
  timerMode = mode;
  timerRemaining = getModeSeconds(mode);
  showTimerStatus('');
  updateModeButtons();
  updateTimerDisplay();
  updateTimerButtons();
}

// 倒计时结束时的处理。
function finishTimer() {
  stopTicking();
  timerRemaining = 0;
  updateTimerDisplay();
  showTimerStatus(timerMode === 'focus' ? '专注完成，可以休息一下！' : '休息完成，可以继续专注！');
  updateTimerButtons();
}

// 显示或隐藏完成提示。
function showTimerStatus(message) {
  if (message) {
    timerStatus.textContent = message;
    timerStatus.hidden = false;
    timerStatus.classList.add('success');
  } else {
    timerStatus.textContent = '';
    timerStatus.hidden = true;
    timerStatus.classList.remove('success');
  }
}

/* ===== 计时器时长设置 ===== */

// 判断一个数值是否为指定范围内的整数。
function isValidMinutes(value, min, max) {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

// 把输入框文本解析为整数；不是纯数字时返回 null。
function parseIntegerInput(raw) {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) {
    return null;
  }
  return parseInt(text, 10);
}

// 从 localStorage 读取时长配置，校验失败时保留默认值。
function loadTimerSettings() {
  const raw = localStorage.getItem(TIMER_SETTINGS_KEY);
  let parsed = null;

  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = null;
    }
  }

  if (parsed && typeof parsed === 'object') {
    if (isValidMinutes(parsed.focusMinutes, 1, 180)) {
      currentFocusMinutes = parsed.focusMinutes;
    }
    if (isValidMinutes(parsed.breakMinutes, 1, 60)) {
      currentBreakMinutes = parsed.breakMinutes;
    }
  }
}

// 把当前时长配置写入 localStorage。
function saveTimerSettings() {
  localStorage.setItem(TIMER_SETTINGS_KEY, JSON.stringify({
    focusMinutes: currentFocusMinutes,
    breakMinutes: currentBreakMinutes
  }));
}

// 把输入框更新为当前已应用的时长。
function updateTimerSettingsInputs() {
  focusInput.value = String(currentFocusMinutes);
  breakInput.value = String(currentBreakMinutes);
}

// 显示时长设置区的提示信息。
function showTimerSettingsMessage(message, isError) {
  timerSettingsMessage.textContent = message || '';
  timerSettingsMessage.hidden = !message;
  timerSettingsMessage.classList.toggle('error', isError === true);
  timerSettingsMessage.classList.toggle('success', isError === false);
}

// 应用新的专注 / 休息时长。
function applyTimerSettings() {
  const focus = parseIntegerInput(focusInput.value);
  const breakMin = parseIntegerInput(breakInput.value);

  if (focus === null || breakMin === null) {
    showTimerSettingsMessage('请输入有效的整数时长', true);
    return;
  }
  if (focus < 1 || focus > 180) {
    showTimerSettingsMessage('专注时长必须是 1–180 的整数', true);
    return;
  }
  if (breakMin < 1 || breakMin > 60) {
    showTimerSettingsMessage('休息时长必须是 1–60 的整数', true);
    return;
  }
  if (timerId !== null) {
    showTimerSettingsMessage('计时中无法修改时长，请先暂停', true);
    return;
  }

  currentFocusMinutes = focus;
  currentBreakMinutes = breakMin;
  saveTimerSettings();

  stopTicking();
  timerRemaining = getModeSeconds(timerMode);
  showTimerStatus('');
  updateModeButtons();
  updateTimerDisplay();
  updateTimerButtons();
  updateTimerSettingsInputs();

  showTimerSettingsMessage('设置已应用', false);
}

// 恢复默认时长 25 / 5 分钟。
function resetTimerSettings() {
  if (timerId !== null) {
    showTimerSettingsMessage('计时中无法恢复默认时长，请先暂停', true);
    return;
  }

  currentFocusMinutes = DEFAULT_FOCUS_MINUTES;
  currentBreakMinutes = DEFAULT_BREAK_MINUTES;
  saveTimerSettings();

  stopTicking();
  timerRemaining = getModeSeconds(timerMode);
  showTimerStatus('');
  updateModeButtons();
  updateTimerDisplay();
  updateTimerButtons();
  updateTimerSettingsInputs();

  showTimerSettingsMessage('已恢复默认时长 25 / 5 分钟', false);
}

// 计时器事件绑定与初始状态。
function initTimer() {
  timerStartBtn.addEventListener('click', startTimer);
  timerPauseBtn.addEventListener('click', pauseTimer);
  timerResumeBtn.addEventListener('click', resumeTimer);
  timerResetBtn.addEventListener('click', resetTimer);

  timerModeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchMode(btn.getAttribute('data-mode'));
    });
  });

  applySettingsBtn.addEventListener('click', applyTimerSettings);
  resetSettingsBtn.addEventListener('click', resetTimerSettings);

  // 初始化：先读取已保存的时长配置，再据此设置初始状态
  loadTimerSettings();
  timerMode = 'focus';
  timerRemaining = getModeSeconds('focus');
  timerId = null;
  timerEndTime = null;
  updateTimerSettingsInputs();
  updateModeButtons();
  updateTimerDisplay();
  updateTimerButtons();
}

/* ===== 学习资源库 ===== */

// 判断某条资源是否匹配关键词（仅匹配标题、忽略大小写、忽略所有空格）。
function matchesSearch(resource, keyword) {
  // 先 trim 去首尾空格，再去掉中间所有空白，并统一小写，
  // 这样关键词里无论混入多少空格，都不影响匹配。
  const kw = keyword.trim().replace(/\s+/g, '').toLowerCase();
  if (kw === '') {
    return true;
  }
  const title = resource.title.replace(/\s+/g, '').toLowerCase();
  return title.indexOf(kw) !== -1;
}

// 根据当前关键词与分类，筛选出要展示的网站。
function getFilteredResources() {
  const keyword = resourceSearch.value;
  const category = resourceCategory.value;

  return websites.filter(function (resource) {
    const matchKeyword = matchesSearch(resource, keyword);
    const matchCategory = category === 'all' || resource.category === category;
    return matchKeyword && matchCategory;
  });
}

// 渲染网站列表，并处理空状态。
function renderResources() {
  const filtered = getFilteredResources();
  resourceList.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'resource-empty';

    const text = document.createElement('p');
    text.textContent = websites.length === 0 ? '还没有收藏的网站' : '暂无匹配网站';
    empty.appendChild(text);

    if (websites.length === 0) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn btn-primary';
      addBtn.textContent = '添加第一个网站';
      addBtn.addEventListener('click', openAddWebsiteForm);
      empty.appendChild(addBtn);
    }

    resourceList.appendChild(empty);
    return;
  }

  filtered.forEach(function (resource) {
    resourceList.appendChild(createResourceCard(resource));
  });
}

// 为一条网站创建卡片 DOM。标题/描述/分类用 textContent，链接使用数据中的 url。
function createResourceCard(resource) {
  const card = document.createElement('article');
  card.className = 'resource-card';

  const header = document.createElement('div');
  header.className = 'resource-card-header';

  const title = document.createElement('h3');
  title.className = 'resource-title';
  title.textContent = resource.title;

  const categorySelect = document.createElement('select');
  categorySelect.className = 'resource-category-select';
  WEBSITE_CATEGORIES.forEach(function (cat) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (cat === resource.category) {
      opt.selected = true;
    }
    categorySelect.appendChild(opt);
  });
  categorySelect.addEventListener('change', function () {
    updateWebsiteCategory(resource.id, categorySelect.value);
  });

  header.appendChild(title);
  header.appendChild(categorySelect);

  const desc = document.createElement('p');
  desc.className = 'resource-desc';
  desc.textContent = resource.description;

  const footer = document.createElement('div');
  footer.className = 'resource-card-footer';

  const link = document.createElement('a');
  link.className = 'resource-link';
  link.href = resource.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = '打开网站 ↗';

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'resource-delete';
  deleteBtn.textContent = '删除';
  deleteBtn.addEventListener('click', function () {
    deleteWebsite(resource.id);
  });

  footer.appendChild(link);
  footer.appendChild(deleteBtn);

  card.appendChild(header);
  card.appendChild(desc);
  card.appendChild(footer);
  return card;
}

/* ===== 网站收藏夹管理 ===== */

// 校验网址：只接受 http/https，且能通过浏览器原生 URL 解析。
function isValidWebsiteUrl(raw) {
  const value = raw.trim();
  if (value === '') {
    return false;
  }
  let url;
  try {
    url = new URL(value);
  } catch (e) {
    return false;
  }
  return url.protocol === 'http:' || url.protocol === 'https:';
}

// 判断一条网站数据是否合法。
function isValidWebsite(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    typeof item.title === 'string' &&
    item.title.trim() !== '' &&
    typeof item.url === 'string' &&
    isValidWebsiteUrl(item.url) &&
    WEBSITE_CATEGORIES.indexOf(item.category) !== -1
  );
}

// 把一条网站数据规范化为统一结构，缺字段补默认值。
function normalizeWebsite(item) {
  return {
    id: typeof item.id === 'string' ? item.id : generateId(),
    title: item.title.trim(),
    category: item.category,
    description: typeof item.description === 'string' ? item.description : '',
    url: item.url
  };
}

// 从 localStorage 读取网站列表。
function loadWebsites() {
  const raw = localStorage.getItem(WEBSITES_KEY);

  // 情况 A：从未保存过 → 用默认资源作为初始列表并保存
  if (raw === null) {
    websites = RESOURCES.map(function (item) {
      return {
        id: generateId(),
        title: item.title,
        category: item.category,
        description: item.description,
        url: item.url
      };
    });
    saveWebsites();
    return;
  }

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    parsed = null;
  }

  // 情况 B：保存的是数组（含空数组 []）→ 校验后使用，空列表保持为空
  if (Array.isArray(parsed)) {
    websites = parsed.filter(isValidWebsite).map(normalizeWebsite);
    saveWebsites();
    return;
  }

  // 情况 C：数据损坏或不是数组 → 回退默认并修复存储
  websites = RESOURCES.map(function (item) {
    return {
      id: generateId(),
      title: item.title,
      category: item.category,
      description: item.description,
      url: item.url
    };
  });
  saveWebsites();
}

// 保存网站列表到 localStorage。
function saveWebsites() {
  localStorage.setItem(WEBSITES_KEY, JSON.stringify(websites));
}

// 打开 / 关闭 / 切换添加网站表单。
function openAddWebsiteForm() {
  addWebsiteForm.hidden = false;
  websiteTitleInput.value = '';
  websiteUrlInput.value = '';
  websiteCategoryInput.value = '数学';
  websiteDescInput.value = '';
  showWebsiteFormHint('');
  websiteTitleInput.focus();
}

function closeAddWebsiteForm() {
  addWebsiteForm.hidden = true;
  showWebsiteFormHint('');
}

function toggleAddWebsiteForm() {
  if (addWebsiteForm.hidden) {
    openAddWebsiteForm();
  } else {
    closeAddWebsiteForm();
  }
}

// 显示添加表单的提示信息。
function showWebsiteFormHint(message) {
  websiteFormHint.textContent = message || '';
  websiteFormHint.hidden = !message;
}

// 添加网站。
function addWebsite() {
  const title = websiteTitleInput.value.trim();
  const url = websiteUrlInput.value.trim();
  const category = websiteCategoryInput.value;
  const desc = websiteDescInput.value.trim();

  if (title === '') {
    showWebsiteFormHint('网站名称不能为空');
    return;
  }
  if (url === '') {
    showWebsiteFormHint('网站网址不能为空');
    return;
  }
  if (!isValidWebsiteUrl(url)) {
    showWebsiteFormHint('请输入有效的 http/https 网址，例如 https://example.com');
    return;
  }
  if (WEBSITE_CATEGORIES.indexOf(category) === -1) {
    showWebsiteFormHint('请选择有效的分类');
    return;
  }

  websites.push({
    id: generateId(),
    title: title,
    category: category,
    description: desc,
    url: url
  });
  saveWebsites();
  renderResources();
  closeAddWebsiteForm();
}

// 快捷修改网站的所属分类（仅改 category 字段）。
function updateWebsiteCategory(id, newCategory) {
  const site = websites.find(function (item) {
    return item.id === id;
  });
  if (!site) {
    return;
  }
  if (WEBSITE_CATEGORIES.indexOf(newCategory) === -1) {
    return;
  }
  if (site.category === newCategory) {
    return;
  }
  site.category = newCategory;
  saveWebsites();
  renderResources();
}

// 删除网站（删除前确认）。
function deleteWebsite(id) {
  const site = websites.find(function (item) {
    return item.id === id;
  });
  if (!site) {
    return;
  }
  if (!confirm('确定要删除「' + site.title + '」吗？')) {
    return;
  }
  websites = websites.filter(function (item) {
    return item.id !== id;
  });
  saveWebsites();
  renderResources();
}

// 资源库事件绑定与初始渲染。
function initResources() {
  loadWebsites();

  resourceSearch.addEventListener('input', renderResources);
  resourceCategory.addEventListener('change', renderResources);
  showAddWebsiteBtn.addEventListener('click', toggleAddWebsiteForm);
  saveWebsiteBtn.addEventListener('click', addWebsite);
  cancelWebsiteBtn.addEventListener('click', closeAddWebsiteForm);

  renderResources();
}

/* ===== 学习资料（IndexedDB） ===== */

// 打开（或复用）IndexedDB 数据库。
function openMaterialsDB() {
  return new Promise(function (resolve, reject) {
    if (materialsDB) {
      resolve(materialsDB);
      return;
    }
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前浏览器不支持 IndexedDB'));
      return;
    }
    const request = indexedDB.open(MATERIALS_DB_NAME, 1);
    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(MATERIALS_STORE)) {
        db.createObjectStore(MATERIALS_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = function (event) {
      materialsDB = event.target.result;
      resolve(materialsDB);
    };
    request.onerror = function (event) {
      reject(event.target.error || new Error('打开数据库失败'));
    };
  });
}

// 读取所有学习资料记录。
function idbGetAllMaterials() {
  return openMaterialsDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(MATERIALS_STORE, 'readonly');
      const store = tx.objectStore(MATERIALS_STORE);
      const req = store.getAll();
      req.onsuccess = function () {
        resolve(req.result || []);
      };
      req.onerror = function () {
        reject(req.error || new Error('读取资料失败'));
      };
    });
  });
}

// 读取单条记录（含文件本体）。
function idbGetMaterial(id) {
  return openMaterialsDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(MATERIALS_STORE, 'readonly');
      const store = tx.objectStore(MATERIALS_STORE);
      const req = store.get(id);
      req.onsuccess = function () {
        resolve(req.result || null);
      };
      req.onerror = function () {
        reject(req.error || new Error('读取资料失败'));
      };
    });
  });
}

// 保存一条记录。
function idbPutMaterial(record) {
  return openMaterialsDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(MATERIALS_STORE, 'readwrite');
      const store = tx.objectStore(MATERIALS_STORE);
      const req = store.put(record);
      req.onsuccess = function () {
        resolve();
      };
      req.onerror = function () {
        reject(req.error || new Error('保存资料失败'));
      };
    });
  });
}

// 删除一条记录。
function idbDeleteMaterial(id) {
  return openMaterialsDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(MATERIALS_STORE, 'readwrite');
      const store = tx.objectStore(MATERIALS_STORE);
      const req = store.delete(id);
      req.onsuccess = function () {
        resolve();
      };
      req.onerror = function () {
        reject(req.error || new Error('删除资料失败'));
      };
    });
  });
}

// 从 IndexedDB 加载资料元数据到内存。
function loadMaterials() {
  return idbGetAllMaterials().then(function (records) {
    materials = records.map(function (r) {
      return {
        id: r.id,
        name: r.name,
        mimeType: r.mimeType || '',
        size: r.size,
        category: r.category,
        addedAt: r.addedAt
      };
    });
  });
}

// 取文件扩展名（小写）。
function getMaterialExtension(name) {
  const i = name.lastIndexOf('.');
  if (i === -1) {
    return '';
  }
  return name.slice(i + 1).toLowerCase();
}

// 判断文件是否允许导入（扩展名 + 危险 MIME 双重校验）。
function isAllowedMaterial(file) {
  const ext = getMaterialExtension(file.name);
  if (ALLOWED_MATERIAL_EXTS.indexOf(ext) === -1) {
    return false;
  }
  if (file.type && BLOCKED_MATERIAL_MIME.indexOf(file.type.toLowerCase()) !== -1) {
    return false;
  }
  return true;
}

// 判断文件是否可预览（PDF 或图片）。
function canPreviewMaterial(mat) {
  const ext = getMaterialExtension(mat.name);
  return ext === 'pdf' || ['png', 'jpg', 'jpeg', 'webp', 'gif'].indexOf(ext) !== -1;
}

// 格式化文件大小。
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return bytes + ' B';
  }
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 格式化日期为 yyyy-mm-dd。
function formatDate(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

// 显示学习资料区域的提示。
function showMaterialMessage(message, isError) {
  materialMessage.textContent = message || '';
  materialMessage.hidden = !message;
  materialMessage.classList.toggle('error', isError === true);
  materialMessage.classList.toggle('success', isError === false);
}

// 根据关键词与分类筛选学习资料。
function getFilteredMaterials() {
  const keyword = materialSearch.value;
  const category = materialCategory.value;

  return materials.filter(function (mat) {
    const kw = keyword.trim().toLowerCase();
    const matchKeyword = kw === '' || mat.name.toLowerCase().indexOf(kw) !== -1;
    const matchCategory = category === 'all' || mat.category === category;
    return matchKeyword && matchCategory;
  });
}

// 渲染学习资料列表。
function renderMaterials() {
  const filtered = getFilteredMaterials();
  materialList.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'material-empty';
    empty.textContent = materials.length === 0 ? '还没有学习资料，点击「上传资料」添加吧！' : '暂无匹配资料';
    materialList.appendChild(empty);
    return;
  }

  filtered.forEach(function (mat) {
    materialList.appendChild(createMaterialItem(mat));
  });
}

// 为一条资料创建列表项。
function createMaterialItem(mat) {
  const item = document.createElement('div');
  item.className = 'material-item';

  const info = document.createElement('div');
  info.className = 'material-info';

  const name = document.createElement('div');
  name.className = 'material-name';
  name.textContent = mat.name;

  const meta = document.createElement('div');
  meta.className = 'material-meta';
  meta.textContent = getMaterialExtension(mat.name).toUpperCase() + ' · ' +
    formatFileSize(mat.size) + ' · ' + mat.category + ' · ' + formatDate(mat.addedAt);

  info.appendChild(name);
  info.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'material-actions';

  if (canPreviewMaterial(mat)) {
    const previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.className = 'btn';
    previewBtn.textContent = '预览';
    previewBtn.addEventListener('click', function () {
      previewMaterial(mat.id);
    });
    actions.appendChild(previewBtn);
  }

  const downloadBtn = document.createElement('button');
  downloadBtn.type = 'button';
  downloadBtn.className = 'btn';
  downloadBtn.textContent = '下载';
  downloadBtn.addEventListener('click', function () {
    downloadMaterial(mat.id);
  });
  actions.appendChild(downloadBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'resource-delete';
  deleteBtn.textContent = '删除';
  deleteBtn.addEventListener('click', function () {
    deleteMaterial(mat.id);
  });
  actions.appendChild(deleteBtn);

  item.appendChild(info);
  item.appendChild(actions);
  return item;
}

// 处理用户选择的文件（逐个校验、保存）。
function handleMaterialFiles(fileList) {
  const files = Array.prototype.slice.call(fileList);
  if (files.length === 0) {
    return;
  }
  const selectedCategory = materialUploadCategory.value;
  let ok = 0;
  let unsupported = 0;
  let tooBig = 0;
  let storageError = 0;

  const jobs = files.map(function (file) {
    if (!isAllowedMaterial(file)) {
      unsupported++;
      return Promise.resolve();
    }
    if (file.size > MAX_MATERIAL_SIZE) {
      tooBig++;
      return Promise.resolve();
    }
    const record = {
      id: generateId(),
      name: file.name,
      mimeType: file.type || '',
      size: file.size,
      category: selectedCategory,
      addedAt: Date.now(),
      blob: file
    };
    return idbPutMaterial(record).then(function () {
      ok++;
    }).catch(function () {
      storageError++;
    });
  });

  Promise.all(jobs).then(function () {
    return loadMaterials();
  }).then(function () {
    renderMaterials();
    let msg = '上传完成：成功 ' + ok + ' 个';
    const parts = [];
    if (unsupported > 0) { parts.push('格式不支持 ' + unsupported + ' 个'); }
    if (tooBig > 0) { parts.push('超出 20MB ' + tooBig + ' 个'); }
    if (storageError > 0) { parts.push('存储失败 ' + storageError + ' 个'); }
    if (parts.length > 0) { msg += '；' + parts.join('，'); }
    showMaterialMessage(msg, ok === 0);
    materialFileInput.value = '';
  });
}

// 预览资料（PDF 用 iframe，图片用 img）。
function previewMaterial(id) {
  idbGetMaterial(id).then(function (record) {
    if (!record || !record.blob) {
      showMaterialMessage('无法读取文件内容', true);
      return;
    }
    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
    }
    const url = URL.createObjectURL(record.blob);
    currentPreviewUrl = url;

    previewModalTitle.textContent = record.name;
    previewModalBody.innerHTML = '';

    if (getMaterialExtension(record.name) === 'pdf') {
      const iframe = document.createElement('iframe');
      iframe.className = 'preview-iframe';
      iframe.src = url;
      previewModalBody.appendChild(iframe);
    } else {
      const img = document.createElement('img');
      img.className = 'preview-img';
      img.src = url;
      img.alt = record.name;
      previewModalBody.appendChild(img);
    }
    previewModal.hidden = false;
  }).catch(function (err) {
    showMaterialMessage('预览失败：' + (err && err.message ? err.message : '未知错误'), true);
  });
}

// 关闭预览并清理临时 object URL。
function closePreview() {
  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
  }
  previewModalBody.innerHTML = '';
  previewModal.hidden = true;
}

// 下载资料。
function downloadMaterial(id) {
  idbGetMaterial(id).then(function (record) {
    if (!record || !record.blob) {
      showMaterialMessage('无法读取文件内容', true);
      return;
    }
    const url = URL.createObjectURL(record.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = record.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }).catch(function (err) {
    showMaterialMessage('下载失败：' + (err && err.message ? err.message : '未知错误'), true);
  });
}

// 删除资料。
function deleteMaterial(id) {
  const mat = materials.find(function (m) {
    return m.id === id;
  });
  if (!mat) {
    return;
  }
  if (!confirm('确定要删除「' + mat.name + '」吗？')) {
    return;
  }
  idbDeleteMaterial(id).then(function () {
    materials = materials.filter(function (m) {
      return m.id !== id;
    });
    renderMaterials();
    showMaterialMessage('已删除「' + mat.name + '」', false);
  }).catch(function (err) {
    showMaterialMessage('删除失败：' + (err && err.message ? err.message : '未知错误'), true);
  });
}

// 切换推荐网站 / 我的学习资料。
function switchResourceTab(tab) {
  resourceTabs.forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });
  websitePanel.classList.toggle('active', tab === 'websites');
  materialsPanel.classList.toggle('active', tab === 'materials');
}

// 资源库标签页事件绑定。
function initResourceTabs() {
  resourceTabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchResourceTab(btn.getAttribute('data-tab'));
    });
  });
}

// 学习资料事件绑定与初始加载。
function initMaterials() {
  uploadMaterialBtn.addEventListener('click', function () {
    materialFileInput.click();
  });
  materialFileInput.addEventListener('change', function () {
    handleMaterialFiles(materialFileInput.files);
  });
  materialSearch.addEventListener('input', renderMaterials);
  materialCategory.addEventListener('change', renderMaterials);
  previewModalClose.addEventListener('click', closePreview);

  // 按 Esc 关闭预览弹窗（仅在弹窗打开时生效）
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !previewModal.hidden) {
      closePreview();
    }
  });

  // 点击遮罩空白区域关闭（点击预览内容本身不关闭）
  previewModal.addEventListener('click', function (event) {
    if (event.target === previewModal) {
      closePreview();
    }
  });

  loadMaterials().then(function () {
    renderMaterials();
  }).catch(function (err) {
    materials = [];
    renderMaterials();
    showMaterialMessage('无法读取学习资料：' + (err && err.message ? err.message : '未知错误'), true);
  });
}

/* ===== 顶部导航切换 ===== */

// 切换到指定模块：更新导航高亮，并只显示对应的 section。
function switchSection(targetId) {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section');

  navLinks.forEach(function (item) {
    item.classList.toggle('active', item.getAttribute('data-section') === targetId);
  });

  sections.forEach(function (section) {
    section.classList.toggle('active', section.id === targetId);
  });
}

// 为顶部导航按钮绑定点击事件。
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      switchSection(link.getAttribute('data-section'));
    });
  });
}

/* ===== 首页快捷入口与初始化 ===== */

// 绑定首页快捷入口按钮。
function initQuickActions() {
  const newTaskBtn = document.getElementById('quick-new-task');
  const focusBtn = document.getElementById('quick-focus');
  const resourcesBtn = document.getElementById('quick-resources');
  const viewAllBtn = document.getElementById('todo-view-all');
  const welcomeTasksBtn = document.getElementById('welcome-tasks');
  const welcomeFocusBtn = document.getElementById('welcome-focus');

  newTaskBtn.addEventListener('click', function () {
    switchSection('tasks');
    taskInput.focus();
  });
  focusBtn.addEventListener('click', function () {
    switchSection('timer');
  });
  resourcesBtn.addEventListener('click', function () {
    switchSection('resources');
  });
  viewAllBtn.addEventListener('click', function () {
    switchSection('tasks');
  });
  welcomeTasksBtn.addEventListener('click', function () {
    switchSection('tasks');
  });
  welcomeFocusBtn.addEventListener('click', function () {
    switchSection('timer');
  });
}

// 初始化首页：渲染静态的资源推荐（待办预览由 updateDashboard 触发）。
function initDashboard() {
  renderResourcePreview();
}

/* ===== 任务管理事件绑定 ===== */

function initTasks() {
  // 点击"添加"按钮
  addTaskBtn.addEventListener('click', addTask);

  // 在输入框中按 Enter 键（排除输入法组词过程中的 Enter，避免误触发添加）
  taskInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.isComposing) {
      addTask();
    }
  });

  // 输入时自动清除错误提示
  taskInput.addEventListener('input', function () {
    showInputHint('');
  });

  // 筛选按钮
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setFilter(btn.getAttribute('data-filter'));
    });
  });

  // 任务列表使用"事件委托"：点击列表时判断点的是"删除"还是"完成切换"。
  // 只绑定一次，避免了重复绑定监听器的问题。
  taskList.addEventListener('click', function (event) {
    const li = event.target.closest('.task-item');
    if (!li) {
      return;
    }
    const id = li.dataset.id;

    if (event.target.closest('.task-delete')) {
      deleteTask(id);
    } else if (event.target.closest('.task-check')) {
      toggleTask(id);
    }
  });

  // 初始化：读取已有数据并渲染，随后刷新仪表盘统计
  loadTasks();
  renderTasks();
  updateDashboard();
}

/* ===== 主题（浅色 / 深色 / 跟随系统） ===== */

const THEME_KEY = 'zhixing-theme';
const THEME_NEXT = { light: 'dark', dark: 'system', system: 'light' };

// 当前用户选择：'light' | 'dark' | 'system'
let themeChoice = 'system';
// matchMedia 对象（仅在 system 状态下监听）
let themeMediaQuery = null;

// 从 localStorage 读取用户选择。
function loadThemeChoice() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (e) {
    saved = null;
  }
  themeChoice = (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'system';
}

// 保存用户选择（localStorage 不可用时忽略）。
function saveThemeChoice() {
  try {
    localStorage.setItem(THEME_KEY, themeChoice);
  } catch (e) {
    /* 忽略 */
  }
}

// 把用户选择解析为实际主题（light / dark）。
function resolveTheme() {
  if (themeChoice === 'light') {
    return 'light';
  }
  if (themeChoice === 'dark') {
    return 'dark';
  }
  // system：跟随系统偏好
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

// 应用主题，并更新切换按钮的状态。
function applyTheme() {
  document.documentElement.setAttribute('data-theme', resolveTheme());

  const btn = document.getElementById('theme-toggle');
  const label = document.getElementById('theme-toggle-label');
  if (btn) {
    btn.setAttribute('data-choice', themeChoice);
    const labelText = themeChoice === 'light' ? '浅色' : themeChoice === 'dark' ? '深色' : '系统';
    if (label) {
      label.textContent = labelText;
    }
    const nextText = THEME_NEXT[themeChoice] === 'light' ? '浅色' : THEME_NEXT[themeChoice] === 'dark' ? '深色' : '系统';
    const desc = '当前主题：' + labelText + '，点击切换为' + nextText;
    btn.setAttribute('aria-label', desc);
    btn.setAttribute('title', desc);
  }
}

// 系统主题变化时（仅 system 状态下）更新。
function handleSystemThemeChange() {
  if (themeChoice === 'system') {
    applyTheme();
  }
}

// 管理 system 状态下的 matchMedia 监听，避免重复绑定 / 遗留监听。
function manageThemeListener() {
  if (themeChoice === 'system') {
    if (!themeMediaQuery && window.matchMedia) {
      themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (themeMediaQuery.addEventListener) {
        themeMediaQuery.addEventListener('change', handleSystemThemeChange);
      } else if (themeMediaQuery.addListener) {
        themeMediaQuery.addListener(handleSystemThemeChange);
      }
    }
  } else {
    if (themeMediaQuery) {
      if (themeMediaQuery.removeEventListener) {
        themeMediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else if (themeMediaQuery.removeListener) {
        themeMediaQuery.removeListener(handleSystemThemeChange);
      }
      themeMediaQuery = null;
    }
  }
}

// 切换主题（浅色 → 深色 → 系统 → 浅色）。
function toggleTheme() {
  themeChoice = THEME_NEXT[themeChoice];
  saveThemeChoice();
  applyTheme();
  manageThemeListener();
}

// 初始化主题。
function initTheme() {
  loadThemeChoice();
  applyTheme();
  manageThemeListener();
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', toggleTheme);
  }
}

/* ===== 启动 ===== */

document.addEventListener('DOMContentLoaded', function () {
  initTheme();
  initNavigation();
  initTasks();
  initTimer();
  initResources();
  initResourceTabs();
  initMaterials();
  initQuickActions();
  initDashboard();
});
