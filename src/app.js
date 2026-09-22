// ==========================================
// 1. 全局狀態與配置 (State & Configuration)
// ==========================================

// 當前登入的使用者資訊（可改為實際登入系統回傳的資料）
let currentUserProfile = {
  displayName: "小明",
  nickname: "小明",
  email: "user@example.com"
};

// SheetBest API 介接網址
const CHALLENGE_SHEETBEST_API = "https://api.sheetbest.com/sheets/6609511a-f588-4e4f-bd2b-ed551cab8770";

// 生成 1~17 單元挑戰的基礎資料結構
const allUnitsGrouped = [];
for (let i = 1; i <= 17; i++) {
  const numStr = i < 10 ? '0' + i : i;
  allUnitsGrouped.push({
    ssDisplay: `${i}-1 句子跟讀挑戰`,
    sfDisplay: `${i}-1 句子填空挑戰`,
    stDisplay: `${i}-1 句子聽打挑戰`,
    ssUnit: `11-${i}-1 句子跟讀挑戰`,
    sfUnit: `11-${i}-1 句子填空挑戰`,
    stUnit: `11-${i}-1 句子聽打挑戰`,
    ssLink: `https://yoonakorean.github.io/11${numStr}01SS/`,
    sfLink: `https://yoonakorean.github.io/11${numStr}01SF/`,
    stLink: `https://yoonakorean.github.io/11${numStr}01ST/`
  });
}

// ==========================================
// 2. 視圖切換邏輯 (View Router)
// ==========================================

function switchView(viewId) {
  // 隱藏所有頁面區塊
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

  // 取消所有導覽按鈕的高亮
  document.querySelectorAll('.btn-3d-nav').forEach(btn => btn.classList.remove('active'));

  // 顯示目標頁面
  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.remove('hidden');

  // 切換導覽按鈕高亮
  if (viewId === 'map-view') document.getElementById('nav-map')?.classList.add('active');
  if (viewId === 'challenge-view') {
    document.getElementById('nav-challenge')?.classList.add('active');
    // 切換至挑戰賽頁面時，自動載入並更新資料
    initChallengeSystem();
  }
  if (viewId === 'profile-view') document.getElementById('nav-profile')?.classList.add('active');
}

// ==========================================
// 3. 挑戰賽模組邏輯 (Challenge System Module)
// ==========================================

// 姓名遮罩工具
function maskName(name) {
  if (!name) return "";
  if (name.length < 2) return name;
  return name[0] + "O" + name.slice(2);
}

// 解析時間格式（如 "30秒" -> 30）
function parseTime(timeStr) {
  if (!timeStr) return 0;
  const match = String(timeStr).match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

// 格式化秒數為分秒（如 90 -> "1:30"）
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// 載入與處理 API 資料
async function loadChallengeData() {
  const lbContainer = document.getElementById("challenge-leaderboard");
  const unitsContainer = document.getElementById("challenge-units-container");

  const currentNickname = currentUserProfile?.displayName || currentUserProfile?.nickname || "";

  try {
    const res = await fetch(CHALLENGE_SHEETBEST_API);
    const data = await res.json();

    // 彙整個人最高成績
    const userBest = {};
    data.forEach(r => {
      if (!r.nickname) return;
      const unit = (r.gametitle || "").trim();
      if (!/^11-\d+-1/.test(unit)) return;

      let score = Number(r.score);
      let time = parseTime(r.time);
      if (isNaN(score)) score = 0;

      if (!userBest[r.nickname]) userBest[r.nickname] = {};
      if (!userBest[r.nickname][unit] || score > userBest[r.nickname][unit].score) {
        userBest[r.nickname][unit] = { score, time };
      }
    });

    // 計算總排行榜
    const leaderboard = Object.entries(userBest).map(([name, units]) => {
      const passed = Object.values(units).filter(u => u.score >= 80);
      const passCount = passed.length;
      const totalScore = passed.reduce((a, b) => a + b.score, 0);
      const totalTime = Object.values(units).reduce((a, b) => a + b.time, 0);
      const challengeCount = Object.keys(units).length;
      const avgTime = challengeCount ? totalTime / challengeCount : 0;
      return { name, passCount, totalScore, avgTime, units };
    });

    // 排序：合格次數高 -> 總分高 -> 平均時間少
    leaderboard.sort((a, b) => {
      if (b.passCount !== a.passCount) return b.passCount - a.passCount;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.avgTime - b.avgTime;
    });

    // 尋找當前使用者位置
    let userData = null;
    let userIndex = -1;
    if (currentNickname) {
      userIndex = leaderboard.findIndex(u => u.name.toLowerCase() === currentNickname.toLowerCase());
      userData = userIndex >= 0 ? leaderboard[userIndex] : null;
    }

    // 渲染 UI
    renderChallengeLeaderboard(leaderboard, userData, userIndex, currentNickname);
    renderChallengeUnitsTable(userData, currentNickname);

  } catch (err) {
    console.error("挑戰賽資料載入失敗:", err);
    if (lbContainer) lbContainer.innerHTML = `<p style="color:red;">載入排行榜失敗，請重新整理。</p>`;
    if (unitsContainer) unitsContainer.innerHTML = `<p style="color:red;">載入關卡失敗，請重新整理。</p>`;
  }
}

// 渲染排行榜表格
function renderChallengeLeaderboard(leaderboard, userData, userIndex, currentNickname) {
  const container = document.getElementById("challenge-leaderboard");
  if (!container) return;

  let html = `<table class="styled-table">
    <thead>
      <tr>
        <th>名次</th><th>姓名</th><th>合格數</th><th>總分</th><th>平均時間</th>
      </tr>
    </thead>
    <tbody>`;

  const medals = ["🥇", "🥈", "🥉"];
  const medalClasses = ["gold", "silver", "bronze"];

  // 前 3 名
  leaderboard.slice(0, 3).forEach((u, i) => {
    const displayName = (currentNickname && u.name === currentNickname) ? u.name : maskName(u.name);
    html += `<tr class="${medalClasses[i]}">
      <td style="font-size:20px;">${medals[i]}</td>
      <td><strong>${displayName}</strong></td>
      <td>${u.passCount}</td>
      <td>${u.totalScore}</td>
      <td>${formatTime(Math.round(u.avgTime))}</td>
    </tr>`;
  });

  // 當前登入使用者（若不在前 3 名）
  if (userData) {
    html += `<tr style="background-color: #e6f7ff; font-weight: bold; border-top: 2px solid #1cb0f6;">
      <td>第 ${userIndex + 1} 名</td>
      <td>${userData.name} (你)</td>
      <td>${userData.passCount}</td>
      <td>${userData.totalScore}</td>
      <td>${formatTime(Math.round(userData.avgTime))}</td>
    </tr>`;
  } else if (currentNickname) {
    html += `<tr style="background-color: #f9f9f9;"><td colspan="5">（${currentNickname} 尚未有挑戰賽紀錄）</td></tr>`;
  }

  html += "</tbody></table>";
  container.innerHTML = html;
}

// 渲染 17 單元挑戰狀態表格
function renderChallengeUnitsTable(userData, currentNickname) {
  const container = document.getElementById("challenge-units-container");
  if (!container) return;

  let html = `<table class="styled-table">
    <thead>
      <tr>
        <th>句子跟讀挑戰</th>
        <th>句子填空挑戰</th>
        <th>句子聽打挑戰</th>
      </tr>
    </thead>
    <tbody>`;

  allUnitsGrouped.forEach(row => {
    // 挑戰連結加上使用者暱稱參數，方便 GitHub Pages 頁面傳遞姓名
    const nickParam = currentNickname ? `?nickname=${encodeURIComponent(currentNickname)}` : '';

    const sfScore = userData?.units[row.sfUnit]?.score || 0;
    const stScore = userData?.units[row.stUnit]?.score || 0;

    html += "<tr>";

    // 1. 跟讀挑戰
    html += `<td><a href="${row.ssLink}${nickParam}" target="_blank" class="btn-link">${row.ssDisplay}</a></td>`;

    // 2. 填空挑戰
    if (sfScore > 0) {
      html += `<td><a href="${row.sfLink}${nickParam}" target="_blank" class="btn-link">${row.sfDisplay}</a><br>
               <span style="color:${sfScore >= 80 ? '#2b8a3e' : '#f59e0b'}; font-weight:bold; font-size: 13px;">${sfScore} 分 ${sfScore >= 80 ? '✅合格' : ''}</span></td>`;
    } else {
      html += `<td><a href="${row.sfLink}${nickParam}" target="_blank" style="color:#666;">${row.sfDisplay}</a><br><small style="color:gray;">尚未挑戰</small></td>`;
    }

    // 3. 聽打挑戰 (解鎖條件：填空挑戰分數 > 0)
    if (sfScore <= 0) {
      html += `<td style="color:#aaa; background-color: #fafafa;">${row.stDisplay}<br><small>🔒 需先完成填空挑戰</small></td>`;
    } else {
      if (stScore > 0) {
        html += `<td><a href="${row.stLink}${nickParam}" target="_blank" class="btn-link">${row.stDisplay}</a><br>
                 <span style="color:${stScore >= 80 ? '#2b8a3e' : '#f59e0b'}; font-weight:bold; font-size: 13px;">${stScore} 分 ${stScore >= 80 ? '✅合格' : ''}</span></td>`;
      } else {
        html += `<td><a href="${row.stLink}${nickParam}" target="_blank" style="color:#666;">${row.stDisplay}</a><br><small style="color:gray;">尚未挑戰</small></td>`;
      }
    }

    html += "</tr>";
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

// 初始化挑戰賽模組
function initChallengeSystem() {
  loadChallengeData();
}

// ==========================================
// 4. 應用程式初始化 (App Initialization)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // 設定個人中心展示姓名
  const nameEl = document.getElementById("user-display-name");
  if (nameEl) nameEl.textContent = currentUserProfile.displayName;
});
