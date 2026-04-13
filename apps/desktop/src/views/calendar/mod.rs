use gpui::prelude::*;
use gpui::*;
use crate::state::{AppState, CalendarView};
use crate::theme::TilTheme;
use chrono::{Datelike, Duration, Local, NaiveDate, Weekday};

pub struct CalendarViewComponent {
    pub state: Entity<AppState>,
    pub theme: TilTheme,
}

impl CalendarViewComponent {
    pub fn new(state: Entity<AppState>, theme: TilTheme) -> Self {
        Self { state, theme }
    }

    fn week_start(&self, cx: &App) -> NaiveDate {
        let offset = self.state.read(cx).week_offset;
        let today = Local::now().date_naive();
        let days_from_monday = today.weekday().num_days_from_monday();
        let monday = today - Duration::days(days_from_monday as i64);
        monday + Duration::weeks(offset as i64)
    }
}

fn day_abbr(weekday: Weekday) -> &'static str {
    match weekday {
        Weekday::Mon => "Mon",
        Weekday::Tue => "Tue",
        Weekday::Wed => "Wed",
        Weekday::Thu => "Thu",
        Weekday::Fri => "Fri",
        Weekday::Sat => "Sat",
        Weekday::Sun => "Sun",
    }
}

impl Render for CalendarViewComponent {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = self.theme.clone();
        let week_start = self.week_start(cx);
        let today = Local::now().date_naive();
        let cal_view = self.state.read(cx).calendar_view.clone();

        let days: Vec<NaiveDate> = (0..7i64)
            .map(|i| week_start + Duration::days(i))
            .collect();

        let week_label = SharedString::from(format!(
            "{} {} – {} {}",
            days[0].format("%b"),
            days[0].day(),
            days[6].format("%b"),
            days[6].day(),
        ));

        div()
            .flex()
            .flex_col()
            .size_full()
            .bg(theme.bg)
            .child(
                // Header bar
                div()
                    .flex()
                    .items_center()
                    .justify_between()
                    .px(px(24.0))
                    .py(px(16.0))
                    .border_b_1()
                    .border_color(theme.border)
                    .child(
                        // View toggle
                        div()
                            .flex()
                            .gap(px(4.0))
                            .child(
                                div()
                                    .px(px(12.0))
                                    .py(px(6.0))
                                    .rounded(px(6.0))
                                    .bg(if cal_view == CalendarView::Week {
                                        theme.accent
                                    } else {
                                        theme.surface2
                                    })
                                    .text_color(theme.text_primary.clone())
                                    .text_sm()
                                    .child("Week")
                            )
                            .child(
                                div()
                                    .px(px(12.0))
                                    .py(px(6.0))
                                    .rounded(px(6.0))
                                    .bg(if cal_view == CalendarView::Month {
                                        theme.accent
                                    } else {
                                        theme.surface2
                                    })
                                    .text_color(theme.text_primary.clone())
                                    .text_sm()
                                    .child("Month")
                            )
                    )
                    .child(
                        // Week label + nav
                        div()
                            .flex()
                            .items_center()
                            .gap(px(12.0))
                            .child(
                                div()
                                    .px(px(8.0))
                                    .py(px(4.0))
                                    .rounded(px(4.0))
                                    .bg(theme.surface2)
                                    .text_color(theme.text_primary.clone())
                                    .text_sm()
                                    .child("←")
                            )
                            .child(
                                div()
                                    .text_color(theme.text_primary.clone())
                                    .text_sm()
                                    .font_weight(FontWeight::SEMIBOLD)
                                    .child(week_label)
                            )
                            .child(
                                div()
                                    .px(px(8.0))
                                    .py(px(4.0))
                                    .rounded(px(4.0))
                                    .bg(theme.surface2)
                                    .text_color(theme.text_primary.clone())
                                    .text_sm()
                                    .child("→")
                            )
                    )
            )
            .child(
                // Week grid
                div()
                    .flex()
                    .flex_1()
                    .overflow_hidden()
                    .children(days.into_iter().map(|day| {
                        let is_today = day == today;
                        let day_abbr_str = SharedString::from(day_abbr(day.weekday()));
                        let day_num_str = SharedString::from(day.day().to_string());

                        let header_bg = if is_today {
                            theme.surface2.clone()
                        } else {
                            theme.surface.clone()
                        };

                        let num_text_color = theme.text_primary.clone();
                        let abbr_color = if is_today {
                            theme.accent.clone()
                        } else {
                            theme.text_secondary.clone()
                        };
                        let num_circle_bg: Option<Hsla> = if is_today {
                            Some(theme.accent.clone())
                        } else {
                            None
                        };
                        let num_weight = if is_today {
                            FontWeight::BOLD
                        } else {
                            FontWeight::NORMAL
                        };

                        let body_bg = if is_today {
                            theme.surface.clone()
                        } else {
                            theme.bg.clone()
                        };

                        div()
                            .flex()
                            .flex_col()
                            .flex_1()
                            .border_r_1()
                            .border_color(theme.border.clone())
                            .child(
                                // Day header
                                div()
                                    .flex()
                                    .flex_col()
                                    .items_center()
                                    .py(px(12.0))
                                    .border_b_1()
                                    .border_color(theme.border.clone())
                                    .bg(header_bg)
                                    .child(
                                        div()
                                            .text_color(abbr_color)
                                            .text_xs()
                                            .font_weight(FontWeight::SEMIBOLD)
                                            .child(day_abbr_str)
                                    )
                                    .child(
                                        div()
                                            .w(px(28.0))
                                            .h(px(28.0))
                                            .flex()
                                            .items_center()
                                            .justify_center()
                                            .rounded_full()
                                            .mt(px(4.0))
                                            .when_some(num_circle_bg, |el, bg| el.bg(bg))
                                            .child(
                                                div()
                                                    .text_color(num_text_color)
                                                    .text_sm()
                                                    .font_weight(num_weight)
                                                    .child(day_num_str)
                                            )
                                    )
                            )
                            .child(
                                // Day body
                                div()
                                    .flex_1()
                                    .overflow_hidden()
                                    .bg(body_bg)
                                    .p(px(4.0))
                                    .child(
                                        div()
                                            .text_color(theme.text_secondary.clone())
                                            .text_xs()
                                            .child("")
                                    )
                            )
                    }))
            )
    }
}
