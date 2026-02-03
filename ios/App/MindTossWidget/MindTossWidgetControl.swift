//
//  MindTossWidgetControl.swift
//  MindTossWidget
//
//  Created by Pau Kuntong on 1/26/26.
//

import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Control Center Widget

@available(iOS 18.0, *)
struct MindTossWidgetControl: ControlWidget {
    static let kind: String = "com.mindtoss.app.MindTossWidgetControl"

    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: Self.kind) {
            ControlWidgetButton(action: OpenMindTossIntent()) {
                Label("MindToss", systemImage: "brain.head.profile")
            }
        }
        .displayName("Quick Toss")
        .description("Quickly open MindToss to capture a thought.")
    }
}

// MARK: - Control Intent

@available(iOS 18.0, *)
struct OpenMindTossIntent: ControlConfigurationIntent {
    static let title: LocalizedStringResource = "Open MindToss"
    static let description: IntentDescription = "Opens MindToss app"
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult & OpensIntent {
        return .result()
    }
}
