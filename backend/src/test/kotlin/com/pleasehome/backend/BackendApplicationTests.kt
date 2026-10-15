package com.pleasehome.backend

import com.pleasehome.backend.housing.service.HousingService
import com.pleasehome.backend.member.service.MemberInteractionService
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class BackendApplicationTests {

    @Autowired
    private lateinit var housingService: HousingService

    @Autowired
    private lateinit var interactionService: MemberInteractionService

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

        val complexes = housingService.getComplexes(null)
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
}
