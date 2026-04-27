import SwiftUI

struct TaskDetailView: View {
    let task: TilTask
    let onSave: (TilTask) -> Void
    let onDelete: (TilTask) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var draft: TilTask
    @State private var newTag = ""
    @State private var newSubtask = ""

    init(task: TilTask, onSave: @escaping (TilTask) -> Void, onDelete: @escaping (TilTask) -> Void) {
        self.task = task
        self.onSave = onSave
        self.onDelete = onDelete
        _draft = State(initialValue: task)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Task") {
                    TextField("Title", text: $draft.title)
                    Picker("Status", selection: $draft.status) {
                        ForEach(TaskStatus.allCases) { status in
                            Text(status.label).tag(status)
                        }
                    }
                    Picker("Priority", selection: $draft.priority) {
                        ForEach(TaskPriority.allCases) { priority in
                            Text(priority.label).tag(priority)
                        }
                    }
                }

                Section("Schedule") {
                    DatePicker("Scheduled", selection: scheduledBinding, displayedComponents: [.date, .hourAndMinute])
                    Toggle("Has deadline", isOn: deadlineEnabledBinding)
                    if draft.deadlineAt != nil {
                        DatePicker("Deadline", selection: deadlineBinding, displayedComponents: [.date, .hourAndMinute])
                    }
                    Stepper(value: durationBinding, in: 0...480, step: 15) {
                        Text(draft.durationMinutes == nil ? "Duration: none" : "Duration: \(draft.durationMinutes ?? 0)m")
                    }
                }

                Section("Description") {
                    TextField("Notes", text: descriptionBinding)
                        .lineLimit(4...8)
                }

                Section("Tags") {
                    HStack {
                        TextField("New tag", text: $newTag)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        Button("Add") { addTag() }
                            .disabled(newTag.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }

                    if draft.tags.isEmpty {
                        Text("No tags")
                            .foregroundStyle(Color.text3)
                    } else {
                        ForEach(draft.tags, id: \.self) { tag in
                            HStack {
                                Text("#\(tag)")
                                Spacer()
                                Button(role: .destructive) {
                                    draft.tags.removeAll { $0 == tag }
                                } label: {
                                    Image(systemName: "minus.circle.fill")
                                }
                            }
                        }
                    }
                }

                Section("Subtasks") {
                    HStack {
                        TextField("New subtask", text: $newSubtask)
                        Button("Add") { addSubtask() }
                            .disabled(newSubtask.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }

                    ForEach($draft.subtasks) { $subtask in
                        Toggle(isOn: $subtask.completed) {
                            TextField("Subtask", text: $subtask.title)
                        }
                    }
                    .onDelete { offsets in
                        draft.subtasks.remove(atOffsets: offsets)
                    }
                }

                Section {
                    Button(role: .destructive) {
                        onDelete(task)
                        dismiss()
                    } label: {
                        Text("Delete Task")
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Color.ink.ignoresSafeArea())
            .foregroundStyle(Color.text1)
            .navigationTitle("Task")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        normalizeDraft()
                        onSave(draft)
                        dismiss()
                    }
                    .disabled(draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private var scheduledBinding: Binding<Date> {
        Binding(
            get: { draft.scheduledAt ?? Date() },
            set: { draft.scheduledAt = $0 }
        )
    }

    private var deadlineBinding: Binding<Date> {
        Binding(
            get: { draft.deadlineAt ?? (draft.scheduledAt ?? Date()) },
            set: { draft.deadlineAt = $0 }
        )
    }

    private var deadlineEnabledBinding: Binding<Bool> {
        Binding(
            get: { draft.deadlineAt != nil },
            set: { draft.deadlineAt = $0 ? (draft.deadlineAt ?? draft.scheduledAt ?? Date()) : nil }
        )
    }

    private var durationBinding: Binding<Int> {
        Binding(
            get: { draft.durationMinutes ?? 0 },
            set: { draft.durationMinutes = $0 == 0 ? nil : $0 }
        )
    }

    private var descriptionBinding: Binding<String> {
        Binding(
            get: { draft.description ?? "" },
            set: { draft.description = $0.isEmpty ? nil : $0 }
        )
    }

    private func addTag() {
        let trimmed = newTag.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !trimmed.isEmpty, !draft.tags.contains(trimmed) else { return }
        draft.tags.append(trimmed)
        newTag = ""
    }

    private func addSubtask() {
        let trimmed = newSubtask.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        draft.subtasks.append(TaskSubtask(title: trimmed, completed: false))
        newSubtask = ""
    }

    private func normalizeDraft() {
        draft.title = draft.title.trimmingCharacters(in: .whitespacesAndNewlines)
        draft.description = draft.description?.trimmingCharacters(in: .whitespacesAndNewlines)
        if (draft.description?.isEmpty ?? true) {
            draft.description = nil
        }
        draft.tags = Array(Set(draft.tags.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty })).sorted()
        draft.subtasks = draft.subtasks.filter { !$0.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }
}
