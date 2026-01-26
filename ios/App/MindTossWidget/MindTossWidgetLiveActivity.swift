//
//  MindTossWidgetLiveActivity.swift
//  MindTossWidget
//
//  Created by Pau Kuntong on 1/26/26.
//

import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Live Activity Attributes

struct MindTossWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic state
        var tossContent: String
        var tossType: String  // "text", "voice", "photo"
        var progress: Double  // 0.0 to 1.0 for upload progress
        var status: String    // "uploading", "processing", "complete", "failed"
    }

    // Static properties
    var tossId: String
    var startTime: Date
}

// MARK: - Live Activity Widget

struct MindTossWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MindTossWidgetAttributes.self) { context in
            // Lock screen / banner UI
            LockScreenLiveActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    HStack {
                        Image(systemName: iconForType(context.state.tossType))
                            .foregroundColor(Color(hex: "FF6B35"))
                        Text("Tossing...")
                            .font(.caption)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(Int(context.state.progress * 100))%")
                        .font(.caption.bold())
                        .foregroundColor(Color(hex: "FF6B35"))
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.tossContent)
                        .font(.caption)
                        .lineLimit(2)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ProgressView(value: context.state.progress)
                        .tint(Color(hex: "FF6B35"))
                }
            } compactLeading: {
                Image(systemName: "brain.head.profile")
                    .foregroundColor(Color(hex: "FF6B35"))
            } compactTrailing: {
                Text("\(Int(context.state.progress * 100))%")
                    .font(.caption2)
            } minimal: {
                Image(systemName: "brain.head.profile")
                    .foregroundColor(Color(hex: "FF6B35"))
            }
        }
    }
    
    private func iconForType(_ type: String) -> String {
        switch type {
        case "voice": return "mic.fill"
        case "photo": return "camera.fill"
        default: return "text.bubble.fill"
        }
    }
}

// MARK: - Lock Screen View

struct LockScreenLiveActivityView: View {
    let context: ActivityViewContext<MindTossWidgetAttributes>
    
    var body: some View {
        HStack(spacing: 16) {
            // Icon
            ZStack {
                Circle()
                    .fill(Color(hex: "FF6B35").opacity(0.2))
                    .frame(width: 48, height: 48)
                
                Image(systemName: iconForType(context.state.tossType))
                    .font(.system(size: 20))
                    .foregroundColor(Color(hex: "FF6B35"))
            }
            
            // Content
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("MindToss")
                        .font(.headline)
                    
                    Spacer()
                    
                    Text(statusText)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Text(context.state.tossContent)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
                
                ProgressView(value: context.state.progress)
                    .tint(Color(hex: "FF6B35"))
            }
        }
        .padding()
    }
    
    private var statusText: String {
        switch context.state.status {
        case "uploading": return "Uploading..."
        case "processing": return "Processing..."
        case "complete": return "Done!"
        case "failed": return "Failed"
        default: return ""
        }
    }
    
    private func iconForType(_ type: String) -> String {
        switch type {
        case "voice": return "mic.fill"
        case "photo": return "camera.fill"
        default: return "text.bubble.fill"
        }
    }
}

#Preview("Notification", as: .content, using: MindTossWidgetAttributes(tossId: "123", startTime: .now)) {
    MindTossWidgetLiveActivity()
} contentStates: {
    MindTossWidgetAttributes.ContentState(
        tossContent: "Remember to call mom about dinner",
        tossType: "text",
        progress: 0.65,
        status: "uploading"
    )
}
