package com.pleasehome.backend.admin

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpMethod
import org.springframework.stereotype.Component
import org.springframework.web.servlet.HandlerInterceptor

@Component
class AdminSecurityInterceptor(
    @Value("\${admin.api-key:plzhome-secret-adm-key-9f8a7e6b5c4d3e2a1}")
    private val expectedApiKey: String
) : HandlerInterceptor {

    override fun preHandle(request: HttpServletRequest, response: HttpServletResponse, handler: Any): Boolean {
        // CORS preflight OPTIONS 요청은 통과
        if (HttpMethod.OPTIONS.matches(request.method)) {
            return true
        }

        val providedKey = request.getHeader("X-Admin-Api-Key")
            ?: request.getParameter("apiKey")

        if (providedKey == null || providedKey != expectedApiKey) {
            response.status = HttpServletResponse.SC_UNAUTHORIZED
            response.contentType = "application/json;charset=UTF-8"
            response.writer.write("""{"error": "Unauthorized admin access", "status": 401}""")
            return false
        }

        return true
    }
}
