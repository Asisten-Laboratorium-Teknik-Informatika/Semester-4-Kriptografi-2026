package com.example.drmreader

import android.content.Context
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

class AndroidDRMBridge(private val context: Context, private val apiBaseUrl: String) {
    companion object {
        private const val TAG = "DRMBridge"
    }

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "android_drm_store",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    private val baseDir: File = File(context.filesDir, "drm_pages").apply { mkdirs() }

    @JavascriptInterface
    fun getApiBaseUrl(): String = apiBaseUrl

    @JavascriptInterface
    fun downloadChapter(payloadJson: String): String = guarded {
        val payload = JSONObject(payloadJson)
        val apiBaseUrl = payload.getString("apiBaseUrl")
        val userId = payload.optString("userId")
        val chapterId = payload.getString("chapterId")
        val comic = payload.getJSONObject("comic")

        require(userId.isNotBlank()) { "User id is required for download grants." }
        Log.i(TAG, "Starting offline download. chapterId=$chapterId apiBaseUrl=$apiBaseUrl")

        val grant = postJson(
            apiBaseUrl,
            JSONObject().put("chapterId", chapterId).toString(),
            mapOf("X-User-Id" to userId)
        ).getJSONObject("data")

        val comicId = grant.getString("comicId")
        val chapter = grant.getJSONObject("chapter")
        val pages = grant.getJSONArray("pages")
        val chapterDir = File(baseDir, safeName(comicId) + "/" + safeName(chapterId)).apply { mkdirs() }
        Log.i(TAG, "Download grant received. comicId=$comicId chapterId=$chapterId pages=${pages.length()}")

        for (i in 0 until pages.length()) {
            val page = pages.getJSONObject(i)
            val pageIndex = page.getInt("pageIndex")
            val encryptedUrl = normalizeBackendUrl(page.getString("encryptedUrl"), apiBaseUrl)
            val encrypted = downloadBytes(encryptedUrl)
            val target = File(chapterDir, "page-$pageIndex.bin")
            target.writeBytes(encrypted)

            val prefix = keyPrefix(comicId, chapterId, pageIndex)
            prefs.edit()
                .putString("$prefix:path", target.absolutePath)
                .putString("$prefix:mime", page.getString("mimeType"))
                .putString("$prefix:key", page.getString("keyBase64"))
                .putString("$prefix:iv", page.getString("ivBase64"))
                .apply()
        }

        val chapterMeta = JSONObject(chapter.toString())
            .put("pages", JSONArray())
            .put("images", JSONArray())
            .put("pageCount", pages.length())

        val record = JSONObject()
            .put("comic", comic)
            .put("chapter", chapterMeta)
            .put("pageCount", pages.length())

        prefs.edit()
            .putString(chapterKey(comicId, chapterId), record.toString())
            .apply()

        Log.i(TAG, "Offline download complete. comicId=$comicId chapterId=$chapterId")
        JSONObject().put("downloaded", true)
    }

    @JavascriptInterface
    fun isChapterDownloaded(comicId: String, chapterId: String): Boolean {
        return prefs.contains(chapterKey(comicId, chapterId))
    }

    @JavascriptInterface
    fun removeChapter(comicId: String, chapterId: String): Boolean {
        val key = chapterKey(comicId, chapterId)
        val raw = prefs.getString(key, null) ?: return true
        val record = JSONObject(raw)
        val pageCount = record.optInt("pageCount", 0)
        val editor = prefs.edit().remove(key)

        for (i in 0 until pageCount) {
            val prefix = keyPrefix(comicId, chapterId, i)
            prefs.getString("$prefix:path", null)?.let { File(it).delete() }
            editor
                .remove("$prefix:path")
                .remove("$prefix:mime")
                .remove("$prefix:key")
                .remove("$prefix:iv")
        }

        editor.apply()
        File(baseDir, safeName(comicId) + "/" + safeName(chapterId)).deleteRecursively()
        return true
    }

    @JavascriptInterface
    fun getOfflinePage(comicId: String, chapterId: String, pageIndex: Int): String = guarded {
        val prefix = keyPrefix(comicId, chapterId, pageIndex)
        val path = prefs.getString("$prefix:path", null) ?: error("Offline page not found.")
        val mime = prefs.getString("$prefix:mime", null) ?: "image/jpeg"
        val keyText = prefs.getString("$prefix:key", null) ?: error("Offline key not found.")
        val ivText = prefs.getString("$prefix:iv", null) ?: error("Offline IV not found.")
        val key = Base64.decode(keyText, Base64.DEFAULT)
        val iv = Base64.decode(ivText, Base64.DEFAULT)
        val cipherBytes = File(path).readBytes()
        val plain = decrypt(cipherBytes, key, iv)

        JSONObject()
            .put("mimeType", mime)
            .put("base64", Base64.encodeToString(plain, Base64.NO_WRAP))
    }

    @JavascriptInterface
    fun getDownloadedChapters(comicId: String): String = guardedArray {
        val chapters = JSONArray()
        prefs.all.forEach { (key, value) ->
            if (key.startsWith("chapter:${safeName(comicId)}:") && value is String) {
                val record = JSONObject(value)
                chapters.put(chapterWithPageCount(record))
            }
        }
        chapters
    }

    @JavascriptInterface
    fun getDownloads(): String = guardedArray {
        val byComic = linkedMapOf<String, JSONObject>()

        prefs.all.forEach { (key, value) ->
            if (!key.startsWith("chapter:") || value !is String) return@forEach
            val record = JSONObject(value)
            val comic = record.getJSONObject("comic")
            val comicId = comic.getString("id")
            val group = byComic.getOrPut(comicId) {
                JSONObject()
                    .put("comic", comic)
                    .put("chapters", JSONArray())
            }
            group.getJSONArray("chapters").put(chapterWithPageCount(record))
        }

        JSONArray(byComic.values)
    }

    private fun postJson(apiBaseUrl: String, body: String, headers: Map<String, String>): JSONObject {
        val url = URL(withAction(apiBaseUrl, "download_grant"))
        Log.d(TAG, "POST $url")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15000
            readTimeout = 30000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
            setRequestProperty("ngrok-skip-browser-warning", "1")
            headers.forEach { (name, value) -> setRequestProperty(name, value) }
        }

        connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
        val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
        val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
        if (connection.responseCode !in 200..299) {
            Log.e(TAG, "API request failed. status=${connection.responseCode} body=$text")
            error("API request failed (${connection.responseCode}).")
        }
        val json = JSONObject(text)
        if (!json.optBoolean("ok")) {
            val apiError = json.optString("error", "API request failed.")
            Log.e(TAG, "API returned error: $apiError")
            error(apiError)
        }
        return json
    }

    private fun downloadBytes(url: String): ByteArray {
        Log.d(TAG, "GET encrypted page $url")
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 15000
            readTimeout = 30000
        }
        if (connection.responseCode !in 200..299) {
            val text = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
            Log.e(TAG, "Encrypted page download failed. status=${connection.responseCode} body=$text")
            error("Unable to download encrypted page (${connection.responseCode}).")
        }
        return connection.inputStream.use { it.readBytes() }
    }

    private fun decrypt(cipherBytes: ByteArray, key: ByteArray, iv: ByteArray): ByteArray {
        val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), IvParameterSpec(iv))
        return cipher.doFinal(cipherBytes)
    }

    private fun guarded(block: () -> JSONObject): String {
        return try {
            JSONObject()
                .put("ok", true)
                .put("data", block())
                .toString()
        } catch (error: Throwable) {
            Log.e(TAG, "Bridge call failed", error)
            JSONObject()
                .put("ok", false)
                .put("error", error.message ?: "AndroidDRM error.")
                .toString()
        }
    }

    private fun guardedArray(block: () -> JSONArray): String {
        return try {
            JSONObject()
                .put("ok", true)
                .put("data", block())
                .toString()
        } catch (error: Throwable) {
            Log.e(TAG, "Bridge call failed", error)
            JSONObject()
                .put("ok", false)
                .put("error", error.message ?: "AndroidDRM error.")
                .toString()
        }
    }

    private fun withAction(apiBaseUrl: String, action: String): String {
        val separator = if (apiBaseUrl.contains("?")) "&" else "?"
        return "$apiBaseUrl${separator}action=$action"
    }

    private fun chapterWithPageCount(record: JSONObject): JSONObject {
        val chapter = JSONObject(record.getJSONObject("chapter").toString())
        val pageCount = record.optInt("pageCount", chapter.optInt("pageCount", 0))
        val placeholders = JSONArray()
        for (i in 0 until pageCount) {
            placeholders.put("")
        }
        return chapter
            .put("pageCount", pageCount)
            .put("images", placeholders)
    }

    private fun normalizeBackendUrl(url: String, apiBaseUrl: String): String {
        val apiUrl = URL(apiBaseUrl)
        val targetUrl = URL(url)
        val targetHost = targetUrl.host.lowercase()

        if (targetHost != "localhost" && targetHost != "127.0.0.1") {
            return url
        }

        val port = if (apiUrl.port > 0) ":${apiUrl.port}" else ""
        val normalized = "${apiUrl.protocol}://${apiUrl.host}$port${targetUrl.file}"
        Log.d(TAG, "Normalized backend URL from $url to $normalized")
        return normalized
    }

    private fun chapterKey(comicId: String, chapterId: String) = "chapter:${safeName(comicId)}:${safeName(chapterId)}"

    private fun keyPrefix(comicId: String, chapterId: String, pageIndex: Int): String {
        return "page:${safeName(comicId)}:${safeName(chapterId)}:$pageIndex"
    }

    private fun safeName(value: String): String {
        return value.replace(Regex("[^A-Za-z0-9_.-]"), "_")
    }
}
