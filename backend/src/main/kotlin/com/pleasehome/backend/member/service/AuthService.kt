package com.pleasehome.backend.member.service

import com.pleasehome.backend.member.entity.Member
import com.github.benmanes.caffeine.cache.Cache
import com.github.benmanes.caffeine.cache.Caffeine
import com.pleasehome.backend.member.repository.MemberRepository
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseCookie
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Duration
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.security.MessageDigest
import java.util.Base64
import java.util.UUID
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

@Service
@Transactional(transactionManager = "memberTransactionManager")
class AuthService(
    private val memberRepository: MemberRepository,
    private val interactionService: MemberInteractionService,
    @Value("\${session.secret:}") secret: String
) {
    private val passwordEncoder = BCryptPasswordEncoder()
    private val cookieName = "pleasehome_session"

    // ponytail: 비밀키 미설정 시 프로세스별 랜덤 키 사용(재시작마다 전원 로그아웃). 운영은 SESSION_SECRET 필수.
    private val sessionSecret: ByteArray = secret.ifBlank {
        LoggerFactory.getLogger(AuthService::class.java).warn("SESSION_SECRET 미설정: 재시작 시 모든 세션이 만료됩니다.")
        UUID.randomUUID().toString() + UUID.randomUUID()
    }.toByteArray()

    // 실서버(1GB·스왑)에서 기동 후 첫 회원가입이 10.9초 걸렸다(로컬은 0.3초, 2026-10-15). 첫 해시 시 난수 시드·bcrypt 코드 로딩 비용을
    // 사용자 대신 기동 직후에 치르게 한다. DB를 쓰지 않으므로 트랜잭션 밖에서 실행.
    @EventListener(ApplicationReadyEvent::class)
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    fun warmUpPasswordEncoder() {
        passwordEncoder.encode("warm-up")
    }

    fun register(body: Map<String, String>, response: HttpServletResponse): Map<String, Any> {
        val id = body["id"]?.trim() ?: throw IllegalArgumentException("모든 항목을 입력해주세요.")
        val password = body["password"] ?: throw IllegalArgumentException("모든 항목을 입력해주세요.")
        val securityQ = body["security_q"]?.trim() ?: throw IllegalArgumentException("모든 항목을 입력해주세요.")
        val securityA = body["security_a"]?.trim() ?: throw IllegalArgumentException("모든 항목을 입력해주세요.")

        if (id.isEmpty() || password.isEmpty() || securityQ.isEmpty() || securityA.isEmpty()) {
            throw IllegalArgumentException("모든 항목을 입력해주세요.")
        }
        if (password.length < 3) {
            throw IllegalArgumentException("비밀번호는 3자 이상이어야 합니다.")
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

    @Transactional(readOnly = true, propagation = Propagation.SUPPORTS, transactionManager = "memberTransactionManager")
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

    @Transactional(readOnly = true, propagation = Propagation.SUPPORTS, transactionManager = "memberTransactionManager")
    fun getMe(request: HttpServletRequest, response: HttpServletResponse): Map<String, Any?> {
        val memberId = getMemberIdFromCookie(request) ?: return mapOf("member" to null)
        val member = memberRepository.findById(memberId).orElse(null) ?: return mapOf("member" to null)

        // 접속(=/me 호출)할 때마다 쿠키를 재발급해 만료를 마지막 접속 기준 30일로 연장한다.
        setSessionCookie(response, memberId)

        // 로그인 상태 확인과 개인화 데이터(찜/숨김/북마크)를 한 번의 요청으로 묶어
        // 클라이언트의 "인증 확인 → 개인화 데이터 조회" 2-hop 대기를 없앤다.
        return mapOf(
            "member" to mapOf(
                "id" to member.id,
                "security_q" to member.securityQ,
                "created_at" to member.createdAt
            ),
            "favorites" to interactionService.getFavorites(memberId),
            "hidden_anns" to interactionService.getHiddenAnns(memberId),
            "bookmark_folders" to interactionService.getBookmarkFolders(memberId),
            "bookmark_items" to interactionService.getBookmarkItems(memberId)
        )
    }

    /** 회원 탈퇴: 비밀번호를 재확인한 뒤 회원 정보와 모든 이용 데이터를 삭제하고 로그인 쿠키를 지운다 (개인정보처리방침 3·6조) */
    fun withdraw(body: Map<String, String>, request: HttpServletRequest, response: HttpServletResponse): Map<String, Any> {
        val memberId = getMemberIdFromCookie(request) ?: throw IllegalArgumentException("로그인이 필요합니다.")
        val password = body["password"] ?: throw IllegalArgumentException("비밀번호를 입력해주세요.")
        val member = memberRepository.findById(memberId).orElseThrow { NoSuchElementException("회원 정보를 찾을 수 없습니다.") }
        if (!passwordEncoder.matches(password, member.pwdHash)) {
            throw IllegalArgumentException("비밀번호가 올바르지 않습니다.")
        }

        interactionService.deleteAllMemberData(memberId)
        memberRepository.deleteLegacyFavorites(memberId)
        memberRepository.deleteLegacyHiddenAnns(memberId)
        memberRepository.delete(member)
        return logout(response)
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
            if (newPassword.length < 3) {
                throw IllegalArgumentException("새 비밀번호는 3자 이상이어야 합니다.")
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

    // 없는 아이디에도 실제 계정과 같은 형태로 질문을 돌려줘 아이디 존재 여부를 노출하지 않는다 (같은 아이디엔 항상 같은 질문).
    // 목록은 web/src/constants의 SECURITY_QUESTIONS와 같아야 진짜 질문과 구분되지 않는다.
    private val securityQuestions = listOf(
        "어릴 때 키우던 반려동물의 이름은?",
        "다닌 초등학교 이름은?",
        "부모님이 처음 만난 도시는?",
        "가장 좋아하는 음식은?",
        "나의 첫 번째 차 종류는?",
        "태어난 병원 이름은?",
    )

    // 보안 답변 무차별 대입 차단: 같은 아이디로 5회 틀리면 마지막 실패로부터 15분간 잠금.
    // shortcut: 프로세스 메모리 기준이라 재시작 시 초기화됨, 백엔드를 여러 대로 늘리면 공유 저장소로 옮길 것
    private val maxFindAttempts = 5
    private val findFailures: Cache<String, Int> = Caffeine.newBuilder()
        .expireAfterWrite(Duration.ofMinutes(15))
        .maximumSize(10_000)
        .build()

    @Transactional(readOnly = true, propagation = Propagation.SUPPORTS, transactionManager = "memberTransactionManager")
    fun getSecurityQuestion(id: String): Map<String, Any> {
        val question = memberRepository.findById(id).map { it.securityQ }
            .orElse(securityQuestions[Math.floorMod(id.hashCode(), securityQuestions.size)])
        return mapOf("security_q" to question)
    }

    fun findAccount(body: Map<String, String>): Map<String, Any> {
        val id = body["id"]?.trim() ?: throw IllegalArgumentException("아이디와 보안 답변을 입력해주세요.")
        val securityA = body["security_a"]?.trim() ?: throw IllegalArgumentException("아이디와 보안 답변을 입력해주세요.")
        val newPassword = body["new_password"]

        if ((findFailures.getIfPresent(id) ?: 0) >= maxFindAttempts) {
            throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "보안 답변을 여러 번 틀려 잠시 잠겼습니다. 15분 후 다시 시도해주세요.")
        }
        // 없는 아이디도 틀린 답변과 같은 응답을 줘 아이디 존재 여부를 노출하지 않는다
        val member = memberRepository.findById(id).orElse(null)
        if (member == null || member.securityA != securityA) {
            findFailures.asMap().merge(id, 1, Int::plus)
            throw IllegalArgumentException("보안 답변이 올바르지 않습니다.")
        }

        if (newPassword == null) {
            return mapOf("verified" to true, "security_q" to member.securityQ)
        }

        if (newPassword.length < 3) {
            throw IllegalArgumentException("비밀번호는 3자 이상이어야 합니다.")
        }

        member.pwdHash = passwordEncoder.encode(newPassword) ?: member.pwdHash
        memberRepository.save(member)
        findFailures.invalidate(id)
        return mapOf("success" to true)
    }

    // 쿠키 값은 "아이디.HMAC서명" 형식이며, 서명이 맞지 않으면 비로그인으로 취급한다.
    // 쿠키 서명만 검사하고 DB는 쓰지 않는다. 클래스 기본 트랜잭션(IMMEDIATE)이 걸리면 호출마다 쓰기 잠금을 잡는다.
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    fun getMemberIdFromCookie(request: HttpServletRequest): String? {
        val value = request.cookies?.firstOrNull { it.name == cookieName }?.value ?: return null
        val dot = value.lastIndexOf('.')
        if (dot <= 0) return null
        val memberId = value.substring(0, dot)
        val expected = sign(memberId).toByteArray()
        return memberId.takeIf { MessageDigest.isEqual(expected, value.substring(dot + 1).toByteArray()) }
    }

    private fun sign(memberId: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(sessionSecret, "HmacSHA256"))
        return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(memberId.toByteArray()))
    }

    private fun setSessionCookie(response: HttpServletResponse, memberId: String) {
        val cookie = ResponseCookie.from(cookieName, "$memberId.${sign(memberId)}")
            .path("/")
            .httpOnly(true)
            .sameSite("Lax")
            .maxAge(Duration.ofDays(30))
            .build()
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString())
    }
}
