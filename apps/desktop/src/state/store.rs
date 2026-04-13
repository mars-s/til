#![allow(dead_code)]
use til_core::types::{ParsedTask, Priority};

#[derive(Debug, Clone, PartialEq)]
pub enum Tab {
    Tasks,
    Calendar,
}

#[derive(Debug, Clone, PartialEq)]
pub enum CalendarView {
    Week,
    Month,
}

#[derive(Debug, Clone)]
pub struct LocalTask {
    pub id: usize,
    pub title: String,
    pub parsed: ParsedTask,
    pub done: bool,
    pub in_progress: bool,
}

pub struct AppState {
    pub tasks: Vec<LocalTask>,
    pub active_tab: Tab,
    pub input_draft: String,
    pub command_palette_open: bool,
    pub command_palette_query: String,
    pub selected_task_id: Option<usize>,
    pub calendar_view: CalendarView,
    pub week_offset: i32,
    pub next_id: usize,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            tasks: vec![
                LocalTask {
                    id: 0,
                    title: "Set up Supabase project".to_string(),
                    parsed: ParsedTask {
                        title: "Set up Supabase project".to_string(),
                        priority: Priority::High,
                        ..Default::default()
                    },
                    done: true,
                    in_progress: false,
                },
                LocalTask {
                    id: 1,
                    title: "Build GPUI desktop app".to_string(),
                    parsed: ParsedTask {
                        title: "Build GPUI desktop app".to_string(),
                        priority: Priority::Urgent,
                        ..Default::default()
                    },
                    done: false,
                    in_progress: true,
                },
                LocalTask {
                    id: 2,
                    title: "Write NLP parser tomorrow 2pm".to_string(),
                    parsed: ParsedTask {
                        title: "Write NLP parser".to_string(),
                        priority: Priority::Medium,
                        ..Default::default()
                    },
                    done: false,
                    in_progress: false,
                },
            ],
            active_tab: Tab::Tasks,
            input_draft: String::new(),
            command_palette_open: false,
            command_palette_query: String::new(),
            selected_task_id: None,
            calendar_view: CalendarView::Week,
            week_offset: 0,
            next_id: 3,
        }
    }

    pub fn add_task(&mut self, raw: &str) {
        let parsed = til_core::nlp::task::parse(raw);
        let title = parsed.title.clone();
        self.tasks.push(LocalTask {
            id: self.next_id,
            title: if title.is_empty() { raw.to_string() } else { title },
            parsed,
            done: false,
            in_progress: false,
        });
        self.next_id += 1;
    }

    pub fn toggle_done(&mut self, id: usize) {
        if let Some(task) = self.tasks.iter_mut().find(|t| t.id == id) {
            task.done = !task.done;
            if task.done {
                task.in_progress = false;
            }
        }
    }

    pub fn toggle_in_progress(&mut self, id: usize) {
        if let Some(task) = self.tasks.iter_mut().find(|t| t.id == id) {
            task.in_progress = !task.in_progress;
            if task.in_progress {
                task.done = false;
            }
        }
    }

    pub fn set_tab(&mut self, tab: Tab) {
        self.active_tab = tab;
    }

    pub fn open_command_palette(&mut self) {
        self.command_palette_open = true;
        self.command_palette_query = String::new();
    }

    pub fn close_command_palette(&mut self) {
        self.command_palette_open = false;
        self.command_palette_query = String::new();
    }
}
