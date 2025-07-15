package expo.modules.webengageexpo

import android.app.Application
import android.content.pm.PackageManager
import expo.modules.core.interfaces.ApplicationLifecycleListener
import com.webengage.sdk.android.WebEngageActivityLifeCycleCallbacks
import com.webengage.sdk.android.WebEngageConfig

class WebEngageApplicationLifecycleListener : ApplicationLifecycleListener {
  override fun onCreate(application: Application) {
    val isExpoEnabled = isExpoEnabled(application)

    if (isExpoEnabled) {
      val webEngageConfig = WebEngageConfig.Builder()
        .build()

      application.registerActivityLifecycleCallbacks(
        WebEngageActivityLifeCycleCallbacks(
          application,
          webEngageConfig
        )
      )
    }
  }

  private fun isExpoEnabled(application: Application): Boolean {
    return try {
      val appInfo = application.packageManager
        .getApplicationInfo(application.packageName, PackageManager.GET_META_DATA)
      val metaData = appInfo.metaData
      metaData?.getBoolean("com.webengage.expo_enabled", false) ?: false
    } catch (e: Exception) {
      e.printStackTrace()
      false
    }
  }
}
