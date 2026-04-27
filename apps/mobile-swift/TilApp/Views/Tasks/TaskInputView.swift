import SwiftUI

struct TaskInputView: View {
    let onSubmit: (ParsedTask) -> Void
    let onDismiss: () -> Void

    @State private var text = ""
    @FocusState private var focused: Bool

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            VStack(spacing: 12) {
                HStack(spacing: 10) {
                    TextField("add a task…", text: $text)
                        .focused($focused)
                        .font(.system(size: 16))
                        .foregroundStyle(Color.text1)
                        .tint(Color.amber)
                        .submitLabel(.done)
                        .onSubmit { submit() }

                    if !text.isEmpty {
                        Button(action: submit) {
                            Image(systemName: "arrow.up.circle.fill")
                                .font(.system(size: 28))
                                .foregroundStyle(Color.amber)
                        }
                        .buttonStyle(.plain)
                        .transition(.scale.combined(with: .opacity))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.ink3)
                .cornerRadius(14)
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.border2, lineWidth: 1))

                Text("tip: include dates like \"tomorrow\" or \"friday 3pm\"")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(Color.text4)
                Text("also works with #tags, urgent/high/low, or durations like 45m")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(Color.text4)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
            .background(Color.ink.ignoresSafeArea(edges: .bottom))
        }
        .onAppear { focused = true }
        .onTapGesture {} // absorb tap to prevent dismiss
        .background(Color.clear)
        .contentShape(Rectangle())
    }

    private func submit() {
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { onDismiss(); return }
        let parsed = NLPParser.parse(trimmed)
        onSubmit(parsed)
        text = ""
    }
}
