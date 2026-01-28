//
//  ShareViewController.swift
//  MindTossShare
//
//  Created by Pau Kuntong on 1/26/26.
//

import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
    
    private var sharedText: String?
    private var sharedURL: URL?
    private var sharedImage: UIImage?
    
    // UI Elements
    private let containerView = UIView()
    private let headerView = UIView()
    private let contentTextView = UITextView()
    private let cancelButton = UIButton(type: .system)
    private let tossButton = UIButton(type: .system)
    private let loadingIndicator = UIActivityIndicatorView(style: .medium)
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        extractSharedContent()
    }
    
    // MARK: - UI Setup
    
    private func setupUI() {
        view.backgroundColor = UIColor.black.withAlphaComponent(0.4)
        
        // Container
        containerView.backgroundColor = .systemBackground
        containerView.layer.cornerRadius = 16
        containerView.clipsToBounds = true
        containerView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(containerView)
        
        // Header
        headerView.backgroundColor = UIColor(red: 1.0, green: 0.42, blue: 0.21, alpha: 1.0) // #FF6B35
        headerView.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(headerView)
        
        // Header Title
        let titleLabel = UILabel()
        titleLabel.text = "Toss to MindToss"
        titleLabel.font = .systemFont(ofSize: 17, weight: .semibold)
        titleLabel.textColor = .white
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(titleLabel)
        
        // Cancel Button
        cancelButton.setTitle("Cancel", for: .normal)
        cancelButton.setTitleColor(.white, for: .normal)
        cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        cancelButton.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(cancelButton)
        
        // Toss Button
        tossButton.setTitle("Toss", for: .normal)
        tossButton.setTitleColor(.white, for: .normal)
        tossButton.titleLabel?.font = .systemFont(ofSize: 17, weight: .bold)
        tossButton.addTarget(self, action: #selector(tossTapped), for: .touchUpInside)
        tossButton.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(tossButton)
        
        // Content TextView
        contentTextView.font = .systemFont(ofSize: 16)
        contentTextView.textColor = .label
        contentTextView.backgroundColor = .secondarySystemBackground
        contentTextView.layer.cornerRadius = 8
        contentTextView.textContainerInset = UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12)
        contentTextView.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(contentTextView)
        
        // Loading Indicator
        loadingIndicator.hidesWhenStopped = true
        loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
        headerView.addSubview(loadingIndicator)
        
        // Constraints
        NSLayoutConstraint.activate([
            containerView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            containerView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            containerView.widthAnchor.constraint(equalTo: view.widthAnchor, multiplier: 0.9),
            containerView.heightAnchor.constraint(equalToConstant: 300),
            
            headerView.topAnchor.constraint(equalTo: containerView.topAnchor),
            headerView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            headerView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            headerView.heightAnchor.constraint(equalToConstant: 56),
            
            cancelButton.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 16),
            cancelButton.centerYAnchor.constraint(equalTo: headerView.centerYAnchor),
            
            titleLabel.centerXAnchor.constraint(equalTo: headerView.centerXAnchor),
            titleLabel.centerYAnchor.constraint(equalTo: headerView.centerYAnchor),
            
            tossButton.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -16),
            tossButton.centerYAnchor.constraint(equalTo: headerView.centerYAnchor),
            
            loadingIndicator.centerXAnchor.constraint(equalTo: tossButton.centerXAnchor),
            loadingIndicator.centerYAnchor.constraint(equalTo: tossButton.centerYAnchor),
            
            contentTextView.topAnchor.constraint(equalTo: headerView.bottomAnchor, constant: 16),
            contentTextView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 16),
            contentTextView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -16),
            contentTextView.bottomAnchor.constraint(equalTo: containerView.bottomAnchor, constant: -16)
        ])
        
        // Add tap gesture to dismiss keyboard
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        tapGesture.cancelsTouchesInView = false
        view.addGestureRecognizer(tapGesture)
    }
    
    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
    
    // MARK: - Content Extraction
    
    private func extractSharedContent() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachments = extensionItem.attachments else {
            return
        }
        
        for attachment in attachments {
            // Handle text
            if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] (item, error) in
                    if let text = item as? String {
                        DispatchQueue.main.async {
                            self?.sharedText = text
                            self?.updateContentView()
                        }
                    }
                }
            }
            // Handle URL
            else if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] (item, error) in
                    if let url = item as? URL {
                        DispatchQueue.main.async {
                            self?.sharedURL = url
                            self?.updateContentView()
                        }
                    }
                }
            }
            // Handle Image
            else if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { [weak self] (item, error) in
                    var image: UIImage?
                    
                    if let url = item as? URL {
                        image = UIImage(contentsOfFile: url.path)
                    } else if let data = item as? Data {
                        image = UIImage(data: data)
                    } else if let img = item as? UIImage {
                        image = img
                    }
                    
                    if let image = image {
                        DispatchQueue.main.async {
                            self?.sharedImage = image
                            self?.updateContentView()
                        }
                    }
                }
            }
        }
    }
    
    private func updateContentView() {
        var content = ""
        
        if let text = sharedText {
            content += text
        }
        
        if let url = sharedURL {
            if !content.isEmpty { content += "\n\n" }
            content += url.absoluteString
        }
        
        if sharedImage != nil {
            if !content.isEmpty { content += "\n\n" }
            content += "[Image attached]"
        }
        
        contentTextView.text = content
    }
    
    // MARK: - Actions
    
    @objc private func cancelTapped() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
    
    @objc private func tossTapped() {
        // Show loading state
        tossButton.isHidden = true
        loadingIndicator.startAnimating()
        
        // Save to shared UserDefaults for the main app to pick up
        saveTossToSharedStorage()
        
        // Open the main app with the toss content
        openMainApp()
    }
    
    private func saveTossToSharedStorage() {
        guard let defaults = UserDefaults(suiteName: "group.com.mindtoss.app") else { return }
        
        var tossData: [String: Any] = [
            "timestamp": Date().timeIntervalSince1970,
            "source": "share_extension"
        ]
        
        // Add text content
        if let text = contentTextView.text, !text.isEmpty {
            tossData["text"] = text.replacingOccurrences(of: "[Image attached]", with: "").trimmingCharacters(in: .whitespacesAndNewlines)
        }
        
        // Add URL
        if let url = sharedURL {
            tossData["url"] = url.absoluteString
        }
        
        // Add image (save to shared container and store path)
        if let image = sharedImage,
           let imageData = image.jpegData(compressionQuality: 0.8) {
            let filename = "shared_image_\(Date().timeIntervalSince1970).jpg"
            if let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.mindtoss.app") {
                let imageURL = containerURL.appendingPathComponent(filename)
                try? imageData.write(to: imageURL)
                tossData["imagePath"] = imageURL.path
            }
        }
        
        defaults.set(tossData, forKey: "pendingSharedToss")
        defaults.synchronize()
    }
    
    private func openMainApp() {
        // Create a URL that the main app can handle
        let urlString = "mindtoss://share"
        guard let url = URL(string: urlString) else {
            completeExtension()
            return
        }
        
        // Use extension context to open the main app
        // This is the proper way to open URLs from app extensions
        extensionContext?.open(url, completionHandler: { [weak self] success in
            // Complete the extension after opening the app
            self?.completeExtension()
        })
    }
    
    private func completeExtension() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        }
    }
}
