import UIKit
import Capacitor

class MindTossBridgeViewController: CAPBridgeViewController {
    
    override open func capacitorDidLoad() {
        // Register custom plugins after the bridge has loaded
        bridge?.registerPluginInstance(AppleSignInPlugin())
    }
}
