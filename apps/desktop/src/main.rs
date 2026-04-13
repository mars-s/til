mod state;
mod theme;
mod views;

use gpui::prelude::*;
use gpui::*;
use state::{AppState, Tab};
use theme::TilTheme;
use views::root::RootView;

// ─── Actions ────────────────────────────────────────────────────────────────

actions!(til, [OpenCommandPalette, NewTask, Escape]);

// ─── Main ────────────────────────────────────────────────────────────────────

fn main() {
    gpui_platform::application().run(|cx: &mut App| {
        // Global keybindings
        cx.bind_keys([
            KeyBinding::new("cmd-k", OpenCommandPalette, None),
            KeyBinding::new("cmd-n", NewTask, None),
            KeyBinding::new("escape", Escape, None),
        ]);

        let theme = TilTheme::dark();
        let state = cx.new(|_| AppState::new());

        // Global action handlers
        {
            let state_cmd = state.clone();
            cx.on_action(move |_: &OpenCommandPalette, cx| {
                state_cmd.update(cx, |s, _| s.open_command_palette());
            });

            let state_task = state.clone();
            cx.on_action(move |_: &NewTask, cx| {
                state_task.update(cx, |s, _| s.set_tab(Tab::Tasks));
            });

            let state_esc = state.clone();
            cx.on_action(move |_: &Escape, cx| {
                state_esc.update(cx, |s, _| {
                    if s.command_palette_open {
                        s.close_command_palette();
                    }
                });
            });
        }

        let bounds = Bounds::centered(
            None,
            size(px(1200.0), px(800.0)),
            cx,
        );

        let state_for_window = state.clone();
        let theme_for_window = theme.clone();
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                titlebar: Some(TitlebarOptions {
                    title: Some(SharedString::from("Til")),
                    appears_transparent: true,
                    traffic_light_position: Some(point(px(12.0), px(12.0))),
                }),
                ..Default::default()
            },
            move |_, cx| {
                cx.new(|cx| RootView::new(state_for_window, theme_for_window, cx))
            },
        )
        .unwrap();

        cx.activate(true);
    });
}
