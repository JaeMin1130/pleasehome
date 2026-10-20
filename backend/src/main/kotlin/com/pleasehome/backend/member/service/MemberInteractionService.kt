package com.pleasehome.backend.member.service

import com.pleasehome.backend.member.entity.*
import com.pleasehome.backend.member.repository.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Service
@Transactional(transactionManager = "memberTransactionManager")
class MemberInteractionService(
    private val interestRepository: AnnouncementInterestRepository,
    private val folderRepository: MemberBookmarkFolderRepository,
    private val itemRepository: MemberBookmarkItemRepository
) {

    /** 회원 탈퇴 시 그 회원의 찜·숨김·저장 폴더·저장 단지를 모두 삭제 */
    fun deleteAllMemberData(memberId: String) {
        interestRepository.deleteAllByIdMemberId(memberId)
        itemRepository.deleteAllByIdMemberId(memberId)
        folderRepository.deleteAllByIdMemberId(memberId)
    }

    // ================= Favorites / Hidden (통합 announcement_interests, docs/dev/DOMAIN_MODEL.md 2.3) =================
    // status 컬럼 하나로 찜/숨김을 표현하므로, 등록 시 상태를 덮어쓰는 것만으로 상호배제가 자동 보장됨
    // (기존처럼 반대쪽 테이블에서 별도 delete를 호출할 필요가 없음).

    @Transactional(readOnly = true, propagation = Propagation.SUPPORTS, transactionManager = "memberTransactionManager")
    fun getFavorites(memberId: String): List<Map<String, Any?>> =
        interestRepository.findAllByIdMemberIdAndStatus(memberId, "FAVORITE").map {
            mapOf(
                "announcement_id" to it.id.announcementId,
                "favorited_at" to it.updatedAt
            )
        }

    fun addFavorite(memberId: String, announcementId: Long): Map<String, Any> {
        upsertInterest(memberId, announcementId, "FAVORITE")
        return mapOf("success" to true)
    }

    fun deleteFavorite(memberId: String, announcementId: Long): Map<String, Any> {
        interestRepository.deleteByIdMemberIdAndIdAnnouncementIdAndStatus(memberId, announcementId, "FAVORITE")
        return mapOf("success" to true)
    }

    // ================= Hidden Announcements =================
    @Transactional(readOnly = true, propagation = Propagation.SUPPORTS, transactionManager = "memberTransactionManager")
    fun getHiddenAnns(memberId: String): List<Map<String, Any?>> =
        interestRepository.findAllByIdMemberIdAndStatus(memberId, "HIDDEN").map {
            mapOf(
                "announcement_id" to it.id.announcementId,
                "hidden_at" to it.updatedAt
            )
        }

    fun addHiddenAnn(memberId: String, announcementId: Long): Map<String, Any> {
        upsertInterest(memberId, announcementId, "HIDDEN")
        return mapOf("success" to true)
    }

    fun deleteHiddenAnn(memberId: String, announcementId: Long): Map<String, Any> {
        interestRepository.deleteByIdMemberIdAndIdAnnouncementIdAndStatus(memberId, announcementId, "HIDDEN")
        return mapOf("success" to true)
    }

    private fun upsertInterest(memberId: String, announcementId: Long, status: String) {
        val now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        val id = AnnouncementInterestId(memberId = memberId, announcementId = announcementId)
        val existing = interestRepository.findById(id).orElse(null)
        if (existing != null) {
            existing.status = status
            existing.updatedAt = now
            interestRepository.save(existing)
        } else {
            interestRepository.save(AnnouncementInterest(id = id, status = status, updatedAt = now))
        }
    }

    // ================= Bookmark Folders =================
    @Transactional(readOnly = true, propagation = Propagation.SUPPORTS, transactionManager = "memberTransactionManager")
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
    @Transactional(readOnly = true, propagation = Propagation.SUPPORTS, transactionManager = "memberTransactionManager")
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
