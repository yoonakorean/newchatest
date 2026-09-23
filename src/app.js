// 全局狀態與使用者資訊
let currentUserProfile = {
  displayName: "wei",
  nickname: "wei",
  email: "user@example.com"
};

const API_1A = "https://api.sheetbest.com/sheets/6609511a-f588-4e4f-bd2b-ed551cab8770";

// 切換程度頁面
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

  if (levelKey === '1A') {
    // 1. 先立刻把 HTML 關卡表格畫出來（保證連結一定看得到）
    renderInitialUnitsHTML();
    // 2. 再去非同步抓取成績資料填補進去
    fetch1AChallengeData();
  }
}

// 先繪製基本表格與連結（不等 API，直接出畫面）
function renderInitialUnitsHTML() {
  const container = document.getElementById("units-table-1A");
  if (!container) return;

  const nickname = currentUserProfile.displayName;
  const nickParam = nickname ? `?nickname=${encodeURIComponent(nickname)}` : '';

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
    const ssLink = `https://yoonakorean.github.io/11${numStr}01SS/${nickParam}`;
    const sfLink = `https://yoonakorean.github.io/11${numStr}01SF/${nickParam}`;
    const stLink = `https://yoonakorean.github.io/11${numStr}01ST/${nickParam}`;

    html += `<tr>
      <td><a href="${ssLink}" target="_blank" class="btn-link">${i}-1 句子跟讀</a></td>
      <td id="sf-unit-${i}"><a href="${sfLink}" target="_blank" class="btn-link">${i}-1 句子填空</a><br><small style="color:gray;">載入成績...</small></td>
      <td id="st-unit-${i}"><a href="${stLink}" target="_blank" class="btn-link">${i}-1 句子聽打</a><br><small style="color:gray;">載入成績...</small></td>
    </tr>`;
  }

  html += "</tbody></table>";
  container.innerHTML = html;
}

// 向 API 取得資料並更新成績與排行榜
async function fetch1AChallengeData() {
  const lbContainer = document.getElementById("leaderboard-1A");
  const currentNickname = currentUserProfile.displayName;

  try {
    const res = await fetch(API_1A);
    if (!res.ok) throw new Error("API 回應失敗");
    const data = await res.json();

    const userBest = {};
    if (Array.isArray(data)) {
      data.forEach(r => {
        if (!r.nickname) return;
        const unit = (r.gametitle || "").trim();
        let score = Number(r.score) || 0;

        if (!userBest[r.nickname]) userBest[r.nickname] = {};
        if (!userBest[r.nickname][unit] || score > userBest[r.nickname][unit].score) {
          userBest[r.nickname][unit] = { score };
        }
      });
    }

    // 計算排行榜
    const leaderboard = Object.entries(userBest).map(([name, units]) => {
      const passedUnits = Object.values(units).filter(u => u.score >= 80);
      const passCount = passedUnits.length;
      const totalScore = passedUnits.reduce((a, b) => a + b.score, 0);
      return { name, passCount, totalScore };
    }).sort((a, b) => b.passCount - a.passCount || b.totalScore - a.totalScore);

    // 更新排行榜渲染
    renderLeaderboardHTML(leaderboard, currentNickname);

    // 更新個人成績至剛才畫好的表格中
    const userData = userBest[currentNickname] || {};
    updateScoresInTable(userData, currentNickname);

  } catch (err) {
    console.error("無法載入成績資料:", err);
    if (lbContainer) lbContainer.innerHTML = `<p style="color:gray; text-align:center;">暫無排行榜資料</p>`;
  }
}

function renderLeaderboardHTML(leaderboard, currentNickname) {
  const container = document.getElementById("leaderboard-1A");
  if (!container) return;

  if (leaderboard.length === 0) {
    container.innerHTML = `<p style="color:gray; text-align:center;">目前尚無挑戰紀錄</p>`;
    return;
  }

  let html = `<table class="styled-table">
    <thead><tr><th>名次</th><th>姓名</th><th>過關數</th><th>總分</th></tr></thead>
    <tbody>`;

  const medals = ["🥇", "🥈", "🥉"];
  leaderboard.slice(0, 3).forEach((u, i) => {
    html += `<tr>
      <td>${medals[i] || i + 1}</td>
      <td><strong>${u.name}</strong></td>
      <td>${u.passCount}</td>
      <td>${u.totalScore}</td>
    </tr>`;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

// 動態覆蓋分數欄位
function updateScoresInTable(userData, nickname) {
  const nickParam = nickname ? `?nickname=${encodeURIComponent(nickname)}` : '';

  for (let i = 1; i <= 17; i++) {
    const numStr = i < 10 ? '0' + i : i;
    const sfKey = `11-${i}-1 句子填空挑戰`;
    const stKey = `11-${i}-1 句子聽打挑戰`;

    const sfScore = userData[sfKey]?.score || 0;
    const stScore = userData[stKey]?.score || 0;

    const sfTd = document.getElementById(`sf-unit-${i}`);
    const stTd = document.getElementById(`st-unit-${i}`);

    const sfLink = `https://yoonakorean.github.io/11${numStr}01SF/${nickParam}`;
    const stLink = `https://yoonakorean.github.io/11${numStr}01ST/${nickParam}`;

    if (sfTd) {
      const isPassed = sfScore >= 80;
      const statusText = sfScore > 0 ? `${sfScore} 分 ${isPassed ? '✅合格' : ''}` : '未挑戰';
      const color = isPassed ? 'green' : (sfScore > 0 ? '#f59e0b' : 'gray');
      sfTd.innerHTML = `<a href="${sfLink}" target="_blank" class="btn-link">${i}-1 句子填空</a><br><span style="color:${color}; font-weight:bold; font-size:12px;">${statusText}</span>`;
    }

    if (stTd) {
      if (sfScore <= 0) {
        stTd.style.backgroundColor = '#fafafa';
        stTd.innerHTML = `<span style="color:#aaa;">${i}-1 句子聽打<br><small>🔒 需先完成填空</small></span>`;
      } else {
        stTd.style.backgroundColor = '';
        const isPassed = stScore >= 80;
        const statusText = stScore > 0 ? `${stScore} 分 ${isPassed ? '✅合格' : ''}` : '未挑戰';
        const color = isPassed ? 'green' : (stScore > 0 ? '#f59e0b' : 'gray');
        stTd.innerHTML = `<a href="${stLink}" target="_blank" class="btn-link">${i}-1 句子聽打</a><br><span style="color:${color}; font-weight:bold; font-size:12px;">${statusText}</span>`;
      }
    }
  }
}

// 頁面初始化
document.addEventListener("DOMContentLoaded", () => {
  const nameEl = document.getElementById("user-display-name");
  if (nameEl) nameEl.textContent = `👤 ${currentUserProfile.displayName}`;

  switchLevel('1A');
});
