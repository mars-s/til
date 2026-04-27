import Foundation
import Supabase
import AuthenticationServices

@MainActor
class AuthService: NSObject, ObservableObject, ASWebAuthenticationPresentationContextProviding {
    @Published var session: Session?
    @Published var isLoading = false
    @Published var errorMessage: String?
    private var authSession: ASWebAuthenticationSession?

    private var client: SupabaseClient { SupabaseManager.shared.client }

    func restoreSession() async {
        do {
            session = try await client.auth.session
        } catch {
            session = nil
        }
    }

    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        do {
            _ = try await client.auth.signIn(email: email, password: password)
            session = try await client.auth.session
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func signInWithGoogle() async {
        isLoading = true
        errorMessage = nil
        do {
            let url = try await client.auth.getOAuthSignInURL(provider: .google, redirectTo: URL(string: "tilapp://oauth-callback"))
            authSession = ASWebAuthenticationSession(url: url, callbackURLScheme: "tilapp") { [weak self] callbackURL, error in
                guard let self = self else { return }
                Task { @MainActor in
                    if let error = error {
                        self.errorMessage = error.localizedDescription
                        self.isLoading = false
                        return
                    }
                    guard let callbackURL = callbackURL else {
                        self.errorMessage = "No callback URL"
                        self.isLoading = false
                        return
                    }
                    await self.handleOAuthCallback(url: callbackURL)
                }
            }
            authSession?.presentationContextProvider = self
            authSession?.start()
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }

    func handleOAuthCallback(url: URL) async {
        do {
            try await client.auth.session(from: url)
        } catch {
            // Ignore error, try to get session
        }
        do {
            session = try await client.auth.session
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func signInWithMagicLink(email: String) async {
        isLoading = true
        errorMessage = nil
        do {
            _ = try await client.auth.signInWithOTP(email: email)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func signOut() async {
        do {
            try await client.auth.signOut()
            session = nil
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        ASPresentationAnchor()
    }
}
