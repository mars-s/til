import SwiftUI

struct TaskRowView: View {
    let task: TilTask
    let onToggle: (TilTask) -> Void
    let onDelete: (TilTask) -> Void
    let onOpen: (TilTask) -> Void

    var body: some View {
        Button(action: { onOpen(task) }) {
            HStack(alignment: .top, spacing: 12) {
                RoundedRectangle(cornerRadius: 3)
                    .fill(task.status == .done ? Color.jade.opacity(0.45) : task.priority.color)
                    .frame(width: 4, height: 42)
                    .padding(.top, 2)

                Button { onToggle(task) } label: {
                    ZStack {
                        Circle()
                            .strokeBorder(task.status == .done ? Color.jade : Color.border2, lineWidth: 1.5)
                            .background(Circle().fill(task.status == .done ? Color.jade.opacity(0.15) : Color.clear))
                            .frame(width: 22, height: 22)
                        if task.status == .done {
                            Image(systemName: "checkmark")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(Color.jade)
                        } else if task.status == .inProgress {
                            Circle()
                                .fill(Color.amber)
                                .frame(width: 8, height: 8)
                        }
                    }
                }
                .buttonStyle(.plain)

                VStack(alignment: .leading, spacing: 6) {
                    Text(task.title)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(task.status == .done ? Color.text3 : Color.text1)
                        .strikethrough(task.status == .done, color: Color.text3)
                        .lineLimit(2)

                    HStack(spacing: 6) {
                        statusChip(task.status.label, tint: task.status == .done ? .jade : .amber)

                        if let scheduledAt = task.scheduledAt {
                            statusChip(scheduledAt.formatted(.dateTime.month(.abbreviated).day().hour().minute()), tint: .sky)
                        }

                        if let deadlineAt = task.deadlineAt {
                            statusChip("Due \(deadlineAt.formatted(.dateTime.month(.abbreviated).day()))", tint: .rose)
                        }
                    }

                    if !task.tags.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(task.tags, id: \.self) { tag in
                                    Text("#\(tag)")
                                        .font(.system(size: 10, design: .monospaced))
                                        .foregroundStyle(Color.sand)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color.ink3)
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }
                }

                Spacer(minLength: 0)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.ink2)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.border, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            Button(role: .destructive) { onDelete(task) } label: {
                Label("Delete", systemImage: "trash")
            }
        }
        .swipeActions(edge: .leading, allowsFullSwipe: false) {
            Button { onToggle(task) } label: {
                Label(task.status == .done ? "Reset" : "Advance", systemImage: task.status == .done ? "arrow.uturn.backward" : "checkmark")
            }
            .tint(task.status == .done ? Color.sky : Color.jade)
        }
    }

    private func statusChip(_ label: String, tint: Color) -> some View {
        Text(label)
            .font(.system(size: 10, design: .monospaced))
            .foregroundStyle(tint)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(tint.opacity(0.12))
            .clipShape(Capsule())
    }
}
