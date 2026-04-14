import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AnimatePresence, MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TaskRow from '../../components/TaskRow';
import TaskInput from '../../components/TaskInput';
import Section from '../../components/Section';
import { useTasks } from '../../hooks/useTasks';
import { Colors, Radii } from '../../constants/tokens';

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const {
    loading,
    addTask,
    toggleTask,
    deleteTask,
    setDate,
    todayTasks,
    scheduledTasks,
    somedayTasks,
    doneTasks,
  } = useTasks();

  const [showInput, setShowInput] = useState(false);

  const handleAddTap = useCallback(() => {
    setShowInput(true);
  }, []);

  const handleSubmit = useCallback(async (parsed: Parameters<typeof addTask>[0]) => {
    await addTask(parsed);
    setShowInput(false);
  }, [addTask]);

  const today = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.ink }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>◇</Text>
            <Text style={styles.emptyText}>Loading…</Text>
          </View>
        ) : (
          <>
            {/* Today */}
            <Section title="Today" count={todayTasks.length} italic date={today} />
            <AnimatePresence>
              {todayTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onUpdateDate={setDate}
                />
              ))}
            </AnimatePresence>

            {/* Scheduled */}
            <Section title="Scheduled" count={scheduledTasks.length} />
            <AnimatePresence>
              {scheduledTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onUpdateDate={setDate}
                />
              ))}
            </AnimatePresence>

            {/* Someday */}
            <Section title="Someday" count={somedayTasks.length} />
            <AnimatePresence>
              {somedayTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onUpdateDate={setDate}
                />
              ))}
            </AnimatePresence>

            {/* Done */}
            <Section title="Completed" count={doneTasks.length} />
            <AnimatePresence>
              {doneTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onUpdateDate={setDate}
                />
              ))}
            </AnimatePresence>

            {/* Empty state */}
            {todayTasks.length + scheduledTasks.length + somedayTasks.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>◇</Text>
                <Text style={styles.emptyText}>Nothing yet — tap + to add</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* NLP Input */}
      <View style={[styles.inputContainer, { paddingBottom: 84 + insets.bottom }]}>
        <AnimatePresence>
          {showInput && (
            <TaskInput onSubmit={handleSubmit} onDismiss={() => setShowInput(false)} />
          )}
        </AnimatePresence>

        {/* FAB */}
        {!showInput && (
          <MotiView
            from={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={styles.fabWrapper}
          >
            <TouchableOpacity onPress={handleAddTap} style={styles.fab} activeOpacity={0.8}>
              <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>
            <Text style={styles.fabHint}>tap to add · swipe to complete</Text>
          </MotiView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll:   { flex: 1 },
  content:  { paddingHorizontal: 20 },

  emptyState: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     80,
    gap:            10,
  },
  emptyIcon: { fontSize: 28, opacity: 0.3, color: Colors.text1 },
  emptyText: { fontFamily: 'serif', fontStyle: 'italic', fontSize: 15, color: Colors.text3 },

  inputContainer: {
    position:   'absolute',
    bottom:     0,
    left:       0,
    right:      0,
    paddingHorizontal: 16,
    gap:        12,
  },
  fabWrapper: {
    alignItems: 'center',
    gap:        6,
  },
  fab: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: Colors.amber,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     Colors.amber,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.45,
    shadowRadius:    12,
    elevation:       8,
  },
  fabIcon: {
    fontSize:   28,
    color:      Colors.ink,
    fontWeight: '300',
    lineHeight: 32,
  },
  fabHint: {
    fontFamily:    'Courier',
    fontSize:      10,
    color:         Colors.text4,
    letterSpacing: 0.3,
  },
});
