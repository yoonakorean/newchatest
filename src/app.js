// 使用者核心資料模型 (包含開通課程與到期日)
let currentUserData = {
    nickname: 'wei',
    email: 'bleach7981@gmail.com',
    streakDays: 2,
    xp: 0,
    energy: 100,
    memberships: [
        { level: '2B', expireDate: '2027-07-04' },
        { level: '0A', expireDate: '2027-07-05' },
        { level: '1A', expireDate: '2027-07-01' },
        { level: '2A', expireDate: '2027-07-02' },
        { level: '3A', expireDate: '2027-07-05' },
        { level: '1B', expireDate: '2027-07-03' }
    ]
};

let currentCalDate = new Date(2026, 8, 1); // 2026年9月

// 安全綁定事件函數 (防止因找不到 DOM 元素導致全頁 JS 崩潰)
function safeAddEventListener(id, event, callback) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(event, callback);
    } else {
        console.warn(`[DOM 注意] 找不到 ID 為 '${id}' 的元素，已跳過事件綁定。`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('App 初始化中...');
    initAppUI();
    bindEvents();
});

function initAppUI() {
    // 渲染會員基本資料與課程清單
    renderProfileData();
}

function bindEvents() {
    // 1. 頂部資訊列按鈕
    safeAddEventListener('btn-profile-trigger', 'click', () => switchProfileView('profile'));
    safeAddEventListener('btn-streak-trigger', 'click', openStreakModal);
    safeAddEventListener('btn-top-leaderboard', 'click', () => switchProfileView('leaderboard'));
    safeAddEventListener('btn-top-my-account', 'click', () => switchProfileView('profile'));

    // 2. 地圖頁面按鈕
    safeAddEventListener('btn-map-leaderboard', 'click', () => switchProfileView('leaderboard'));
    safeAddEventListener('btn-map-my-account', 'click', () => switchProfileView('profile'));

    // 3. 排行榜 / 我的帳號 切換 Tab
    safeAddEventListener('btn-view-leaderboard', 'click', () => showSubPage('leaderboard'));
    safeAddEventListener('btn-view-profile', 'click', () => showSubPage('profile'));

    // 4. 返回地圖按鈕
    safeAddEventListener('btn-profile-back-map', 'click', () => {
        document.getElementById('profile-view')?.classList.add('hidden');
        document.getElementById('map-view')?.classList.remove('hidden');
    });

    // 5. 連續簽到 (打卡月曆) Dashboard 控制
    safeAddEventListener('btn-close-streak-modal', 'click', closeStreakModal);
    safeAddEventListener('btn-cal-prev', 'click', () => changeCalMonth(-1));
    safeAddEventListener('btn-cal-next', 'click', () => changeCalMonth(1));

    // 6. 排行榜 Tab (好友榜 / 全球總榜) 切換
    safeAddEventListener('tab-leaderboard-friends', 'click', () => switchRankTab('friends'));
    safeAddEventListener('tab-leaderboard-global', 'click', () => switchRankTab('global'));

    // 7. 登出 Modal 控制
    safeAddEventListener('btn-trigger-logout', 'click', () => {
        document.getElementById('modal-logout-confirm')?.classList.remove('hidden');
    });
    safeAddEventListener('btn-logout-no', 'click', () => {
        document.getElementById('modal-logout-confirm')?.classList.add('hidden');
    });
    safeAddEventListener('btn-logout-yes', 'click', () => {
        location.reload();
    });
}

// 渲染「我的帳號」資料與「已開通課程與到期日」列表
function renderProfileData() {
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setText('lbl-username', currentUserData.nickname);
    setText('lbl-login-days', currentUserData.streakDays);
    setText('lbl-xp', currentUserData.xp);
    setText('lbl-energy', currentUserData.energy);

    setText('profile-nickname', currentUserData.nickname);
    setText('profile-email', currentUserData.email);
    setText('profile-xp', currentUserData.xp);
    setText('profile-energy', currentUserData.energy);
    setText('profile-streak', currentUserData.streakDays);

    // 動態繪製課程到期日膠囊
    const membershipContainer = document.getElementById('profile-memberships-list');
    if (membershipContainer) {
        membershipContainer.innerHTML = '';
        currentUserData.memberships.forEach(item => {
            const pill = document.createElement('div');
            pill.className = 'course-badge-pill';
            pill.textContent = `${item.level} | 到期日 ${item.expireDate}`;
            membershipContainer.appendChild(pill);
        });
    }
}

// 畫面視圖切換 (地圖 <-> 個人資料/排行榜)
function switchProfileView(defaultTab = 'profile') {
    document.getElementById('map-view')?.classList.add('hidden');
    document.getElementById('profile-view')?.classList.remove('hidden');
    showSubPage(defaultTab);
}

function showSubPage(page) {
    const btnLeaderboard = document.getElementById('btn-view-leaderboard');
    const btnProfile = document.getElementById('btn-view-profile');
    const pageLeaderboard = document.getElementById('sub-page-leaderboard');
    const pageProfile = document.getElementById('sub-page-profile');

    if (page === 'leaderboard') {
        btnLeaderboard?.classList.add('active');
        btnProfile?.classList.remove('active');
        pageLeaderboard?.classList.remove('hidden');
        pageProfile?.classList.add('hidden');
    } else {
        btnProfile?.classList.add('active');
        btnLeaderboard?.classList.remove('active');
        pageProfile?.classList.remove('hidden');
        pageLeaderboard?.classList.add('hidden');
    }
}

// 排行榜 Tab 切換
function switchRankTab(tab) {
    const tabFriends = document.getElementById('tab-leaderboard-friends');
    const tabGlobal = document.getElementById('tab-leaderboard-global');
    const contentFriends = document.getElementById('content-rank-friends');
    const contentGlobal = document.getElementById('content-rank-global');

    if (tab === 'friends') {
        tabFriends?.classList.add('active');
        tabGlobal?.classList.remove('active');
        contentFriends?.classList.remove('hidden');
        contentGlobal?.classList.add('hidden');
    } else {
        tabGlobal?.classList.add('active');
        tabFriends?.classList.remove('active');
        contentGlobal?.classList.remove('hidden');
        contentFriends?.classList.add('hidden');
    }
}

// 打卡月曆 Modal Controls
function openStreakModal() {
    const dashDays = document.getElementById('dash-streak-days');
    if (dashDays) dashDays.textContent = currentUserData.streakDays;
    renderCalendar(currentCalDate);
    document.getElementById('modal-streak-dashboard')?.classList.remove('hidden');
}

function closeStreakModal() {
    document.getElementById('modal-streak-dashboard')?.classList.add('hidden');
}

function changeCalMonth(offset) {
    currentCalDate.setMonth(currentCalDate.getMonth() + offset);
    renderCalendar(currentCalDate);
}

// 動態繪製打卡月曆
function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();

    const monthTitle = document.getElementById('lbl-calendar-month-title');
    if (monthTitle) monthTitle.textContent = `${year}年 ${month + 1}月`;

    const container = document.getElementById('calendar-days-container');
    if (!container) return;
    container.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 填充前面空缺天數
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        container.appendChild(empty);
    }

    // 生成當月天數 (2026年9月 22、23號標記為連續打卡)
    for (let d = 1; d <= daysInMonth; d++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = d;

        if (year === 2026 && month === 8 && (d === 22 || d === 23)) {
            dayEl.classList.add('checked');
        }

        container.appendChild(dayEl);
    }
}
