// PleaseHome Admin Console Frontend Logic

let currentMemberPage = 0;
let totalMemberPages = 1;
let currentSearchQuery = "";
let currentMemberList = [];
let currentSortCol = null;
let currentSortDir = "desc";
let currentJobId = null;
let currentEventSource = null;

// 초기화
document.addEventListener("DOMContentLoaded", () => {
  initDatePresets();
  loadAdminStats();
  loadMembers(0);
  loadPipelineStatus();
});

function initDatePresets() {
  setDateRangePreset(10);
}

function setDateRangePreset(days) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const format = (d) => d.toISOString().split("T")[0];
  const startInput = document.getElementById("pipeline-start-date");
  const endInput = document.getElementById("pipeline-end-date");
  if (startInput) startInput.value = format(startDate);
  if (endInput) endInput.value = format(endDate);
}

// 탭 전환
function switchTab(tab) {
  const usersSection = document.getElementById("section-users");
  const pipelineSection = document.getElementById("section-pipeline");
  const btnUsers = document.getElementById("tab-btn-users");
  const btnPipeline = document.getElementById("tab-btn-pipeline");

  if (tab === "users") {
    usersSection.classList.remove("hidden");
    pipelineSection.classList.add("hidden");
    btnUsers.className = "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 flex items-center space-x-2 bg-emerald-500 text-white shadow-sm";
    btnPipeline.className = "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 flex items-center space-x-2 text-slate-400 hover:text-slate-200";
    loadAdminStats();
  } else {
    usersSection.classList.add("hidden");
    pipelineSection.classList.remove("hidden");
    btnPipeline.className = "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 flex items-center space-x-2 bg-emerald-500 text-white shadow-sm";
    btnUsers.className = "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 flex items-center space-x-2 text-slate-400 hover:text-slate-200";
    loadPipelineStatus();
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
  tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-slate-500">불러오는 중...</td></tr>`;
  if (cardList) {
    cardList.innerHTML = `<p class="py-8 text-center text-slate-500 text-sm">회원 데이터를 불러오는 중...</p>`;
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

  document.getElementById("modal-tab-content-bookmarks").innerHTML = `<p class="text-xs text-slate-500">데이터 로딩 중...</p>`;
  document.getElementById("modal-tab-content-favorites").innerHTML = `<p class="text-xs text-slate-500">데이터 로딩 중...</p>`;
  document.getElementById("modal-tab-content-hidden").innerHTML = `<p class="text-xs text-slate-500">데이터 로딩 중...</p>`;

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
// 4. 공고 파이프라인 상태 모니터링
// -------------------------------------------------------------
async function loadPipelineStatus() {
  try {
    const res = await fetch("/api/pipeline/status");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // PDF 폴더 큐
    const folderList = document.getElementById("pdf-folder-list");
    if (!data.pdf_folders || data.pdf_folders.length === 0) {
      folderList.innerHTML = `<p class="text-xs text-slate-500 py-4 text-center">현재 대기 중인 신규 공고 폴더가 없습니다. (모두 아카이빙 완료)</p>`;
    } else {
      folderList.innerHTML = data.pdf_folders.map(f => `
        <div class="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 flex items-center justify-between">
          <div class="truncate mr-3">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-mono font-bold text-slate-200 truncate">${escapeHtml(f.name)}</span>
              ${f.has_passed_token ? '<span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">감사 통과</span>' : ''}
              ${f.has_data_json ? '<span class="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">data.json</span>' : ''}
            </div>
            <span class="text-[11px] text-slate-400 mt-0.5 block truncate">
              ${f.pdf_files.length > 0 ? f.pdf_files.join(", ") : 'PDF 없음'}
            </span>
          </div>
          <span class="text-xs text-slate-500 flex-shrink-0">${f.file_count}개 파일</span>
        </div>
      `).join("");
    }

    // 로컬 DB 현황
    if (data.db_stats) {
      document.getElementById("db-total-anns").textContent = Number(data.db_stats.total_announcements || 0).toLocaleString();
      document.getElementById("db-total-complexes").textContent = Number(data.db_stats.total_complexes || 0).toLocaleString();
      document.getElementById("db-total-units").textContent = Number(data.db_stats.total_units || 0).toLocaleString();

      const recentContainer = document.getElementById("db-recent-anns");
      if (data.db_stats.recent_announcements && data.db_stats.recent_announcements.length > 0) {
        recentContainer.innerHTML = data.db_stats.recent_announcements.slice(0, 5).map(a => `
          <div class="p-2 bg-slate-900/40 rounded-lg flex items-center justify-between">
            <span class="truncate mr-2 font-medium">[ID ${a.id}] ${escapeHtml(a.title)}</span>
            <span class="text-[10px] text-slate-400 font-mono flex-shrink-0">${formatDate(a.created_at)}</span>
          </div>
        `).join("");
      } else {
        recentContainer.innerHTML = `<p class="text-slate-500">적재된 공고 없음</p>`;
      }
    }

  } catch (err) {
    console.error("Pipeline status error:", err);
  }
}

// -------------------------------------------------------------
// 5. 파이프라인 CLI 실행 및 SSE 실시간 터미널 스트리밍
// -------------------------------------------------------------
async function triggerPipeline(command, title) {
  if (currentEventSource) {
    alert("이미 실행 중인 작업이 있습니다. 먼저 완료되거나 중단될 때까지 기다려주세요.");
    return;
  }

  const terminalBody = document.getElementById("terminal-body");
  const jobTitle = document.getElementById("terminal-job-title");
  const spinner = document.getElementById("terminal-spinner");
  const stopBtn = document.getElementById("btn-stop-job");

  jobTitle.textContent = `Running: ${title} (${command})`;
  spinner.classList.remove("hidden");
  stopBtn.classList.remove("hidden");

  terminalBody.textContent += `\n\n======================================================\n`;
  terminalBody.textContent += `🚀 [작업 시작] ${title} (${new Date().toLocaleTimeString()})\n`;
  terminalBody.textContent += `======================================================\n`;
  terminalBody.scrollTop = terminalBody.scrollHeight;

  const startDateInput = document.getElementById("pipeline-start-date");
  const endDateInput = document.getElementById("pipeline-end-date");
  const startDate = startDateInput ? startDateInput.value : "";
  const endDate = endDateInput ? endDateInput.value : "";

  try {
    const res = await fetch("/api/pipeline/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command,
        start_date: startDate,
        end_date: endDate
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    currentJobId = data.job_id;

    // SSE 연결
    currentEventSource = new EventSource(`/api/pipeline/stream/${currentJobId}`);

    currentEventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.text) {
          terminalBody.textContent += payload.text;
          terminalBody.scrollTop = terminalBody.scrollHeight;
        }
        if (payload.done) {
          finishJob(payload.exit_code);
        }
      } catch (e) {
        terminalBody.textContent += event.data + "\n";
      }
    };

    currentEventSource.onerror = () => {
      finishJob(-1);
    };

  } catch (err) {
    terminalBody.textContent += `❌ 작업 실행 요청 실패: ${err.message}\n`;
    finishJob(-1);
  }
}

function finishJob(exitCode) {
  const jobTitle = document.getElementById("terminal-job-title");
  const spinner = document.getElementById("terminal-spinner");
  const stopBtn = document.getElementById("btn-stop-job");

  if (currentEventSource) {
    currentEventSource.close();
    currentEventSource = null;
  }
  currentJobId = null;

  spinner.classList.add("hidden");
  stopBtn.classList.add("hidden");

  if (exitCode === 0) {
    jobTitle.textContent = `Terminal: 작업 성공 (Exit code: 0)`;
  } else {
    jobTitle.textContent = `Terminal: 작업 종료 (Exit code: ${exitCode})`;
  }

  // 작업 완료 후 공고 현황 자동 갱신
  loadPipelineStatus();
}

async function stopCurrentJob() {
  if (!currentJobId) return;
  try {
    await fetch(`/api/pipeline/stop/${currentJobId}`, { method: "POST" });
  } catch (err) {
    console.error("Stop job error:", err);
  }
}

function clearTerminal() {
  const terminalBody = document.getElementById("terminal-body");
  terminalBody.textContent = `Terminal 초기화됨.\n`;
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
