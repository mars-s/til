import Foundation
import Supabase

@MainActor
class SupabaseManager: ObservableObject {
    static let shared = SupabaseManager()

    let client: SupabaseClient

    private init() {
        let options = SupabaseClientOptions(
            auth: SupabaseClientOptions.AuthOptions(
                redirectToURL: URL(string: "tilapp://oauth-callback"),
                flowType: .implicit
            )
        )
        client = SupabaseClient(
            supabaseURL: AppConfig.supabaseURL,
            supabaseKey: AppConfig.supabaseAnonKey,
            options: options
        )
    }
}
