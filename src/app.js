// 1. 全局狀態與使用者資訊（未來接 Firebase 時只需更換這裡的值）
let currentUserProfile = {
  displayName: "使用者",
  nickname: "使用者",
  email: "user@example.com"
};

// 2. SheetBest API 設定
const API_1A = "https://api.sheetbest.com/sheets/6609511a-f588-4e4f-bd2b-ed551cab8770";

// 3. 切換程度頁面
function switchLevel(levelKey) {
  document.querySelectorAll('.level-view').forEach(el => el.classList.remove('active'));

  document.querySelectorAll('.btn-level').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.includes(levelKey)) {
      btn.classList.add('active');
    }
  });

  const targetView = document.getElementById(`level-view-${levelKey}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // 切換到 1A 時，自動去抓取並計算 1A 的表單資料
  if (levelKey === '1A') {
    fetch1AChallengeData();
  }
}

// 4. 工具函式：時間與姓名轉換
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

// 5. 核心邏輯：向 SheetBest 抓資料，並進行「通關數」與「過關（>=80分）」計算
async function fetch1AChallengeData() {
  const lbContainer = document.getElementById("leaderboard-1A");
  const unitsContainer = document.getElementById("units-table-1A");
  const currentNickname = currentUserProfile.displayName;

  try {
    const res = await fetch(API_1A);
    const data = await res.json();

    // A. 整理每個人在各單元的最高成績
    const userBest = {};
    data.forEach(r => {
      if (!r.nickname) return;
      const unit = (r.gametitle || "").trim();
      if (!/^11-\d+-1/.test(unit)) return; // 篩選 1A 的 11-X-1 資料

      let score = Number(r.score) || 0;
      let time = parseTime(r.time);

      if (!userBest[r.nickname]) userBest[r.nickname] = {};
      if (!userBest[r.nickname][unit] || score > userBest[r.nickname][unit].score) {
        userBest[r.nickname][unit] = { score, time };
      }
    });

    // B. 計算排行榜（分數 >= 80 判定為過關）
    const leaderboard = Object.entries(userBest).map(([name, units]) => {
      const passedUnits = Object.values(units).filter(u => u.score >= 80);
      const passCount = passedUnits.length; // 過關總數
      const totalScore = passedUnits.reduce((a, b) => a + b.score, 0); // 通關總分
      const totalTime = Object.values(units).reduce((a, b) => a + b.time, 0);
      const avgTime = Object.keys(units).length ? totalTime / Object.keys(units).length : 0;
      return { name, passCount, totalScore, avgTime, units };
    });

    // 排序：通關數多 -> 總分高 -> 平均花費時間少
    leaderboard.sort((a, b) => {
      if (b.passCount !== a.passCount) return b.passCount - a.passCount;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.avgTime - b.avgTime;
    });

    // C. 取得當前使用者個人的紀錄
    const userData = userBest[currentNickname] || {};

    // D. 渲染資料到 index.html 的容器內
    renderLeaderboardHTML(leaderboard, currentNickname);
    renderUnitsHTML(userData, currentNickname);

  } catch (err) {
    console.error("抓取挑戰賽資料失敗:", err);
    if (lbContainer) lbContainer.innerHTML = `<p style="color:red; text-align:center;">載入失敗，請重新整理。</p>`;
  }
}

// 6. 將排行榜結果寫入 index.html 的 #leaderboard-1A
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

// 7. 將 17 個單元對應網址與過關成績寫入 index.html 的 #units-table-1A
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

    // 生成對應挑戰連結
    const ssLink = `https://yoonakorean.github.io/11${numStr}01SS/${nickParam}`;
    const sfLink = `https://yoonakorean.github.io/11${numStr}01SF/${nickParam}`;
    const stLink = `https://yoonakorean.github.io/11${numStr}01ST/${nickParam}`;

    html += "<tr>";

    // 1. 跟讀挑戰
    html += `<td><a href="${ssLink}" target="_blank" class="btn-link">${i}-1 句子跟讀</a></td>`;

    // 2. 填空挑戰
    if (sfScore > 0) {
      const isPassed = sfScore >= 80;
      html += `<td><a href="${sfLink}" target="_blank" class="btn-link">${i}-1 句子填空</a><br>
               <span style="color:${isPassed ? 'green' : '#f59e0b'}; font-weight:bold; font-size:12px;">
                 ${sfScore} 分 ${isPassed ? '✅合格' : ''}
               </span></td>`;
    } else {
      html += `<td><a href="${sfLink}" target="_blank" style="color:#666; text-decoration:none;">${i}-1 句子填空</a><br><small style="color:gray;">未挑戰</small></td>`;
    }

    // 3. 聽打挑戰 (判斷邏輯：需填空挑戰有過分數才解鎖)
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

  // 預設切換至 1A 程度
  switchLevel('1A');
});
