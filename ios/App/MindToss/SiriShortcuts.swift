import Intents
import UIKit

class SiriShortcuts {

    static let shared = SiriShortcuts()

    // Activity types for Siri suggestions
    static let tossTextActivityType = "com.mindtoss.app.toss.text"
    static let tossVoiceActivityType = "com.mindtoss.app.toss.voice"
    static let tossPhotoActivityType = "com.mindtoss.app.toss.photo"

    // Donate shortcuts when user performs actions
    func donateTextToss() {
        let activity = NSUserActivity(activityType: SiriShortcuts.tossTextActivityType)
        activity.title = "Toss a Note"
        activity.suggestedInvocationPhrase = "Toss a thought"
        activity.isEligibleForSearch = true
        activity.isEligibleForPrediction = true
        activity.persistentIdentifier = NSUserActivityPersistentIdentifier(SiriShortcuts.tossTextActivityType)

        // Set user info
        activity.userInfo = ["mode": "text"]

        // Make current
        activity.becomeCurrent()
    }

    func donateVoiceToss() {
        let activity = NSUserActivity(activityType: SiriShortcuts.tossVoiceActivityType)
        activity.title = "Record a Voice Memo"
        activity.suggestedInvocationPhrase = "Record a voice memo"
        activity.isEligibleForSearch = true
        activity.isEligibleForPrediction = true
        activity.persistentIdentifier = NSUserActivityPersistentIdentifier(SiriShortcuts.tossVoiceActivityType)

        activity.userInfo = ["mode": "voice"]
        activity.becomeCurrent()
    }

    func donatePhotoToss() {
        let activity = NSUserActivity(activityType: SiriShortcuts.tossPhotoActivityType)
        activity.title = "Capture a Photo"
        activity.suggestedInvocationPhrase = "Capture a photo"
        activity.isEligibleForSearch = true
        activity.isEligibleForPrediction = true
        activity.persistentIdentifier = NSUserActivityPersistentIdentifier(SiriShortcuts.tossPhotoActivityType)

        activity.userInfo = ["mode": "photo"]
        activity.becomeCurrent()
    }

    // Request Siri permissions
    func requestSiriAuthorization(completion: @escaping (Bool) -> Void) {
        INPreferences.requestSiriAuthorization { status in
            DispatchQueue.main.async {
                completion(status == .authorized)
            }
        }
    }

    // Add a shortcut to Siri
    func addToSiri(for mode: String, completion: @escaping (Bool, Error?) -> Void) {
        let activityType: String
        let title: String
        let phrase: String

        switch mode {
        case "voice":
            activityType = SiriShortcuts.tossVoiceActivityType
            title = "Record Voice Memo"
            phrase = "Record a voice memo"
        case "photo":
            activityType = SiriShortcuts.tossPhotoActivityType
            title = "Capture Photo"
            phrase = "Capture a photo"
        default:
            activityType = SiriShortcuts.tossTextActivityType
            title = "Toss a Thought"
            phrase = "Toss a thought"
        }

        let activity = NSUserActivity(activityType: activityType)
        activity.title = title
        activity.suggestedInvocationPhrase = phrase
        activity.isEligibleForSearch = true
        activity.isEligibleForPrediction = true
        activity.persistentIdentifier = NSUserActivityPersistentIdentifier(activityType)
        activity.userInfo = ["mode": mode]

        // Create the shortcut
        let shortcut = INShortcut(userActivity: activity)

        // Present the add to Siri UI
        if let viewController = UIApplication.shared.windows.first?.rootViewController {
            let addVoiceShortcutVC = INUIAddVoiceShortcutViewController(shortcut: shortcut)
            addVoiceShortcutVC.delegate = AddVoiceShortcutDelegate.shared
            viewController.present(addVoiceShortcutVC, animated: true)
            completion(true, nil)
        } else {
            completion(false, nil)
        }
    }
}

// Delegate for Add Voice Shortcut
class AddVoiceShortcutDelegate: NSObject, INUIAddVoiceShortcutViewControllerDelegate {
    static let shared = AddVoiceShortcutDelegate()

    func addVoiceShortcutViewController(_ controller: INUIAddVoiceShortcutViewController, didFinishWith voiceShortcut: INVoiceShortcut?, error: Error?) {
        controller.dismiss(animated: true)
    }

    func addVoiceShortcutViewControllerDidCancel(_ controller: INUIAddVoiceShortcutViewController) {
        controller.dismiss(animated: true)
    }
}

// Import for INUIAddVoiceShortcutViewController
import IntentsUI
