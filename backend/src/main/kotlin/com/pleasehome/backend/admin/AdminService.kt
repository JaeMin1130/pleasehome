package com.pleasehome.backend.admin

import com.pleasehome.backend.housing.repository.AnnouncementRepository
import com.pleasehome.backend.housing.repository.ComplexRepository
import com.pleasehome.backend.member.repository.AnnouncementInterestRepository
import com.pleasehome.backend.member.repository.MemberBookmarkFolderRepository
import com.pleasehome.backend.member.repository.MemberBookmarkItemRepository
import com.pleasehome.backend.member.repository.MemberRepository
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class AdminService(
    private val memberRepository: MemberRepository,
    private val memberBookmarkFolderRepository: MemberBookmarkFolderRepository,
    private val memberBookmarkItemRepository: MemberBookmarkItemRepository,
    private val announcementInterestRepository: AnnouncementInterestRepository,
    private val complexRepository: ComplexRepository,
    private val announcementRepository: AnnouncementRepository
) {

    fun getStats(): AdminStatsResponse {
        val totalMembers = memberRepository.count()
        val totalBookmarks = memberBookmarkItemRepository.count()
        val totalFavorites = announcementInterestRepository.countByStatus("FAVORITE")
        val totalHidden = announcementInterestRepository.countByStatus("HIDDEN")

        val topComplexRows = memberBookmarkItemRepository.findTopBookmarkedComplexIds(PageRequest.of(0, 10))
        val complexIds = topComplexRows.mapNotNull { (it[0] as? Number)?.toLong() }
        val complexMap = if (complexIds.isNotEmpty()) {
            complexRepository.findAllById(complexIds).associateBy { it.id }
        } else emptyMap()

        val topComplexes = topComplexRows.mapNotNull { row ->
            val id = (row[0] as? Number)?.toLong() ?: return@mapNotNull null
            val cnt = (row[1] as? Number)?.toLong() ?: 0L
            val complex = complexMap[id]
            TopComplexItem(
                complexId = id,
                complexName = complex?.name ?: "단지 ID $id",
                address = complex?.address,
                bookmarkCount = cnt
            )
        }

        val topAnnRows = announcementInterestRepository.findTopFavoriteAnnouncementIds(PageRequest.of(0, 10))
        val annIds = topAnnRows.mapNotNull { (it[0] as? Number)?.toLong() }
        val annMap = if (annIds.isNotEmpty()) {
            announcementRepository.findAllById(annIds).associateBy { it.id }
        } else emptyMap()

        val topAnnouncements = topAnnRows.mapNotNull { row ->
            val id = (row[0] as? Number)?.toLong() ?: return@mapNotNull null
            val cnt = (row[1] as? Number)?.toLong() ?: 0L
            val ann = annMap[id]
            TopAnnouncementItem(
                announcementId = id,
                title = ann?.title ?: "공고 ID $id",
                institution = ann?.institution,
                favoriteCount = cnt
            )
        }

        return AdminStatsResponse(
            totalMembers = totalMembers,
            totalBookmarks = totalBookmarks,
            totalFavorites = totalFavorites,
            totalHidden = totalHidden,
            topComplexes = topComplexes,
            topAnnouncements = topAnnouncements
        )
    }

    fun getMemberList(page: Int, size: Int, query: String?): AdminMemberListResponse {
        val pageable = PageRequest.of(page.coerceAtLeast(0), size.coerceIn(1, 100), Sort.by(Sort.Direction.DESC, "createdAt"))
        val pagedMembers = if (!query.isNullOrBlank()) {
            memberRepository.findByIdContaining(query.trim(), pageable)
        } else {
            memberRepository.findAll(pageable)
        }

        val memberIds = pagedMembers.content.map { it.id }
        val folderCounts = if (memberIds.isNotEmpty()) {
            memberBookmarkFolderRepository.countByMemberIdIn(memberIds).associate {
                (it[0] as String) to ((it[1] as? Number)?.toLong() ?: 0L)
            }
        } else emptyMap()

        val bookmarkCounts = if (memberIds.isNotEmpty()) {
            memberBookmarkItemRepository.countByMemberIdIn(memberIds).associate {
                (it[0] as String) to ((it[1] as? Number)?.toLong() ?: 0L)
            }
        } else emptyMap()

        val interestCounts = if (memberIds.isNotEmpty()) {
            memberBookmarkFolderRepository.countByMemberIdIn(memberIds) // placeholder
            val map = mutableMapOf<Pair<String, String>, Long>()
            announcementInterestRepository.countByMemberIdInGroupByStatus(memberIds).forEach { row ->
                val mId = row[0] as? String
                val status = row[1] as? String
                val cnt = (row[2] as? Number)?.toLong() ?: 0L
                if (mId != null && status != null) {
                    map[mId to status] = cnt
                }
            }
            map
        } else emptyMap()

        val items = pagedMembers.content.map { member ->
            AdminMemberItem(
                id = member.id,
                createdAt = member.createdAt,
                preferredRegions = member.preferredRegions,
                bookmarkFolderCount = folderCounts[member.id] ?: 0L,
                bookmarkItemCount = bookmarkCounts[member.id] ?: 0L,
                favoriteCount = interestCounts[member.id to "FAVORITE"] ?: 0L,
                hiddenCount = interestCounts[member.id to "HIDDEN"] ?: 0L
            )
        }

        return AdminMemberListResponse(
            items = items,
            totalCount = pagedMembers.totalElements,
            totalPages = pagedMembers.totalPages,
            currentPage = pagedMembers.number,
            pageSize = pagedMembers.size
        )
    }

    fun getMemberActivity(memberId: String): AdminMemberActivityResponse {
        val member = memberRepository.findById(memberId).orElseThrow {
            IllegalArgumentException("존재하지 않는 회원입니다: $memberId")
        }

        val folders = memberBookmarkFolderRepository.findAllByIdMemberIdOrderByCreatedAtAsc(memberId)
        val folderMap = folders.associate { it.id.id to it.name }
        val folderItems = folders.map {
            AdminBookmarkFolderItem(
                id = it.id.id,
                name = it.name,
                color = it.color,
                createdAt = it.createdAt
            )
        }

        val bookmarkItems = memberBookmarkItemRepository.findAllByIdMemberIdOrderByCreatedAtAsc(memberId)
        val complexIds = bookmarkItems.map { it.id.complexId }.distinct()
        val complexMap = if (complexIds.isNotEmpty()) {
            complexRepository.findAllById(complexIds).associateBy { it.id }
        } else emptyMap()

        val bookmarkDetails = bookmarkItems.map { item ->
            val complex = complexMap[item.id.complexId]
            AdminBookmarkItemDetail(
                complexId = item.id.complexId,
                complexName = complex?.name ?: "단지 ID ${item.id.complexId}",
                address = complex?.address,
                folderId = item.folderId,
                folderName = folderMap[item.folderId],
                memo = item.memo,
                createdAt = item.createdAt
            )
        }

        val favorites = announcementInterestRepository.findAllByIdMemberIdAndStatus(memberId, "FAVORITE")
        val hiddenList = announcementInterestRepository.findAllByIdMemberIdAndStatus(memberId, "HIDDEN")

        val allAnnIds = (favorites.map { it.id.announcementId } + hiddenList.map { it.id.announcementId }).distinct()
        val annMap = if (allAnnIds.isNotEmpty()) {
            announcementRepository.findAllById(allAnnIds).associateBy { it.id }
        } else emptyMap()

        val favoriteDetails = favorites.map { item ->
            val ann = annMap[item.id.announcementId]
            AdminAnnouncementInterestDetail(
                announcementId = item.id.announcementId,
                title = ann?.title ?: "공고 ID ${item.id.announcementId}",
                institution = ann?.institution,
                subscriptionType = ann?.subscriptionType,
                status = item.status,
                updatedAt = item.updatedAt
            )
        }

        val hiddenDetails = hiddenList.map { item ->
            val ann = annMap[item.id.announcementId]
            AdminAnnouncementInterestDetail(
                announcementId = item.id.announcementId,
                title = ann?.title ?: "공고 ID ${item.id.announcementId}",
                institution = ann?.institution,
                subscriptionType = ann?.subscriptionType,
                status = item.status,
                updatedAt = item.updatedAt
            )
        }

        return AdminMemberActivityResponse(
            memberId = member.id,
            createdAt = member.createdAt,
            preferredRegions = member.preferredRegions,
            folders = folderItems,
            bookmarks = bookmarkDetails,
            favorites = favoriteDetails,
            hiddenList = hiddenDetails
        )
    }
}
