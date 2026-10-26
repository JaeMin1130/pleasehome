package com.pleasehome.backend.member.repository

import com.pleasehome.backend.member.entity.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface MemberRepository : JpaRepository<Member, String> {
    // 007 마이그레이션(announcement_interests 통합) 이전의 레거시 테이블. 엔티티는 없지만 회원 행이 남아 있어 탈퇴 시 함께 지운다.
    @Modifying
    @Query(value = "DELETE FROM member_favorites WHERE member_id = :memberId", nativeQuery = true)
    fun deleteLegacyFavorites(memberId: String)

    @Modifying
    @Query(value = "DELETE FROM member_hidden_anns WHERE member_id = :memberId", nativeQuery = true)
    fun deleteLegacyHiddenAnns(memberId: String)

    fun findByIdContaining(keyword: String, pageable: Pageable): Page<Member>
}

@Repository
interface AnnouncementInterestRepository : JpaRepository<AnnouncementInterest, AnnouncementInterestId> {
    fun findAllByIdMemberIdAndStatus(memberId: String, status: String): List<AnnouncementInterest>
    fun deleteByIdMemberIdAndIdAnnouncementIdAndStatus(memberId: String, announcementId: Long, status: String)
    fun deleteAllByIdMemberId(memberId: String)

    fun countByStatus(status: String): Long
    fun countByIdMemberIdAndStatus(memberId: String, status: String): Long

    @Query("SELECT i.id.memberId, i.status, COUNT(i) FROM AnnouncementInterest i WHERE i.id.memberId IN :memberIds GROUP BY i.id.memberId, i.status")
    fun countByMemberIdInGroupByStatus(memberIds: List<String>): List<Array<Any>>

    @Query("SELECT i.id.announcementId, COUNT(i) as cnt FROM AnnouncementInterest i WHERE i.status = 'FAVORITE' GROUP BY i.id.announcementId ORDER BY cnt DESC")
    fun findTopFavoriteAnnouncementIds(pageable: Pageable): List<Array<Any>>
}

@Repository
interface MemberBookmarkFolderRepository : JpaRepository<MemberBookmarkFolder, MemberBookmarkFolderId> {
    fun findAllByIdMemberIdOrderByCreatedAtAsc(memberId: String): List<MemberBookmarkFolder>
    fun deleteByIdMemberIdAndIdId(memberId: String, id: String)
    fun deleteAllByIdMemberId(memberId: String)

    fun countByIdMemberId(memberId: String): Long

    @Query("SELECT f.id.memberId, COUNT(f) FROM MemberBookmarkFolder f WHERE f.id.memberId IN :memberIds GROUP BY f.id.memberId")
    fun countByMemberIdIn(memberIds: List<String>): List<Array<Any>>
}

@Repository
interface MemberBookmarkItemRepository : JpaRepository<MemberBookmarkItem, MemberBookmarkItemId> {
    fun findAllByIdMemberIdOrderByCreatedAtAsc(memberId: String): List<MemberBookmarkItem>
    fun deleteByIdMemberIdAndIdComplexId(memberId: String, complexId: Long)
    fun deleteAllByIdMemberIdAndFolderId(memberId: String, folderId: String)
    fun deleteAllByIdMemberId(memberId: String)

    fun countByIdMemberId(memberId: String): Long

    @Query("SELECT b.id.memberId, COUNT(b) FROM MemberBookmarkItem b WHERE b.id.memberId IN :memberIds GROUP BY b.id.memberId")
    fun countByMemberIdIn(memberIds: List<String>): List<Array<Any>>

    @Query("SELECT b.id.complexId, COUNT(b) as cnt FROM MemberBookmarkItem b GROUP BY b.id.complexId ORDER BY cnt DESC")
    fun findTopBookmarkedComplexIds(pageable: Pageable): List<Array<Any>>
}
