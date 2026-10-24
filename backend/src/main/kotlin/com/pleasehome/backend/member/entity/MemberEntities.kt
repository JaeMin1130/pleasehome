package com.pleasehome.backend.member.entity

import jakarta.persistence.*
import java.io.Serializable
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Entity
@Table(name = "members")
class Member(
    @Id
    var id: String = "",

    @Column(name = "pwd_hash", nullable = false)
    var pwdHash: String = "",

    @Column(name = "security_q", nullable = false)
    var securityQ: String = "",

    @Column(name = "security_a", nullable = false)
    var securityA: String = "",

    @Column(name = "created_at")
    var createdAt: String? = null,

    // 관심 공고 지역(LH 지역코드 CNP_CD)을 '11,41'처럼 쉼표로 이은 값. 미선택은 ''
    @Column(name = "preferred_regions", nullable = false)
    var preferredRegions: String = ""
)

// 찜/숨김 통합 (docs/dev/DOMAIN_MODEL.md 2.3). 기존 member_favorites/member_hidden_anns
// 테이블은 DB에 그대로 남아있으나(백업 목적) 앱 코드에서는 더 이상 참조하지 않음.
@Embeddable
data class AnnouncementInterestId(
    @Column(name = "member_id")
    var memberId: String = "",

    @Column(name = "announcement_id")
    var announcementId: Long = 0
) : Serializable

@Entity
@Table(name = "announcement_interests")
class AnnouncementInterest(
    @EmbeddedId
    var id: AnnouncementInterestId = AnnouncementInterestId(),

    @Column(nullable = false)
    var status: String = "FAVORITE",

    @Column(name = "updated_at")
    var updatedAt: String? = null
)

@Embeddable
data class MemberBookmarkFolderId(
    var id: String = "",

    @Column(name = "member_id")
    var memberId: String = ""
) : Serializable

@Entity
@Table(name = "member_bookmark_folders")
class MemberBookmarkFolder(
    @EmbeddedId
    var id: MemberBookmarkFolderId = MemberBookmarkFolderId(),

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = false)
    var color: String = "",

    @Column(name = "created_at")
    var createdAt: String? = null
)

@Embeddable
data class MemberBookmarkItemId(
    @Column(name = "member_id")
    var memberId: String = "",

    @Column(name = "complex_id")
    var complexId: Long = 0
) : Serializable

@Entity
@Table(name = "member_bookmark_items")
class MemberBookmarkItem(
    @EmbeddedId
    var id: MemberBookmarkItemId = MemberBookmarkItemId(),

    @Column(name = "folder_id", nullable = false)
    var folderId: String = "",

    var memo: String? = null,

    @Column(name = "created_at")
    var createdAt: String? = null
)
