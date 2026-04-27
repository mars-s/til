import SwiftUI

struct ContentView: View {
    @EnvironmentObject var auth: AuthService
    @EnvironmentObject var taskService: TaskService
    @EnvironmentObject var calendarService: CalendarService

    var body: some View {
        Group {
            if auth.session != nil {
                TabView {
                    NavigationStack {
                        TasksView()
                    }
                    .tabItem {
                        Label("Tasks", systemImage: "list.bullet")
                    }

                    NavigationStack {
                        CalendarView()
                    }
                    .tabItem {
                        Label("Calendar", systemImage: "calendar")
                    }

                    NavigationStack {
                        SettingsView()
                    }
                    .tabItem {
                        Label("Settings", systemImage: "gearshape")
                    }
                }
                .tint(Color.amber)
            } else {
                LoginView()
            }
        }
        .task {
            await auth.restoreSession()
            if auth.session != nil {
                await taskService.handleSignedIn()
                await calendarService.handleSignedIn()
            }
        }
        .onChange(of: auth.session?.accessToken) { _, newValue in
            Task {
                if newValue == nil {
                    taskService.handleSignedOut()
                    calendarService.handleSignedOut()
                } else {
                    await taskService.handleSignedIn()
                    await calendarService.handleSignedIn()
                }
            }
        }
    }
}
