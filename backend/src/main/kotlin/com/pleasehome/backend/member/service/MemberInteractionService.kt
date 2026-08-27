package com.pleasehome.backend.member.service

import com.pleasehome.backend.member.entity.*
import com.pleasehome.backend.member.repository.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Service
@Transactional(transactionManager = "memberTransactionManager")
class MemberInteractionService(
    private val favoriteRepository: MemberFavoriteRepository,
    private val hiddenAnnRepository: MemberHiddenAnnRepository,
    private val folderRepository: MemberBookmarkFolderRepository,
    private val itemRepository: MemberBookmarkItemRepository
) {

    // ================= Favorites =================
    @Transactional(readOnly = true, transactionManager = "memberTransactionManager")
    fun getFavorites(memberId: String): List<Map<String, Any?>> =
        favoriteRepository.findAllByIdMemberId(memberId).map {
            mapOf(
                "announcement_id" to it.id.announcementId,
                "favorited_at" to it.favoritedAt
            )
        }

    fun addFavorite(memberId: String, announcementId: Long): Map<String, Any> {
        val now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        val favId = MemberFavoriteId(memberId = memberId, announcementId = announcementId)
        favoriteRepository.save(MemberFavorite(id = favId, favoritedAt = now))

        // 상호 배제 로직 (Option A): 찜 등록 시 숨김 자동 해제
        hiddenAnnRepository.deleteByIdMemberIdAndIdAnnouncementId(memberId, announcementId)
        return mapOf("success" to true)
    }

    fun deleteFavorite(memberId: String, announcementId: Long): Map<String, Any> {
        favoriteRepository.deleteByIdMemberIdAndIdAnnouncementId(memberId, announcementId)
        return mapOf("success" to true)
    }

    // ================= Hidden Announcements =================
    @Transactional(readOnly = true, transactionManager = "memberTransactionManager")
    fun getHiddenAnns(memberId: String): List<Map<String, Any?>> =
        hiddenAnnRepository.findAllByIdMemberId(memberId).map {
            mapOf(
                "announcement_id" to it.id.announcementId,
                "hidden_at" to it.hiddenAt
            )
        }

    fun addHiddenAnn(memberId: String, announcementId: Long): Map<String, Any> {
        val now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        val hidId = MemberHiddenAnnId(memberId = memberId, announcementId = announcementId)
        hiddenAnnRepository.save(MemberHiddenAnn(id = hidId, hiddenAt = now))

        // 상호 배제 로직 (Option A): 숨김 등록 시 찜 자동 해제
        favoriteRepository.deleteByIdMemberIdAndIdAnnouncementId(memberId, announcementId)
        return mapOf("success" to true)
    }

    fun deleteHiddenAnn(memberId: String, announcementId: Long): Map<String, Any> {
        hiddenAnnRepository.deleteByIdMemberIdAndIdAnnouncementId(memberId, announcementId)
        return mapOf("success" to true)
    }

    // ================= Bookmark Folders =================
    @Transactional(readOnly = true, transactionManager = "memberTransactionManager")
    fun getBookmarkFolders(memberId: String): List<Map<String, Any?>> =
        folderRepository.findAllByIdMemberIdOrderByCreatedAtAsc(memberId).map {
            mapOf(
                "id" to it.id.id,
                "name" to it.name,
                "color" to it.color,
                "created_at" to it.createdAt
            )
        }

    fun saveBookmarkFolder(memberId: String, id: String, name: String, color: String): Map<String, Any> {
        val folderId = MemberBookmarkFolderId(id = id, memberId = memberId)
        val existing = folderRepository.findById(folderId).orElse(null)
        val now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))

        if (existing != null) {
            existing.name = name
            existing.color = color
            folderRepository.save(existing)
        } else {
            folderRepository.save(MemberBookmarkFolder(id = folderId, name = name, color = color, createdAt = now))
        }
        return mapOf("success" to true)
    }

    fun deleteBookmarkFolder(memberId: String, id: String): Map<String, Any> {
        // Cascade: 폴더 삭제 시 해당 폴더의 북마크 아이템도 동시 삭제
        itemRepository.deleteAllByIdMemberIdAndFolderId(memberId, id)
        folderRepository.deleteByIdMemberIdAndIdId(memberId, id)
        return mapOf("success" to true)
    }

    // ================= Bookmark Items =================
    @Transactional(readOnly = true, transactionManager = "memberTransactionManager")
    fun getBookmarkItems(memberId: String): List<Map<String, Any?>> =
        itemRepository.findAllByIdMemberIdOrderByCreatedAtAsc(memberId).map {
            mapOf(
                "complex_id" to it.id.complexId,
                "folder_id" to it.folderId,
                "memo" to it.memo,
                "created_at" to it.createdAt
            )
        }

    fun saveBookmarkItem(memberId: String, complexId: Long, folderId: String, memo: String?): Map<String, Any> {
        val itemId = MemberBookmarkItemId(memberId = memberId, complexId = complexId)
        val existing = itemRepository.findById(itemId).orElse(null)
        val now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))

        if (existing != null) {
            existing.folderId = folderId
            existing.memo = memo
            itemRepository.save(existing)
        } else {
            itemRepository.save(MemberBookmarkItem(id = itemId, folderId = folderId, memo = memo, createdAt = now))
        }
        return mapOf("success" to true)
    }

    fun deleteBookmarkItem(memberId: String, complexId: Long): Map<String, Any> {
        itemRepository.deleteByIdMemberIdAndIdComplexId(memberId, complexId)
        return mapOf("success" to true)
    }
}
