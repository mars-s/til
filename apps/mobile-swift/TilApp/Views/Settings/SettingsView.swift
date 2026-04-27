import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var auth: AuthService
    @EnvironmentObject var taskService: TaskService
    @EnvironmentObject var calendarService: CalendarService

    var body: some View {
        ZStack {
            Color.ink.ignoresSafeArea()
            List {
                Section {
                    if let session = auth.session {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Signed in as")
                                .foregroundStyle(Color.text2)
                            Text(session.user.email ?? "unknown")
                                .font(.system(size: 13, design: .monospaced))
                                .foregroundStyle(Color.text3)
                        }
                        .listRowBackground(Color.ink2)
                    }

                    Button(role: .destructive) {
                        let workItem = DispatchWorkItem {
                            _Concurrency.Task {
                                await auth.signOut()
                            }
                        }
                        DispatchQueue.main.async(execute: workItem)
                    } label: {
                        Text("Sign Out")
                            .foregroundStyle(Color.rose)
                    }
                    .listRowBackground(Color.ink2)
                }

                Section("Sync") {
                    syncRow(title: "Tasks", value: "\(taskService.tasks.count) live")
                    syncRow(title: "Calendars", value: "\(calendarService.calendars.count)")
                    syncRow(title: "Events", value: "\(calendarService.events.count)")
                    if let error = taskService.errorMessage ?? calendarService.errorMessage {
                        Text(error)
                            .font(.system(size: 12))
                            .foregroundStyle(Color.rose)
                            .listRowBackground(Color.ink2)
                    }
                }

                Section("About") {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Version")
                            .foregroundStyle(Color.text2)
                        Text("1.0")
                            .font(.system(size: 13, design: .monospaced))
                            .foregroundStyle(Color.text3)
                    }
                    .listRowBackground(Color.ink2)
                }
            }
            .scrollContentBackground(.hidden)
            .foregroundStyle(Color.text1)
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.large)
    }

    private func syncRow(title: String, value: String) -> some View {
        HStack {
            Text(title)
                .foregroundStyle(Color.text2)
            Spacer()
            Text(value)
                .font(.system(size: 13, design: .monospaced))
                .foregroundStyle(Color.text3)
        }
        .listRowBackground(Color.ink2)
    }
}
