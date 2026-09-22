// 1. 全局狀態與使用者資訊
let currentUserProfile = {
  displayName: "wei", // 可配合畫面上顯示的名字
  nickname: "wei",
  email: "user@example.com"
};

// 2. SheetBest API 設定（1A 挑戰賽專用）
const API_1A = "https://api.sheetbest.com/sheets/6609511a-f588-4e4f-bd2b-ed551cab8770";

// 3. 切換程度頁面
function switchLevel(levelKey) {
  // 隱藏所有 level-view
  document.querySelectorAll('.level-view').forEach(el => el.classList.remove('active'));

  // 重置按鈕高亮狀態
  document.querySelectorAll('.btn-level').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.includes(levelKey)) {
      btn.classList.add('active');
    }
  });

  // 顯示指定的 level-view
  const targetView = document.getElementById(`level-view-${levelKey}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // 若切換至 1A，執行 1A 挑戰賽資料讀取
  if (levelKey === '1A') {
    fetch1AChallengeData();
  }
}

// 4. 工具函式：時間與姓名隱私處理
function parseTime(timeStr) {
  if (!timeStr) return 0;
  const match = String(timeStr).match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function maskName(name) {
  if (!name) return "";
  if (name.length < 2) return name;
  return name[0] + "O" + name.slice(2);
}

// 5. 核心邏輯：向 SheetBest 抓取 1A 表單資料並計算過關情況 (score >= 80)
async function fetch1AChallengeData() {
  const lbContainer = document.getElementById("leaderboard-1A");
  const unitsContainer = document.getElementById("units-table-1A");
  const currentNickname = currentUserProfile.displayName;

  if (lbContainer) lbContainer.innerHTML = `<p style="color: gray; text-align: center;">載入排行榜中...</p>`;
  if (unitsContainer) unitsContainer.innerHTML = `<p style="color: gray; text-align: center;">載入關卡中...</p>`;

  try {
    const res = await fetch(API_1A);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const data = await res.json();

    // A. 整理每位玩家在各單元的最高成績
    const userBest = {};
    if (Array.isArray(data)) {
      data.forEach(r => {
        if (!r.nickname) return;
        const unit = (r.gametitle || "").trim();
        if (!/^11-\d+-1/.test(unit)) return; // 只篩選 1A (11-X-1) 相關紀錄

        let score = Number(r.score) || 0;
        let time = parseTime(r.time);

        if (!userBest[r.nickname]) userBest[r.nickname] = {};
        if (!userBest[r.nickname][unit] || score > userBest[r.nickname][unit].score) {
          userBest[r.nickname][unit] = { score, time };
        }
      });
    }

    // B. 計算排行榜（單元 score >= 80 才算合格過關）
    const leaderboard = Object.entries(userBest).map(([name, units]) => {
      const passedUnits = Object.values(units).filter(u => u.score >= 80);
      const passCount = passedUnits.length;
      const totalScore = passedUnits.reduce((a, b) => a + b.score, 0);
      const totalTime = Object.values(units).reduce((a, b) => a + b.time, 0);
      const avgTime = Object.keys(units).length ? totalTime / Object.keys(units).length : 0;
      return { name, passCount, totalScore, avgTime, units };
    });

    // 排序權重：過關數最多 -> 總分最高 -> 平均時間最少
    leaderboard.sort((a, b) => {
      if (b.passCount !== a.passCount) return b.passCount - a.passCount;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.avgTime - b.avgTime;
    });

    // C. 抓出目前登入使用者的個人成績
    const userData = userBest[currentNickname] || {};

    // D. 渲染至畫面容器
    renderLeaderboardHTML(leaderboard, currentNickname);
    renderUnitsHTML(userData, currentNickname);

  } catch (err) {
    console.error("抓取挑戰賽資料失敗:", err);
    if (lbContainer) lbContainer.innerHTML = `<p style="color:red; text-align:center;">載入排行榜失敗，請重新整理。</p>`;
    if (unitsContainer) unitsContainer.innerHTML = `<p style="color:red; text-align:center;">載入關卡資料失敗。</p>`;
  }
}

// 6. 渲染排行榜表格
function renderLeaderboardHTML(leaderboard, currentNickname) {
  const container = document.getElementById("leaderboard-1A");
  if (!container) return;

  let html = `<table class="styled-table">
    <thead>
      <tr><th>名次</th><th>姓名</th><th>過關數</th><th>總分</th><th>平均時間</th></tr>
    </thead>
    <tbody>`;

  const medals = ["🥇", "🥈", "🥉"];
  leaderboard.slice(0, 3).forEach((u, i) => {
    const isSelf = currentNickname && u.name === currentNickname;
    const nameDisplay = isSelf ? u.name : maskName(u.name);
    html += `<tr>
      <td style="font-size:18px;">${medals[i]}</td>
      <td><strong>${nameDisplay}</strong></td>
      <td>${u.passCount}</td>
      <td>${u.totalScore}</td>
      <td>${formatTime(Math.round(u.avgTime))}</td>
    </tr>`;
  });

  if (leaderboard.length === 0) {
    html += `<tr><td colspan="5">目前尚無挑戰紀錄</td></tr>`;
  }

  html += "</tbody></table>";
  container.innerHTML = html;
}

// 7. 渲染 17 個挑戰單元列表
function renderUnitsHTML(userData, currentNickname) {
  const container = document.getElementById("units-table-1A");
  if (!container) return;

  const nickParam = currentNickname ? `?nickname=${encodeURIComponent(currentNickname)}` : '';

  let html = `<table class="styled-table">
    <thead>
      <tr>
        <th>句子跟讀挑戰</th>
        <th>句子填空挑戰</th>
        <th>句子聽打挑戰</th>
      </tr>
    </thead>
    <tbody>`;

  for (let i = 1; i <= 17; i++) {
    const numStr = i < 10 ? '0' + i : i;
    const sfKey = `11-${i}-1 句子填空挑戰`;
    const stKey = `11-${i}-1 句子聽打挑戰`;

    const sfScore = userData[sfKey]?.score || 0;
    const stScore = userData[stKey]?.score || 0;

    const ssLink = `https://yoonakorean.github.io/11${numStr}01SS/${nickParam}`;
    const sfLink = `https://yoonakorean.github.io/11${numStr}01SF/${nickParam}`;
    const stLink = `https://yoonakorean.github.io/11${numStr}01ST/${nickParam}`;

    html += "<tr>";

    // 跟讀
    html += `<td><a href="${ssLink}" target="_blank" class="btn-link">${i}-1 句子跟讀</a></td>`;

    // 填空
    if (sfScore > 0) {
      const isPassed = sfScore >= 80;
      html += `<td><a href="${sfLink}" target="_blank" class="btn-link">${i}-1 句子填空</a><br>
               <span style="color:${isPassed ? 'green' : '#f59e0b'}; font-weight:bold; font-size:12px;">
                 ${sfScore} 分 ${isPassed ? '✅合格' : ''}
               </span></td>`;
    } else {
      html += `<td><a href="${sfLink}" target="_blank" style="color:#666; text-decoration:none;">${i}-1 句子填空</a><br><small style="color:gray;">未挑戰</small></td>`;
    }

    // 聽打（解鎖機制：填空評分 > 0 才解鎖）
    if (sfScore <= 0) {
      html += `<td style="color:#aaa; background-color: #fafafa;">${i}-1 句子聽打<br><small>🔒 需先完成填空</small></td>`;
    } else {
      if (stScore > 0) {
        const isPassed = stScore >= 80;
        html += `<td><a href="${stLink}" target="_blank" class="btn-link">${i}-1 句子聽打</a><br>
                 <span style="color:${isPassed ? 'green' : '#f59e0b'}; font-weight:bold; font-size:12px;">
                   ${stScore} 分 ${isPassed ? '✅合格' : ''}
                 </span></td>`;
      } else {
        html += `<td><a href="${stLink}" target="_blank" style="color:#666; text-decoration:none;">${i}-1 句子聽打</a><br><small style="color:gray;">未挑戰</small></td>`;
      }
    }

    html += "</tr>";
  }

  html += "</tbody></table>";
  container.innerHTML = html;
}

// 8. 頁面初始化
document.addEventListener("DOMContentLoaded", () => {
  const nameEl = document.getElementById("user-display-name");
  if (nameEl) nameEl.textContent = `👤 ${currentUserProfile.displayName}`;

  // 預設載入 1A 程度
  switchLevel('1A');
});
