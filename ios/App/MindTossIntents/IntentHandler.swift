import Intents

class IntentHandler: INExtension {
    override func handler(for intent: INIntent) -> Any {
        // Handle different intent types
        if intent is INSendMessageIntent {
            return TossThoughtIntentHandler()
        }
        return self
    }
}

// Custom handler for tossing thoughts via Siri
class TossThoughtIntentHandler: NSObject, INSendMessageIntentHandling {

    func handle(intent: INSendMessageIntent, completion: @escaping (INSendMessageIntentResponse) -> Void) {
        // Get the message content
        guard let content = intent.content else {
            completion(INSendMessageIntentResponse(code: .failure, userActivity: nil))
            return
        }

        // Store the thought in shared UserDefaults for the main app to process
        let sharedDefaults = UserDefaults(suiteName: "group.com.mindtoss.app")
        sharedDefaults?.set(content, forKey: "pendingToss")
        sharedDefaults?.set(Date().timeIntervalSince1970, forKey: "pendingTossTimestamp")
        sharedDefaults?.synchronize()

        // Create user activity to open the app
        let userActivity = NSUserActivity(activityType: "com.mindtoss.app.toss")
        userActivity.title = "Toss Thought"
        userActivity.userInfo = ["content": content]

        // Return success
        let response = INSendMessageIntentResponse(code: .success, userActivity: userActivity)
        completion(response)
    }

    func resolveContent(for intent: INSendMessageIntent, with completion: @escaping (INStringResolutionResult) -> Void) {
        if let content = intent.content, !content.isEmpty {
            completion(.success(with: content))
        } else {
            completion(.needsValue())
        }
    }

    func resolveRecipients(for intent: INSendMessageIntent, with completion: @escaping ([INSendMessageRecipientResolutionResult]) -> Void) {
        // We don't need recipients - it goes to the user's configured email
        completion([.notRequired()])
    }
}
