package com.pleasehome.backend.housing.entity

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "announcements")
class Announcement(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(nullable = false)
    var title: String = "",

    @Column(nullable = false)
    var institution: String = "",

    @Column(name = "subscription_type", nullable = false)
    var subscriptionType: String = "",

    @Column(name = "doc_path")
    var docPath: String? = null,

    @Column(columnDefinition = "TEXT")
    var attributes: String? = null,

    @Column(name = "dtl_url")
    var dtlUrl: String? = null,

    @Column(name = "dtl_url_mob")
    var dtlUrlMob: String? = null,

    var region: String? = null,

    @Column(name = "created_at")
    var createdAt: String? = null,

    @Column(name = "updated_at")
    var updatedAt: String? = null
)

@Entity
@Table(name = "announcement_schedules")
class AnnouncementSchedule(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "announcement_id", nullable = false)
    var announcementId: Long = 0,

    @Column(name = "schedule_type", nullable = false)
    var scheduleType: String = "",

    @Column(name = "start_date")
    var startDate: String? = null,

    @Column(name = "end_date")
    var endDate: String? = null,

    @Column(name = "raw_text")
    var rawText: String? = null,

    @Column(columnDefinition = "TEXT")
    var notes: String? = null
)

@Entity
@Table(name = "announcement_details")
class AnnouncementDetail(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "announcement_id", nullable = false)
    var announcementId: Long = 0,

    @Column(name = "section_title", nullable = false)
    var sectionTitle: String = "",

    @Column(name = "section_content", columnDefinition = "TEXT", nullable = false)
    var sectionContent: String = "",

    @Column(name = "sort_order")
    var sortOrder: Int = 0
)

@Entity
@Table(name = "announcement_limits")
class AnnouncementLimit(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "announcement_id", nullable = false)
    var announcementId: Long = 0,

    @Column(name = "target_group")
    var targetGroup: String? = null,

    @Column(name = "max_support_amount")
    var maxSupportAmount: Long? = null,

    @Column(name = "deposit_limit")
    var depositLimit: Long? = null,

    @Column(name = "tenant_share")
    var tenantShare: Long? = null,

    @Column(name = "interest_rate")
    var interestRate: Double? = null,

    @Column(name = "max_monthly_rent")
    var maxMonthlyRent: Long? = null,

    @Column(columnDefinition = "TEXT")
    var notes: String? = null,

    @Column(columnDefinition = "TEXT")
    var attributes: String? = null
)

@Entity
@Table(name = "complexes")
class Complex(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "announcement_id", nullable = false)
    var announcementId: Long = 0,

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = false)
    var address: String = "",

    @Column(name = "heating_type")
    var heatingType: String? = null,

    @Column(name = "has_elevator")
    var hasElevator: Boolean? = null,

    @Column(name = "parking_info")
    var parkingInfo: String? = null,

    @Column(name = "complex_type")
    var complexType: String? = null,

    @Column(columnDefinition = "TEXT")
    var attributes: String? = null,

    var latitude: Double? = null,
    var longitude: Double? = null,

    @Column(name = "is_imprecise")
    var isImprecise: Int? = 0,

    @Column(name = "created_at")
    var createdAt: String? = null,

    @Column(name = "updated_at")
    var updatedAt: String? = null
)

@Entity
@Table(name = "housing_units")
class HousingUnit(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "announcement_id", nullable = false)
    var announcementId: Long = 0,

    @Column(name = "complex_id")
    var complexId: Long? = null,

    @Column(name = "room_number")
    var roomNumber: String? = null,

    @Column(name = "room_count")
    var roomCount: Int? = null,

    @Column(name = "room_type")
    var roomType: String? = null,

    @Column(name = "supply_type")
    var supplyType: String? = null,

    @Column(name = "exclusive_area", nullable = false)
    var exclusiveArea: Double = 0.0,

    @Column(name = "contract_area")
    var contractArea: Double? = null,

    @Column(name = "target_group")
    var targetGroup: String? = null,

    @Column(name = "income_group")
    var incomeGroup: String? = null,

    @Column(name = "supply_count")
    var supplyCount: Int? = 0,

    @Column(name = "reserve_count")
    var reserveCount: Int? = 0,

    @Column(nullable = false)
    var deposit: Long = 0,

    @Column(name = "monthly_rent")
    var monthlyRent: Long? = 0,

    @Column(name = "max_deposit")
    var maxDeposit: Long? = null,

    @Column(name = "min_deposit")
    var minDeposit: Long? = null,

    @Column(name = "max_monthly_rent")
    var maxMonthlyRent: Long? = null,

    @Column(name = "min_monthly_rent")
    var minMonthlyRent: Long? = null,

    @Column(columnDefinition = "TEXT")
    var attributes: String? = null,

    @Column(name = "created_at")
    var createdAt: String? = null,

    @Column(name = "updated_at")
    var updatedAt: String? = null
)
