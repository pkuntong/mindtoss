//
//  MindTossWidgetBundle.swift
//  MindTossWidget
//
//  Created by Pau Kuntong on 1/26/26.
//

import WidgetKit
import SwiftUI

@main
struct MindTossWidgetBundle: WidgetBundle {
    var body: some Widget {
        MindTossWidget()
        MindTossWidgetControl()
        MindTossWidgetLiveActivity()
    }
}
