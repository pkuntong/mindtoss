import Foundation
import Capacitor
import AuthenticationServices

@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]
    
    private var savedCall: CAPPluginCall?
    
    @objc public func authorize(_ call: CAPPluginCall) {
        self.savedCall = call
        
        let appleIDProvider = ASAuthorizationAppleIDProvider()
        let request = appleIDProvider.createRequest()
        request.requestedScopes = [.fullName, .email]
        
        // Set nonce if provided
        if let nonce = call.getString("nonce") {
            request.nonce = nonce
        }
        
        // Set state if provided
        if let state = call.getString("state") {
            request.state = state
        }
        
        let authorizationController = ASAuthorizationController(authorizationRequests: [request])
        authorizationController.delegate = self
        authorizationController.presentationContextProvider = self
        
        DispatchQueue.main.async {
            authorizationController.performRequests()
        }
    }
    
    // MARK: - ASAuthorizationControllerDelegate
    
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = self.savedCall else { return }
        
        if let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential {
            let userIdentifier = appleIDCredential.user
            let fullName = appleIDCredential.fullName
            let email = appleIDCredential.email
            
            var identityToken: String? = nil
            if let identityTokenData = appleIDCredential.identityToken {
                identityToken = String(data: identityTokenData, encoding: .utf8)
            }
            
            var authorizationCode: String? = nil
            if let authCodeData = appleIDCredential.authorizationCode {
                authorizationCode = String(data: authCodeData, encoding: .utf8)
            }
            
            var givenName: String? = nil
            var familyName: String? = nil
            if let name = fullName {
                givenName = name.givenName
                familyName = name.familyName
            }
            
            call.resolve([
                "response": [
                    "user": userIdentifier,
                    "email": email as Any,
                    "givenName": givenName as Any,
                    "familyName": familyName as Any,
                    "identityToken": identityToken as Any,
                    "authorizationCode": authorizationCode as Any,
                    "state": appleIDCredential.state as Any
                ]
            ])
        } else {
            call.reject("Unknown credential type")
        }
        
        self.savedCall = nil
    }
    
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = self.savedCall else { return }
        
        let authError = error as? ASAuthorizationError
        
        switch authError?.code {
        case .canceled:
            call.reject("User canceled authorization", "USER_CANCELED")
        case .failed:
            call.reject("Authorization failed", "FAILED")
        case .invalidResponse:
            call.reject("Invalid response from Apple", "INVALID_RESPONSE")
        case .notHandled:
            call.reject("Authorization not handled", "NOT_HANDLED")
        case .unknown:
            call.reject("Unknown error occurred", "UNKNOWN")
        default:
            call.reject(error.localizedDescription, "ERROR")
        }
        
        self.savedCall = nil
    }
    
    // MARK: - ASAuthorizationControllerPresentationContextProviding
    
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.bridge?.webView?.window ?? UIWindow()
    }
}
