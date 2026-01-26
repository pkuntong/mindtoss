//
//  MindTossWidget.swift
//  MindTossWidget
//
//  Created by Pau Kuntong on 1/26/26.
//

import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Timeline Provider

struct MindTossProvider: TimelineProvider {
    func placeholder(in context: Context) -> MindTossEntry {
        MindTossEntry(date: Date(), tossCount: 0)
    }

    func getSnapshot(in context: Context, completion: @escaping (MindTossEntry) -> Void) {
        let entry = MindTossEntry(date: Date(), tossCount: getTodayTossCount())
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<MindTossEntry>) -> Void) {
        let entry = MindTossEntry(date: Date(), tossCount: getTodayTossCount())
        // Refresh every hour
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func getTodayTossCount() -> Int {
        let defaults = UserDefaults(suiteName: "group.com.mindtoss.app")
        return defaults?.integer(forKey: "dailyTossCount") ?? 0
    }
}

// MARK: - Timeline Entry

struct MindTossEntry: TimelineEntry {
    let date: Date
    let tossCount: Int
}

// MARK: - Widget Views

struct MindTossWidgetEntryView: View {
    var entry: MindTossProvider.Entry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .accessoryCircular:
            CircularWidgetView(entry: entry)
        case .accessoryRectangular:
            RectangularWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

// Small Widget - Single tap to open app
struct SmallWidgetView: View {
    var entry: MindTossEntry
    
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [Color(hex: "FF6B35"), Color(hex: "FF8C42")]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(spacing: 8) {
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 36))
                    .foregroundColor(.white)
                
                Text("MindToss")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                
                Text("\(entry.tossCount) today")
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(0.8))
            }
        }
        .widgetURL(URL(string: "mindtoss://open")!)
    }
}

// Medium Widget - Quick action buttons
struct MediumWidgetView: View {
    var entry: MindTossEntry
    
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [Color(hex: "FF6B35"), Color(hex: "FF8C42")]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            HStack(spacing: 16) {
                // App Info
                VStack(alignment: .leading, spacing: 4) {
                    Image(systemName: "brain.head.profile")
                        .font(.system(size: 28))
                        .foregroundColor(.white)
                    
                    Text("MindToss")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text("\(entry.tossCount) tosses today")
                        .font(.system(size: 11))
                        .foregroundColor(.white.opacity(0.8))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                
                // Quick Actions
                HStack(spacing: 12) {
                    Link(destination: URL(string: "mindtoss://toss/text")!) {
                        QuickActionButton(icon: "text.bubble.fill", label: "Text")
                    }
                    
                    Link(destination: URL(string: "mindtoss://toss/voice")!) {
                        QuickActionButton(icon: "mic.fill", label: "Voice")
                    }
                    
                    Link(destination: URL(string: "mindtoss://toss/photo")!) {
                        QuickActionButton(icon: "camera.fill", label: "Photo")
                    }
                }
            }
            .padding()
        }
    }
}

struct QuickActionButton: View {
    let icon: String
    let label: String
    
    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.25))
                    .frame(width: 44, height: 44)
                
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(.white)
            }
            
            Text(label)
                .font(.system(size: 10))
                .foregroundColor(.white.opacity(0.9))
        }
    }
}

// Lock Screen Widgets
struct CircularWidgetView: View {
    var entry: MindTossEntry
    
    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            
            VStack(spacing: 2) {
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 20))
                Text("\(entry.tossCount)")
                    .font(.system(size: 12, weight: .bold))
            }
        }
        .widgetURL(URL(string: "mindtoss://open")!)
    }
}

struct RectangularWidgetView: View {
    var entry: MindTossEntry
    
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "brain.head.profile")
                .font(.system(size: 24))
            
            VStack(alignment: .leading) {
                Text("MindToss")
                    .font(.system(size: 14, weight: .bold))
                Text("\(entry.tossCount) tosses today")
                    .font(.system(size: 11))
                    .opacity(0.8)
            }
        }
        .widgetURL(URL(string: "mindtoss://open")!)
    }
}

// MARK: - Widget Configuration

struct MindTossWidget: Widget {
    let kind: String = "MindTossWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MindTossProvider()) { entry in
            MindTossWidgetEntryView(entry: entry)
                .containerBackground(for: .widget) {
                    Color.clear
                }
        }
        .configurationDisplayName("MindToss")
        .description("Quick access to capture your thoughts.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Preview

#Preview(as: .systemSmall) {
    MindTossWidget()
} timeline: {
    MindTossEntry(date: .now, tossCount: 5)
}

#Preview(as: .systemMedium) {
    MindTossWidget()
} timeline: {
    MindTossEntry(date: .now, tossCount: 12)
}
