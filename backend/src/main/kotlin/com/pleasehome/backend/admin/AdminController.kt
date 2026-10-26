package com.pleasehome.backend.admin

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/admin")
class AdminController(
    private val adminService: AdminService
) {

    @GetMapping("/stats")
    fun getStats(): ResponseEntity<AdminStatsResponse> {
        val stats = adminService.getStats()
        return ResponseEntity.ok(stats)
    }

    @GetMapping("/users")
    fun getMemberList(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) search: String?
    ): ResponseEntity<AdminMemberListResponse> {
        val list = adminService.getMemberList(page, size, search)
        return ResponseEntity.ok(list)
    }

    @GetMapping("/users/{memberId}/activity")
    fun getMemberActivity(
        @PathVariable memberId: String
    ): ResponseEntity<AdminMemberActivityResponse> {
        val activity = adminService.getMemberActivity(memberId)
        return ResponseEntity.ok(activity)
    }
}
