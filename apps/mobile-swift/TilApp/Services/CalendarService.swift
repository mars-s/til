import Foundation
import Supabase

private struct CreateCalendarEventRequest: Encodable {
    let title: String
    let startAt: String
    let endAt: String

    enum CodingKeys: String, CodingKey {
        case title
        case startAt = "start_at"
        case endAt = "end_at"
    }
}

@MainActor
final class CalendarService: ObservableObject {
    @Published private(set) var events: [CalendarEventRecord] = []
    @Published private(set) var calendars: [CalendarInfo] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private var client: SupabaseClient { SupabaseManager.shared.client }
    private var eventRealtimeTask: Task<Void, Never>?
    private var calendarRealtimeTask: Task<Void, Never>?
    private var eventRealtimeChannel: RealtimeChannelV2?
    private var calendarRealtimeChannel: RealtimeChannelV2?

    deinit {
        eventRealtimeTask?.cancel()
        calendarRealtimeTask?.cancel()
    }

    func handleSignedIn() async {
        await refreshAll()
        await startRealtime()
    }

    func handleSignedOut() {
        eventRealtimeTask?.cancel()
        calendarRealtimeTask?.cancel()
        eventRealtimeTask = nil
        calendarRealtimeTask = nil
        if let eventRealtimeChannel {
            Task { await client.removeChannel(eventRealtimeChannel) }
        }
        if let calendarRealtimeChannel {
            Task { await client.removeChannel(calendarRealtimeChannel) }
        }
        eventRealtimeChannel = nil
        calendarRealtimeChannel = nil
        events = []
        calendars = []
        errorMessage = nil
        isLoading = false
    }

    func refreshAll() async {
        isLoading = true
        defer { isLoading = false }
        await fetchCalendars()
        await fetchEvents()
    }

    func fetchCalendars() async {
        do {
            let session = try await client.auth.session
            let fetched: [CalendarInfo] = try await client
                .from("calendars")
                .select("id,name,color,is_primary")
                .eq("user_id", value: session.user.id.uuidString)
                .order("name", ascending: true)
                .execute()
                .value
            calendars = fetched
        } catch {
            errorMessage = error.localizedDescription
            print("CalendarService.fetchCalendars error: \(error)")
        }
    }

    func fetchEvents() async {
        do {
            let fetched: [CalendarEventRecord] = try await client
                .from("calendar_events")
                .select("id,calendar_id,title,start_at,end_at,is_task_block,is_suggestion,calendar:calendars(id,name,color,is_primary)")
                .order("start_at", ascending: true)
                .execute()
                .value
            events = fetched
        } catch {
            errorMessage = error.localizedDescription
            print("CalendarService.fetchEvents error: \(error)")
        }
    }

    func createEvent(title: String, startAt: Date, endAt: Date) async {
        do {
            let formatter = ISO8601DateFormatter()
            _ = try await client.functions.invoke(
                "create-calendar-event",
                options: FunctionInvokeOptions(
                    body: CreateCalendarEventRequest(
                        title: title,
                        startAt: formatter.string(from: startAt),
                        endAt: formatter.string(from: endAt)
                    )
                )
            )
            await fetchEvents()
        } catch {
            errorMessage = error.localizedDescription
            print("CalendarService.createEvent error: \(error)")
        }
    }

    private func startRealtime() async {
        eventRealtimeTask?.cancel()
        calendarRealtimeTask?.cancel()
        if let eventRealtimeChannel {
            await client.removeChannel(eventRealtimeChannel)
        }
        if let calendarRealtimeChannel {
            await client.removeChannel(calendarRealtimeChannel)
        }
        eventRealtimeChannel = nil
        calendarRealtimeChannel = nil

        do {
            let session = try await client.auth.session
            let userId = session.user.id.uuidString
            let calendarsChannel = client.channel("calendars-\(userId)")
            let calendarsStream = calendarsChannel.postgresChange(
                AnyAction.self,
                schema: "public",
                table: "calendars",
                filter: .eq("user_id", value: userId)
            )
            try await calendarsChannel.subscribeWithError()
            calendarRealtimeChannel = calendarsChannel

            let eventsChannel = client.channel("events-\(userId)")
            let eventsStream = eventsChannel.postgresChange(
                AnyAction.self,
                schema: "public",
                table: "calendar_events"
            )
            try await eventsChannel.subscribeWithError()
            eventRealtimeChannel = eventsChannel

            calendarRealtimeTask = Task { [weak self] in
                guard let self else { return }
                for await _ in calendarsStream {
                    await self.fetchCalendars()
                }
            }

            eventRealtimeTask = Task { [weak self] in
                guard let self else { return }
                for await _ in eventsStream {
                    await self.fetchEvents()
                }
            }
        } catch {
            errorMessage = error.localizedDescription
            print("CalendarService.startRealtime setup error: \(error)")
        }
    }
}
