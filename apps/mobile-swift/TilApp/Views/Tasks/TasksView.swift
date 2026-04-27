import SwiftUI

struct TasksView: View {
    @EnvironmentObject var taskService: TaskService
    @State private var showInput = false
    @State private var selectedTask: TilTask?

    var todayTasks: [TilTask] { taskService.tasks.filter { $0.bucket == .today } }
    var scheduledTasks: [TilTask] { taskService.tasks.filter { $0.bucket == .scheduled } }
    var somedayTasks: [TilTask] { taskService.tasks.filter { $0.bucket == .someday } }
    var doneTasks: [TilTask] { taskService.tasks.filter { $0.bucket == .done } }

    var body: some View {
        ZStack(alignment: .bottom) {
            LinearGradient(
                colors: [Color.ink, Color.ink2, Color.ink],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    header

                    if taskService.isLoading && taskService.tasks.isEmpty {
                        loadingState
                    } else {
                        section(.today, tasks: todayTasks, subtitle: Date().formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day()))
                        section(.scheduled, tasks: scheduledTasks)
                        section(.someday, tasks: somedayTasks)
                        section(.done, tasks: doneTasks)

                        if taskService.tasks.isEmpty {
                            emptyState
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 18)
                .padding(.bottom, 140)
            }

            if showInput {
                Color.black.opacity(0.4)
                    .ignoresSafeArea()
                    .onTapGesture { showInput = false }

                TaskInputView(
                    onSubmit: { parsed in
                        _Concurrency.Task { await taskService.addTask(parsed) }
                        showInput = false
                    },
                    onDismiss: { showInput = false }
                )
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }

            if !showInput {
                addButton
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.84), value: showInput)
        .sheet(item: $selectedTask) { task in
            TaskDetailView(
                task: task,
                onSave: { updated in
                    _Concurrency.Task {
                        await taskService.updateTask(
                            task,
                            title: updated.title,
                            status: updated.status,
                            priority: updated.priority,
                            scheduledAt: updated.scheduledAt,
                            deadlineAt: updated.deadlineAt,
                            durationMinutes: updated.durationMinutes,
                            tags: updated.tags,
                            description: updated.description,
                            subtasks: updated.subtasks
                        )
                    }
                },
                onDelete: { doomed in
                    _Concurrency.Task { await taskService.deleteTask(doomed) }
                }
            )
            .presentationDetents([.large])
        }
        .refreshable {
            await taskService.fetchTasks()
        }
        .navigationTitle("Tasks")
        .navigationBarTitleDisplayMode(.large)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Everything live.")
                .font(.system(size: 26, weight: .semibold, design: .serif))
                .italic()
                .foregroundStyle(Color.text1)
            Text("Tasks sync across desktop and mobile in realtime. Tap any row to edit title, notes, tags, subtasks, dates, and priority.")
                .font(.system(size: 13))
                .foregroundStyle(Color.text3)
        }
    }

    private func section(_ bucket: TaskBucket, tasks: [TilTask], subtitle: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(bucket.label)
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Color.text3)
                    .textCase(.uppercase)
                    .tracking(1.2)
                Text("\(tasks.count)")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(Color.text4)
                if let subtitle {
                    Text(subtitle)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(Color.text4)
                }
            }
            if tasks.isEmpty {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.ink2)
                    .frame(height: 52)
                    .overlay(alignment: .leading) {
                        Text("No \(bucket.label.lowercased()) items")
                            .font(.system(size: 13))
                            .foregroundStyle(Color.text4)
                            .padding(.horizontal, 14)
                    }
            } else {
                ForEach(tasks) { task in
                    TaskRowView(
                        task: task,
                        onToggle: { value in _Concurrency.Task { await taskService.toggleTask(value) } },
                        onDelete: { value in _Concurrency.Task { await taskService.deleteTask(value) } },
                        onOpen: { selectedTask = $0 }
                    )
                }
            }
        }
    }

    private var loadingState: some View {
        HStack {
            Spacer()
            ProgressView().tint(Color.amber)
            Spacer()
        }
        .padding(.top, 80)
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            Text("◇")
                .font(.system(size: 28))
                .foregroundStyle(Color.text3.opacity(0.4))
            Text("Nothing yet. Start with a natural-language task and the parser will pull out dates, tags, priority, and duration.")
                .font(.system(size: 14, design: .serif))
                .italic()
                .foregroundStyle(Color.text3)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 80)
    }

    private var addButton: some View {
        VStack(spacing: 8) {
            Button {
                withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                    showInput = true
                }
            } label: {
                ZStack {
                    Circle()
                        .fill(Color.amber)
                        .frame(width: 58, height: 58)
                        .shadow(color: Color.amber.opacity(0.35), radius: 16, y: 6)
                    Image(systemName: "plus")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(Color.ink)
                }
            }
            .buttonStyle(.plain)

            Text("quick add")
                .font(.system(size: 10, design: .monospaced))
                .foregroundStyle(Color.text4)
        }
        .padding(.bottom, 22)
    }
}
