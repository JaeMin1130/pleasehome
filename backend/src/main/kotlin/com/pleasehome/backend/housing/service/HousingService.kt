package com.pleasehome.backend.housing.service

import com.pleasehome.backend.housing.entity.*
import com.pleasehome.backend.housing.repository.*
import org.springframework.cache.annotation.CacheEvict
import org.springframework.cache.annotation.Cacheable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true, transactionManager = "housingTransactionManager")
class HousingService(
    private val announcementRepository: AnnouncementRepository,
    private val scheduleRepository: AnnouncementScheduleRepository,
    private val detailRepository: AnnouncementDetailRepository,
    private val recruitmentGroupRepository: AnnouncementRecruitmentGroupRepository,
    private val complexRepository: ComplexRepository,
    private val unitRepository: HousingUnitRepository
) {

    @Cacheable("announcements")
    fun getAllAnnouncements(): List<Map<String, Any?>> {
        val announcements = announcementRepository.findAllByOrderByIdDesc()
        if (announcements.isEmpty()) return emptyList()

        val annIds = announcements.mapNotNull { it.id }
        val schedulesMap = scheduleRepository.findAllByAnnouncementIdIn(annIds).groupBy { it.announcementId }
        val detailsMap = detailRepository.findAllByAnnouncementIdInOrderBySortOrderAscIdAsc(annIds).groupBy { it.announcementId }

        return announcements.map { ann ->
            val id = ann.id ?: 0
            mapOf(
                "id" to ann.id,
                "title" to ann.title,
                "institution" to ann.institution,
                "subscription_type" to ann.subscriptionType,
                "doc_path" to ann.docPath,
                "attributes" to ann.attributes,
                "dtl_url" to ann.dtlUrl,
                "dtl_url_mob" to ann.dtlUrlMob,
                "region" to ann.region,
                "created_at" to ann.createdAt,
                "updated_at" to ann.updatedAt,
                "schedules" to (schedulesMap[id]?.map { scheduleToMap(it) } ?: emptyList<Any>()),
                "details" to (detailsMap[id]?.map { detailToMap(it) } ?: emptyList<Any>())
            )
        }
    }

    @Cacheable("announcement", key = "#id")
    fun getAnnouncementById(id: Long): Map<String, Any?> {
        val ann = announcementRepository.findById(id).orElseThrow { NoSuchElementException("공고를 찾을 수 없습니다. (ID: $id)") }
        val schedules = scheduleRepository.findAllByAnnouncementId(id).map { scheduleToMap(it) }
        val details = detailRepository.findAllByAnnouncementIdOrderBySortOrderAscIdAsc(id).map { detailToMap(it) }

        return mapOf(
            "id" to ann.id,
            "title" to ann.title,
            "institution" to ann.institution,
            "subscription_type" to ann.subscriptionType,
            "doc_path" to ann.docPath,
            "attributes" to ann.attributes,
            "dtl_url" to ann.dtlUrl,
            "dtl_url_mob" to ann.dtlUrlMob,
            "region" to ann.region,
            "created_at" to ann.createdAt,
            "updated_at" to ann.updatedAt,
            "schedules" to schedules,
            "details" to details
        )
    }

    @Cacheable("announcementDetails", key = "#id")
    fun getAnnouncementFullDetails(id: Long): Map<String, Any?> {
        val ann = getAnnouncementById(id)
        val rgs = recruitmentGroupRepository.findAllByAnnouncementId(id)
        val complexList = complexRepository.findAllByHousingUnitAnnouncementId(id)
        val summaries = unitRepository.findUnitSummaryByAnnouncementId(id).associateBy { it.getComplexId() ?: 0L }
        val complexRgMap = fetchComplexRecruitmentGroups(complexList.mapNotNull { it.id })
        val complexes = complexList.map {
            complexToMap(it, complexRgMap[it.id] ?: emptyList(), summaries[it.id])
        }
        val units = unitRepository.findAllByAnnouncementIdOrderByExclusiveAreaAsc(id)
        val tagsMap = fetchTags(units.mapNotNull { it.id })
        val unitMaps = units.map { unitToMap(it, tagsMap[it.id] ?: emptyList()) }

        return ann + mapOf(
            "recruitment_groups" to rgs.map { recruitmentGroupToMap(it) },
            "complexes" to complexes,
            "units" to unitMaps
        )
    }

    @Cacheable("complexes", key = "#announcementId ?: 'all'")
    fun getComplexes(announcementId: Long?): List<Map<String, Any?>> {
        val list = if (announcementId != null) {
            complexRepository.findAllByHousingUnitAnnouncementId(announcementId)
        } else {
            complexRepository.findAll()
        }

        val summaries = if (announcementId != null) {
            unitRepository.findUnitSummaryByAnnouncementId(announcementId).associateBy { it.getComplexId() ?: 0L }
        } else {
            unitRepository.findUnitSummaryGroupedByComplex().associateBy { it.getComplexId() ?: 0L }
        }
        val complexRgMap = fetchComplexRecruitmentGroups(list.mapNotNull { it.id })

        return list.map { complexToMap(it, complexRgMap[it.id] ?: emptyList(), summaries[it.id]) }
    }

    @Cacheable("complex", key = "#id")
    fun getComplexById(id: Long): Map<String, Any?> {
        val complex = complexRepository.findById(id).orElseThrow { NoSuchElementException("단지를 찾을 수 없습니다. (ID: $id)") }
        val rgs = fetchComplexRecruitmentGroups(listOf(id))[id] ?: emptyList()
        val summary = unitRepository.findUnitSummaryByComplexId(id)
        return complexToMap(complex, rgs, summary)
    }

    @Cacheable("complexDetails", key = "#id")
    fun getComplexFullDetails(id: Long): Map<String, Any?> {
        val complex = complexRepository.findById(id).orElseThrow { NoSuchElementException("단지를 찾을 수 없습니다. (ID: $id)") }
        // 최초 발견 공고 (전역 단지라 "그 공고"는 참고용 -- 실제 전체 이력은 historyList 참고)
        // announcementId는 그 공고가 삭제되면 null이 될 수 있음 (ON DELETE SET NULL)
        val ann = complex.announcementId?.let { announcementRepository.findById(it).orElse(null) }
        val units = unitRepository.findAllByComplexIdOrderByExclusiveAreaAsc(id)
        val tagsMap = fetchTags(units.mapNotNull { it.id })
        val unitMaps = units.map { unitToMap(it, tagsMap[it.id] ?: emptyList()) }
        val rgs = fetchComplexRecruitmentGroups(listOf(id))[id] ?: emptyList()
        val summary = unitRepository.findUnitSummaryByComplexId(id)
        val historyList = complexRepository.findHistoryList(id).map {
            mapOf(
                "announcement_id" to it.getAnnouncementId(),
                "title" to it.getTitle(),
                "subscription_type" to it.getSubscriptionType(),
                "institution" to it.getInstitution()
            )
        }

        val complexMap = complexToMap(complex, rgs, summary)

        return mapOf(
            "complex" to complexMap,
            "announcement" to (if (ann != null) announcementToSimpleMap(ann) else null),
            "units" to unitMaps,
            "historyList" to historyList
        )
    }

    fun getHousingUnits(complexId: Long?, announcementId: Long?): List<Map<String, Any?>> {
        val list = when {
            complexId != null -> unitRepository.findAllByComplexIdOrderByExclusiveAreaAsc(complexId)
            announcementId != null -> unitRepository.findAllByAnnouncementIdOrderByExclusiveAreaAsc(announcementId)
            else -> unitRepository.findAllByOrderByExclusiveAreaAsc()
        }
        val tagsMap = fetchTags(list.mapNotNull { it.id })
        return list.map { unitToMap(it, tagsMap[it.id] ?: emptyList()) }
    }

    /** 단지별로 걸쳐있는 신청단위(모집단위) 목록을 일괄 조회 (N+1 방지) */
    private fun fetchComplexRecruitmentGroups(complexIds: List<Long>): Map<Long, List<AnnouncementRecruitmentGroup>> {
        if (complexIds.isEmpty()) return emptyMap()
        val links = unitRepository.findDistinctRecruitmentGroupsByComplexIds(complexIds)
        if (links.isEmpty()) return emptyMap()
        val rgMap = recruitmentGroupRepository.findAllById(links.map { it.getRecruitmentGroupId() }.distinct())
            .associateBy { it.id ?: 0L }
        return links.groupBy({ it.getComplexId() }, { rgMap[it.getRecruitmentGroupId()] })
            .mapValues { (_, v) -> v.filterNotNull() }
    }

    /** 유닛별 자격 태그를 일괄 조회 (N+1 방지) */
    private fun fetchTags(unitIds: List<Long>): Map<Long, List<String>> {
        if (unitIds.isEmpty()) return emptyMap()
        return unitRepository.findTagsByUnitIds(unitIds).groupBy({ it.getHousingUnitId() }, { it.getTag() })
    }

    @Cacheable("sitemapPaths")
    fun getSitemapPaths(): Map<String, Any> {
        val annIds = announcementRepository.findAll().mapNotNull { it.id }
        val complexIds = complexRepository.findAll().mapNotNull { it.id }
        return mapOf(
            "announcements" to annIds,
            "complexes" to complexIds
        )
    }

    @CacheEvict(
        value = ["announcements", "announcement", "announcementDetails", "complexes", "complex", "complexDetails", "sitemapPaths"],
        allEntries = true
    )
    fun evictHousingCaches() {
        // 모든 주택 공고/단지 캐시 일괄 무효화
    }

    private fun scheduleToMap(s: AnnouncementSchedule) = mapOf(
        "id" to s.id,
        "announcement_id" to s.announcementId,
        "schedule_type" to s.scheduleType,
        "start_date" to s.startDate,
        "end_date" to s.endDate,
        "raw_text" to s.rawText,
        "notes" to s.notes
    )

    private fun detailToMap(d: AnnouncementDetail) = mapOf(
        "id" to d.id,
        "announcement_id" to d.announcementId,
        "section_title" to d.sectionTitle,
        "section_content" to d.sectionContent,
        "sort_order" to d.sortOrder
    )

    private fun recruitmentGroupToMap(rg: AnnouncementRecruitmentGroup) = mapOf(
        "id" to rg.id,
        "announcement_id" to rg.announcementId,
        "name" to rg.name,
        "region" to rg.region,
        "supply_count" to rg.supplyCount,
        "reserve_count" to rg.reserveCount,
        "notes" to rg.notes
    )

    private fun complexToMap(
        c: Complex,
        rgs: List<AnnouncementRecruitmentGroup> = emptyList(),
        summary: UnitSummaryProjection? = null
    ) = mapOf(
        "id" to c.id,
        "announcement_id" to c.announcementId,
        // 전역 단지가 여러 신청단위에 걸칠 수 있어 이름/합계를 모아서 노출 (docs/dev/DOMAIN_MODEL.md 4장 강일리버파크 사례)
        "recruitment_group_name" to rgs.joinToString(" / ") { it.name }.ifEmpty { null },
        "recruitment_group_supply_count" to if (rgs.isEmpty()) null else rgs.sumOf { it.supplyCount },
        "recruitment_group_reserve_count" to if (rgs.isEmpty()) null else rgs.sumOf { it.reserveCount },
        "min_deposit" to summary?.getMinDeposit(),
        "max_deposit" to summary?.getMaxDeposit(),
        "min_monthly_rent" to summary?.getMinMonthlyRent(),
        "max_monthly_rent" to summary?.getMaxMonthlyRent(),
        "min_exclusive_area" to summary?.getMinExclusiveArea(),
        "max_exclusive_area" to summary?.getMaxExclusiveArea(),
        "total_supply_count" to summary?.getTotalSupplyCount(),
        "total_reserve_count" to summary?.getTotalReserveCount(),
        "name" to c.name,
        "address" to c.address,
        "heating_type" to c.heatingType,
        "has_elevator" to c.hasElevator,
        "parking_info" to c.parkingInfo,
        "complex_type" to c.complexType,
        "latitude" to c.latitude,
        "longitude" to c.longitude,
        "is_imprecise" to c.isImprecise,
        "created_at" to c.createdAt,
        "updated_at" to c.updatedAt
    )

    private fun announcementToSimpleMap(a: Announcement) = mapOf(
        "id" to a.id,
        "title" to a.title,
        "institution" to a.institution,
        "subscription_type" to a.subscriptionType,
        "region" to a.region
    )

    private fun unitToMap(u: HousingUnit, tags: List<String> = emptyList()) = mapOf(
        "id" to u.id,
        "announcement_id" to u.announcementId,
        "complex_id" to u.complexId,
        "recruitment_group_id" to u.recruitmentGroupId,
        "room_number" to u.roomNumber,
        "room_count" to u.roomCount,
        "room_type" to u.roomType,
        "supply_type" to u.supplyType,
        "exclusive_area" to u.exclusiveArea,
        "contract_area" to u.contractArea,
        "target_group" to u.targetGroup,
        "target_tags" to tags,
        "income_group" to u.incomeGroup,
        // 신규 분해 필드 (docs/dev/DOMAIN_MODEL.md 3.4) -- 자격진단/향후 기능용, 기존 필드는 표시 하위호환 유지
        "housing_product_type" to u.housingProductType,
        "allocation_method" to u.allocationMethod,
        "priority_rank" to u.priorityRank,
        "rent_price_tier" to u.rentPriceTier,
        "income_threshold_pct" to u.incomeThresholdPct,
        "income_threshold_condition" to u.incomeThresholdCondition,
        "sale_price" to u.salePrice,
        "supply_count" to u.supplyCount,
        "reserve_count" to u.reserveCount,
        "deposit" to u.deposit,
        "monthly_rent" to u.monthlyRent,
        "max_deposit" to u.maxDeposit,
        "min_deposit" to u.minDeposit,
        "max_monthly_rent" to u.maxMonthlyRent,
        "min_monthly_rent" to u.minMonthlyRent,
        "attributes" to u.attributes,
        "created_at" to u.createdAt,
        "updated_at" to u.updatedAt
    )
}
