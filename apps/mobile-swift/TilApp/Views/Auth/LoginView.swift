import SwiftUI

struct LoginView: View {
    @EnvironmentObject var auth: AuthService
    @State private var email = ""

    var body: some View {
        ZStack {
            Color.ink.ignoresSafeArea()
            VStack(spacing: 32) {
                VStack(spacing: 6) {
                    Text("til")
                        .font(.system(size: 42, weight: .light, design: .serif))
                        .italic()
                        .foregroundStyle(Color.text1)
                    Text("things i need to do")
                        .font(.system(size: 13, design: .monospaced))
                        .foregroundStyle(Color.text3)
                }
                .padding(.top, 60)

                if let error = auth.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(Color.rose)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }

                Button {
                    let workItem = DispatchWorkItem {
                        _Concurrency.Task {
                            await auth.signInWithGoogle()
                        }
                    }
                    DispatchQueue.main.async(execute: workItem)
                } label: {
                    Group {
                        if auth.isLoading {
                            ProgressView().tint(Color.ink)
                        } else {
                            HStack(spacing: 8) {
                                Image(systemName: "g.circle.fill")
                                    .font(.system(size: 20))
                                Text("continue with google")
                                    .font(.system(size: 15, weight: .medium, design: .monospaced))
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.white)
                    .cornerRadius(9)
                    .foregroundStyle(Color.ink)
                }
                .disabled(auth.isLoading)
                .padding(.horizontal, 24)

                HStack(spacing: 4) {
                    Rectangle()
                        .fill(Color.text3)
                        .frame(height: 1)
                    Text("or")
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(Color.text3)
                    Rectangle()
                        .fill(Color.text3)
                        .frame(height: 1)
                }
                .padding(.horizontal, 24)

                VStack(spacing: 12) {
                    TextField("email", text: $email)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .textContentType(.emailAddress)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(Color.ink3)
                        .cornerRadius(9)
                        .foregroundStyle(Color.text1)
                        .tint(Color.amber)

                    Button {
                        let workItem = DispatchWorkItem {
                            _Concurrency.Task {
                                await auth.signInWithMagicLink(email: email)
                            }
                        }
                        DispatchQueue.main.async(execute: workItem)
                    } label: {
                        Text("send magic link")
                            .font(.system(size: 15, weight: .medium, design: .monospaced))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.ink3)
                            .cornerRadius(9)
                            .foregroundStyle(Color.text1)
                    }
                    .disabled(auth.isLoading || email.isEmpty)
                }
                .padding(.horizontal, 24)

                Spacer()
            }
        }
    }
}