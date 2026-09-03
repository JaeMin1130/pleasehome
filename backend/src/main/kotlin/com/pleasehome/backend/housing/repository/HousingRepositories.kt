package com.pleasehome.backend.housing.repository

import com.pleasehome.backend.housing.entity.*
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface AnnouncementRepository : JpaRepository<Announcement, Long> {
    fun findAllByOrderByIdDesc(): List<Announcement>
}

@Repository
interface AnnouncementScheduleRepository : JpaRepository<AnnouncementSchedule, Long> {
    fun findAllByAnnouncementId(announcementId: Long): List<AnnouncementSchedule>
    fun findAllByAnnouncementIdIn(announcementIds: List<Long>): List<AnnouncementSchedule>
}

@Repository
interface AnnouncementDetailRepository : JpaRepository<AnnouncementDetail, Long> {
    fun findAllByAnnouncementIdOrderBySortOrderAscIdAsc(announcementId: Long): List<AnnouncementDetail>
    fun findAllByAnnouncementIdInOrderBySortOrderAscIdAsc(announcementIds: List<Long>): List<AnnouncementDetail>
}

@Repository
interface AnnouncementRecruitmentGroupRepository : JpaRepository<AnnouncementRecruitmentGroup, Long> {
    fun findAllByAnnouncementId(announcementId: Long): List<AnnouncementRecruitmentGroup>
    fun findAllByAnnouncementIdIn(announcementIds: List<Long>): List<AnnouncementRecruitmentGroup>
}

@Repository
interface ComplexRepository : JpaRepository<Complex, Long> {
    fun findAllByAnnouncementId(announcementId: Long): List<Complex>
    fun findAllByAnnouncementIdIn(announcementIds: List<Long>): List<Complex>

    @Query("""
        SELECT c.id as complexId, c.announcementId as announcementId, a.title as title, a.subscriptionType as subscriptionType, a.institution as institution
        FROM Complex c, Announcement a
        WHERE c.announcementId = a.id
          AND c.name = :name
          AND c.address = :address
          AND c.id != :complexId
        ORDER BY a.id DESC
    """)
    fun findHistoryList(name: String, address: String, complexId: Long): List<ComplexHistoryProjection>
}

interface ComplexHistoryProjection {
    fun getComplexId(): Long
    fun getAnnouncementId(): Long
    fun getTitle(): String
    fun getSubscriptionType(): String
    fun getInstitution(): String
}

@Repository
interface HousingUnitRepository : JpaRepository<HousingUnit, Long> {
    fun findAllByComplexIdOrderByExclusiveAreaAsc(complexId: Long): List<HousingUnit>
    fun findAllByAnnouncementIdOrderByExclusiveAreaAsc(announcementId: Long): List<HousingUnit>
    fun findAllByOrderByExclusiveAreaAsc(): List<HousingUnit>
}
