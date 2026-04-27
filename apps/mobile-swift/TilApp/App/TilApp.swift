import SwiftUI
import Supabase

@main
struct TilApp: App {
    @StateObject private var auth = AuthService()
    @StateObject private var taskService = TaskService()
    @StateObject private var calendarService = CalendarService()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(auth)
                .environmentObject(taskService)
                .environmentObject(calendarService)
                .preferredColorScheme(.dark)
                .onOpenURL { url in
                    Task {
                        await auth.handleOAuthCallback(url: url)
                    }
                }
        }
    }
}
