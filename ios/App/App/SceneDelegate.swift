import UIKit
import Capacitor

// =====================================================================
//  SceneDelegate — UIScene lifecycle adapter for the Capacitor host.
//
//  iOS 13 introduced the UIScene API. iOS 26+ ships a warning that the
//  old "AppDelegate owns the window" model will start asserting in a
//  future release. Adopting UIScene now means the app keeps booting on
//  whichever iOS version flips the switch.
//
//  How this composes with the existing storyboard:
//   • Info.plist's UIApplicationSceneManifest names this class as the
//     delegate and points at Main.storyboard.
//   • The system instantiates Main.storyboard's initial VC and assigns
//     it to `window.rootViewController` for us — we don't build the
//     window manually.
//   • All we own here is forwarding launch-time URL contexts and
//     NSUserActivity events to Capacitor's ApplicationDelegateProxy
//     (the same proxy AppDelegate used to invoke directly). Without
//     this hop, Universal Links / custom URL schemes would silently
//     drop on cold launch via a scene.
//
//  AppDelegate still implements `application(_:configurationForConnecting:options:)`
//  to return a UISceneConfiguration with this class's name — that's
//  what tells UIKit to instantiate us.
// =====================================================================
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene,
               willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        // The window + root VC come from Main.storyboard via the
        // UISceneStoryboardFile key in Info.plist, so we don't construct
        // them here. We only need to deliver any launch-time deep links
        // that the OS handed us in `connectionOptions`.
        //
        // `_ =` on each forward — the proxy returns `Bool` (did anyone
        // handle this URL/activity?) but Capacitor already does its own
        // internal routing + plugin notification; we don't act on the
        // return value, and ignoring it without the underscore prefix
        // is an "unused result" warning in Swift 5.
        for context in connectionOptions.urlContexts {
            _ = ApplicationDelegateProxy.shared.application(
                UIApplication.shared,
                open: context.url,
                options: [:])
        }
        if let userActivity = connectionOptions.userActivities.first {
            _ = ApplicationDelegateProxy.shared.application(
                UIApplication.shared,
                continue: userActivity,
                restorationHandler: { _ in })
        }
    }

    func scene(_ scene: UIScene,
               openURLContexts URLContexts: Set<UIOpenURLContext>) {
        // Fired when the app is already running and a deep link arrives
        // (e.g. user tapped the captive-portal QR URL while the app was
        // backgrounded). Hand it to Capacitor.
        guard let url = URLContexts.first?.url else { return }
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            open: url,
            options: [:])
    }

    func scene(_ scene: UIScene,
               continue userActivity: NSUserActivity) {
        // Universal Links land here while the app is foregrounded.
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            continue: userActivity,
            restorationHandler: { _ in })
    }
}
