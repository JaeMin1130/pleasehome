package com.pleasehome.backend.housing.controller

import com.pleasehome.backend.housing.service.HousingService
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/announcements")
class AnnouncementController(
    private val housingService: HousingService
) {

    @GetMapping
    fun getAllAnnouncements(): List<Map<String, Any?>> =
        housingService.getAllAnnouncements()

    @GetMapping("/{id}")
    fun getAnnouncementById(@PathVariable id: Long): Map<String, Any?> =
        housingService.getAnnouncementById(id)

    @GetMapping("/{id}/details")
    fun getAnnouncementFullDetails(@PathVariable id: Long): Map<String, Any?> =
        housingService.getAnnouncementFullDetails(id)
}

@RestController
@RequestMapping("/api/complexes")
class ComplexController(
    private val housingService: HousingService
) {

    @GetMapping
    fun getComplexes(@RequestParam(required = false, name = "announcement_id") announcementId: Long?): List<Map<String, Any?>> =
        housingService.getComplexes(announcementId)

    @GetMapping("/{id}")
    fun getComplexById(@PathVariable id: Long): Map<String, Any?> =
        housingService.getComplexById(id)

    @GetMapping("/{id}/details")
    fun getComplexFullDetails(@PathVariable id: Long): Map<String, Any?> =
        housingService.getComplexFullDetails(id)
}

@RestController
@RequestMapping("/api/housing-units")
class HousingUnitController(
    private val housingService: HousingService
) {

    @GetMapping
    fun getHousingUnits(
        @RequestParam(required = false, name = "complex_id") complexId: Long?,
        @RequestParam(required = false, name = "announcement_id") announcementId: Long?
    ): List<Map<String, Any?>> =
        housingService.getHousingUnits(complexId, announcementId)
}

@RestController
@RequestMapping("/api/sitemap")
class SitemapController(
    private val housingService: HousingService
) {

    @GetMapping("/paths")
    fun getSitemapPaths(): Map<String, Any> =
        housingService.getSitemapPaths()
}
