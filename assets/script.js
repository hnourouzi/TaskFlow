(function () {
  "use strict";

  // ========== STORAGE KEYS (as specified) ==========
  const KEYS = {
    user: "tf-user",
    categories: "tf-categories",
    tasks: "tf-tasks",
    theme: "tf-theme",
  };

  // ========== HELPERS ==========
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  function esc(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function hashPwd(pwd) {
    let h = 0;
    for (let i = 0; i < pwd.length; i++) {
      h = (h << 5) - h + pwd.charCodeAt(i);
      h = h & h;
    }
    let s = Math.abs(h).toString(36);
    for (let r = 0; r < 5; r++) {
      let rh = 0;
      for (let j = 0; j < s.length; j++) {
        rh = (rh << 5) - rh + s.charCodeAt(j);
        rh = rh & rh;
      }
      s = Math.abs(rh).toString(36);
    }
    return "tf$" + Math.abs(h).toString(36) + "$" + s;
  }

  function timeAgo(ts) {
    const now = Date.now();
    const d = now - ts;
    const m = Math.floor(d / 60000);
    const h = Math.floor(d / 3600000);
    const dy = Math.floor(d / 86400000);
    if (m < 1) return "لحظه گذشته";
    if (m < 60) return m + " دقیقه پیش";
    if (h < 24) return h + " ساعت پیش";
    if (dy < 30) return dy + " روز پیش";
    return new Date(ts).toLocaleDateString("fa-IR", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $("toast");
    $("toastMsg").textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("hidden"), 2800);
  }

  function $(id) {
    return document.getElementById(id);
  }

  // ========== STORAGE ==========
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.user));
    } catch {
      return null;
    }
  }
  function setUser(u) {
    localStorage.setItem(KEYS.user, JSON.stringify(u));
  }

  function getCategories() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.categories)) || [];
    } catch {
      return [];
    }
  }
  function setCategories(c) {
    localStorage.setItem(KEYS.categories, JSON.stringify(c));
  }

  function getTasks() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.tasks)) || [];
    } catch {
      return [];
    }
  }
  function setTasks(t) {
    localStorage.setItem(KEYS.tasks, JSON.stringify(t));
  }

  function getTheme() {
    return localStorage.getItem(KEYS.theme) || "light";
  }
  function setThemeStorage(t) {
    localStorage.setItem(KEYS.theme, t);
  }

  // ========== STATE ==========
  let activeCategoryId = null; // null = "All Tasks", string = specific category
  let selectedEmoji = "📁";
  let editingTaskId = null;
  let confirmCallback = null;
  let isSignUpMode = false; // Sign in vs sign up mode

  const EMOJIS = [
    "📁",
    "🏠",
    "💼",
    "🛒",
    "📚",
    "🎯",
    "💡",
    "🎨",
    "🏃",
    "✈️",
    "🎮",
    "🎵",
    "📱",
    "🔧",
    "❤️",
    "⭐",
    "🍕",
    "🌱",
    "💰",
    "🧠",
    "🎬",
    "📝",
    "🔬",
    "🏖️",
  ];

  // ========== DARK MODE ==========
  function applyTheme(theme) {
    const isDark = theme === "dark";
    const html = document.documentElement;

    if (isDark) {
      html.classList.add("dark");
      document.body.classList.remove("bg-gray-50", "text-gray-900");
      document.body.classList.add("bg-slate-900", "text-slate-100");
    } else {
      html.classList.remove("dark");
      document.body.classList.remove("bg-slate-900", "text-slate-100");
      document.body.classList.add("bg-gray-50", "text-gray-900");
    }

    // Header
    const hdr = $("appHeader");
    hdr.classList.toggle("bg-white", !isDark);
    hdr.classList.toggle("border-gray-200", !isDark);
    hdr.classList.toggle("bg-slate-800", isDark);
    hdr.classList.toggle("border-slate-700", isDark);

    // Sidebar
    const sb = $("sidebar");
    sb.classList.toggle("bg-white", !isDark);
    sb.classList.toggle("border-gray-200", !isDark);
    sb.classList.toggle("bg-slate-800", isDark);
    sb.classList.toggle("border-slate-700", isDark);

    // Modals
    document.querySelectorAll(".modal-card").forEach((mc) => {
      mc.classList.toggle("bg-white", !isDark);
      mc.classList.toggle("bg-slate-800", isDark);
    });

    // Icons
    $("iconSun").classList.toggle("hidden", !isDark);
    $("iconMoon").classList.toggle("hidden", isDark);
  }

  function toggleTheme() {
    const next = getTheme() === "dark" ? "light" : "dark";
    setThemeStorage(next);
    applyTheme(next);
    renderCategories();
    renderTasks();
  }

  // ========== AUTH MODE TOGGLE ==========
  function toggleAuthMode(toSignUp) {
    isSignUpMode = toSignUp;

    const emailField = $("emailField");
    const signInBtn = $("signInToggle");
    const signUpBtn = $("signUpToggle");
    const authWarning = $("authWarning");

    if (toSignUp) {
      // Sign up mode
      emailField.classList.remove("hidden");
      authWarning.classList.remove("hidden");
      $("authHeading").textContent = "حساب جدید ایجاد کنید";
      $("authSubheading").textContent =
        "نام کاربری، ایمیل و رمز عبور خود را وارد کنید";
      $("authSubmitBtn").textContent = "ثبت نام";
      $("authUsername").required = true;
      $("authEmail").required = true;
      $("authPassword").required = true;
      $("authToggleText").textContent =
        "قبلاً حساب دارید؟ برای ورود اینجا کلیک کنید.";

      signUpBtn.className =
        "flex-1 px-4 py-2 bg-white text-gray-800 font-semibold rounded-lg transition-all shadow-sm";
      signInBtn.className =
        "flex-1 px-4 py-2 text-gray-600 font-semibold rounded-lg transition-all hover:bg-white/50";
    } else {
      // Sign in mode
      emailField.classList.add("hidden");
      authWarning.classList.add("hidden");
      $("authHeading").textContent = "خوش آمدید";
      $("authSubheading").textContent =
        "برای ورود نام کاربری و رمز عبور خود را وارد کنید";
      $("authSubmitBtn").textContent = "ورود";
      $("authUsername").required = true;
      $("authEmail").required = false;
      $("authPassword").required = true;
      $("authToggleText").textContent =
        "حساب جدید نمی‌خواهید؟ برای ثبت‌نام اینجا کلیک کنید.";

      signInBtn.className =
        "flex-1 px-4 py-2 bg-white text-gray-800 font-semibold rounded-lg transition-all shadow-sm";
      signUpBtn.className =
        "flex-1 px-4 py-2 text-gray-600 font-semibold rounded-lg transition-all hover:bg-white/50";
    }

    hideAuthError();
    hideAuthInfo();
  }

  // ========== AUTH ==========
  function showAuth() {
    $("authScreen").classList.remove("hidden");
    $("appScreen").classList.add("hidden");

    isSignUpMode = false;
    toggleAuthMode(false);

    $("authUsername").value = "";
    $("authEmail").value = "";
    $("authPassword").value = "";
    hideAuthError();
    hideAuthInfo();
  }

  function hideAuthError() {
    $("authError").classList.add("hidden");
  }
  function showAuthError(msg) {
    const el = $("authError");
    el.textContent = msg;
    el.classList.remove("hidden");
    el.classList.remove("anim-shake");
    void el.offsetWidth;
    el.classList.add("anim-shake");
  }
  function hideAuthInfo() {
    $("authInfo").classList.add("hidden");
  }
  function showAuthInfo(msg) {
    const el = $("authInfo");
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function handleAuth(e) {
    e.preventDefault();
    const username = $("authUsername").value.trim();
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;

    if (username.length < 3) {
      showAuthError("نام کاربری حداقل 3 کاراکتر باشد.");
      return;
    }
    if (password.length < 4) {
      showAuthError("رمز عبور حداقل 4 کاراکتر باشد.");
      return;
    }

    const stored = getUser();
    const hashed = hashPwd(password);

    if (isSignUpMode) {
      // Registration mode
      if (!email) {
        showAuthError("لطفاً ایمیل خود را وارد کنید.");
        return;
      }
      // Clear previous user data
      localStorage.removeItem(KEYS.user);
      localStorage.removeItem(KEYS.categories);
      localStorage.removeItem(KEYS.tasks);
      // Create new account
      setUser({ username, email, password: hashed });
      const defaults = [
        { id: uid(), name: "شخصی", emoji: "🏠", createdAt: Date.now() },
        { id: uid(), name: "کار", emoji: "💼", createdAt: Date.now() },
        { id: uid(), name: "خرید", emoji: "🛒", createdAt: Date.now() },
      ];
      setCategories(defaults);
      setTasks([]);
      hideAuthError();
      enterApp(username);
      toast("حساب کاربری با موفقیت ساخته شد. به تسک‌فلو خوش آمدید!");
    } else {
      // Sign in mode
      if (!stored) {
        showAuthError("حساب کاربری یافت نشد. لطفاً ابتدا ثبت‌نام کنید.");
        return;
      }
      if (stored.username === username && stored.password === hashed) {
        hideAuthError();
        enterApp(username);
      } else {
        showAuthError("نام کاربری یا رمز عبور اشتباه است.");
      }
    }
  }

  // ========== ENTER APP ==========
  function enterApp(username) {
    $("authScreen").classList.add("hidden");
    $("appScreen").classList.remove("hidden");

    $("headerUsername").textContent = username;
    $("headerAvatar").textContent = username.charAt(0).toUpperCase();

    activeCategoryId = null;
    applyTheme(getTheme());
    renderCategories();
    updateProgress();
    showEmptyState();
  }

  // ========== LOGOUT ==========
  function logout() {
    activeCategoryId = null;
    showAuth();
    toast("خروج از حساب");
  }

  // ========== CLEAR ALL ==========
  function clearAll() {
    openConfirm(
      "حذف تمام داده‌ها",
      "این اقدام تمام دسته‌بندی‌ها، کارها و حساب شما را دائما حذف خواهد کرد و این عمل قابل برگشت نیست.",
      "همه‌چیز را کار ببرید",
      () => {
        localStorage.removeItem(KEYS.user);
        localStorage.removeItem(KEYS.categories);
        localStorage.removeItem(KEYS.tasks);
        localStorage.removeItem(KEYS.theme);
        activeCategoryId = null;
        document.documentElement.classList.remove("dark");
        document.body.classList.remove("bg-slate-900", "text-slate-100");
        document.body.classList.add("bg-gray-50", "text-gray-900");
        applyTheme("light");
        showAuth();
        toast("تمام داده‌ها حذف شد");
      },
    );
  }

  // ========== SIDEBAR ==========
  function openSidebar() {
    $("sidebar").classList.remove("-translate-x-full");
    $("sidebarOverlay").classList.remove("hidden");
  }
  function closeSidebar() {
    $("sidebar").classList.add("-translate-x-full");
    $("sidebarOverlay").classList.add("hidden");
  }
  function closeSidebarIfMobile() {
    if (window.innerWidth < 1024) closeSidebar();
  }

  // ========== EMPTY STATE ==========
  function showEmptyState() {
    $("emptyState").classList.remove("hidden");
    $("taskPanel").classList.add("hidden");
  }
  function showTaskPanel() {
    $("emptyState").classList.add("hidden");
    $("taskPanel").classList.remove("hidden");
  }

  // ========== CATEGORIES ==========
  function renderCategories() {
    const cats = getCategories();
    const tasks = getTasks();
    const isDark = getTheme() === "dark";
    const container = $("categoryList");

    // Update "All Tasks" count
    $("allTasksCount").textContent = tasks.length;
    // Style "All Tasks" button based on active state
    const allBtn = $("allTasksBtn");
    if (
      activeCategoryId === null &&
      $("taskPanel") &&
      !$("taskPanel").classList.contains("hidden")
    ) {
      allBtn.className =
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border " +
        (isDark
          ? "bg-brand-900/40 border-brand-700 text-brand-300"
          : "bg-brand-50 border-brand-200 text-brand-700");
    } else {
      allBtn.className =
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-transparent " +
        (isDark
          ? "hover:bg-slate-700 text-slate-400"
          : "hover:bg-gray-50 text-gray-600");
    }

    if (cats.length === 0) {
      container.innerHTML = `<div class="text-center py-10 text-sm ${isDark ? "text-slate-500" : "text-gray-400"}">
          <p class="font-medium">هنوز دسته‌بندی‌ای ایجاد نشده</p>
          <p class="mt-1 text-xs">برای ایجاد یکی بر + بالا کلیک کنید</p>
        </div>`;
      return;
    }

    container.innerHTML = cats
      .map((cat) => {
        const catTasks = tasks.filter((t) => t.categoryId === cat.id);
        const doneCount = catTasks.filter((t) => t.status === "done").length;
        const total = catTasks.length;
        const isActive = cat.id === activeCategoryId;

        let cls;
        if (isActive) {
          cls = isDark
            ? "bg-brand-900/40 border-brand-700 text-brand-300"
            : "bg-brand-50 border-brand-200 text-brand-700";
        } else {
          cls = isDark
            ? "hover:bg-slate-700 border-transparent text-slate-300"
            : "hover:bg-gray-50 border-transparent text-gray-700";
        }

        return `<div class="cat-item group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer border ${cls} transition-all"
                     data-catid="${cat.id}">
          <span class="text-lg flex-shrink-0">${cat.emoji}</span>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-sm truncate">${esc(cat.name)}</p>
            <p class="text-xs ${isDark ? "text-slate-500" : "text-gray-400"}">${doneCount}/${total} انجام شده</p>
          </div>
          <button class="cat-delete-btn opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-500 rounded-lg transition-all flex-shrink-0" title="Delete" data-catid="${cat.id}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>`;
      })
      .join("");

    // Event delegation for category clicks
    container.querySelectorAll(".cat-item").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.target.closest(".cat-delete-btn")) return;
        selectCategory(el.dataset.catid);
      });
    });
    container.querySelectorAll(".cat-delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteCategory(btn.dataset.catid);
      });
    });
  }

  function selectCategory(id) {
    activeCategoryId = id;
    renderCategories();
    renderTasks();
    showTaskPanel();
    closeSidebarIfMobile();
  }

  function selectAllTasks() {
    activeCategoryId = null;
    renderCategories();
    renderTasks();
    showTaskPanel();
    closeSidebarIfMobile();
  }

  function deleteCategory(id) {
    const cats = getCategories();
    const cat = cats.find((c) => c.id === id);
    if (!cat) return;

    openConfirm(
      "حذف دسته‌بندی",
      `"${cat.name}" را و تمام کارهای آن حذف کنم؟"`,
      "حذف",
      () => {
        setCategories(cats.filter((c) => c.id !== id));
        // Also delete all tasks in this category
        setTasks(getTasks().filter((t) => t.categoryId !== id));
        if (activeCategoryId === id) {
          activeCategoryId = null;
          showEmptyState();
        }
        renderCategories();
        renderTasks();
        updateProgress();
        toast(`"${cat.name}" حذف شد`);
      },
    );
  }

  // ========== ADD CATEGORY MODAL ==========
  function openAddCatModal() {
    $("addCatModal").classList.remove("hidden");
    $("catNameInput").value = "";
    selectedEmoji = "📁";
    renderEmojiPicker();
    applyModalTheme();
    setTimeout(() => $("catNameInput").focus(), 100);
  }
  function closeAddCatModal() {
    $("addCatModal").classList.add("hidden");
  }
  function renderEmojiPicker() {
    const isDark = getTheme() === "dark";
    $("emojiPicker").innerHTML = EMOJIS.map((e) => {
      const sel = e === selectedEmoji;
      const cls = sel
        ? "ring-2 ring-brand-500 bg-brand-50 scale-110"
        : isDark
          ? "hover:bg-slate-600 bg-slate-700"
          : "hover:bg-gray-100 bg-gray-50";
      return `<button type="button" class="emoji-pick w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${cls}" data-emoji="${e}">${e}</button>`;
    }).join("");

    $("emojiPicker")
      .querySelectorAll(".emoji-pick")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedEmoji = btn.dataset.emoji;
          renderEmojiPicker();
        });
      });
  }
  function confirmAddCategory() {
    const name = $("catNameInput").value.trim();
    if (!name) {
      $("catNameInput").focus();
      return;
    }
    const cats = getCategories();
    cats.push({ id: uid(), name, emoji: selectedEmoji, createdAt: Date.now() });
    setCategories(cats);
    closeAddCatModal();
    renderCategories();
    selectCategory(cats[cats.length - 1].id);
    toast(`"${name}" ایجاد شد`);
  }

  // ========== TASKS ==========
  function getSearchTerm() {
    return ($("searchInput").value || $("searchInputMobile").value || "")
      .toLowerCase()
      .trim();
  }

  function getFilteredSortedTasks() {
    let tasks = getTasks();

    // Filter by category
    if (activeCategoryId !== null) {
      tasks = tasks.filter((t) => t.categoryId === activeCategoryId);
    }

    // Filter by search
    const q = getSearchTerm();
    if (q) {
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)),
      );
    }

    // Sort
    const sort = $("sortSelect").value;
    switch (sort) {
      case "newest":
        tasks.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "oldest":
        tasks.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case "az":
        tasks.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "za":
        tasks.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "pending":
        tasks.sort(
          (a, b) =>
            (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0),
        );
        break;
      case "done":
        tasks.sort(
          (a, b) =>
            (b.status === "done" ? 1 : 0) - (a.status === "done" ? 1 : 0),
        );
        break;
    }
    return tasks;
  }

  function renderTasks() {
    const allTasks = getTasks();
    const isDark = getTheme() === "dark";

    // Header
    if (activeCategoryId === null) {
      $("panelCategoryName").textContent = "📋 تمام کارها";
      const total = allTasks.length;
      const done = allTasks.filter((t) => t.status === "done").length;
      $("panelTaskCount").textContent = `${total} کار ${done} انجام شده`;
    } else {
      const cats = getCategories();
      const cat = cats.find((c) => c.id === activeCategoryId);
      if (!cat) {
        showEmptyState();
        return;
      }
      const catTasks = allTasks.filter(
        (t) => t.categoryId === activeCategoryId,
      );
      $("panelCategoryName").textContent = cat.emoji + " " + cat.name;
      const total = catTasks.length;
      const done = catTasks.filter((t) => t.status === "done").length;
      $("panelTaskCount").textContent = `${total} کار ${done} انجام شده`;
    }

    const tasks = getFilteredSortedTasks();

    const listEl = $("taskList");
    const emptyEl = $("emptyTasks");

    if (tasks.length === 0) {
      listEl.innerHTML = "";
      emptyEl.classList.remove("hidden");
      // If searching and no results, show different message
      if (getSearchTerm()) {
        emptyEl.innerHTML = `<div class="py-16 text-center select-none">
            <div class="w-20 h-20 ${isDark ? "bg-slate-700" : "bg-gray-100"} rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg class="w-10 h-10 ${isDark ? "text-slate-500" : "text-gray-300"}" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <h4 class="font-bold ${isDark ? "text-slate-400" : "text-gray-400"} mb-1 text-lg">هیچ مطابقتی نیست</h4>
            <p class="text-sm ${isDark ? "text-slate-500" : "text-gray-400"}">عبارت جستجو خود را برای دوباره سعی کنید</p>
          </div>`;
      } else {
        emptyEl.innerHTML = `<div class="py-16 text-center select-none">
            <div class="w-20 h-20 ${isDark ? "bg-slate-700" : "bg-gray-100"} rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg class="w-10 h-10 ${isDark ? "text-slate-500" : "text-gray-300"}" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
            </div>
            <h4 class="font-bold ${isDark ? "text-slate-400" : "text-gray-400"} mb-1 text-lg">کاری اینجا وجود ندارد</h4>
            <p class="text-sm ${isDark ? "text-slate-500" : "text-gray-400"}">برای افزودن اولین کار "افزودن کار" را کلیک کنید!</p>
          </div>`;
      }
      return;
    }

    emptyEl.classList.add("hidden");
    const cats = getCategories();

    const cardBg = isDark
      ? "bg-slate-800 border-slate-700"
      : "bg-white border-gray-100";
    const hoverBg = isDark
      ? "hover:border-slate-600"
      : "hover:border-gray-200 hover:shadow-sm";
    const mutedText = isDark ? "text-slate-500" : "text-gray-400";
    const descText = isDark ? "text-slate-400" : "text-gray-500";

    listEl.innerHTML = tasks
      .map((task, i) => {
        const isDone = task.status === "done";
        const cat = cats.find((c) => c.id === task.categoryId);
        const catLabel =
          activeCategoryId === null && cat
            ? `<span class="inline-flex items-center gap-1 text-xs ${isDark ? "bg-slate-700 text-slate-400" : "bg-gray-100 text-gray-500"} px-2 py-0.5 rounded-full font-medium">${cat.emoji} ${esc(cat.name)}</span>`
            : "";

        return `<div class="task-card ${isDone ? "is-done" : ""} group ${cardBg} border rounded-xl p-4 ${hoverBg} transition-all anim-fadeInUp" style="animation-delay:${i * 40}ms" data-taskid="${task.id}">
          <div class="flex items-start gap-3">
            <input type="checkbox" ${isDone ? "checked" : ""} class="task-checkbox mt-0.5" data-taskid="${task.id}">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="task-title-text font-semibold text-sm leading-snug">${esc(task.title)}</p>
                ${catLabel}
              </div>
              ${task.description ? `<p class="task-desc-text text-xs ${descText} mt-1.5 leading-relaxed">${esc(task.description)}</p>` : ""}
              <div class="flex items-center gap-3 mt-2">
                <p class="text-xs ${mutedText} font-medium">${timeAgo(task.createdAt)}</p>
                <span class="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${isDone ? "bg-green-100 text-green-700" : isDark ? "bg-amber-900/40 text-amber-400" : "bg-amber-50 text-amber-600"}">${isDone ? "انجام شده" : "وارسعه"}</span>
              </div>
            </div>
            <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button class="task-edit-btn p-1.5 ${isDark ? "hover:bg-slate-600" : "hover:bg-brand-50"} hover:text-brand-600 rounded-lg transition-colors" title="Edit" data-taskid="${task.id}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button class="task-delete-btn p-1.5 ${isDark ? "hover:bg-red-900/40" : "hover:bg-red-50"} hover:text-red-500 rounded-lg transition-colors" title="Delete" data-taskid="${task.id}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>`;
      })
      .join("");

    // Bind events
    listEl.querySelectorAll(".task-checkbox").forEach((cb) => {
      cb.addEventListener("change", () => toggleTaskStatus(cb.dataset.taskid));
    });
    listEl.querySelectorAll(".task-edit-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        openEditTaskModal(btn.dataset.taskid),
      );
    });
    listEl.querySelectorAll(".task-delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteTask(btn.dataset.taskid));
    });
  }

  function toggleTaskStatus(id) {
    const tasks = getTasks();
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    t.status = t.status === "done" ? "pending" : "done";
    setTasks(tasks);
    renderTasks();
    renderCategories();
    updateProgress();
  }

  function deleteTask(id) {
    const tasks = getTasks();
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    openConfirm(
      "حذف کار",
      `"${t.title}" را حذف کنم؟ این عمل قابل برگشت نیست.`,
      "حذف",
      () => {
        setTasks(tasks.filter((x) => x.id !== id));
        renderTasks();
        renderCategories();
        updateProgress();
        toast("کار حذف شد");
      },
    );
  }

  // ========== ADD TASK MODAL ==========
  function openAddTaskModal() {
    if (activeCategoryId === null) {
      // If "All Tasks" is shown, user needs to pick a category... just use first one or prompt
      const cats = getCategories();
      if (cats.length === 0) {
        toast("ابتدا یک دسته‌بندی ایجاد کنید!");
        return;
      }
    }
    $("addTaskModal").classList.remove("hidden");
    $("taskTitleInput").value = "";
    $("taskDescInput").value = "";
    applyModalTheme();
    setTimeout(() => $("taskTitleInput").focus(), 100);
  }
  function closeAddTaskModal() {
    $("addTaskModal").classList.add("hidden");
  }
  function confirmAddTask() {
    const title = $("taskTitleInput").value.trim();
    if (!title) {
      $("taskTitleInput").focus();
      return;
    }

    let catId = activeCategoryId;
    if (catId === null) {
      // Pick first category
      const cats = getCategories();
      if (cats.length === 0) {
        toast("ابتدا یک دسته‌بندی ایجاد کنید!");
        return;
      }
      catId = cats[0].id;
    }

    const tasks = getTasks();
    tasks.push({
      id: uid(),
      title,
      description: $("taskDescInput").value.trim(),
      categoryId: catId,
      status: "pending",
      createdAt: Date.now(),
    });
    setTasks(tasks);
    closeAddTaskModal();
    renderTasks();
    renderCategories();
    updateProgress();
    toast("کار افزوده شد");
  }

  // ========== EDIT TASK MODAL ==========
  function openEditTaskModal(id) {
    const tasks = getTasks();
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    editingTaskId = id;
    $("editTitleInput").value = t.title;
    $("editDescInput").value = t.description || "";
    $("editTaskModal").classList.remove("hidden");
    applyModalTheme();
    setTimeout(() => $("editTitleInput").focus(), 100);
  }
  function closeEditTaskModal() {
    $("editTaskModal").classList.add("hidden");
    editingTaskId = null;
  }
  function confirmEditTask() {
    if (!editingTaskId) return;
    const title = $("editTitleInput").value.trim();
    if (!title) {
      $("editTitleInput").focus();
      return;
    }
    const tasks = getTasks();
    const t = tasks.find((x) => x.id === editingTaskId);
    if (!t) return;
    t.title = title;
    t.description = $("editDescInput").value.trim();
    setTasks(tasks);
    closeEditTaskModal();
    renderTasks();
    toast("کار به‌روز‌رسانی شد");
  }

  // ========== CONFIRM MODAL ==========
  function openConfirm(title, msg, btnText, cb) {
    $("confirmTitle").textContent = title;
    $("confirmMessage").textContent = msg;
    $("confirmOkBtn").textContent = btnText;
    $("confirmModal").classList.remove("hidden");
    applyModalTheme();
    confirmCallback = cb;
  }
  function closeConfirm() {
    $("confirmModal").classList.add("hidden");
    confirmCallback = null;
  }
  function execConfirm() {
    const cb = confirmCallback;
    closeConfirm();
    if (cb) cb();
  }

  // ========== PROGRESS ==========
  function updateProgress() {
    const tasks = getTasks();
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    $("progressPct").textContent = pct + "%";
    $("progressBar").style.width = pct + "%";
    $("progressLabel").textContent = `${done} از ${total} کار انجام شده`;
  }

  // ========== MODAL THEME HELPER ==========
  function applyModalTheme() {
    const isDark = getTheme() === "dark";
    document.querySelectorAll(".modal-card").forEach((mc) => {
      mc.classList.toggle("bg-white", !isDark);
      mc.classList.toggle("bg-slate-800", isDark);
    });
  }

  // ========== EVENT BINDING ==========
  document.addEventListener("DOMContentLoaded", () => {
    // Auth
    $("authForm").addEventListener("submit", handleAuth);
    $("signInToggle").addEventListener("click", () => toggleAuthMode(false));
    $("signUpToggle").addEventListener("click", () => toggleAuthMode(true));
    $("togglePwdBtn").addEventListener("click", () => {
      const inp = $("authPassword");
      const isP = inp.type === "password";
      inp.type = isP ? "text" : "password";
      $("eyeOpen").classList.toggle("hidden", !isP);
      $("eyeClosed").classList.toggle("hidden", isP);
    });

    // Header
    $("themeToggleBtn").addEventListener("click", toggleTheme);
    $("logoutBtn").addEventListener("click", logout);
    $("clearAllBtn").addEventListener("click", clearAll);
    $("menuToggleBtn").addEventListener("click", openSidebar);

    // Sidebar
    $("closeSidebarBtn").addEventListener("click", closeSidebar);
    $("sidebarOverlay").addEventListener("click", closeSidebar);
    $("allTasksBtn").addEventListener("click", selectAllTasks);

    // Add category modal
    $("openAddCatBtn").addEventListener("click", openAddCatModal);
    $("closeAddCatBtn").addEventListener("click", closeAddCatModal);
    $("cancelAddCatBtn").addEventListener("click", closeAddCatModal);
    $("addCatModalOverlay").addEventListener("click", closeAddCatModal);
    $("confirmAddCatBtn").addEventListener("click", confirmAddCategory);
    $("catNameInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") confirmAddCategory();
    });

    // Add task modal
    $("openAddTaskBtn").addEventListener("click", openAddTaskModal);
    $("closeAddTaskBtn").addEventListener("click", closeAddTaskModal);
    $("cancelAddTaskBtn").addEventListener("click", closeAddTaskModal);
    $("addTaskModalOverlay").addEventListener("click", closeAddTaskModal);
    $("confirmAddTaskBtn").addEventListener("click", confirmAddTask);
    $("taskTitleInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") confirmAddTask();
    });

    // Edit task modal
    $("closeEditTaskBtn").addEventListener("click", closeEditTaskModal);
    $("cancelEditTaskBtn").addEventListener("click", closeEditTaskModal);
    $("editTaskModalOverlay").addEventListener("click", closeEditTaskModal);
    $("confirmEditTaskBtn").addEventListener("click", confirmEditTask);
    $("editTitleInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") confirmEditTask();
    });

    // Confirm modal
    $("confirmCancelBtn").addEventListener("click", closeConfirm);
    $("confirmModalOverlay").addEventListener("click", closeConfirm);
    $("confirmOkBtn").addEventListener("click", execConfirm);

    // Search
    $("searchInput").addEventListener("input", () => {
      $("searchInputMobile").value = $("searchInput").value;
      renderTasks();
    });
    $("searchInputMobile").addEventListener("input", () => {
      $("searchInput").value = $("searchInputMobile").value;
      renderTasks();
    });

    // Sort
    $("sortSelect").addEventListener("change", renderTasks);

    // Escape closes modals
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAddCatModal();
        closeAddTaskModal();
        closeEditTaskModal();
        closeConfirm();
      }
    });

    // ===== INIT =====
    // Always show auth screen on load (per spec)
    showAuth();
  });
})();
