import SwiftUI

struct CalendarView: View {
    @EnvironmentObject var taskService: TaskService
    @EnvironmentObject var calendarService: CalendarService

    @State private var mode: CalendarMode = .week
    @State private var weekStart = Calendar.current.startOfDay(for: Date()).startOfWeek()
    @State private var monthAnchor = Date()
    @State private var selectedSlot: SelectedDateSlot?
    @State private var newEventTitle = ""
    @State private var unscheduledTask: TilTask?

    private let calendar = Calendar.current

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.ink, Color.ink2, Color.ink],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    topBar
                    unscheduledSection
                    calendarLegend

                    if mode == .week {
                        weekView
                    } else {
                        monthView
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 18)
                .padding(.bottom, 40)
            }
        }
        .navigationTitle("Calendar")
        .navigationBarTitleDisplayMode(.large)
        .sheet(item: $selectedSlot) { slot in
            eventComposer(for: slot.date)
                .presentationDetents([.fraction(0.32)])
        }
        .sheet(item: $unscheduledTask) { task in
            scheduleTaskSheet(task)
                .presentationDetents([.fraction(0.34)])
        }
        .refreshable {
            await calendarService.refreshAll()
            await taskService.fetchTasks()
        }
    }

    private var topBar: some View {
        VStack(alignment: .leading, spacing: 12) {
            Picker("Mode", selection: $mode) {
                ForEach(CalendarMode.allCases) { mode in
                    Text(mode.label).tag(mode)
                }
            }
            .pickerStyle(.segmented)

            HStack {
                Button(action: goBackward) {
                    Label("Prev", systemImage: "chevron.left")
                }
                .buttonStyle(CalendarNavButtonStyle())

                Spacer()

                Text(mode == .week ? weekLabel : monthLabel)
                    .font(.system(size: 16, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Color.text2)

                Spacer()

                Button("Today", action: goToToday)
                    .buttonStyle(CalendarNavButtonStyle(tint: .amber))
                Button(action: goForward) {
                    Label("Next", systemImage: "chevron.right")
                }
                .buttonStyle(CalendarNavButtonStyle())
            }
        }
    }

    private var unscheduledSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Unscheduled Tasks")
                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                .foregroundStyle(Color.text3)
                .textCase(.uppercase)
                .tracking(1.2)

            let items = taskService.tasks.filter { $0.status != .done && $0.scheduledAt == nil }
            if items.isEmpty {
                Text("No loose tasks waiting for a slot.")
                    .font(.system(size: 13))
                    .foregroundStyle(Color.text4)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(items) { task in
                            Button { unscheduledTask = task } label: {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(task.title)
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundStyle(Color.text1)
                                        .lineLimit(2)
                                    HStack(spacing: 6) {
                                        Text(task.priority.label)
                                        if let duration = task.durationMinutes {
                                            Text("\(duration)m")
                                        }
                                    }
                                    .font(.system(size: 10, design: .monospaced))
                                    .foregroundStyle(task.priority.color)
                                }
                                .padding(12)
                                .frame(width: 180, alignment: .leading)
                                .background(Color.ink2)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.border, lineWidth: 1))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }

    private var calendarLegend: some View {
        HStack(spacing: 12) {
            legendChip("Events", tint: .sky)
            legendChip("Tasks", tint: .amber)
            legendChip("Suggestions", tint: .violet)
        }
    }

    private var weekView: some View {
        let days = (0..<7).map { calendar.date(byAdding: .day, value: $0, to: weekStart)! }

        return VStack(spacing: 10) {
            ForEach(days, id: \.self) { day in
                Button { selectedSlot = SelectedDateSlot(date: day.noon) } label: {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text(day.formatted(.dateTime.weekday(.wide).month(.abbreviated).day()))
                                .font(.system(size: 16, weight: .semibold, design: .serif))
                                .italic()
                                .foregroundStyle(calendar.isDateInToday(day) ? Color.amber : Color.text1)
                            Spacer()
                            Text("\(items(for: day).count) items")
                                .font(.system(size: 10, design: .monospaced))
                                .foregroundStyle(Color.text4)
                        }

                        if items(for: day).isEmpty {
                            Text("Tap to add an event")
                                .font(.system(size: 12))
                                .foregroundStyle(Color.text4)
                        } else {
                            VStack(spacing: 8) {
                                ForEach(items(for: day)) { item in
                                    HStack(alignment: .top, spacing: 10) {
                                        Circle()
                                            .fill(item.tint)
                                            .frame(width: 8, height: 8)
                                            .padding(.top, 5)
                                        VStack(alignment: .leading, spacing: 3) {
                                            Text(item.title)
                                                .font(.system(size: 14, weight: .medium))
                                                .foregroundStyle(Color.text1)
                                            Text(item.subtitle)
                                                .font(.system(size: 11, design: .monospaced))
                                                .foregroundStyle(Color.text3)
                                        }
                                        Spacer()
                                    }
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                }
                            }
                        }
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.ink2)
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.border, lineWidth: 1))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var monthView: some View {
        let days = monthGridDates(anchor: monthAnchor)

        return LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 7), spacing: 8) {
            ForEach(shortWeekdaySymbols(), id: \.self) { label in
                Text(label)
                    .font(.system(size: 10, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Color.text4)
                    .frame(maxWidth: .infinity)
            }

            ForEach(days, id: \.self) { day in
                Button { selectedSlot = SelectedDateSlot(date: day.noon) } label: {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(day.formatted(.dateTime.day()))
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(calendar.isDate(day, equalTo: monthAnchor, toGranularity: .month) ? Color.text1 : Color.text4)
                        VStack(alignment: .leading, spacing: 3) {
                            ForEach(items(for: day).prefix(3)) { item in
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(item.tint)
                                    .frame(height: 4)
                            }
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(8)
                    .frame(maxWidth: .infinity, minHeight: 72, alignment: .topLeading)
                    .background(calendar.isDateInToday(day) ? Color.amber.opacity(0.12) : Color.ink2)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.border, lineWidth: 1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func items(for day: Date) -> [CalendarItem] {
        let dayEvents = calendarService.events
            .filter { calendar.isDate($0.startAt, inSameDayAs: day) }
            .map {
                CalendarItem(
                    id: "event-\($0.id)",
                    title: $0.title,
                    subtitle: timeRange(start: $0.startAt, end: $0.endAt),
                    tint: $0.isSuggestion ? .violet : $0.swiftUIColor
                )
            }

        let dayTasks = taskService.tasks
            .filter { $0.status != .done && ($0.scheduledAt.map { calendar.isDate($0, inSameDayAs: day) } ?? false) }
            .map {
                CalendarItem(
                    id: "task-\($0.id)",
                    title: $0.title,
                    subtitle: $0.scheduledAt.map { "Task · \($0.formatted(.dateTime.hour().minute()))" } ?? "Task",
                    tint: .amber
                )
            }

        return (dayEvents + dayTasks).sorted { $0.subtitle < $1.subtitle }
    }

    private func eventComposer(for slot: Date) -> some View {
        NavigationStack {
            Form {
                Section("New Event") {
                    TextField("Title", text: $newEventTitle)
                    Text(slot.formatted(.dateTime.weekday(.wide).month(.abbreviated).day().hour().minute()))
                        .foregroundStyle(Color.text3)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Color.ink.ignoresSafeArea())
            .navigationTitle("Create Event")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") {
                        selectedSlot = nil
                        newEventTitle = ""
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        let end = calendar.date(byAdding: .minute, value: 60, to: slot) ?? slot.addingTimeInterval(3600)
                        _Concurrency.Task {
                            await calendarService.createEvent(
                                title: newEventTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "New Event" : newEventTitle,
                                startAt: slot,
                                endAt: end
                            )
                            selectedSlot = nil
                            newEventTitle = ""
                        }
                    }
                }
            }
        }
    }

    private func scheduleTaskSheet(_ task: TilTask) -> some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 18) {
                Text(task.title)
                    .font(.system(size: 20, weight: .semibold, design: .serif))
                    .italic()
                    .foregroundStyle(Color.text1)
                DatePicker(
                    "Schedule for",
                    selection: Binding(
                        get: { task.scheduledAt ?? Date() },
                        set: { newValue in
                            _Concurrency.Task { await taskService.setDate(task, date: newValue) }
                        }
                    ),
                    displayedComponents: [.date, .hourAndMinute]
                )
                .tint(Color.amber)
                Spacer()
            }
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(Color.ink.ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { unscheduledTask = nil }
                }
            }
        }
    }

    private func legendChip(_ title: String, tint: Color) -> some View {
        HStack(spacing: 6) {
            Circle().fill(tint).frame(width: 8, height: 8)
            Text(title)
                .font(.system(size: 10, design: .monospaced))
                .foregroundStyle(Color.text3)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.ink2)
        .clipShape(Capsule())
    }

    private var weekLabel: String {
        let end = calendar.date(byAdding: .day, value: 6, to: weekStart) ?? weekStart
        return "\(weekStart.formatted(.dateTime.month(.abbreviated).day())) - \(end.formatted(.dateTime.month(.abbreviated).day().year()))"
    }

    private var monthLabel: String {
        monthAnchor.formatted(.dateTime.month(.wide).year())
    }

    private func goBackward() {
        if mode == .week {
            weekStart = calendar.date(byAdding: .day, value: -7, to: weekStart) ?? weekStart
        } else {
            monthAnchor = calendar.date(byAdding: .month, value: -1, to: monthAnchor) ?? monthAnchor
        }
    }

    private func goForward() {
        if mode == .week {
            weekStart = calendar.date(byAdding: .day, value: 7, to: weekStart) ?? weekStart
        } else {
            monthAnchor = calendar.date(byAdding: .month, value: 1, to: monthAnchor) ?? monthAnchor
        }
    }

    private func goToToday() {
        weekStart = Date().startOfWeek()
        monthAnchor = Date()
    }

    private func monthGridDates(anchor: Date) -> [Date] {
        let monthStart = calendar.date(from: calendar.dateComponents([.year, .month], from: anchor)) ?? anchor
        let firstVisible = monthStart.startOfWeek()
        return (0..<42).compactMap { calendar.date(byAdding: .day, value: $0, to: firstVisible) }
    }

    private func shortWeekdaySymbols() -> [String] {
        let symbols = calendar.shortStandaloneWeekdaySymbols
        let first = calendar.firstWeekday - 1
        return Array(symbols[first...] + symbols[..<first])
    }

    private func timeRange(start: Date, end: Date?) -> String {
        let startText = start.formatted(.dateTime.hour().minute())
        let endText = end?.formatted(.dateTime.hour().minute()) ?? ""
        return end == nil ? startText : "\(startText) - \(endText)"
    }
}

private enum CalendarMode: String, CaseIterable, Identifiable {
    case week
    case month

    var id: String { rawValue }
    var label: String { rawValue.capitalized }
}

private struct CalendarItem: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let tint: Color
}

private struct SelectedDateSlot: Identifiable {
    let id = UUID()
    let date: Date
}

private struct CalendarNavButtonStyle: ButtonStyle {
    var tint: Color = .text2

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(tint)
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(Color.ink2.opacity(configuration.isPressed ? 0.7 : 1))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.border, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

private extension Date {
    func startOfWeek() -> Date {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: self)
        return calendar.date(from: components) ?? self
    }

    var noon: Date {
        Calendar.current.date(bySettingHour: 12, minute: 0, second: 0, of: self) ?? self
    }
}
