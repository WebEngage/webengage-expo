package expo.modules.webengageexpo

import android.content.Context
import expo.modules.core.interfaces.ApplicationLifecycleListener
import expo.modules.core.interfaces.Package
import expo.modules.kotlin.modules.Module

class WebEngageExpoPackage : Package {
  override fun createApplicationLifecycleListeners(context: Context): List<ApplicationLifecycleListener> {
    return listOf(WebEngageApplicationLifecycleListener())
  }

}