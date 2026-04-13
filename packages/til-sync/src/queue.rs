/// Offline mutation queue — buffers writes when network is unavailable.
/// Replayed in order when SyncClient reconnects.

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::client::{NewTask, TaskPatch};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PendingMutation {
    CreateTask { id: Uuid, task: NewTask },
    UpdateTask { id: Uuid, patch: TaskPatch },
    DeleteTask { id: Uuid },
}

#[derive(Debug, Default)]
pub struct OfflineQueue {
    mutations: std::collections::VecDeque<PendingMutation>,
}

impl OfflineQueue {
    pub fn push(&mut self, m: PendingMutation) {
        self.mutations.push_back(m);
    }

    pub fn drain(&mut self) -> Vec<PendingMutation> {
        self.mutations.drain(..).collect()
    }

    pub fn is_empty(&self) -> bool {
        self.mutations.is_empty()
    }

    pub fn len(&self) -> usize {
        self.mutations.len()
    }
}
