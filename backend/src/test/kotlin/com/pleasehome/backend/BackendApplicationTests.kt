package com.pleasehome.backend

import com.pleasehome.backend.housing.service.HousingService
import com.pleasehome.backend.member.repository.MemberRepository
import com.pleasehome.backend.member.service.AuthService
import com.pleasehome.backend.member.service.MemberInteractionService
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.web.server.ResponseStatusException

@SpringBootTest
class BackendApplicationTests {

    @Autowired
    private lateinit var housingService: HousingService

    @Autowired
    private lateinit var interactionService: MemberInteractionService

    @Autowired
    private lateinit var authService: AuthService

    @Autowired
    private lateinit var memberRepository: MemberRepository

    @Test
    fun contextLoads() {
        assertNotNull(housingService)
        assertNotNull(interactionService)
    }

    @Test
    fun testHousingServiceIntegration() {
        val announcements = housingService.getAllAnnouncements()
        println("Loaded ${announcements.size} announcements from SQLite")
        assertTrue(announcements.isNotEmpty(), "Announcements should not be empty")

        val firstAnnId = announcements.first()["id"] as Long
        val singleAnn = housingService.getAnnouncementFullDetails(firstAnnId)
        assertNotNull(singleAnn["title"])
        assertNotNull(singleAnn["schedules"])

        val complexes = housingService.getComplexes(firstAnnId)
        println("Loaded ${complexes.size} complexes from SQLite")
        assertTrue(complexes.isNotEmpty(), "Complexes should not be empty")

        val firstCompId = complexes.first()["id"] as Long
        val singleComp = housingService.getComplexFullDetails(firstCompId)
        assertNotNull(singleComp["complex"])
    }

    @Test
    fun testExclusiveFavoriteAndHiddenToggling() {
        val testMember = "test_user_ponytail"
        val testAnnId = 999999L

        // 1. 숨김 추가
        interactionService.addHiddenAnn(testMember, testAnnId)
        var hiddenList = interactionService.getHiddenAnns(testMember)
        assertTrue(hiddenList.any { it["announcement_id"] == testAnnId })

        // 2. 찜 추가 -> 숨김 자동 해제 검증 (상호 배제 로직)
        interactionService.addFavorite(testMember, testAnnId)
        val favList = interactionService.getFavorites(testMember)
        assertTrue(favList.any { it["announcement_id"] == testAnnId })

        hiddenList = interactionService.getHiddenAnns(testMember)
        assertTrue(hiddenList.none { it["announcement_id"] == testAnnId }, "Hidden should be removed when favorited")

        // 3. 다시 숨김 추가 -> 찜 자동 해제 검증
        interactionService.addHiddenAnn(testMember, testAnnId)
        val favListAfter = interactionService.getFavorites(testMember)
        assertTrue(favListAfter.none { it["announcement_id"] == testAnnId }, "Favorite should be removed when hidden")

        // 4. 정리
        interactionService.deleteHiddenAnn(testMember, testAnnId)
    }

    // Regression: GET /api/housing-units with neither complex_id nor
    // announcement_id fetched every housing unit row unbounded (11.7MB,
    // ~1-1.7s, no auth required) — found by 백엔드 성능 QA on 2026-09-22.
    @Test
    fun testGetHousingUnitsRequiresAFilter() {
        assertThrows(IllegalArgumentException::class.java) {
            housingService.getHousingUnits(null, null)
        }

        val firstAnnId = housingService.getAllAnnouncements().first()["id"] as Long
        val byAnnouncement = housingService.getHousingUnits(null, firstAnnId)
        assertNotNull(byAnnouncement)
    }

    // Regression: complex_id와 announcement_id를 함께 주면 announcement_id가 무시되어,
    // 단지 445(공고 33·479·481에 걸침)를 공고 479에서 열면 공고 33의 예비 192명이 섞여 보였다 (2026-10-15 실서버 체험).
    @Test
    fun testGetHousingUnitsFiltersByComplexAndAnnouncement() {
        val units = housingService.getHousingUnits(445L, 479L)
        assertTrue(units.isNotEmpty())
        assertTrue(units.all { it["announcement_id"] == 479L && it["complex_id"] == 445L })
    }

    @Test
    fun testWithdrawDeletesMemberAndAllData() {
        val id = "test_withdraw_ponytail"
        if (memberRepository.existsById(id)) memberRepository.deleteById(id)
        val registerRes = MockHttpServletResponse()
        authService.register(mapOf("id" to id, "password" to "pw1234", "security_q" to "q", "security_a" to "a"), registerRes)
        val request = MockHttpServletRequest().apply { setCookies(registerRes.getCookie("pleasehome_session")!!) }
        interactionService.addFavorite(id, 999998L)
        interactionService.saveBookmarkFolder(id, "f1", "폴더", "#000000")

        assertThrows(IllegalArgumentException::class.java) {
            authService.withdraw(mapOf("password" to "wrong"), request, MockHttpServletResponse())
        }
        assertTrue(memberRepository.existsById(id), "비밀번호가 틀리면 삭제되면 안 된다")

        val withdrawRes = MockHttpServletResponse()
        authService.withdraw(mapOf("password" to "pw1234"), request, withdrawRes)
        assertTrue(!memberRepository.existsById(id))
        assertTrue(interactionService.getFavorites(id).isEmpty())
        assertTrue(interactionService.getBookmarkFolders(id).isEmpty())
        assertTrue(withdrawRes.getHeader("Set-Cookie")!!.contains("Max-Age=0"), "로그인 쿠키가 지워져야 한다")
    }

    // 관심 지역은 선택 사항이며, 목록에 없는 코드는 거부하고 저장 값은 중복 없이 목록 순서로 맞춘다
    @Test
    fun testPreferredRegionsOnRegisterAndUpdate() {
        val id = "test_regions_ponytail"
        if (memberRepository.existsById(id)) memberRepository.deleteById(id)
        val base = mapOf("id" to id, "password" to "pw1234", "security_q" to "q", "security_a" to "a")
        try {
            assertThrows(IllegalArgumentException::class.java) {
                authService.register(base + ("preferred_regions" to "11,99"), MockHttpServletResponse())
            }
            assertTrue(!memberRepository.existsById(id), "잘못된 지역 코드면 가입되면 안 된다")

            val registerRes = MockHttpServletResponse()
            authService.register(base + ("preferred_regions" to "41, 11,41"), registerRes)
            assertTrue(memberRepository.findById(id).get().preferredRegions == "11,41")

            val request = MockHttpServletRequest().apply { setCookies(registerRes.getCookie("pleasehome_session")!!) }
            authService.updateAccount(mapOf("preferred_regions" to ""), request)
            assertTrue(memberRepository.findById(id).get().preferredRegions == "", "전부 해제할 수 있어야 한다")
        } finally {
            if (memberRepository.existsById(id)) memberRepository.deleteById(id)
        }
    }

    // 없는 아이디도 실제 계정처럼 질문을 돌려주고, 틀린 답변과 같은 오류를 내야 아이디 존재 여부가 새지 않는다
    @Test
    fun testFindAccountDoesNotRevealIdExistence() {
        val ghost = "ghost_id_ponytail_never_registered"
        val q1 = authService.getSecurityQuestion(ghost)["security_q"]
        assertTrue(q1 == authService.getSecurityQuestion(ghost)["security_q"], "같은 아이디엔 항상 같은 질문")
        val e = assertThrows(IllegalArgumentException::class.java) {
            authService.findAccount(mapOf("id" to ghost, "security_a" to "x"))
        }
        assertTrue(e.message == "보안 답변이 올바르지 않습니다.")
    }

    // 5회 틀리면 정답이어도 잠겨야 무차별 대입을 막는다
    @Test
    fun testFindAccountLocksAfterRepeatedWrongAnswers() {
        val id = "test_lock_ponytail"
        if (memberRepository.existsById(id)) memberRepository.deleteById(id)
        authService.register(mapOf("id" to id, "password" to "pw1234", "security_q" to "q", "security_a" to "right"), MockHttpServletResponse())
        try {
            repeat(5) {
                assertThrows(IllegalArgumentException::class.java) {
                    authService.findAccount(mapOf("id" to id, "security_a" to "wrong$it"))
                }
            }
            val locked = assertThrows(ResponseStatusException::class.java) {
                authService.findAccount(mapOf("id" to id, "security_a" to "right"))
            }
            assertTrue(locked.statusCode.value() == 429)
        } finally {
            memberRepository.deleteById(id)
        }
    }
}
