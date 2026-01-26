//
//  AppIntent.swift
//  MindTossWidget
//
//  Created by Pau Kuntong on 1/26/26.
//

import WidgetKit
import AppIntents

// MARK: - Quick Toss Intents

struct TossTextIntent: AppIntent {
    static var title: LocalizedStringResource = "Toss Text"
    static var description: IntentDescription = "Open MindToss to capture a text note"
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult & OpensIntent {
        return .result()
    }
}

struct TossVoiceIntent: AppIntent {
    static var title: LocalizedStringResource = "Toss Voice"
    static var description: IntentDescription = "Open MindToss to record a voice memo"
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult & OpensIntent {
        return .result()
    }
}

struct TossPhotoIntent: AppIntent {
    static var title: LocalizedStringResource = "Toss Photo"
    static var description: IntentDescription = "Open MindToss to capture a photo"
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult & OpensIntent {
        return .result()
    }
}

// MARK: - Shortcuts Provider

struct MindTossShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: TossTextIntent(),
            phrases: [
                "Toss a thought in \(.applicationName)",
                "Quick note in \(.applicationName)",
                "Capture a thought with \(.applicationName)"
            ],
            shortTitle: "Toss Text",
            systemImageName: "text.bubble.fill"
        )
        
        AppShortcut(
            intent: TossVoiceIntent(),
            phrases: [
                "Record a voice memo in \(.applicationName)",
                "Voice toss in \(.applicationName)"
            ],
            shortTitle: "Toss Voice",
            systemImageName: "mic.fill"
        )
        
        AppShortcut(
            intent: TossPhotoIntent(),
            phrases: [
                "Capture a photo in \(.applicationName)",
                "Photo toss in \(.applicationName)"
            ],
            shortTitle: "Toss Photo",
            systemImageName: "camera.fill"
        )
    }
}
