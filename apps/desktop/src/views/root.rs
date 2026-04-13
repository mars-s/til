use gpui::prelude::*;
use gpui::*;
use crate::state::{AppState, Tab};
use crate::theme::TilTheme;
use crate::views::tasks::TasksView;
use crate::views::calendar::CalendarViewComponent;
use crate::views::command_palette::CommandPalette;

pub struct RootView {
    pub state: Entity<AppState>,
    pub theme: TilTheme,
    pub tasks_view: Entity<TasksView>,
    pub calendar_view: Entity<CalendarViewComponent>,
    pub command_palette: Entity<CommandPalette>,
}

impl RootView {
    pub fn new(state: Entity<AppState>, theme: TilTheme, cx: &mut Context<Self>) -> Self {
        let tasks_view = cx.new(|_| TasksView::new(state.clone(), theme.clone()));
        let calendar_view = cx.new(|_| CalendarViewComponent::new(state.clone(), theme.clone()));
        let command_palette = cx.new(|_| CommandPalette::new(state.clone(), theme.clone()));
        Self {
            state,
            theme,
            tasks_view,
            calendar_view,
            command_palette,
        }
    }
}

impl Render for RootView {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = self.theme.clone();
        let active_tab = self.state.read(cx).active_tab.clone();
        let palette_open = self.state.read(cx).command_palette_open;

        let tasks_active = active_tab == Tab::Tasks;
        let calendar_active = active_tab == Tab::Calendar;

        div()
            .relative()
            .flex()
            .flex_col()
            .size_full()
            .bg(theme.bg)
            .child(
                // Tab bar
                div()
                    .flex()
                    .items_center()
                    .gap(px(2.0))
                    .px(px(16.0))
                    .h(px(48.0))
                    .border_b_1()
                    .border_color(theme.border)
                    .bg(theme.surface)
                    .child(
                        // App name
                        div()
                            .flex()
                            .items_center()
                            .mr(px(16.0))
                            .child(
                                div()
                                    .text_color(theme.accent)
                                    .text_sm()
                                    .font_weight(FontWeight::BOLD)
                                    .child("til")
                            )
                    )
                    .child(
                        // Tasks tab
                        div()
                            .px(px(14.0))
                            .py(px(6.0))
                            .rounded(px(6.0))
                            .when(tasks_active, |el| el.bg(theme.surface2))
                            .text_color(if tasks_active {
                                theme.text_primary.clone()
                            } else {
                                theme.text_secondary.clone()
                            })
                            .text_sm()
                            .font_weight(if tasks_active {
                                FontWeight::SEMIBOLD
                            } else {
                                FontWeight::NORMAL
                            })
                            .child("Tasks")
                    )
                    .child(
                        // Calendar tab
                        div()
                            .px(px(14.0))
                            .py(px(6.0))
                            .rounded(px(6.0))
                            .when(calendar_active, |el| el.bg(theme.surface2))
                            .text_color(if calendar_active {
                                theme.text_primary.clone()
                            } else {
                                theme.text_secondary.clone()
                            })
                            .text_sm()
                            .font_weight(if calendar_active {
                                FontWeight::SEMIBOLD
                            } else {
                                FontWeight::NORMAL
                            })
                            .child("Calendar")
                    )
                    .child(
                        // Spacer
                        div().flex_1()
                    )
                    .child(
                        // Cmd+K hint
                        div()
                            .flex()
                            .items_center()
                            .gap(px(4.0))
                            .px(px(8.0))
                            .py(px(4.0))
                            .rounded(px(4.0))
                            .bg(theme.surface2)
                            .border_1()
                            .border_color(theme.border)
                            .child(
                                div()
                                    .text_color(theme.text_secondary)
                                    .text_xs()
                                    .child("⌘K")
                            )
                    )
            )
            .child(
                // Main content area
                div()
                    .flex()
                    .flex_1()
                    .overflow_hidden()
                    .when(tasks_active, |el| {
                        el.child(self.tasks_view.clone())
                    })
                    .when(calendar_active, |el| {
                        el.child(self.calendar_view.clone())
                    })
            )
            // Command palette overlay
            .when(palette_open, |el| {
                el.child(self.command_palette.clone())
            })
    }
}
