// PleaseHome Admin Console Frontend Logic

let currentMemberPage = 0;
let totalMemberPages = 1;
let currentSearchQuery = "";
let currentMemberList = [];
let currentSortCol = null;
let currentSortDir = "desc";

// 실서버 공고 상태 변수
let allAnnouncements = [];
let filteredAnnouncements = [];
let currentAnnPage = 0;
const ANN_PAGE_SIZE = 20;
let currentInstFilter = "ALL";
let isAnnouncementsLoading = false;

// 기관 홈페이지 실시간 조회 상태 변수
let externalNoticesList = [];
let currentExtInst = "ALL";
let isExtLoading = false;
let currentNoticeSubTab = "external";

// 🐱 달리는 고양이 '이루' 로더 HTML 렌더러
function renderCatLoader(label = "데이터를 불러오는 중입니다...", scale = 0.55) {
  return `
    <div class="cat-loader-wrap py-4">
      <div class="cat-loader-sprite" style="--cat-scale: ${scale};" role="img" aria-label="로딩 중"></div>
      <span class="cat-loader-label">${escapeHtml(label)}</span>
    </div>
  `;
}

// 초기화
document.addEventListener("DOMContentLoaded", () => {
  setExtDatePreset(14);
  updateRegionUI();
  loadAdminStats();
  loadMembers(0);
  loadAnnouncements();
});

// 서브 탭 전환 (기관 홈페이지 실시간 vs 실서버 DB)
function switchNoticeSubTab(subTab) {
  currentNoticeSubTab = subTab;
  const viewExt = document.getElementById("view-external-notices");
  const viewDb = document.getElementById("view-db-notices");
  const btnExt = document.getElementById("subtab-btn-external");
  const btnDb = document.getElementById("subtab-btn-db");

  const activeCls = "px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition flex items-center space-x-2 bg-emerald-500 text-white shadow-sm";
  const inactiveCls = "px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition flex items-center space-x-2 text-slate-400 hover:text-white";

  if (subTab === "external") {
    if (viewExt) viewExt.classList.remove("hidden");
    if (viewDb) viewDb.classList.add("hidden");
    if (btnExt) btnExt.className = activeCls;
    if (btnDb) btnDb.className = inactiveCls;
  } else {
    if (viewExt) viewExt.classList.add("hidden");
    if (viewDb) viewDb.classList.remove("hidden");
    if (btnDb) btnDb.className = activeCls;
    if (btnExt) btnExt.className = inactiveCls;
    if (allAnnouncements.length === 0) {
      loadAnnouncements();
    }
  }
}

// 탭 전환 (회원 모니터링 vs 공고 조회)
function switchTab(tab) {
  const usersSection = document.getElementById("section-users");
  const pipelineSection = document.getElementById("section-pipeline");
  const btnUsers = document.getElementById("tab-btn-users");
  const btnPipeline = document.getElementById("tab-btn-pipeline");

  if (tab === "users") {
    usersSection.classList.remove("hidden");
    pipelineSection.classList.add("hidden");
    btnUsers.className = "flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-150 flex items-center justify-center space-x-1.5 bg-emerald-500 text-white shadow-sm";
    btnPipeline.className = "flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-150 flex items-center justify-center space-x-1.5 text-slate-400 hover:text-slate-200";
    loadAdminStats();
  } else {
    usersSection.classList.add("hidden");
    pipelineSection.classList.remove("hidden");
    btnPipeline.className = "flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-150 flex items-center justify-center space-x-1.5 bg-emerald-500 text-white shadow-sm";
    btnUsers.className = "flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-150 flex items-center justify-center space-x-1.5 text-slate-400 hover:text-slate-200";
    if (currentNoticeSubTab === "db" && allAnnouncements.length === 0) {
      loadAnnouncements();
    }
  }
}

// -------------------------------------------------------------
// 1. 회원 모니터링: 통계 및 랭킹 로드
// -------------------------------------------------------------
async function loadAdminStats() {
  const statusLabel = document.getElementById("server-status-label");
  const statusLabelM = document.getElementById("server-status-label-m");
  const setStatus = (text, cls) => {
    if (statusLabel) { statusLabel.textContent = text; statusLabel.className = cls; }
    if (statusLabelM) { statusLabelM.textContent = text; statusLabelM.className = cls; }
  };

  const topComplexesContainer = document.getElementById("top-complexes-list");
  const topAnnsContainer = document.getElementById("top-announcements-list");
  if (topComplexesContainer && !topComplexesContainer.querySelector(".cat-loader-wrap") && topComplexesContainer.children.length <= 1) {
    topComplexesContainer.innerHTML = renderCatLoader("인기 단지 분석 중...", 0.45);
  }
  if (topAnnsContainer && !topAnnsContainer.querySelector(".cat-loader-wrap") && topAnnsContainer.children.length <= 1) {
    topAnnsContainer.innerHTML = renderCatLoader("인기 공고 분석 중...", 0.45);
  }

  try {
    const res = await fetch("/api/proxy/stats");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    setStatus("실서버 백엔드 정상", "text-emerald-400 font-mono");

    // 통계 카드
    document.getElementById("stat-total-members").textContent = Number(data.totalMembers || 0).toLocaleString();
    document.getElementById("stat-total-bookmarks").textContent = Number(data.totalBookmarks || 0).toLocaleString();
    document.getElementById("stat-total-favorites").textContent = Number(data.totalFavorites || 0).toLocaleString();
    document.getElementById("stat-total-hidden").textContent = Number(data.totalHidden || 0).toLocaleString();

    // 인기 단지 TOP 5
    const topComplexesContainer = document.getElementById("top-complexes-list");
    if (data.topComplexes && data.topComplexes.length > 0) {
      topComplexesContainer.innerHTML = data.topComplexes.slice(0, 5).map((c, idx) => `
        <div class="flex items-center justify-between p-2.5 bg-slate-900/40 rounded-xl border border-slate-700/40">
          <div class="flex items-center space-x-3 truncate">
            <span class="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
              ${idx + 1}
            </span>
            <div class="truncate">
              <span class="text-xs font-medium text-white truncate block">${escapeHtml(c.complexName)}</span>
              <span class="text-[11px] text-slate-400 truncate block">${escapeHtml(c.address || "-")}</span>
            </div>
          </div>
          <div class="text-right flex-shrink-0 ml-3">
            <span class="text-xs font-bold text-amber-400">${c.bookmarkCount}</span>
            <span class="text-[10px] text-slate-500 block">북마크</span>
          </div>
        </div>
      `).join("");
    } else {
      topComplexesContainer.innerHTML = `<p class="text-xs text-slate-500 py-3 text-center">아직 저장된 북마크 단지가 없습니다.</p>`;
    }

    // 인기 공고 TOP 5
    const topAnnsContainer = document.getElementById("top-announcements-list");
    if (data.topAnnouncements && data.topAnnouncements.length > 0) {
      topAnnsContainer.innerHTML = data.topAnnouncements.slice(0, 5).map((a, idx) => `
        <div class="flex items-center justify-between p-2.5 bg-slate-900/40 rounded-xl border border-slate-700/40">
          <div class="flex items-center space-x-3 truncate">
            <span class="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
              ${idx + 1}
            </span>
            <div class="truncate">
              <span class="text-xs font-medium text-white truncate block">${escapeHtml(a.title)}</span>
              <span class="text-[11px] text-slate-400 truncate block">${escapeHtml(a.institution || "-")}</span>
            </div>
          </div>
          <div class="text-right flex-shrink-0 ml-3">
            <span class="text-xs font-bold text-rose-400">${a.favoriteCount}</span>
            <span class="text-[10px] text-slate-500 block">찜</span>
          </div>
        </div>
      `).join("");
    } else {
      topAnnsContainer.innerHTML = `<p class="text-xs text-slate-500 py-3 text-center">아직 찜한 공고가 없습니다.</p>`;
    }

  } catch (err) {
    setStatus("백엔드 응답 대기/오프라인", "text-amber-400 font-mono");
  }
}

// -------------------------------------------------------------
// 2. 회원 목록 테이블 조회 & 검색
// -------------------------------------------------------------
async function loadMembers(page = 0) {
  currentMemberPage = page;
  const tbody = document.getElementById("member-table-body");
  const cardList = document.getElementById("member-card-list");
  tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-center">${renderCatLoader("회원 목록을 불러오는 중입니다...", 0.55)}</td></tr>`;
  if (cardList) {
    cardList.innerHTML = renderCatLoader("회원 목록을 불러오는 중입니다...", 0.55);
  }

  try {
    let url = `/api/proxy/users?page=${page}&size=20`;
    if (currentSearchQuery) {
      url += `&search=${encodeURIComponent(currentSearchQuery)}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    totalMemberPages = data.totalPages || 1;
    document.getElementById("member-total-count").textContent = Number(data.totalCount || 0).toLocaleString();
    document.getElementById("member-page-info").textContent = `${data.currentPage + 1} / ${Math.max(1, data.totalPages)}`;

    document.getElementById("btn-prev-page").disabled = (data.currentPage <= 0);
    document.getElementById("btn-next-page").disabled = (data.currentPage >= data.totalPages - 1);

    currentMemberList = data.items || [];
    if (currentSortCol) {
      applyMemberSort();
    } else {
      renderMemberTable(currentMemberList);
    }

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-rose-400">회원 목록 조회 실패: ${escapeHtml(err.message)}</td></tr>`;
    if (cardList) {
      cardList.innerHTML = `<p class="py-8 text-center text-rose-400 text-sm">회원 목록 조회 실패: ${escapeHtml(err.message)}</p>`;
    }
  }
}

function renderMemberTable(items) {
  const tbody = document.getElementById("member-table-body");
  const cardList = document.getElementById("member-card-list");

  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-slate-500">가입된 회원이 없습니다.</td></tr>`;
    if (cardList) {
      cardList.innerHTML = `<p class="py-8 text-center text-slate-500 text-sm">가입된 회원이 없습니다.</p>`;
    }
    return;
  }

  // 데스크톱 테이블 렌더링
  tbody.innerHTML = items.map(m => `
    <tr class="hover:bg-slate-800/40 transition">
      <td class="py-3.5 px-4 font-mono font-medium text-slate-200">
        <div class="flex items-center space-x-2">
          <div class="w-7 h-7 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs">
            <i class="fa-solid fa-user"></i>
          </div>
          <span>${escapeHtml(m.id)}</span>
        </div>
      </td>
      <td class="py-3.5 px-4 text-xs text-slate-400 font-mono">${formatDate(m.createdAt)}</td>
      <td class="py-3.5 px-4 text-xs text-slate-300">
        ${formatRegions(m.preferredRegions)}
      </td>
      <td class="py-3.5 px-4 text-center font-semibold text-slate-300">${m.bookmarkFolderCount}개</td>
      <td class="py-3.5 px-4 text-center font-semibold text-amber-400">${m.bookmarkItemCount}건</td>
      <td class="py-3.5 px-4 text-center font-semibold text-rose-400">${m.favoriteCount}건</td>
      <td class="py-3.5 px-4 text-center font-semibold text-purple-400">${m.hiddenCount}건</td>
      <td class="py-3.5 px-4 text-right">
        <button onclick="openMemberModal('${escapeHtml(m.id)}')"
          class="px-3 py-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition">
          활동 보기
        </button>
      </td>
    </tr>
  `).join("");

  // 모바일 전용 카드 뷰 렌더링
  if (cardList) {
    cardList.innerHTML = items.map(m => `
      <div class="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3.5 space-y-3 shadow-sm">
        <!-- 상단 헤더: 회원 정보 & 가입일 -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center space-x-2 min-w-0">
            <div class="w-7 h-7 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs flex-shrink-0">
              <i class="fa-solid fa-user"></i>
            </div>
            <div class="min-w-0">
              <div class="text-xs font-semibold text-white truncate font-mono">${escapeHtml(m.id)}</div>
              <div class="text-[10px] text-slate-400 flex items-center mt-0.5">
                <i class="fa-regular fa-clock mr-1 text-slate-500"></i>${formatDate(m.createdAt)}
              </div>
            </div>
          </div>
        </div>

        <!-- 관심 지역 -->
        <div class="text-[11px] text-slate-300 bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/40">
          <span class="text-slate-400 mr-1.5 text-[10px]">관심지역:</span>
          ${formatRegions(m.preferredRegions)}
        </div>

        <!-- 활동 통계 4종 그리드 -->
        <div class="grid grid-cols-4 gap-2 text-center text-xs">
          <div class="bg-slate-800/70 p-2 rounded-lg border border-slate-700/50">
            <div class="text-[10px] text-slate-400 mb-0.5">폴더</div>
            <div class="font-bold text-slate-200">${m.bookmarkFolderCount}<span class="text-[9px] font-normal text-slate-400 ml-0.5">개</span></div>
          </div>
          <div class="bg-slate-800/70 p-2 rounded-lg border border-slate-700/50">
            <div class="text-[10px] text-amber-400/80 mb-0.5">북마크</div>
            <div class="font-bold text-amber-400">${m.bookmarkItemCount}<span class="text-[9px] font-normal text-slate-400 ml-0.5">건</span></div>
          </div>
          <div class="bg-slate-800/70 p-2 rounded-lg border border-slate-700/50">
            <div class="text-[10px] text-rose-400/80 mb-0.5">찜</div>
            <div class="font-bold text-rose-400">${m.favoriteCount}<span class="text-[9px] font-normal text-slate-400 ml-0.5">건</span></div>
          </div>
          <div class="bg-slate-800/70 p-2 rounded-lg border border-slate-700/50">
            <div class="text-[10px] text-purple-400/80 mb-0.5">숨김</div>
            <div class="font-bold text-purple-400">${m.hiddenCount}<span class="text-[9px] font-normal text-slate-400 ml-0.5">건</span></div>
          </div>
        </div>

        <!-- 상세 활동 보기 버튼 -->
        <button onclick="openMemberModal('${escapeHtml(m.id)}')"
          class="w-full py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition">
          <span>활동 상세 보기</span>
          <i class="fa-solid fa-chevron-right text-[10px] text-slate-400"></i>
        </button>
      </div>
    `).join("");
  }
}

function sortMembers(columnKey) {
  if (currentSortCol === columnKey) {
    currentSortDir = (currentSortDir === "asc") ? "desc" : "asc";
  } else {
    currentSortCol = columnKey;
    currentSortDir = "desc";
  }

  updateSortIcons();
  applyMemberSort();
}

function updateSortIcons() {
  const columns = ["id", "createdAt", "preferredRegions", "bookmarkFolderCount", "bookmarkItemCount", "favoriteCount", "hiddenCount"];
  columns.forEach(col => {
    // 1. PC 테이블 헤더 아이콘
    const iconSpan = document.getElementById(`sort-icon-${col}`);
    if (iconSpan) {
      if (col === currentSortCol) {
        iconSpan.className = "text-[11px] text-emerald-400";
        iconSpan.innerHTML = currentSortDir === "asc"
          ? '<i class="fa-solid fa-sort-up"></i>'
          : '<i class="fa-solid fa-sort-down"></i>';
      } else {
        iconSpan.className = "text-[10px] text-slate-500 group-hover:text-slate-300";
        iconSpan.innerHTML = '<i class="fa-solid fa-sort"></i>';
      }
    }

    // 2. 모바일 알약 버튼 스타일
    const mBtn = document.getElementById(`m-sort-${col}`);
    if (mBtn) {
      const baseLabel = mBtn.getAttribute("data-label") || mBtn.textContent.replace(/ [▲▼↑↓]/g, "").trim();
      mBtn.setAttribute("data-label", baseLabel);
      if (col === currentSortCol) {
        const arrow = currentSortDir === "asc" ? "▲" : "▼";
        mBtn.className = "px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 transition font-semibold";
        mBtn.textContent = `${baseLabel} ${arrow}`;
      } else {
        mBtn.className = "px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 transition";
        mBtn.textContent = baseLabel;
      }
    }
  });
}

function applyMemberSort() {
  if (!currentSortCol || !currentMemberList) return;

  const numericCols = ["bookmarkFolderCount", "bookmarkItemCount", "favoriteCount", "hiddenCount"];
  const isNumeric = numericCols.includes(currentSortCol);

  currentMemberList.sort((a, b) => {
    let valA = a[currentSortCol];
    let valB = b[currentSortCol];

    if (isNumeric) {
      valA = Number(valA || 0);
      valB = Number(valB || 0);
      return currentSortDir === "asc" ? (valA - valB) : (valB - valA);
    } else {
      valA = String(valA || "");
      valB = String(valB || "");
      const cmp = valA.localeCompare(valB, "ko");
      return currentSortDir === "asc" ? cmp : -cmp;
    }
  });

  renderMemberTable(currentMemberList);
}

function searchMembers() {
  const input = document.getElementById("member-search-input");
  currentSearchQuery = input.value.trim();
  loadMembers(0);
}

function changeMemberPage(delta) {
  const targetPage = currentMemberPage + delta;
  if (targetPage >= 0 && targetPage < totalMemberPages) {
    loadMembers(targetPage);
  }
}

// -------------------------------------------------------------
// 3. 회원 활동 상세 모달
// -------------------------------------------------------------
let currentMemberActivityData = null;

async function openMemberModal(memberId) {
  const modal = document.getElementById("modal-member-activity");
  modal.classList.remove("hidden");

  document.getElementById("modal-member-id").textContent = memberId;
  document.getElementById("modal-member-created").textContent = "-";
  document.getElementById("modal-member-regions").textContent = "-";

  document.getElementById("modal-tab-content-bookmarks").innerHTML = renderCatLoader("북마크 활동 내역을 불러오는 중...", 0.45);
  document.getElementById("modal-tab-content-favorites").innerHTML = renderCatLoader("찜 활동 내역을 불러오는 중...", 0.45);
  document.getElementById("modal-tab-content-hidden").innerHTML = renderCatLoader("숨김 활동 내역을 불러오는 중...", 0.45);

  switchModalTab("bookmarks");

  try {
    const res = await fetch(`/api/proxy/users/${encodeURIComponent(memberId)}/activity`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    currentMemberActivityData = data;

    document.getElementById("modal-member-created").textContent = formatDate(data.createdAt);
    document.getElementById("modal-member-regions").textContent = formatRegions(data.preferredRegions);

    document.getElementById("modal-count-bookmarks").textContent = data.bookmarks ? data.bookmarks.length : 0;
    document.getElementById("modal-count-favorites").textContent = data.favorites ? data.favorites.length : 0;
    document.getElementById("modal-count-hidden").textContent = data.hiddenList ? data.hiddenList.length : 0;

    renderModalTabs(data);
  } catch (err) {
    document.getElementById("modal-tab-content-bookmarks").innerHTML = `<p class="text-xs text-rose-400">조회 실패: ${escapeHtml(err.message)}</p>`;
  }
}

function closeMemberModal() {
  document.getElementById("modal-member-activity").classList.add("hidden");
}

function switchModalTab(tabKey) {
  ["bookmarks", "favorites", "hidden"].forEach(key => {
    const tabBtn = document.getElementById(`modal-tab-${key}`);
    const tabContent = document.getElementById(`modal-tab-content-${key}`);
    if (key === tabKey) {
      tabBtn.className = "pb-3 border-b-2 border-emerald-400 text-emerald-400 font-bold";
      tabContent.classList.remove("hidden");
    } else {
      tabBtn.className = "pb-3 border-b-2 border-transparent text-slate-400 hover:text-slate-200";
      tabContent.classList.add("hidden");
    }
  });
}

function renderModalTabs(data) {
  // 북마크 탭
  const bmContainer = document.getElementById("modal-tab-content-bookmarks");
  if (!data.bookmarks || data.bookmarks.length === 0) {
    bmContainer.innerHTML = `<p class="text-xs text-slate-500 py-6 text-center">저장된 북마크 단지가 없습니다.</p>`;
  } else {
    bmContainer.innerHTML = data.bookmarks.map(b => `
      <div class="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 flex flex-col sm:flex-row justify-between gap-2">
        <div>
          <div class="flex items-center space-x-2">
            <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
              ${escapeHtml(b.folderName || "기본 폴더")}
            </span>
            <span class="font-bold text-white text-sm">${escapeHtml(b.complexName)}</span>
          </div>
          <p class="text-xs text-slate-400 mt-1">${escapeHtml(b.address || "-")}</p>
          ${b.memo ? `<p class="text-xs text-amber-300/90 mt-1 bg-amber-500/10 px-2 py-1 rounded inline-block">📝 ${escapeHtml(b.memo)}</p>` : ''}
        </div>
        <div class="text-right text-[11px] text-slate-500 font-mono self-start sm:self-auto">
          ${formatDate(b.createdAt)}
        </div>
      </div>
    `).join("");
  }

  // 찜 공고 탭
  const favContainer = document.getElementById("modal-tab-content-favorites");
  if (!data.favorites || data.favorites.length === 0) {
    favContainer.innerHTML = `<p class="text-xs text-slate-500 py-6 text-center">찜한 공고가 없습니다.</p>`;
  } else {
    favContainer.innerHTML = data.favorites.map(f => `
      <div class="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 flex justify-between items-center">
        <div>
          <div class="flex items-center space-x-2">
            <span class="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-medium">
              ${escapeHtml(f.institution || "기관")}
            </span>
            <span class="font-bold text-white text-sm">${escapeHtml(f.title)}</span>
          </div>
          <span class="text-xs text-slate-400 mt-1 block">${escapeHtml(f.subscriptionType || "")}</span>
        </div>
        <span class="text-[11px] text-slate-500 font-mono">${formatDate(f.updatedAt)}</span>
      </div>
    `).join("");
  }

  // 숨김 공고 탭
  const hidContainer = document.getElementById("modal-tab-content-hidden");
  if (!data.hiddenList || data.hiddenList.length === 0) {
    hidContainer.innerHTML = `<p class="text-xs text-slate-500 py-6 text-center">숨긴 공고가 없습니다.</p>`;
  } else {
    hidContainer.innerHTML = data.hiddenList.map(h => `
      <div class="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 flex justify-between items-center">
        <div>
          <div class="flex items-center space-x-2">
            <span class="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">
              ${escapeHtml(h.institution || "기관")}
            </span>
            <span class="font-bold text-slate-300 text-sm">${escapeHtml(h.title)}</span>
          </div>
          <span class="text-xs text-slate-500 mt-1 block">${escapeHtml(h.subscriptionType || "")}</span>
        </div>
        <span class="text-[11px] text-slate-500 font-mono">${formatDate(h.updatedAt)}</span>
      </div>
    `).join("");
  }
}

// -------------------------------------------------------------
// 4. 실서버 공고 및 DB 조회 로직
// -------------------------------------------------------------
async function loadAnnouncements(forceRefresh = false) {
  if (isAnnouncementsLoading) return;
  isAnnouncementsLoading = true;

  const tableBody = document.getElementById("announcement-table-body");
  const mobileList = document.getElementById("announcement-mobile-list");

  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center">
          ${renderCatLoader("실서버 공고 데이터를 불러오는 중입니다...", 0.6)}
        </td>
      </tr>
    `;
  }
  if (mobileList) {
    mobileList.innerHTML = `
      <div class="p-8 text-center">
        ${renderCatLoader("실서버 공고 데이터를 불러오는 중입니다...", 0.6)}
      </div>
    `;
  }

  try {
    const res = await fetch("/api/proxy/announcements");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allAnnouncements = Array.isArray(data) ? data : [];

    // 실서버 DB 통계 카드 4종 카운트
    const totalCount = allAnnouncements.length;
    let lhCount = 0;
    let shCount = 0;
    let ghCount = 0;

    for (const ann of allAnnouncements) {
      const inst = (ann.institution || "").toUpperCase();
      if (inst.includes("LH")) lhCount++;
      else if (inst.includes("SH")) shCount++;
      else if (inst.includes("GH")) ghCount++;
    }

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = Number(val).toLocaleString();
    };

    setEl("stat-db-total-anns", totalCount);
    setEl("stat-db-lh", lhCount);
    setEl("stat-db-sh", shCount);
    setEl("stat-db-gh", ghCount);
    setEl("ann-total-db-count", totalCount);

    // 필터 및 테이블 렌더링
    filterAnnouncements();

  } catch (err) {
    console.error("Announcements load error:", err);
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-rose-400">
            <i class="fa-solid fa-triangle-exclamation mr-1"></i>
            실서버 공고 데이터를 불러오지 못했습니다: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
    if (mobileList) {
      mobileList.innerHTML = `
        <div class="p-6 text-center text-rose-400 text-xs">
          <i class="fa-solid fa-triangle-exclamation mr-1"></i>
          실서버 공고 데이터를 불러오지 못했습니다: ${escapeHtml(err.message)}
        </div>
      `;
    }
  } finally {
    isAnnouncementsLoading = false;
  }
}

function filterAnnouncementsByInst(inst) {
  currentInstFilter = inst;
  currentAnnPage = 0;

  // 알약 버튼 스타일 업데이트
  const buttons = {
    ALL: document.getElementById("ann-inst-all"),
    LH: document.getElementById("ann-inst-lh"),
    SH: document.getElementById("ann-inst-sh"),
    GH: document.getElementById("ann-inst-gh")
  };

  const activeCls = "px-3 py-1.5 rounded-lg font-semibold transition bg-emerald-500 text-white";
  const inactiveCls = "px-3 py-1.5 rounded-lg font-semibold transition text-slate-400 hover:text-white";

  for (const [key, btn] of Object.entries(buttons)) {
    if (btn) {
      btn.className = (key === inst) ? activeCls : inactiveCls;
    }
  }

  filterAnnouncements();
}

function filterAnnouncements() {
  const searchInput = document.getElementById("ann-search-input");
  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const typeFilter = document.getElementById("ann-type-filter");
  const selectedType = typeFilter ? typeFilter.value : "ALL";

  filteredAnnouncements = allAnnouncements.filter(item => {
    // 1. 기관 필터
    if (currentInstFilter !== "ALL") {
      const inst = (item.institution || "").toUpperCase();
      if (!inst.includes(currentInstFilter)) return false;
    }

    // 2. 청약 유형 필터
    if (selectedType !== "ALL") {
      const type = (item.subscription_type || item.subscriptionType || "");
      if (!type.includes(selectedType)) return false;
    }

    // 3. 검색어 필터 (공고명, 공급지역)
    if (query) {
      const title = (item.title || "").toLowerCase();
      const region = (item.region || "").toLowerCase();
      if (!title.includes(query) && !region.includes(query)) return false;
    }

    return true;
  });

  const filteredCountEl = document.getElementById("ann-filtered-count");
  if (filteredCountEl) {
    filteredCountEl.textContent = Number(filteredAnnouncements.length).toLocaleString();
  }

  // 페이지 인덱스 보정
  const maxPage = Math.max(0, Math.ceil(filteredAnnouncements.length / ANN_PAGE_SIZE) - 1);
  if (currentAnnPage > maxPage) {
    currentAnnPage = maxPage;
  }

  renderAnnouncementTable();
}

function renderAnnouncementTable() {
  const tableBody = document.getElementById("announcement-table-body");
  const mobileList = document.getElementById("announcement-mobile-list");
  if (!tableBody && !mobileList) return;

  const total = filteredAnnouncements.length;
  const startIdx = currentAnnPage * ANN_PAGE_SIZE;
  const endIdx = Math.min(startIdx + ANN_PAGE_SIZE, total);
  const pageItems = filteredAnnouncements.slice(startIdx, endIdx);

  // 기관 뱃지 헬퍼
  const getInstBadge = (inst) => {
    const raw = (inst || "기타").toUpperCase();
    if (raw.includes("LH")) {
      return `<span class="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold">LH</span>`;
    } else if (raw.includes("SH")) {
      return `<span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold">SH</span>`;
    } else if (raw.includes("GH")) {
      return `<span class="px-2 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-bold">GH</span>`;
    }
    return `<span class="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs font-bold">${escapeHtml(raw)}</span>`;
  };

  // 일정 요약 헬퍼
  const formatScheduleText = (ann) => {
    if (Array.isArray(ann.schedules) && ann.schedules.length > 0) {
      const applySched = ann.schedules.find(s => s.schedule_type === "서류제출" || s.schedule_type === "청약접수") || ann.schedules[0];
      if (applySched && applySched.start_date) {
        const start = applySched.start_date.substring(5, 10);
        const end = applySched.end_date ? ` ~ ${applySched.end_date.substring(5, 10)}` : "";
        return `<span class="text-emerald-400 font-mono">${start}${end}</span>`;
      }
    }
    if (ann.created_at) {
      return `<span class="text-slate-400 font-mono">${ann.created_at.substring(0, 10)}</span>`;
    }
    return `<span class="text-slate-500">-</span>`;
  };

  // 1. 데스크톱 테이블 렌더링
  if (tableBody) {
    if (pageItems.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-12 text-center text-slate-400 text-sm">
            조건에 부합하는 공고가 없습니다.
          </td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = pageItems.map(item => `
        <tr class="hover:bg-slate-700/30 transition">
          <td class="py-3 px-4 font-mono text-xs text-slate-400 text-center">${item.id}</td>
          <td class="py-3 px-4 whitespace-nowrap">${getInstBadge(item.institution)}</td>
          <td class="py-3 px-4 text-xs text-slate-300 whitespace-nowrap">
            ${escapeHtml(item.subscription_type || item.subscriptionType || "-")}
          </td>
          <td class="py-3 px-4 min-w-[280px]">
            <a href="https://pleasehome.com/announcements/details/${item.id}" target="_blank" rel="noopener noreferrer"
              class="font-medium text-white hover:text-emerald-400 transition flex items-center space-x-1.5 group">
              <span class="group-hover:underline line-clamp-1">${escapeHtml(item.title)}</span>
              <i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-slate-500 group-hover:text-emerald-400"></i>
            </a>
          </td>
          <td class="py-3 px-4 text-xs text-slate-300 whitespace-nowrap">
            ${escapeHtml(item.region || "-")}
          </td>
          <td class="py-3 px-4 text-xs whitespace-nowrap">
            ${formatScheduleText(item)}
          </td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <div class="flex items-center justify-end space-x-1.5">
              <a href="https://pleasehome.com/announcements/details/${item.id}" target="_blank" rel="noopener noreferrer"
                class="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition" title="실서버 상세 페이지">
                상세보기
              </a>
              ${item.dtl_url ? `
                <a href="${escapeHtml(item.dtl_url)}" target="_blank" rel="noopener noreferrer"
                  class="p-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition" title="원문 공고문 바로가기">
                  <i class="fa-solid fa-file-lines"></i>
                </a>
              ` : ''}
            </div>
          </td>
        </tr>
      `).join("");
    }
  }

  // 2. 모바일 카드 렌더링
  if (mobileList) {
    if (pageItems.length === 0) {
      mobileList.innerHTML = `
        <div class="p-8 text-center text-slate-400 text-xs">
          조건에 부합하는 공고가 없습니다.
        </div>
      `;
    } else {
      mobileList.innerHTML = pageItems.map(item => `
        <div class="p-4 space-y-2 hover:bg-slate-700/20 transition">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="font-mono text-xs text-slate-500">#${item.id}</span>
              ${getInstBadge(item.institution)}
              <span class="text-xs text-slate-400">${escapeHtml(item.subscription_type || item.subscriptionType || "-")}</span>
            </div>
            <span class="text-xs text-slate-400 font-medium">${escapeHtml(item.region || "-")}</span>
          </div>

          <a href="https://pleasehome.com/announcements/details/${item.id}" target="_blank" rel="noopener noreferrer"
            class="block font-semibold text-white text-sm hover:text-emerald-400 transition leading-snug">
            ${escapeHtml(item.title)}
          </a>

          <div class="flex items-center justify-between pt-1 text-xs">
            <div class="text-slate-400 flex items-center space-x-1">
              <i class="fa-regular fa-calendar text-[11px]"></i>
              <span>${formatScheduleText(item)}</span>
            </div>
            <div class="flex items-center space-x-1.5">
              ${item.dtl_url ? `
                <a href="${escapeHtml(item.dtl_url)}" target="_blank" rel="noopener noreferrer"
                  class="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[11px] border border-slate-700">
                  원문
                </a>
              ` : ''}
              <a href="https://pleasehome.com/announcements/details/${item.id}" target="_blank" rel="noopener noreferrer"
                class="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-medium">
                상세보기
              </a>
            </div>
          </div>
        </div>
      `).join("");
    }
  }

  // 3. 페이지네이션 UI 업데이트
  const totalPages = Math.max(1, Math.ceil(total / ANN_PAGE_SIZE));
  const pageInfo = document.getElementById("ann-page-info");
  const paginationInfo = document.getElementById("ann-pagination-info");
  const prevBtn = document.getElementById("btn-ann-prev-page");
  const nextBtn = document.getElementById("btn-ann-next-page");

  if (pageInfo) {
    pageInfo.textContent = `${currentAnnPage + 1} / ${totalPages}`;
  }
  if (paginationInfo) {
    paginationInfo.textContent = total > 0 ? `${startIdx + 1} - ${endIdx} / ${total.toLocaleString()}건` : "0 - 0 / 0건";
  }
  if (prevBtn) {
    prevBtn.disabled = currentAnnPage <= 0;
  }
  if (nextBtn) {
    nextBtn.disabled = currentAnnPage >= totalPages - 1;
  }
}

function changeAnnPage(delta) {
  const totalPages = Math.max(1, Math.ceil(filteredAnnouncements.length / ANN_PAGE_SIZE));
  const targetPage = currentAnnPage + delta;
  if (targetPage >= 0 && targetPage < totalPages) {
    currentAnnPage = targetPage;
    renderAnnouncementTable();
  }
}

// -------------------------------------------------------------
// 5. 기관 홈페이지 실시간 공고 탐색 (다운로드 없음)
// -------------------------------------------------------------
function setExtDatePreset(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  // toISOString은 UTC라 한국 오전 9시 전엔 하루 밀린다 → 로컬 날짜로
  const format = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const startInput = document.getElementById("ext-start-date");
  const endInput = document.getElementById("ext-end-date");
  if (startInput) startInput.value = format(start);
  if (endInput) endInput.value = format(end);

  // 프리셋 버튼 스타일 토글
  [7, 14, 30].forEach(d => {
    const btn = document.getElementById(`ext-preset-${d}`);
    if (btn) {
      if (d === days) {
        btn.className = "px-2.5 py-1 rounded-lg font-bold bg-slate-800 text-emerald-400 transition";
      } else {
        btn.className = "px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition";
      }
    }
  });
}

// 날짜를 직접 바꾸면 프리셋 강조를 끄고, 이미 조회했으면 바로 다시 조회
function onExtDateChange() {
  [7, 14, 30].forEach(d => {
    const btn = document.getElementById(`ext-preset-${d}`);
    if (btn) btn.className = "px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition";
  });
  if (externalNoticesList.length > 0) loadLiveExternalNotices();
}

// 공급 지역 다중 선택 상태 (기본값: 서울, 경기, 인천 다중 활성화)
let selectedRegions = new Set(["서울", "경기", "인천"]);
let isAllRegions = false;

const EXT_REGIONS = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];

function updateRegionUI() {
  const group = document.getElementById("ext-region-group");
  if (!group) return;
  const btn = (on, onclick, label) =>
    `<button type="button" aria-pressed="${on}" onclick="${onclick}" class="lg:flex-1 px-2 py-1.5 rounded-lg whitespace-nowrap transition ${on ? "font-bold bg-emerald-500 text-white shadow-sm" : "font-semibold text-slate-400 hover:text-white"}">${label}</button>`;
  group.innerHTML = btn(isAllRegions, "toggleAllRegions()", "전체") +
    EXT_REGIONS.map(r => btn(!isAllRegions && selectedRegions.has(r), `toggleRegion('${r}')`, r)).join("");
}

function toggleRegion(r) {
  isAllRegions = false;
  if (selectedRegions.has(r)) {
    selectedRegions.delete(r);
  } else {
    selectedRegions.add(r);
  }
  updateRegionUI();
  if (externalNoticesList.length > 0) {
    loadLiveExternalNotices();
  }
}

function toggleAllRegions() {
  isAllRegions = !isAllRegions;
  if (isAllRegions) {
    selectedRegions.clear();
  } else {
    selectedRegions = new Set(["서울", "경기", "인천"]);
  }
  updateRegionUI();
  if (externalNoticesList.length > 0) {
    loadLiveExternalNotices();
  }
}

function setExtInst(inst) {
  currentExtInst = inst;
  const buttons = {
    ALL: document.getElementById("ext-inst-all"),
    LH: document.getElementById("ext-inst-lh"),
    SH: document.getElementById("ext-inst-sh"),
    GH: document.getElementById("ext-inst-gh")
  };
  const activeCls = "px-3.5 py-1.5 rounded-lg font-bold transition bg-emerald-500 text-white shadow-sm";
  const inactiveCls = "px-3.5 py-1.5 rounded-lg font-semibold transition text-slate-400 hover:text-white";

  for (const [key, btn] of Object.entries(buttons)) {
    if (btn) btn.className = (key === inst) ? activeCls : inactiveCls;
  }
  if (externalNoticesList.length > 0) {
    loadLiveExternalNotices();
  }
}

async function loadLiveExternalNotices() {
  if (isExtLoading) return;
  isExtLoading = true;

  const tbody = document.getElementById("external-notices-tbody");
  const mobileList = document.getElementById("external-notices-mobile");
  const btn = document.getElementById("btn-fetch-live");

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>공고 조회 중...</span>`;
  }

  const loaderHtml = renderCatLoader("각 기관 공식 사이트에서 최신 공고를 조회 중입니다...", 0.6);
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-12 text-center">${loaderHtml}</td></tr>`;
  }
  if (mobileList) {
    mobileList.innerHTML = `<div class="p-8 text-center">${loaderHtml}</div>`;
  }

  const startDate = document.getElementById("ext-start-date")?.value || "";
  const endDate = document.getElementById("ext-end-date")?.value || "";
  const recruitmentOnly = document.getElementById("ext-recruitment-only")?.checked !== false;

  const regionParam = (isAllRegions || selectedRegions.size === 0)
    ? "ALL"
    : [...selectedRegions].join(",");

  const params = new URLSearchParams({
    institution: currentExtInst,
    region: regionParam,
    start_date: startDate,
    end_date: endDate,
    recruitment_only: recruitmentOnly ? "true" : "false"
  });

  try {
    const res = await fetch(`/api/external/announcements?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    externalNoticesList = Array.isArray(data.items) ? data.items : [];

    // 통계 카드 반영
    const stats = data.stats || {};
    const setStat = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = Number(val || 0).toLocaleString();
    };
    setStat("stat-ext-total", stats.total);
    setStat("stat-ext-new", stats.new_count);
    setStat("stat-ext-lh", stats.lh);
    setStat("stat-ext-sh", stats.sh);
    setStat("stat-ext-gh", stats.gh);

    renderExternalNotices();

  } catch (err) {
    console.error("External announcements error:", err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-rose-400">
            <i class="fa-solid fa-triangle-exclamation mr-1"></i>
            공고 실시간 조회 실패: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  } finally {
    isExtLoading = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-magnifying-glass text-xs"></i> <span>공고 조회하기</span>`;
    }
  }
}

function renderExternalNotices() {
  const tbody = document.getElementById("external-notices-tbody");
  const mobileList = document.getElementById("external-notices-mobile");
  if (!tbody && !mobileList) return;

  const searchInput = document.getElementById("ext-search-input");
  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const newOnly = document.getElementById("ext-new-only")?.checked === true;

  const items = externalNoticesList.filter(item => {
    if (newOnly && item.is_ingested) return false;
    if (query) {
      const title = (item.title || "").toLowerCase();
      const region = (item.region || "").toLowerCase();
      if (!title.includes(query) && !region.includes(query)) return false;
    }
    return true;
  });

  const countEl = document.getElementById("ext-display-count");
  if (countEl) countEl.textContent = Number(items.length).toLocaleString();

  const getBadge = (inst) => {
    const raw = (inst || "").toUpperCase();
    if (raw.includes("LH")) return `<span class="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold">LH</span>`;
    if (raw.includes("SH")) return `<span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold">SH</span>`;
    if (raw.includes("GH")) return `<span class="px-2 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-bold">GH</span>`;
    return `<span class="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs font-bold">${escapeHtml(raw)}</span>`;
  };

  const getStatusBadge = (item) => {
    if (item.is_ingested) {
      return `<span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
        <i class="fa-solid fa-check text-[10px]"></i>
        <span>적재 완료</span>
      </span>`;
    }
    return `<span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold animate-pulse">
      <i class="fa-solid fa-bell text-[10px]"></i>
      <span>신규 미적재</span>
    </span>`;
  };

  // 데스크톱 테이블
  if (tbody) {
    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-12 text-center text-slate-400 text-sm">
            조회된 공고가 없거나 조건에 부합하는 공고가 없습니다.
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = items.map(it => `
        <tr class="hover:bg-slate-700/30 transition ${!it.is_ingested ? 'bg-amber-500/[0.03]' : ''}">
          <td class="py-3 px-4 text-center whitespace-nowrap">${getBadge(it.institution)}</td>
          <td class="py-3 px-4 text-xs font-mono text-slate-400 whitespace-nowrap">
            ${it.notice_date || "-"}
          </td>
          <td class="py-3 px-4 min-w-[320px]">
            <a href="${escapeHtml(it.detail_url)}" target="_blank" rel="noopener noreferrer"
              class="font-medium text-white hover:text-emerald-400 transition flex items-center space-x-1.5 group">
              <span class="group-hover:underline line-clamp-1">${escapeHtml(it.title)}</span>
              <i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-slate-500 group-hover:text-emerald-400"></i>
            </a>
          </td>
          <td class="py-3 px-4 text-xs text-slate-300 whitespace-nowrap">
            <span class="text-slate-200">${escapeHtml(it.subscription_type || "-")}</span>
            <span class="text-slate-500 mx-1">|</span>
            <span class="text-slate-400">${escapeHtml(it.region || "-")}</span>
          </td>
          <td class="py-3 px-4 text-center whitespace-nowrap">
            ${getStatusBadge(it)}
          </td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <a href="${escapeHtml(it.detail_url)}" target="_blank" rel="noopener noreferrer"
              class="px-2.5 py-1 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition inline-flex items-center space-x-1">
              <span>원문</span>
              <i class="fa-solid fa-chevron-right text-[9px]"></i>
            </a>
          </td>
        </tr>
      `).join("");
    }
  }

  // 모바일 리스트
  if (mobileList) {
    if (items.length === 0) {
      mobileList.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs">조회된 공고가 없습니다.</div>`;
    } else {
      mobileList.innerHTML = items.map(it => `
        <div class="p-4 space-y-2 hover:bg-slate-700/20 transition ${!it.is_ingested ? 'bg-amber-500/[0.04]' : ''}">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              ${getBadge(it.institution)}
              <span class="text-xs text-slate-400">${escapeHtml(it.subscription_type || "")}</span>
              <span class="text-xs text-slate-400">${escapeHtml(it.region || "")}</span>
            </div>
            ${getStatusBadge(it)}
          </div>

          <a href="${escapeHtml(it.detail_url)}" target="_blank" rel="noopener noreferrer"
            class="block font-semibold text-white text-sm hover:text-emerald-400 transition leading-snug">
            ${escapeHtml(it.title)}
          </a>

          <div class="flex items-center justify-between pt-1 text-xs text-slate-400">
            <span>공고일: <strong class="font-mono text-slate-300">${it.notice_date || "-"}</strong></span>
            <a href="${escapeHtml(it.detail_url)}" target="_blank" rel="noopener noreferrer"
              class="px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 text-[11px]">
              원문 보기 <i class="fa-solid fa-arrow-up-right-from-square text-[9px] ml-0.5"></i>
            </a>
          </div>
        </div>
      `).join("");
    }
  }
}

// -------------------------------------------------------------
// 유틸리티 함수
// -------------------------------------------------------------
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(isoStr) {
  if (!isoStr) return "-";
  return String(isoStr).replace("T", " ").substring(0, 19);
}

function formatRegions(regionsStr) {
  if (!regionsStr) return '<span class="text-slate-500">전국 (미선택)</span>';
  const regionMap = {
    "11": "서울", "41": "경기", "28": "인천", "26": "부산", "27": "대구",
    "29": "광주", "30": "대전", "31": "울산", "36": "세종", "42": "강원",
    "43": "충북", "44": "충남", "45": "전북", "46": "전남", "47": "경북",
    "48": "경남", "50": "제주"
  };
  return regionsStr.split(",")
    .map(c => regionMap[c.trim()] || c.trim())
    .join(", ");
}
