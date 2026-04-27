import Foundation
import Supabase

private struct TaskInsertPayload: Encodable {
    let title: String
    let status: TaskStatus
    let priority: TaskPriority
    let scheduledAt: Date?
    let deadlineAt: Date?
    let durationMinutes: Int?
    let tags: [String]
    let description: String?
    let subtasks: [TaskSubtask]
    let userId: String

    enum CodingKeys: String, CodingKey {
        case title
        case status
        case priority
        case scheduledAt = "scheduled_at"
        case deadlineAt = "deadline_at"
        case durationMinutes = "duration_minutes"
        case tags
        case description
        case subtasks
        case userId = "user_id"
    }
}

private struct TaskUpdatePayload: Encodable {
    let title: String?
    let status: TaskStatus?
    let priority: TaskPriority?
    let scheduledAt: Date?
    let deadlineAt: Date?
    let durationMinutes: Int?
    let tags: [String]?
    let description: String?
    let subtasks: [TaskSubtask]?

    enum CodingKeys: String, CodingKey {
        case title
        case status
        case priority
        case scheduledAt = "scheduled_at"
        case deadlineAt = "deadline_at"
        case durationMinutes = "duration_minutes"
        case tags
        case description
        case subtasks
    }
}

@MainActor
final class TaskService: ObservableObject {
    @Published private(set) var tasks: [TilTask] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private var client: SupabaseClient { SupabaseManager.shared.client }
    private var realtimeTask: Task<Void, Never>?
    private var realtimeChannel: RealtimeChannelV2?

    deinit {
        realtimeTask?.cancel()
    }

    func handleSignedIn() async {
        await fetchTasks()
        await startRealtime()
    }

    func handleSignedOut() {
        realtimeTask?.cancel()
        realtimeTask = nil
        if let realtimeChannel {
            Task { await client.removeChannel(realtimeChannel) }
        }
        realtimeChannel = nil
        tasks = []
        errorMessage = nil
        isLoading = false
    }

    func fetchTasks() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let session = try await client.auth.session
            let fetched: [TilTask] = try await client
                .from("tasks")
                .select()
                .eq("user_id", value: session.user.id.uuidString)
                .order("created_at", ascending: false)
                .execute()
                .value
            tasks = sortTasks(fetched)
        } catch {
            errorMessage = error.localizedDescription
            print("TaskService.fetchTasks error: \(error)")
        }
    }

    func addTask(_ parsed: ParsedTask) async {
        do {
            let session = try await client.auth.session
            let payload = TaskInsertPayload(
                title: parsed.title,
                status: .todo,
                priority: parsed.priority,
                scheduledAt: parsed.scheduledAt,
                deadlineAt: parsed.deadlineAt,
                durationMinutes: parsed.durationMinutes,
                tags: parsed.tags,
                description: nil,
                subtasks: [],
                userId: session.user.id.uuidString
            )

            let inserted: TilTask = try await client
                .from("tasks")
                .insert(payload)
                .select()
                .single()
                .execute()
                .value

            upsertTask(inserted)
        } catch {
            errorMessage = error.localizedDescription
            print("TaskService.addTask error: \(error)")
        }
    }

    func updateTask(
        _ task: TilTask,
        title: String? = nil,
        status: TaskStatus? = nil,
        priority: TaskPriority? = nil,
        scheduledAt: Date? = nil,
        deadlineAt: Date? = nil,
        durationMinutes: Int? = nil,
        tags: [String]? = nil,
        description: String? = nil,
        subtasks: [TaskSubtask]? = nil
    ) async {
        do {
            let payload = TaskUpdatePayload(
                title: title,
                status: status,
                priority: priority,
                scheduledAt: scheduledAt,
                deadlineAt: deadlineAt,
                durationMinutes: durationMinutes,
                tags: tags,
                description: description,
                subtasks: subtasks
            )

            let updated: TilTask = try await client
                .from("tasks")
                .update(payload)
                .eq("id", value: task.id)
                .select()
                .single()
                .execute()
                .value

            upsertTask(updated)

            for tag in tags ?? [] {
                await ensureTagExists(tag)
            }
        } catch {
            errorMessage = error.localizedDescription
            print("TaskService.updateTask error: \(error)")
        }
    }

    func toggleTask(_ task: TilTask) async {
        let nextStatus: TaskStatus = switch task.status {
        case .todo: .inProgress
        case .inProgress: .done
        case .done: .todo
        }
        await updateTask(task, status: nextStatus)
    }

    func deleteTask(_ task: TilTask) async {
        do {
            try await client
                .from("tasks")
                .delete()
                .eq("id", value: task.id)
                .execute()
            tasks.removeAll { $0.id == task.id }
        } catch {
            errorMessage = error.localizedDescription
            print("TaskService.deleteTask error: \(error)")
        }
    }

    func startTask(_ task: TilTask) async {
        await updateTask(task, status: .inProgress)
    }

    func completeTask(_ task: TilTask) async {
        await updateTask(task, status: .done)
    }

    func setDate(_ task: TilTask, date: Date?) async {
        await updateTask(task, scheduledAt: date)
    }

    private func ensureTagExists(_ name: String) async {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        struct TagPayload: Encodable {
            let userId: String
            let name: String

            enum CodingKeys: String, CodingKey {
                case userId = "user_id"
                case name
            }
        }

        do {
            let session = try await client.auth.session
            try await client
                .from("user_tags")
                .upsert(
                    TagPayload(userId: session.user.id.uuidString, name: trimmed),
                    onConflict: "user_id,name"
                )
                .execute()
        } catch {
            print("TaskService.ensureTagExists error: \(error)")
        }
    }

    private func upsertTask(_ task: TilTask) {
        if let index = tasks.firstIndex(where: { $0.id == task.id }) {
            tasks[index] = task
        } else {
            tasks.append(task)
        }
        tasks = sortTasks(tasks)
    }

    private func sortTasks(_ items: [TilTask]) -> [TilTask] {
        items.sorted {
            if $0.status == .done, $1.status != .done { return false }
            if $0.status != .done, $1.status == .done { return true }
            return $0.createdAt > $1.createdAt
        }
    }

    private func startRealtime() async {
        realtimeTask?.cancel()
        if let realtimeChannel {
            await client.removeChannel(realtimeChannel)
        }
        realtimeChannel = nil

        do {
            let session = try await client.auth.session
            let userId = session.user.id.uuidString
            let channel = client.channel("tasks-\(userId)")
            let stream = channel.postgresChange(
                AnyAction.self,
                schema: "public",
                table: "tasks",
                filter: .eq("user_id", value: userId)
            )

            try await channel.subscribeWithError()
            realtimeChannel = channel

            realtimeTask = Task { [weak self] in
                guard let self else { return }
                do {
                    for await _ in stream {
                        let refreshed: [TilTask] = try await self.client
                            .from("tasks")
                            .select()
                            .eq("user_id", value: userId)
                            .order("created_at", ascending: false)
                            .execute()
                            .value

                        await MainActor.run {
                            self.tasks = self.sortTasks(refreshed)
                        }
                    }
                } catch {
                    guard !Task.isCancelled else { return }
                    await MainActor.run {
                        self.errorMessage = error.localizedDescription
                    }
                    print("TaskService.startRealtime error: \(error)")
                }
            }
        } catch {
            errorMessage = error.localizedDescription
            print("TaskService.startRealtime setup error: \(error)")
        }
    }
}
