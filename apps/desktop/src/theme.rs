#![allow(dead_code)]
use gpui::Hsla;

#[derive(Clone, Debug)]
pub struct TilTheme {
    pub bg: Hsla,
    pub surface: Hsla,
    pub surface2: Hsla,
    pub text_primary: Hsla,
    pub text_secondary: Hsla,
    pub accent: Hsla,
    pub span_time: Hsla,
    pub span_date: Hsla,
    pub span_priority: Hsla,
    pub span_duration: Hsla,
    pub task_done: Hsla,
    pub task_in_progress: Hsla,
    pub border: Hsla,
}

fn hex(r: u8, g: u8, b: u8) -> Hsla {
    gpui::rgb(((r as u32) << 16) | ((g as u32) << 8) | (b as u32)).into()
}

impl TilTheme {
    pub fn dark() -> Self {
        Self {
            bg: hex(0x0f, 0x0f, 0x0f),
            surface: hex(0x1a, 0x1a, 0x1a),
            surface2: hex(0x24, 0x24, 0x24),
            text_primary: hex(0xf0, 0xf0, 0xf0),
            text_secondary: hex(0x8a, 0x8a, 0x8a),
            accent: hex(0x63, 0x66, 0xf1),
            span_time: hex(0x3b, 0x82, 0xf6),
            span_date: hex(0x10, 0xb9, 0x81),
            span_priority: hex(0xf5, 0x9e, 0x0b),
            span_duration: hex(0x8b, 0x5c, 0xf6),
            task_done: hex(0x4a, 0xde, 0x80),
            task_in_progress: hex(0xf5, 0x9e, 0x0b),
            border: hex(0x2a, 0x2a, 0x2a),
        }
    }
}
