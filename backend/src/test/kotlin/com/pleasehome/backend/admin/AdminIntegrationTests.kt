package com.pleasehome.backend.admin

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse

@SpringBootTest
class AdminIntegrationTests {

    @Autowired
    private lateinit var adminService: AdminService

    @Autowired
    private lateinit var adminSecurityInterceptor: AdminSecurityInterceptor

    @Autowired
    private lateinit var adminController: AdminController

    private val validApiKey = "plzhome-secret-adm-key-9f8a7e6b5c4d3e2a1"

    @Test
    fun testAdminStatsService() {
        val stats = adminService.getStats()
        assertNotNull(stats)
        assertTrue(stats.totalMembers >= 0)
        println("Stats loaded: totalMembers=${stats.totalMembers}, bookmarks=${stats.totalBookmarks}")
    }

    @Test
    fun testAdminSecurityInterceptor() {
        // 1. 헤더 없이 요청 시 차단 (false, 401)
        val reqNoKey = MockHttpServletRequest("GET", "/api/admin/stats")
        val resNoKey = MockHttpServletResponse()
        val passedNoKey = adminSecurityInterceptor.preHandle(reqNoKey, resNoKey, Any())
        assertFalse(passedNoKey)
        assertEquals(401, resNoKey.status)

        // 2. 잘못된 키 요청 시 차단 (false, 401)
        val reqWrongKey = MockHttpServletRequest("GET", "/api/admin/stats")
        reqWrongKey.addHeader("X-Admin-Api-Key", "invalid-key")
        val resWrongKey = MockHttpServletResponse()
        val passedWrong = adminSecurityInterceptor.preHandle(reqWrongKey, resWrongKey, Any())
        assertFalse(passedWrong)
        assertEquals(401, resWrongKey.status)

        // 3. 올바른 키 요청 시 통과 (true, 200)
        val reqValidKey = MockHttpServletRequest("GET", "/api/admin/stats")
        reqValidKey.addHeader("X-Admin-Api-Key", validApiKey)
        val resValidKey = MockHttpServletResponse()
        val passedValid = adminSecurityInterceptor.preHandle(reqValidKey, resValidKey, Any())
        assertTrue(passedValid)

        // 4. OPTIONS preflight 요청 시 통과
        val reqOptions = MockHttpServletRequest("OPTIONS", "/api/admin/stats")
        val resOptions = MockHttpServletResponse()
        val passedOptions = adminSecurityInterceptor.preHandle(reqOptions, resOptions, Any())
        assertTrue(passedOptions)
    }

    @Test
    fun testAdminControllerEndpoints() {
        val statsResponse = adminController.getStats()
        assertEquals(200, statsResponse.statusCode.value())
        assertNotNull(statsResponse.body)

        val usersResponse = adminController.getMemberList(0, 10, null)
        assertEquals(200, usersResponse.statusCode.value())
        assertNotNull(usersResponse.body)
        assertTrue(usersResponse.body!!.items.isNotEmpty() || usersResponse.body!!.totalCount == 0L)
    }
}
