package com.pleasehome.backend.admin

data class AdminStatsResponse(
    val totalMembers: Long,
    val totalBookmarks: Long,
    val totalFavorites: Long,
    val totalHidden: Long,
    val topComplexes: List<TopComplexItem>,
    val topAnnouncements: List<TopAnnouncementItem>
)

data class TopComplexItem(
    val complexId: Long,
    val complexName: String,
    val address: String?,
    val bookmarkCount: Long
)

data class TopAnnouncementItem(
    val announcementId: Long,
    val title: String,
    val institution: String?,
    val favoriteCount: Long
)

data class AdminMemberListResponse(
    val items: List<AdminMemberItem>,
    val totalCount: Long,
    val totalPages: Int,
    val currentPage: Int,
    val pageSize: Int
)

data class AdminMemberItem(
    val id: String,
    val createdAt: String?,
    val preferredRegions: String,
    val bookmarkFolderCount: Long,
    val bookmarkItemCount: Long,
    val favoriteCount: Long,
    val hiddenCount: Long
)

data class AdminMemberActivityResponse(
    val memberId: String,
    val createdAt: String?,
    val preferredRegions: String,
    val folders: List<AdminBookmarkFolderItem>,
    val bookmarks: List<AdminBookmarkItemDetail>,
    val favorites: List<AdminAnnouncementInterestDetail>,
    val hiddenList: List<AdminAnnouncementInterestDetail>
)

data class AdminBookmarkFolderItem(
    val id: String,
    val name: String,
    val color: String,
    val createdAt: String?
)

data class AdminBookmarkItemDetail(
    val complexId: Long,
    val complexName: String,
    val address: String?,
    val folderId: String,
    val folderName: String?,
    val memo: String?,
    val createdAt: String?
)

data class AdminAnnouncementInterestDetail(
    val announcementId: Long,
    val title: String,
    val institution: String?,
    val subscriptionType: String?,
    val status: String,
    val updatedAt: String?
)
