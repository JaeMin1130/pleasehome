package com.pleasehome.backend.housing.controller

import com.pleasehome.backend.housing.service.HousingService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
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

@RestController
@RequestMapping("/api/cache")
class CacheController(
    private val housingService: HousingService
) {

    @PostMapping("/evict")
    fun evictCache(request: jakarta.servlet.http.HttpServletRequest): ResponseEntity<Map<String, Any>> {
        val remoteAddr = request.remoteAddr
        val forwardedFor = request.getHeader("X-Forwarded-For")
        val isLocal = (remoteAddr == "127.0.0.1" || remoteAddr == "0:0:0:0:0:0:0:1") && forwardedFor.isNullOrEmpty()

        // 예외로 던지면 GlobalExceptionHandler의 Exception 핸들러가 500으로 바꾼다
        if (!isLocal) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(mapOf("error" to "Access denied: cache eviction is only allowed from localhost"))
        }

        housingService.evictHousingCaches()
        return ResponseEntity.ok(mapOf("success" to true, "message" to "All housing caches evicted successfully."))
    }
}
