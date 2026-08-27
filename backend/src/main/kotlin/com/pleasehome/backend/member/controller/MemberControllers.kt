package com.pleasehome.backend.member.controller

import com.pleasehome.backend.member.service.AuthService
import com.pleasehome.backend.member.service.MemberInteractionService
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService
) {

    @PostMapping("/register")
    fun register(@RequestBody body: Map<String, String>, response: HttpServletResponse): Map<String, Any> =
        authService.register(body, response)

    @PostMapping("/login")
    fun login(@RequestBody body: Map<String, String>, response: HttpServletResponse): Map<String, Any> =
        authService.login(body, response)

    @PostMapping("/logout")
    fun logout(response: HttpServletResponse): Map<String, Any> =
        authService.logout(response)

    @GetMapping("/me")
    fun getMe(request: HttpServletRequest): Map<String, Any?> =
        authService.getMe(request)

    @PatchMapping("/update")
    fun updateAccount(@RequestBody body: Map<String, Any?>, request: HttpServletRequest): Map<String, Any> =
        authService.updateAccount(body, request)

    @GetMapping("/find-account")
    fun getSecurityQuestion(@RequestParam id: String): Map<String, Any> =
        authService.getSecurityQuestion(id)

    @PostMapping("/find-account")
    fun findAccount(@RequestBody body: Map<String, String>): Map<String, Any> =
        authService.findAccount(body)
}

@RestController
@RequestMapping("/api/member")
class MemberInteractionController(
    private val authService: AuthService,
    private val interactionService: MemberInteractionService
) {

    private fun getRequiredMemberId(request: HttpServletRequest): String =
        authService.getMemberIdFromCookie(request) ?: throw IllegalArgumentException("로그인이 필요합니다.")

    // ================= Favorites =================
    @GetMapping("/favorites")
    fun getFavorites(request: HttpServletRequest): List<Map<String, Any?>> =
        interactionService.getFavorites(getRequiredMemberId(request))

    @PostMapping("/favorites")
    fun addFavorite(@RequestBody body: Map<String, Any>, request: HttpServletRequest): Map<String, Any> {
        val annId = (body["announcement_id"] as? Number)?.toLong() ?: throw IllegalArgumentException("announcement_id가 필요합니다.")
        return interactionService.addFavorite(getRequiredMemberId(request), annId)
    }

    @DeleteMapping("/favorites")
    fun deleteFavoriteBody(@RequestBody body: Map<String, Any>, request: HttpServletRequest): Map<String, Any> {
        val annId = (body["announcement_id"] as? Number)?.toLong() ?: throw IllegalArgumentException("announcement_id가 필요합니다.")
        return interactionService.deleteFavorite(getRequiredMemberId(request), annId)
    }

    @DeleteMapping("/favorites/{annId}")
    fun deleteFavoritePath(@PathVariable annId: Long, request: HttpServletRequest): Map<String, Any> =
        interactionService.deleteFavorite(getRequiredMemberId(request), annId)

    // ================= Hidden Announcements =================
    @GetMapping("/hidden-anns")
    fun getHiddenAnns(request: HttpServletRequest): List<Map<String, Any?>> =
        interactionService.getHiddenAnns(getRequiredMemberId(request))

    @PostMapping("/hidden-anns")
    fun addHiddenAnn(@RequestBody body: Map<String, Any>, request: HttpServletRequest): Map<String, Any> {
        val annId = (body["announcement_id"] as? Number)?.toLong() ?: throw IllegalArgumentException("announcement_id가 필요합니다.")
        return interactionService.addHiddenAnn(getRequiredMemberId(request), annId)
    }

    @DeleteMapping("/hidden-anns")
    fun deleteHiddenAnnBody(@RequestBody body: Map<String, Any>, request: HttpServletRequest): Map<String, Any> {
        val annId = (body["announcement_id"] as? Number)?.toLong() ?: throw IllegalArgumentException("announcement_id가 필요합니다.")
        return interactionService.deleteHiddenAnn(getRequiredMemberId(request), annId)
    }

    @DeleteMapping("/hidden-anns/{annId}")
    fun deleteHiddenAnnPath(@PathVariable annId: Long, request: HttpServletRequest): Map<String, Any> =
        interactionService.deleteHiddenAnn(getRequiredMemberId(request), annId)

    // ================= Bookmark Folders =================
    @GetMapping("/bookmark-folders")
    fun getBookmarkFolders(request: HttpServletRequest): List<Map<String, Any?>> =
        interactionService.getBookmarkFolders(getRequiredMemberId(request))

    @PostMapping("/bookmark-folders")
    fun saveBookmarkFolder(@RequestBody body: Map<String, String>, request: HttpServletRequest): Map<String, Any> {
        val id = body["id"] ?: throw IllegalArgumentException("id, name, color가 필요합니다.")
        val name = body["name"] ?: throw IllegalArgumentException("id, name, color가 필요합니다.")
        val color = body["color"] ?: throw IllegalArgumentException("id, name, color가 필요합니다.")
        return interactionService.saveBookmarkFolder(getRequiredMemberId(request), id, name, color)
    }

    @DeleteMapping("/bookmark-folders")
    fun deleteBookmarkFolderBody(@RequestBody body: Map<String, String>, request: HttpServletRequest): Map<String, Any> {
        val id = body["id"] ?: throw IllegalArgumentException("id가 필요합니다.")
        if (id == "default") throw IllegalArgumentException("기본 폴더는 삭제할 수 없습니다.")
        return interactionService.deleteBookmarkFolder(getRequiredMemberId(request), id)
    }

    @DeleteMapping("/bookmark-folders/{id}")
    fun deleteBookmarkFolderPath(@PathVariable id: String, request: HttpServletRequest): Map<String, Any> {
        if (id == "default") throw IllegalArgumentException("기본 폴더는 삭제할 수 없습니다.")
        return interactionService.deleteBookmarkFolder(getRequiredMemberId(request), id)
    }

    // ================= Bookmark Items =================
    @GetMapping("/bookmark-items")
    fun getBookmarkItems(request: HttpServletRequest): List<Map<String, Any?>> =
        interactionService.getBookmarkItems(getRequiredMemberId(request))

    @PostMapping("/bookmark-items")
    fun saveBookmarkItem(@RequestBody body: Map<String, Any?>, request: HttpServletRequest): Map<String, Any> {
        val complexId = (body["complex_id"] as? Number)?.toLong() ?: throw IllegalArgumentException("complex_id, folder_id가 필요합니다.")
        val folderId = body["folder_id"] as? String ?: throw IllegalArgumentException("complex_id, folder_id가 필요합니다.")
        val memo = body["memo"] as? String
        return interactionService.saveBookmarkItem(getRequiredMemberId(request), complexId, folderId, memo)
    }

    @DeleteMapping("/bookmark-items")
    fun deleteBookmarkItemBody(@RequestBody body: Map<String, Any?>, request: HttpServletRequest): Map<String, Any> {
        val complexId = (body["complex_id"] as? Number)?.toLong() ?: throw IllegalArgumentException("complex_id가 필요합니다.")
        return interactionService.deleteBookmarkItem(getRequiredMemberId(request), complexId)
    }

    @DeleteMapping("/bookmark-items/{complexId}")
    fun deleteBookmarkItemPath(@PathVariable complexId: Long, request: HttpServletRequest): Map<String, Any> =
        interactionService.deleteBookmarkItem(getRequiredMemberId(request), complexId)
}
