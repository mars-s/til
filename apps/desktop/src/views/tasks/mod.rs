use gpui::prelude::*;
use gpui::*;
use til_core::types::Priority;
use crate::state::AppState;
use crate::theme::TilTheme;

pub struct TasksView {
    pub state: Entity<AppState>,
    pub theme: TilTheme,
}

impl TasksView {
    pub fn new(state: Entity<AppState>, theme: TilTheme) -> Self {
        Self { state, theme }
    }

    fn priority_color(&self, priority: &Priority) -> Hsla {
        match priority {
            Priority::Urgent => rgb(0xef4444).into(),
            Priority::High => self.theme.span_priority,
            Priority::Medium => self.theme.accent,
            Priority::Low => self.theme.text_secondary,
        }
    }

    fn priority_label(priority: &Priority) -> &'static str {
        match priority {
            Priority::Urgent => "URGENT",
            Priority::High => "HIGH",
            Priority::Medium => "MED",
            Priority::Low => "LOW",
        }
    }
}

impl Render for TasksView {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = self.theme.clone();
        let state_ref = self.state.read(cx);
        let draft = state_ref.input_draft.clone();
        let tasks = state_ref.tasks.clone();
        drop(state_ref);

        // Parse current draft for preview
        let preview: Option<String> = if draft.is_empty() {
            None
        } else {
            let parsed = til_core::nlp::task::parse(&draft);
            let mut parts: Vec<String> = Vec::new();
            if let Some(dt) = parsed.scheduled_at {
                parts.push(format!("Scheduled: {}", dt.format("%b %d %H:%M")));
            }
            if let Some(dl) = parsed.deadline_at {
                parts.push(format!("Deadline: {}", dl.format("%b %d")));
            }
            if let Some(dur) = parsed.duration_minutes {
                if dur >= 60 {
                    parts.push(format!("Duration: {}h {}m", dur / 60, dur % 60));
                } else {
                    parts.push(format!("Duration: {}m", dur));
                }
            }
            if !parsed.tags.is_empty() {
                parts.push(format!("Tags: {}", parsed.tags.join(", ")));
            }
            if parts.is_empty() { None } else { Some(parts.join("  •  ")) }
        };

        let tasks_empty = tasks.is_empty();

        div()
            .flex()
            .flex_col()
            .size_full()
            .bg(theme.bg)
            .child(
                // NLP Input area
                div()
                    .px(px(24.0))
                    .pt(px(20.0))
                    .pb(px(16.0))
                    .border_b_1()
                    .border_color(theme.border)
                    .child(
                        div()
                            .flex()
                            .items_center()
                            .gap(px(10.0))
                            .px(px(16.0))
                            .py(px(12.0))
                            .rounded(px(8.0))
                            .bg(theme.surface)
                            .border_1()
                            .border_color(theme.border)
                            .child(
                                div()
                                    .text_color(theme.accent)
                                    .text_sm()
                                    .child("+")
                            )
                            .child(
                                div()
                                    .flex_1()
                                    .text_color(if draft.is_empty() {
                                        theme.text_secondary.clone()
                                    } else {
                                        theme.text_primary.clone()
                                    })
                                    .text_sm()
                                    .child(if draft.is_empty() {
                                        SharedString::from("Add task... (e.g. \"Review PR tomorrow 2pm !high\")")
                                    } else {
                                        SharedString::from(draft.clone())
                                    })
                            )
                    )
                    .when_some(preview, |el, preview_text| {
                        el.child(
                            div()
                                .px(px(16.0))
                                .pt(px(6.0))
                                .text_color(theme.span_date)
                                .text_xs()
                                .child(SharedString::from(preview_text))
                        )
                    })
            )
            .child(
                // Task list
                div()
                    .flex()
                    .flex_col()
                    .flex_1()
                    .overflow_hidden()
                    .p(px(16.0))
                    .gap(px(2.0))
                    .when(tasks_empty, |el| {
                        el.child(
                            div()
                                .flex()
                                .flex_1()
                                .items_center()
                                .justify_center()
                                .text_color(theme.text_secondary)
                                .text_sm()
                                .child("No tasks yet. Start typing above to add one.")
                        )
                    })
                    .children(tasks.iter().map(|task| {
                        let is_done = task.done;
                        let is_in_progress = task.in_progress;
                        let priority_color = self.priority_color(&task.parsed.priority);
                        let priority_label = SharedString::from(Self::priority_label(&task.parsed.priority));
                        let title = SharedString::from(task.title.clone());
                        let scheduled_str: Option<String> = task.parsed.scheduled_at.map(|dt| {
                            dt.format("%b %d %H:%M").to_string()
                        });

                        let checkbox_color = if is_done {
                            theme.task_done
                        } else if is_in_progress {
                            theme.task_in_progress
                        } else {
                            theme.border
                        };

                        let dot_color = theme.task_in_progress;

                        div()
                            .flex()
                            .items_center()
                            .gap(px(12.0))
                            .px(px(12.0))
                            .py(px(10.0))
                            .rounded(px(6.0))
                            .bg(theme.surface)
                            .border_1()
                            .border_color(theme.border)
                            .child(
                                // Checkbox
                                div()
                                    .w(px(18.0))
                                    .h(px(18.0))
                                    .rounded(px(4.0))
                                    .border_2()
                                    .border_color(checkbox_color)
                                    .flex()
                                    .items_center()
                                    .justify_center()
                                    .when(is_done, |el| {
                                        el.child(
                                            div()
                                                .text_color(theme.task_done)
                                                .text_xs()
                                                .child("✓")
                                        )
                                    })
                                    .when(is_in_progress && !is_done, |el| {
                                        el.child(
                                            div()
                                                .w(px(8.0))
                                                .h(px(8.0))
                                                .rounded_full()
                                                .bg(dot_color)
                                        )
                                    })
                            )
                            .child(
                                // Title
                                div()
                                    .flex_1()
                                    .text_color(if is_done {
                                        theme.text_secondary.clone()
                                    } else {
                                        theme.text_primary.clone()
                                    })
                                    .text_sm()
                                    .when(is_done, |el| el.line_through())
                                    .child(title)
                            )
                            .when_some(scheduled_str, |el, s| {
                                el.child(
                                    div()
                                        .text_color(theme.span_time)
                                        .text_xs()
                                        .child(SharedString::from(s))
                                )
                            })
                            .child(
                                // Priority badge
                                div()
                                    .px(px(6.0))
                                    .py(px(2.0))
                                    .rounded(px(4.0))
                                    .bg(priority_color)
                                    .text_color(white())
                                    .text_xs()
                                    .font_weight(FontWeight::SEMIBOLD)
                                    .child(priority_label)
                            )
                    }))
            )
    }
}
