import Foundation

enum TaskStatus: String, Codable, CaseIterable, Identifiable {
    case todo
    case inProgress = "in_progress"
    case done

    var id: String { rawValue }

    var label: String {
        switch self {
        case .todo: "To Do"
        case .inProgress: "In Progress"
        case .done: "Done"
        }
    }
}

enum TaskPriority: String, Codable, CaseIterable, Identifiable {
    case low
    case medium
    case high
    case urgent

    var id: String { rawValue }

    var label: String { rawValue.capitalized }
}

struct TaskSubtask: Codable, Hashable, Identifiable {
    var id = UUID()
    var title: String
    var completed: Bool
}

struct TilTask: Codable, Identifiable, Hashable {
    let id: String
    var title: String
    var status: TaskStatus
    var priority: TaskPriority
    var scheduledAt: Date?
    var deadlineAt: Date?
    var createdAt: Date
    var updatedAt: Date?
    var durationMinutes: Int?
    var tags: [String]
    var description: String?
    var subtasks: [TaskSubtask]
    var userId: String?
    var calendarEventId: String?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case status
        case priority
        case scheduledAt = "scheduled_at"
        case deadlineAt = "deadline_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case durationMinutes = "duration_minutes"
        case tags
        case description
        case subtasks
        case userId = "user_id"
        case calendarEventId = "calendar_event_id"
    }

    var bucket: TaskBucket {
        if status == .done { return .done }
        guard let date = scheduledAt else { return .someday }
        return Calendar.current.isDateInToday(date) || status == .inProgress ? .today : .scheduled
    }
}

enum TaskBucket: String, CaseIterable, Identifiable {
    case today
    case scheduled
    case someday
    case done

    var id: String { rawValue }

    var label: String {
        switch self {
        case .today: "Today"
        case .scheduled: "Scheduled"
        case .someday: "Someday"
        case .done: "Completed"
        }
    }
}

struct ParsedTask {
    var title: String
    var scheduledAt: Date?
    var deadlineAt: Date?
    var durationMinutes: Int?
    var priority: TaskPriority
    var tags: [String]
}

struct CalendarInfo: Codable, Identifiable, Hashable {
    let id: String
    var name: String
    var color: String?
    var isPrimary: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case color
        case isPrimary = "is_primary"
    }
}

struct CalendarEventRecord: Codable, Identifiable, Hashable {
    let id: String
    var calendarId: String
    var title: String
    var startAt: Date
    var endAt: Date?
    var isTaskBlock: Bool
    var isSuggestion: Bool
    var calendar: CalendarInfo?

    enum CodingKeys: String, CodingKey {
        case id
        case calendarId = "calendar_id"
        case title
        case startAt = "start_at"
        case endAt = "end_at"
        case isTaskBlock = "is_task_block"
        case isSuggestion = "is_suggestion"
        case calendar
    }

    var displayColorHex: String {
        calendar?.color ?? "#5b9cf0"
    }
}
