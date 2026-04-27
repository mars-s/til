import Foundation

struct NLPParser {
    static func parse(_ input: String) -> ParsedTask {
        var scheduledAt: Date?
        var deadlineAt: Date?
        var durationMinutes: Int?
        var priority: TaskPriority = .medium

        let nsInput = input as NSString
        var consumedRanges: [NSRange] = []

        if let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.date.rawValue) {
            let range = NSRange(location: 0, length: nsInput.length)
            let matches = detector.matches(in: input, options: [], range: range)
            if let first = matches.first, let date = first.date {
                scheduledAt = date
                consumedRanges.append(first.range)
            }
            if matches.count > 1, let date = matches[1].date {
                deadlineAt = date
                consumedRanges.append(matches[1].range)
            }
        }

        let tagPattern = try? NSRegularExpression(pattern: "#([A-Za-z0-9_-]+)")
        let tags = tagPattern?
            .matches(in: input, range: NSRange(location: 0, length: nsInput.length))
            .compactMap { match -> String? in
                consumedRanges.append(match.range)
                guard match.numberOfRanges > 1 else { return nil }
                return nsInput.substring(with: match.range(at: 1))
            } ?? []

        let lowercased = input.lowercased()
        if lowercased.contains("urgent") || lowercased.contains("asap") {
            priority = .urgent
        } else if lowercased.contains("high") {
            priority = .high
        } else if lowercased.contains("low") {
            priority = .low
        }

        if let durationRegex = try? NSRegularExpression(pattern: "(?:for|\\b)(\\d+)\\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\\b", options: [.caseInsensitive]),
           let match = durationRegex.firstMatch(in: input, range: NSRange(location: 0, length: nsInput.length))
        {
            let value = Int(nsInput.substring(with: match.range(at: 1))) ?? 0
            let unit = nsInput.substring(with: match.range(at: 2)).lowercased()
            durationMinutes = ["h", "hr", "hrs", "hour", "hours"].contains(unit) ? value * 60 : value
            consumedRanges.append(match.range)
        }

        let title = cleanedTitle(from: input, removing: consumedRanges)

        return ParsedTask(
            title: title.isEmpty ? input.trimmingCharacters(in: .whitespacesAndNewlines) : title,
            scheduledAt: scheduledAt,
            deadlineAt: deadlineAt,
            durationMinutes: durationMinutes,
            priority: priority,
            tags: tags
        )
    }

    private static func cleanedTitle(from input: String, removing ranges: [NSRange]) -> String {
        let nsInput = input as NSString
        var mutable = input

        for range in ranges.sorted(by: { $0.location > $1.location }) where range.location != NSNotFound {
            let swiftRange = Range(range, in: mutable)
            if let swiftRange {
                mutable.removeSubrange(swiftRange)
            } else if range.location + range.length <= nsInput.length {
                let fragment = nsInput.substring(with: range)
                mutable = mutable.replacingOccurrences(of: fragment, with: "")
            }
        }

        return mutable
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
