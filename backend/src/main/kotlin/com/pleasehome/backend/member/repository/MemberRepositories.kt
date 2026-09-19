package com.pleasehome.backend.member.repository

import com.pleasehome.backend.member.entity.*
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface MemberRepository : JpaRepository<Member, String>

@Repository
interface AnnouncementInterestRepository : JpaRepository<AnnouncementInterest, AnnouncementInterestId> {
    fun findAllByIdMemberIdAndStatus(memberId: String, status: String): List<AnnouncementInterest>
    fun deleteByIdMemberIdAndIdAnnouncementIdAndStatus(memberId: String, announcementId: Long, status: String)
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
