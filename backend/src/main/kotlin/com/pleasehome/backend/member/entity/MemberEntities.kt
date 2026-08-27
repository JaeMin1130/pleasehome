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
    var createdAt: String? = null
)

@Embeddable
data class MemberFavoriteId(
    @Column(name = "member_id")
    var memberId: String = "",

    @Column(name = "announcement_id")
    var announcementId: Long = 0
) : Serializable

@Entity
@Table(name = "member_favorites")
class MemberFavorite(
    @EmbeddedId
    var id: MemberFavoriteId = MemberFavoriteId(),

    @Column(name = "favorited_at")
    var favoritedAt: String? = null
)

@Embeddable
data class MemberHiddenAnnId(
    @Column(name = "member_id")
    var memberId: String = "",

    @Column(name = "announcement_id")
    var announcementId: Long = 0
) : Serializable

@Entity
@Table(name = "member_hidden_anns")
class MemberHiddenAnn(
    @EmbeddedId
    var id: MemberHiddenAnnId = MemberHiddenAnnId(),

    @Column(name = "hidden_at")
    var hiddenAt: String? = null
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
