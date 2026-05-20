package com.example.drmreader

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceError
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    companion object {
        private const val TAG = "DRMMainActivity"
    }

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            window.setFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE
            )

            webView = WebView(this)
            setContentView(webView)

            WebView.setWebContentsDebuggingEnabled(false)

            val appUrl = appUrl()
            val apiBaseUrl = apiBaseUrl()

            webView.settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = false
                allowFileAccess = appUrl.startsWith("file:///android_asset/")
                allowFileAccessFromFileURLs = appUrl.startsWith("file:///android_asset/")
                allowUniversalAccessFromFileURLs = appUrl.startsWith("file:///android_asset/")
                allowContentAccess = false
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                userAgentString = "DRMReader/1.0"
            }

            val trustedHost = android.net.Uri.parse(appUrl).host
            Log.i(TAG, "Loading React WebView URL: $appUrl")
            Log.i(TAG, "Using API base URL: $apiBaseUrl")

            webView.webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest
                ): Boolean {
                    val isTrustedAsset = request.url.toString().startsWith("file:///android_asset/")
                    val blocked = !isTrustedAsset && request.url.host != trustedHost
                    if (blocked) {
                        Log.w(TAG, "Blocked navigation to untrusted host: ${request.url}")
                    }
                    return blocked
                }

                override fun onReceivedError(
                    view: WebView,
                    request: WebResourceRequest,
                    error: WebResourceError
                ) {
                    Log.e(TAG, "WebView load error url=${request.url} code=${error.errorCode} desc=${error.description}")
                }
            }

            webView.addJavascriptInterface(AndroidDRMBridge(applicationContext, apiBaseUrl), "AndroidDRM")
            webView.loadUrl(appUrl)
        } catch (error: Throwable) {
            Log.e(TAG, "MainActivity startup failed", error)
            showFatalError(error)
        }
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
            return
        }
        super.onBackPressed()
    }

    private fun appUrl(): String {
        val info = packageManager.getActivityInfo(componentName, android.content.pm.PackageManager.GET_META_DATA)
        return info.metaData?.getString("react_app_url") ?: "http://10.0.2.2/model_aplikasi/"
    }

    private fun apiBaseUrl(): String {
        val info = packageManager.getActivityInfo(componentName, android.content.pm.PackageManager.GET_META_DATA)
        return info.metaData?.getString("api_base_url") ?: "http://10.0.2.2/manga_api/api.php"
    }

    private fun showFatalError(error: Throwable) {
        val message = error.message ?: error::class.java.simpleName
        val view = TextView(this).apply {
            setBackgroundColor(Color.rgb(20, 20, 20))
            setTextColor(Color.WHITE)
            textSize = 14f
            setPadding(32, 32, 32, 32)
            text = "DRM Reader failed to start.\n\n$message\n\nOpen Logcat and filter tag: $TAG"
        }
        setContentView(view)
    }
}
