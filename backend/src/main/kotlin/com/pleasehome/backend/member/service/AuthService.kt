package com.pleasehome.backend.member.service

import com.pleasehome.backend.member.entity.Member
import com.pleasehome.backend.member.repository.MemberRepository
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseCookie
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Service
@Transactional(transactionManager = "memberTransactionManager")
class AuthService(
    private val memberRepository: MemberRepository
) {
    private val passwordEncoder = BCryptPasswordEncoder()
    private val cookieName = "pleasehome_session"

    fun register(body: Map<String, String>, response: HttpServletResponse): Map<String, Any> {
        val id = body["id"]?.trim() ?: throw IllegalArgumentException("모든 항목을 입력해주세요.")
        val password = body["password"] ?: throw IllegalArgumentException("모든 항목을 입력해주세요.")
        val securityQ = body["security_q"]?.trim() ?: throw IllegalArgumentException("모든 항목을 입력해주세요.")
        val securityA = body["security_a"]?.trim() ?: throw IllegalArgumentException("모든 항목을 입력해주세요.")

        if (id.isEmpty() || password.isEmpty() || securityQ.isEmpty() || securityA.isEmpty()) {
            throw IllegalArgumentException("모든 항목을 입력해주세요.")
        }

        if (memberRepository.existsById(id)) {
            throw IllegalStateException("이미 사용 중인 아이디입니다.")
        }

        val pwdHash = passwordEncoder.encode(password) ?: ""
        val now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        val member = Member(
            id = id,
            pwdHash = pwdHash,
            securityQ = securityQ,
            securityA = securityA,
            createdAt = now
        )
        memberRepository.save(member)

        setSessionCookie(response, id)
        return mapOf("success" to true, "memberId" to id)
    }

    fun login(body: Map<String, String>, response: HttpServletResponse): Map<String, Any> {
        val id = body["id"]?.trim() ?: throw IllegalArgumentException("아이디와 비밀번호를 입력해주세요.")
        val password = body["password"] ?: throw IllegalArgumentException("아이디와 비밀번호를 입력해주세요.")

        val member = memberRepository.findById(id).orElse(null)
            ?: throw IllegalArgumentException("아이디 또는 비밀번호가 올바르지 않습니다.")

        if (!passwordEncoder.matches(password, member.pwdHash)) {
            throw IllegalArgumentException("아이디 또는 비밀번호가 올바르지 않습니다.")
        }

        setSessionCookie(response, id)
        return mapOf("success" to true, "memberId" to id)
    }

    fun logout(response: HttpServletResponse): Map<String, Any> {
        val cookie = ResponseCookie.from(cookieName, "")
            .path("/")
            .httpOnly(true)
            .sameSite("Lax")
            .maxAge(Duration.ZERO)
            .build()
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString())
        return mapOf("success" to true)
    }

    @Transactional(readOnly = true, transactionManager = "memberTransactionManager")
    fun getMe(request: HttpServletRequest): Map<String, Any?> {
        val memberId = getMemberIdFromCookie(request) ?: return mapOf("member" to null)
        val member = memberRepository.findById(memberId).orElse(null) ?: return mapOf("member" to null)

        return mapOf(
            "member" to mapOf(
                "id" to member.id,
                "security_q" to member.securityQ,
                "created_at" to member.createdAt
            )
        )
    }

    fun updateAccount(body: Map<String, Any?>, request: HttpServletRequest): Map<String, Any> {
        val memberId = getMemberIdFromCookie(request) ?: throw IllegalArgumentException("로그인이 필요합니다.")
        val member = memberRepository.findById(memberId).orElseThrow { NoSuchElementException("회원 정보를 찾을 수 없습니다.") }

        val currentPassword = body["current_password"] as? String
        val newPassword = body["new_password"] as? String
        val securityQ = body["security_q"] as? String
        val securityA = body["security_a"] as? String

        if (newPassword != null) {
            if (currentPassword == null || !passwordEncoder.matches(currentPassword, member.pwdHash)) {
                throw IllegalArgumentException("현재 비밀번호가 올바르지 않습니다.")
            }
            if (newPassword.length < 6) {
                throw IllegalArgumentException("새 비밀번호는 6자 이상이어야 합니다.")
            }
            member.pwdHash = passwordEncoder.encode(newPassword) ?: member.pwdHash
        }

        if (securityQ != null || securityA != null) {
            val newQ = securityQ ?: member.securityQ
            val newA = securityA ?: member.securityA
            if (newA.trim().isEmpty()) {
                throw IllegalArgumentException("보안 답변을 입력해주세요.")
            }
            member.securityQ = newQ
            member.securityA = newA.trim()
        }

        memberRepository.save(member)
        return mapOf("success" to true)
    }

    @Transactional(readOnly = true, transactionManager = "memberTransactionManager")
    fun getSecurityQuestion(id: String): Map<String, Any> {
        val member = memberRepository.findById(id).orElseThrow { NoSuchElementException("존재하지 않는 아이디입니다.") }
        return mapOf("security_q" to member.securityQ)
    }

    fun findAccount(body: Map<String, String>): Map<String, Any> {
        val id = body["id"]?.trim() ?: throw IllegalArgumentException("아이디와 보안 답변을 입력해주세요.")
        val securityA = body["security_a"]?.trim() ?: throw IllegalArgumentException("아이디와 보안 답변을 입력해주세요.")
        val newPassword = body["new_password"]

        val member = memberRepository.findById(id).orElseThrow { NoSuchElementException("존재하지 않는 아이디입니다.") }
        if (member.securityA != securityA) {
            throw IllegalArgumentException("보안 답변이 올바르지 않습니다.")
        }

        if (newPassword == null) {
            return mapOf("verified" to true, "security_q" to member.securityQ)
        }

        if (newPassword.length < 6) {
            throw IllegalArgumentException("비밀번호는 6자 이상이어야 합니다.")
        }

        member.pwdHash = passwordEncoder.encode(newPassword) ?: member.pwdHash
        memberRepository.save(member)
        return mapOf("success" to true)
    }

    fun getMemberIdFromCookie(request: HttpServletRequest): String? {
        val authHeader = request.getHeader("Authorization")
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim()
        }
        return request.cookies?.firstOrNull { it.name == cookieName }?.value?.takeIf { it.isNotBlank() }
    }

    private fun setSessionCookie(response: HttpServletResponse, memberId: String) {
        val cookie = ResponseCookie.from(cookieName, memberId)
            .path("/")
            .httpOnly(true)
            .sameSite("Lax")
            .maxAge(Duration.ofDays(30))
            .build()
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString())
    }
}
