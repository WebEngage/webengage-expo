import ExpoModulesCore
import WebEngage


public class WebEngageAppDelegate: ExpoAppDelegateSubscriber {
    
    var weBridge : WEGWebEngageBridge?
    
   public func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
       
       let autoRegister = Bundle.main.object(forInfoDictionaryKey: "WEGAutoRegister") as? Bool ?? true
        weBridge = WEGWebEngageBridge()
       
       WebEngage.sharedInstance().pushNotificationDelegate = self.weBridge!
        WebEngage.sharedInstance().application(UIApplication.shared,
                                                didFinishLaunchingWithOptions: launchOptions,
                                               notificationDelegate: self.weBridge!,
                                                autoRegister: autoRegister)
       if #available(iOS 10.0, *) {
         UNUserNotificationCenter.current().delegate = self as? UNUserNotificationCenterDelegate
       }
        return true 
    }
    
    public func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool{
        if let url = userActivity.webpageURL {
            WebEngage.sharedInstance().deeplinkManager.getAndTrackDeeplink(url, callbackBlock: { [self] location in
              //send location to react
                if self.weBridge == nil {
                  self.weBridge = WEGWebEngageBridge()
              }
                self.weBridge!.sendUniversalLinkLocation(location)
          })
        }
          
      return true
    }

    
}


extension WebEngageAppDelegate:UNUserNotificationCenterDelegate{
    
    
    // Function to display notifications when the app is in the foreground
    
    public func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        print("willPresent")
        WEGManualIntegration.userNotificationCenter(center, willPresent: notification)
        completionHandler([.alert, .sound, .badge])
    }
    
    // Function to handle notification taps
    
    public func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        print("didReceive")
        WEGManualIntegration.userNotificationCenter(center, didReceive: response)
        completionHandler()
    }
    

}
