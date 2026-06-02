import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    // NOTE: `var window` removed — under UIScene the window is owned by
    // SceneDelegate, not AppDelegate. Keeping both fights for ownership
    // and shows up as a "duplicate window" warning at launch.

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    // MARK: - UISceneSession lifecycle (iOS 13+)

    // Called when a new scene session is being created. Returning a
    // UISceneConfiguration whose name matches an entry in Info.plist's
    // UIApplicationSceneManifest tells UIKit which delegate class
    // (SceneDelegate) and which storyboard (Main) to use for the
    // scene. Without this Apple's UIScene assertion fires.
    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration",
                                    sessionRole: connectingSceneSession.role)
    }

    func application(_ application: UIApplication,
                     didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
        // Called when the user drops a scene from the app switcher.
        // Nothing scene-specific to clean up for this app.
    }

    // MARK: - Legacy app lifecycle hooks
    //
    // iOS still calls these on the app delegate (separately from the
    // scene's didEnterBackground / willEnterForeground). The Capacitor
    // bridge listens on the AppDelegate hooks for plugin state, so we
    // keep them present but empty.

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    // MARK: - URL + Universal Link routing (back-compat path)
    //
    // Under iOS 13+ with UIScene, the same events ALSO arrive through
    // SceneDelegate.scene(_:openURLContexts:) / scene(_:continue:),
    // which is what we route through there. These app-delegate
    // versions stay in place so older iOS hosts and Capacitor's plugin
    // proxy keep working as before.

    func application(_ app: UIApplication,
                     open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication,
                     continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application,
                                                           continue: userActivity,
                                                           restorationHandler: restorationHandler)
    }
}
