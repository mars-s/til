use gpui::*;
use crate::state::{AppState, Tab};
use crate::theme::TilTheme;

pub struct CommandPalette {
    pub state: Entity<AppState>,
    pub theme: TilTheme,
    pub selected_index: usize,
}

#[derive(Clone)]
struct Command {
    label: &'static str,
    action: CommandAction,
}

#[derive(Clone)]
enum CommandAction {
    GoToTasks,
    GoToCalendar,
    NewTask,
}

fn all_commands() -> Vec<Command> {
    vec![
        Command { label: "New Task", action: CommandAction::NewTask },
        Command { label: "Go to Tasks", action: CommandAction::GoToTasks },
        Command { label: "Go to Calendar", action: CommandAction::GoToCalendar },
    ]
}

impl CommandPalette {
    pub fn new(state: Entity<AppState>, theme: TilTheme) -> Self {
        Self { state, theme, selected_index: 0 }
    }

    fn filtered_commands(&self, cx: &App) -> Vec<Command> {
        let query = self.state.read(cx).command_palette_query.to_lowercase();
        all_commands()
            .into_iter()
            .filter(|c| query.is_empty() || c.label.to_lowercase().contains(&query))
            .collect()
    }

    fn execute_command(&mut self, cmd: &Command, cx: &mut Context<Self>) {
        self.state.update(cx, |state, _| {
            match cmd.action {
                CommandAction::GoToTasks => state.set_tab(Tab::Tasks),
                CommandAction::GoToCalendar => state.set_tab(Tab::Calendar),
                CommandAction::NewTask => state.set_tab(Tab::Tasks),
            }
            state.close_command_palette();
        });
        cx.notify();
    }
}

impl Render for CommandPalette {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = self.theme.clone();
        let commands = self.filtered_commands(cx);
        let query = self.state.read(cx).command_palette_query.clone();
        let selected = self.selected_index.min(commands.len().saturating_sub(1));

        // Overlay container
        div()
            .absolute()
            .inset_0()
            .flex()
            .items_center()
            .justify_center()
            .bg(gpui::hsla(0.0, 0.0, 0.0, 0.6))
            .child(
                div()
                    .w(px(560.0))
                    .rounded(px(12.0))
                    .bg(theme.surface)
                    .border_1()
                    .border_color(theme.border)
                    .shadow_lg()
                    .overflow_hidden()
                    .child(
                        // Search input area
                        div()
                            .px(px(16.0))
                            .py(px(12.0))
                            .border_b_1()
                            .border_color(theme.border)
                            .flex()
                            .items_center()
                            .gap(px(8.0))
                            .child(
                                div()
                                    .text_color(theme.text_secondary)
                                    .text_sm()
                                    .child("⌘")
                            )
                            .child(
                                div()
                                    .flex_1()
                                    .text_color(if query.is_empty() { theme.text_secondary.clone() } else { theme.text_primary.clone() })
                                    .text_base()
                                    .child(if query.is_empty() {
                                        SharedString::from("Type a command...")
                                    } else {
                                        SharedString::from(query.clone())
                                    })
                            )
                    )
                    .child(
                        // Commands list
                        div()
                            .max_h(px(320.0))
                            .overflow_hidden()
                            .py(px(4.0))
                            .children(
                                commands.iter().enumerate().map(|(i, cmd)| {
                                    let is_selected = i == selected;
                                    let label = SharedString::from(cmd.label);
                                    div()
                                        .px(px(16.0))
                                        .py(px(10.0))
                                        .flex()
                                        .items_center()
                                        .gap(px(8.0))
                                        .rounded(px(4.0))
                                        .mx(px(4.0))
                                        .bg(if is_selected { theme.surface2.clone() } else { theme.surface.clone() })
                                        .child(
                                            div()
                                                .text_color(if is_selected { theme.text_primary.clone() } else { theme.text_secondary.clone() })
                                                .text_sm()
                                                .child("→")
                                        )
                                        .child(
                                            div()
                                                .text_color(theme.text_primary.clone())
                                                .text_sm()
                                                .child(label)
                                        )
                                })
                            )
                    )
                    .child(
                        // Footer hint
                        div()
                            .px(px(16.0))
                            .py(px(8.0))
                            .border_t_1()
                            .border_color(theme.border)
                            .flex()
                            .gap(px(12.0))
                            .child(
                                div()
                                    .text_color(theme.text_secondary)
                                    .text_xs()
                                    .child("↑↓ navigate")
                            )
                            .child(
                                div()
                                    .text_color(theme.text_secondary)
                                    .text_xs()
                                    .child("↵ select")
                            )
                            .child(
                                div()
                                    .text_color(theme.text_secondary)
                                    .text_xs()
                                    .child("Esc close")
                            )
                    )
            )
    }
}
