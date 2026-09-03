package com.pleasehome.backend.housing.service

import com.pleasehome.backend.housing.entity.*
import com.pleasehome.backend.housing.repository.*
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

    fun getAnnouncementFullDetails(id: Long): Map<String, Any?> {
        val ann = getAnnouncementById(id)
        val rgs = recruitmentGroupRepository.findAllByAnnouncementId(id)
        val rgMap = rgs.associateBy { it.id ?: 0L }
        val complexes = complexRepository.findAllByAnnouncementId(id).map { complexToMap(it, rgMap[it.recruitmentGroupId]) }
        val units = unitRepository.findAllByAnnouncementIdOrderByExclusiveAreaAsc(id).map { unitToMap(it) }

        return ann + mapOf(
            "recruitment_groups" to rgs.map { recruitmentGroupToMap(it) },
            "complexes" to complexes,
            "units" to units
        )
    }

    fun getComplexes(announcementId: Long?): List<Map<String, Any?>> {
        val list = if (announcementId != null) {
            complexRepository.findAllByAnnouncementId(announcementId)
        } else {
            complexRepository.findAll()
        }
        val rgIds = list.mapNotNull { it.recruitmentGroupId }.distinct()
        val rgMap = if (rgIds.isNotEmpty()) {
            recruitmentGroupRepository.findAllById(rgIds).associateBy { it.id ?: 0L }
        } else emptyMap()
        return list.map { complexToMap(it, rgMap[it.recruitmentGroupId]) }
    }

    fun getComplexById(id: Long): Map<String, Any?> {
        val complex = complexRepository.findById(id).orElseThrow { NoSuchElementException("단지를 찾을 수 없습니다. (ID: $id)") }
        val rg = complex.recruitmentGroupId?.let { recruitmentGroupRepository.findById(it).orElse(null) }
        return complexToMap(complex, rg)
    }

    fun getComplexFullDetails(id: Long): Map<String, Any?> {
        val complex = complexRepository.findById(id).orElseThrow { NoSuchElementException("단지를 찾을 수 없습니다. (ID: $id)") }
        val ann = announcementRepository.findById(complex.announcementId).orElse(null)
        val units = unitRepository.findAllByComplexIdOrderByExclusiveAreaAsc(id).map { unitToMap(it) }
        val rg = complex.recruitmentGroupId?.let { recruitmentGroupRepository.findById(it).orElse(null) }
        val historyList = complexRepository.findHistoryList(complex.name, complex.address, id).map {
            mapOf(
                "complex_id" to it.getComplexId(),
                "announcement_id" to it.getAnnouncementId(),
                "title" to it.getTitle(),
                "subscription_type" to it.getSubscriptionType(),
                "institution" to it.getInstitution()
            )
        }

        val complexMap = complexToMap(complex, rg) + mapOf(
            "recruitment_group" to (if (rg != null) recruitmentGroupToMap(rg) else null)
        )

        return mapOf(
            "complex" to complexMap,
            "announcement" to (if (ann != null) announcementToSimpleMap(ann) else null),
            "units" to units,
            "historyList" to historyList
        )
    }

    fun getHousingUnits(complexId: Long?, announcementId: Long?): List<Map<String, Any?>> {
        val list = when {
            complexId != null -> unitRepository.findAllByComplexIdOrderByExclusiveAreaAsc(complexId)
            announcementId != null -> unitRepository.findAllByAnnouncementIdOrderByExclusiveAreaAsc(announcementId)
            else -> unitRepository.findAllByOrderByExclusiveAreaAsc()
        }
        return list.map { unitToMap(it) }
    }

    fun getSitemapPaths(): Map<String, Any> {
        val annIds = announcementRepository.findAll().mapNotNull { it.id }
        val complexIds = complexRepository.findAll().mapNotNull { it.id }
        return mapOf(
            "announcements" to annIds,
            "complexes" to complexIds
        )
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

    private fun complexToMap(c: Complex, rg: AnnouncementRecruitmentGroup? = null) = mapOf(
        "id" to c.id,
        "announcement_id" to c.announcementId,
        "recruitment_group_id" to c.recruitmentGroupId,
        "recruitment_group_name" to rg?.name,
        "recruitment_group_supply_count" to rg?.supplyCount,
        "recruitment_group_reserve_count" to rg?.reserveCount,
        "name" to c.name,
        "address" to c.address,
        "heating_type" to c.heatingType,
        "has_elevator" to c.hasElevator,
        "parking_info" to c.parkingInfo,
        "complex_type" to c.complexType,
        "attributes" to c.attributes,
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

    private fun unitToMap(u: HousingUnit) = mapOf(
        "id" to u.id,
        "announcement_id" to u.announcementId,
        "complex_id" to u.complexId,
        "room_number" to u.roomNumber,
        "room_count" to u.roomCount,
        "room_type" to u.roomType,
        "supply_type" to u.supplyType,
        "exclusive_area" to u.exclusiveArea,
        "contract_area" to u.contractArea,
        "target_group" to u.targetGroup,
        "income_group" to u.incomeGroup,
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
