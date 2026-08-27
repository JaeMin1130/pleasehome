package com.pleasehome.backend.member.repository

import com.pleasehome.backend.member.entity.*
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface MemberRepository : JpaRepository<Member, String>

@Repository
interface MemberFavoriteRepository : JpaRepository<MemberFavorite, MemberFavoriteId> {
    fun findAllByIdMemberId(memberId: String): List<MemberFavorite>
    fun deleteByIdMemberIdAndIdAnnouncementId(memberId: String, announcementId: Long)
}

@Repository
interface MemberHiddenAnnRepository : JpaRepository<MemberHiddenAnn, MemberHiddenAnnId> {
    fun findAllByIdMemberId(memberId: String): List<MemberHiddenAnn>
    fun deleteByIdMemberIdAndIdAnnouncementId(memberId: String, announcementId: Long)
}

@Repository
interface MemberBookmarkFolderRepository : JpaRepository<MemberBookmarkFolder, MemberBookmarkFolderId> {
    fun findAllByIdMemberIdOrderByCreatedAtAsc(memberId: String): List<MemberBookmarkFolder>
    fun deleteByIdMemberIdAndIdId(memberId: String, id: String)
}

@Repository
interface MemberBookmarkItemRepository : JpaRepository<MemberBookmarkItem, MemberBookmarkItemId> {
    fun findAllByIdMemberIdOrderByCreatedAtAsc(memberId: String): List<MemberBookmarkItem>
    fun deleteByIdMemberIdAndIdComplexId(memberId: String, complexId: Long)
    fun deleteAllByIdMemberIdAndFolderId(memberId: String, folderId: String)
}
