package com.pleasehome.backend

import com.pleasehome.backend.housing.service.HousingService
import com.pleasehome.backend.member.service.MemberInteractionService
import org.junit.jupiter.api.Assertions.assertNotNull
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
}
