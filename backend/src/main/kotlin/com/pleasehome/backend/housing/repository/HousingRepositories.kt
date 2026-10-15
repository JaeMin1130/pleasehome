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
    // 참고: Complex는 전역 엔티티라 announcement_id로 "소유"되지 않음.
    // 이 두 메서드는 announcementId 컬럼(최초 발견 공고 메타)만 보는 레거시 조회이며,
    // "이 공고에 등장하는 단지" 조회는 findAllByHousingUnitAnnouncementId를 쓴다.
    fun findAllByAnnouncementId(announcementId: Long): List<Complex>
    fun findAllByAnnouncementIdIn(announcementIds: List<Long>): List<Complex>

    @Query("""
        SELECT DISTINCT c FROM Complex c, HousingUnit u
        WHERE u.complexId = c.id AND u.announcementId = :announcementId
    """)
    fun findAllByHousingUnitAnnouncementId(announcementId: Long): List<Complex>

    @Query("""
        SELECT DISTINCT u.announcementId as announcementId, a.title as title,
               a.subscriptionType as subscriptionType, a.institution as institution
        FROM HousingUnit u, Announcement a
        WHERE u.complexId = :complexId AND u.announcementId = a.id
        ORDER BY a.id DESC
    """)
    fun findHistoryList(complexId: Long): List<ComplexHistoryProjection>
}

interface ComplexHistoryProjection {
    fun getAnnouncementId(): Long
    fun getTitle(): String
    fun getSubscriptionType(): String
    fun getInstitution(): String
}

interface ComplexRecruitmentGroupProjection {
    fun getComplexId(): Long
    fun getRecruitmentGroupId(): Long
}

interface UnitTagProjection {
    fun getHousingUnitId(): Long
    fun getTag(): String
}

@Repository
interface HousingUnitRepository : JpaRepository<HousingUnit, Long> {
    fun findAllByComplexIdOrderByExclusiveAreaAsc(complexId: Long): List<HousingUnit>
    fun findAllByAnnouncementIdOrderByExclusiveAreaAsc(announcementId: Long): List<HousingUnit>
    fun findAllByComplexIdAndAnnouncementIdOrderByExclusiveAreaAsc(complexId: Long, announcementId: Long): List<HousingUnit>

    @Query("""
        SELECT u.complexId as complexId, 
               MIN(u.deposit) as minDeposit, 
               MAX(u.deposit) as maxDeposit,
               MIN(u.monthlyRent) as minMonthlyRent, 
               MAX(u.monthlyRent) as maxMonthlyRent,
               MIN(u.exclusiveArea) as minExclusiveArea, 
               MAX(u.exclusiveArea) as maxExclusiveArea,
               COUNT(u.id) as unitCount,
               SUM(u.supplyCount) as totalSupplyCount,
               SUM(u.reserveCount) as totalReserveCount
        FROM HousingUnit u
        GROUP BY u.complexId
    """)
    fun findUnitSummaryGroupedByComplex(): List<UnitSummaryProjection>

    @Query("""
        SELECT u.complexId as complexId, 
               MIN(u.deposit) as minDeposit, 
               MAX(u.deposit) as maxDeposit,
               MIN(u.monthlyRent) as minMonthlyRent, 
               MAX(u.monthlyRent) as maxMonthlyRent,
               MIN(u.exclusiveArea) as minExclusiveArea, 
               MAX(u.exclusiveArea) as maxExclusiveArea,
               COUNT(u.id) as unitCount,
               SUM(u.supplyCount) as totalSupplyCount,
               SUM(u.reserveCount) as totalReserveCount
        FROM HousingUnit u
        WHERE u.announcementId = :announcementId
        GROUP BY u.complexId
    """)
    fun findUnitSummaryByAnnouncementId(announcementId: Long): List<UnitSummaryProjection>

    @Query("""
        SELECT u.complexId as complexId, 
               MIN(u.deposit) as minDeposit, 
               MAX(u.deposit) as maxDeposit,
               MIN(u.monthlyRent) as minMonthlyRent, 
               MAX(u.monthlyRent) as maxMonthlyRent,
               MIN(u.exclusiveArea) as minExclusiveArea, 
               MAX(u.exclusiveArea) as maxExclusiveArea,
               COUNT(u.id) as unitCount,
               SUM(u.supplyCount) as totalSupplyCount,
               SUM(u.reserveCount) as totalReserveCount
        FROM HousingUnit u
        WHERE u.complexId = :complexId
        GROUP BY u.complexId
    """)
    fun findUnitSummaryByComplexId(complexId: Long): UnitSummaryProjection?

    @Query("""
        SELECT DISTINCT u.complexId as complexId, u.recruitmentGroupId as recruitmentGroupId
        FROM HousingUnit u
        WHERE u.complexId IN :complexIds AND u.recruitmentGroupId IS NOT NULL
    """)
    fun findDistinctRecruitmentGroupsByComplexIds(complexIds: List<Long>): List<ComplexRecruitmentGroupProjection>

    @Query(
        value = "SELECT housing_unit_id as housingUnitId, tag as tag FROM housing_unit_target_tags WHERE housing_unit_id IN :unitIds",
        nativeQuery = true
    )
    fun findTagsByUnitIds(unitIds: List<Long>): List<UnitTagProjection>
}

interface UnitSummaryProjection {
    fun getComplexId(): Long?
    fun getMinDeposit(): Long?
    fun getMaxDeposit(): Long?
    fun getMinMonthlyRent(): Long?
    fun getMaxMonthlyRent(): Long?
    fun getMinExclusiveArea(): Double?
    fun getMaxExclusiveArea(): Double?
    fun getUnitCount(): Long?
    fun getTotalSupplyCount(): Long?
    fun getTotalReserveCount(): Long?
}
