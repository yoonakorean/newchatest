// ==========================================
// 1. 全局狀態與 Firebase 使用者驗證模擬
// ==========================================

// 模擬 Firebase Auth / Firestore 目前登入的使用者資料
let currentUserProfile = {
  displayName: "小明",
  nickname: "小明",
  email: "user@example.com"
};

// ==========================================
// 2. 挑戰賽多程度設定檔 (支援 1A，預留 1B, 2A, 2B 擴充)
// ==========================================

const CHALLENGE_CONFIGS = {
  '1A': {
    api: "https://api.sheetbest.com/sheets/6609511a-f588-4e4f-bd2b-ed551cab8770",
    prefixCode: "11", // 11 代表 1A 程度 (例如 110101SS)
    unitCount: 17,
    pattern: /^11-\d+-1/
  }
  /* 未來擴充 1B, 2A 範例：只需取消註解並填入 API 即可
  ,
  '1B': {
    api: "https://api.sheetbest.com/sheets/YOUR_1B_SHEETBEST_API",
    prefixCode: "12",
    unitCount: 17,
    pattern: /^12-\d+-1/
  }
  */
};

// ==========================================
// 3. 程度分級頁面切換邏輯
// ==========================================

function switchLevel(levelKey) {
  // 隱藏所有程度頁面
  document.querySelectorAll('.level-view').forEach(el => el.classList.remove('active'));

  // 更新按鈕高亮樣式
  document.querySelectorAll('.btn-level').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.includes(levelKey)) {
      btn.classList.add('active');
    }
  });

  // 顯示對應程度 View
  const targetView = document.getElementById(`level-view-${levelKey}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // 若該程度有配置挑戰賽（例如 1A），則自動載入數據
  if (CHALLENGE_CONFIGS[levelKey]) {
    loadLevelChallenge(levelKey);
  }
}

// ==========================================
// 4. 挑戰賽核心數據處理模組
// ==========================================

// 生成特定程度的 17 個單元對應網址
function generateChallengeUnits(levelKey) {
  const config = CHALLENGE_CONFIGS[levelKey];
  if (!config) return [];

  const units = [];
  for (let i = 1; i <= config.unitCount; i++) {
    const numStr = i < 10 ? '0' + i : i;
    units.push({
      ssDisplay: `${i}-1 句子跟讀挑戰`,
      sfDisplay: `${i}-1 句子填空挑戰`,
      stDisplay: `${i}-1 句子聽打挑戰`,
      ssUnit: `${config.prefixCode}-${i}-1 句子跟讀挑戰`,
      sfUnit: `${config.prefixCode}-${i}-1 句子填空挑戰`,
      stUnit: `${config.prefixCode}-${i}-1 句子聽打挑戰`,
      ssLink: `https://yoonakorean.github.io/${config.prefixCode}${numStr}01SS/`,
      sfLink: `https://yoonakorean.github.io/${config.prefixCode}${numStr}01SF/`,
      stLink: `https://yoonakorean.github.io/${config.prefixCode}${numStr}01ST/`
    });
  }
  return units;
}

// 姓名遮罩 (隱私處理)
function maskName(name) {
  if (!name) return "";
  if (name.length < 2) return name;
  return name[0] + "O" + name.slice(2);
}

// 時間解析 (例如 "45秒" -> 45)
function parseTime(timeStr) {
  if (!timeStr) return 0;
  const match = String(timeStr).match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

// 時間格式化 (例如 90 秒 -> "1:30")
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// 載入 SheetBest 資料並計算特定程度排行榜與關卡狀態
async function loadLevelChallenge(levelKey) {
  const config = CHALLENGE_CONFIGS[levelKey];
  if (!config) return;

  const lbContainer = document.getElementById(`leaderboard-${levelKey}`);
  const unitsContainer = document.getElementById(`units-table-${levelKey}`);

  const currentNickname = currentUserProfile?.displayName || currentUserProfile?.nickname || "";

  try {
    const res = await fetch(config.api);
    const data = await res.json();

    // 彙整每位使用者的各單元最高分數
    const userBest = {};
    data.forEach(r => {
      if (!r.nickname) return;
      const unit = (r.gametitle || "").trim();
      if (!config.pattern.test(unit)) return;

      let score = Number(r.score);
      let time = parseTime(r.time);
      if (isNaN(score)) score = 0;

      if (!userBest[r.nickname]) userBest[r.nickname] = {};
      if (!userBest[r.nickname][unit] || score > userBest[r.nickname][unit].score) {
        userBest[r.nickname][unit] = { score, time };
      }
    });

    // 建立總排行榜
    const leaderboard = Object.entries(userBest).map(([name, units]) => {
      const passed = Object.values(units).filter(u => u.score >= 80);
      const passCount = passed.length;
      const totalScore = passed.reduce((a, b) => a + b.score, 0);
      const totalTime = Object.values(units).reduce((a, b) => a + b.time, 0);
      const challengeCount = Object.keys(units).length;
      const avgTime = challengeCount ? totalTime / challengeCount : 0;
      return { name, passCount, totalScore, avgTime, units };
    });

    // 排序權重：合格關卡數 > 總分 > 平均消耗時間
    leaderboard.sort((a, b) => {
      if (b.passCount !== a.passCount) return b.passCount - a.passCount;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.avgTime - b.avgTime;
    });

    // 尋找當前使用者排名
    let userData = null;
    let userIndex = -1;
    if (currentNickname) {
      userIndex = leaderboard.findIndex(u => u.name.toLowerCase() === currentNickname.toLowerCase());
      userData = userIndex >= 0 ? leaderboard[userIndex] : null;
    }

    // 渲染排行榜與單元關卡 UI
    renderLeaderboardUI(levelKey, leaderboard, userData, userIndex, currentNickname);
    renderUnitsUI(levelKey, userData, currentNickname);

  } catch (err) {
    console.error(`[${levelKey}] 挑戰賽資料載入失敗:`, err);
    if (lbContainer) lbContainer.innerHTML = `<p style="color:red; text-align:center;">載入排行榜失敗，請重新整理。</p>`;
  }
}

// 渲染排行榜 UI
function renderLeaderboardUI(levelKey, leaderboard, userData, userIndex, currentNickname) {
  const container = document.getElementById(`leaderboard-${levelKey}`);
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
      <td style="font-size:18px;">${medals[i]}</td>
      <td><strong>${displayName}</strong></td>
      <td>${u.passCount}</td>
      <td>${u.totalScore}</td>
      <td>${formatTime(Math.round(u.avgTime))}</td>
    </tr>`;
  });

  // 若當前使用者在 3 名以外，額外顯示個人成績列
  if (userData && userIndex >= 3) {
    html += `<tr style="background-color: #cce5ff; font-weight: bold;">
      <td>第 ${userIndex + 1} 名</td>
      <td>${userData.name} (你)</td>
      <td>${userData.passCount}</td>
      <td>${userData.totalScore}</td>
      <td>${formatTime(Math.round(userData.avgTime))}</td>
    </tr>`;
  }

  html += "</tbody></table>";
  container.innerHTML = html;
}

// 渲染關卡 UI (包含 SS跟讀/SF填空/ST聽打 狀態與解鎖邏輯)
function renderUnitsUI(levelKey, userData, currentNickname) {
  const container = document.getElementById(`units-table-${levelKey}`);
  if (!container) return;

  const unitsGrouped = generateChallengeUnits(levelKey);
  let html = `<table class="styled-table">
    <thead>
      <tr>
        <th>句子跟讀挑戰</th>
        <th>句子填空挑戰</th>
        <th>句子聽打挑戰</th>
      </tr>
    </thead>
    <tbody>`;

  unitsGrouped.forEach(row => {
    const nickParam = currentNickname ? `?nickname=${encodeURIComponent(currentNickname)}` : '';
    const sfScore = userData?.units[row.sfUnit]?.score || 0;
    const stScore = userData?.units[row.stUnit]?.score || 0;

    html += "<tr>";
    // 1. 跟讀挑戰 (隨時可挑戰)
    html += `<td><a href="${row.ssLink}${nickParam}" target="_blank" class="btn-link">${row.ssDisplay}</a></td>`;

    // 2. 填空挑戰
    if (sfScore > 0) {
      html += `<td><a href="${row.sfLink}${nickParam}" target="_blank" class="btn-link">${row.sfDisplay}</a><br>
               <span style="color:${sfScore>=80?'green':'#f59e0b'}; font-weight:bold;">${sfScore} 分 ${sfScore>=80?'✅':''}</span></td>`;
    } else {
      html += `<td><a href="${row.sfLink}${nickParam}" target="_blank" style="color:#666; text-decoration:none;">${row.sfDisplay}</a><br><small style="color:gray;">尚未挑戰</small></td>`;
    }

    // 3. 聽打挑戰 (解鎖條件：填空挑戰分數 > 0)
    if (sfScore <= 0) {
      html += `<td style="color:#aaa; background-color: #fafafa;">${row.stDisplay}<br><small>🔒 需先完成填空挑戰</small></td>`;
    } else {
      if (stScore > 0) {
        html += `<td><a href="${row.stLink}${nickParam}" target="_blank" class="btn-link">${row.stDisplay}</a><br>
                 <span style="color:${stScore>=80?'green':'#f59e0b'}; font-weight:bold;">${stScore} 分 ${stScore>=80?'✅':''}</span></td>`;
      } else {
        html += `<td><a href="${row.stLink}${nickParam}" target="_blank" style="color:#666; text-decoration:none;">${row.stDisplay}</a><br><small style="color:gray;">尚未挑戰</small></td>`;
      }
    }

    html += "</tr>";
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

// 刷新指定程度資料
function refreshCurrentChallenge(levelKey) {
  loadLevelChallenge(levelKey);
}

// ==========================================
// 5. 初始化
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // 設定登入者顯示名稱
  const nameEl = document.getElementById("user-display-name");
  if (nameEl) nameEl.textContent = `👤 ${currentUserProfile.displayName}`;

  // 預設切換至 1A 程度並載入挑戰賽
  switchLevel('1A');
});
