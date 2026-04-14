import Foundation
import NaturalLanguage

struct TilNlpParser {

  /// Parse a natural-language task string using NSDataDetector + NLTagger.
  /// Returns a dictionary matching ParsedTask shape expected by lib/nlp.ts.
  static func parse(_ input: String) -> [String: Any] {
    var result: [String: Any] = ["title": input]
    var spans:  [[String: Any]] = []
    var masked: [Bool] = Array(repeating: false, count: input.utf16.count)

    // ── 1. NSDataDetector — absolute dates and times ───────────────────────
    let detectorTypes: NSTextCheckingResult.CheckingType = [.date]
    if let detector = try? NSDataDetector(types: detectorTypes.rawValue) {
      let nsInput = input as NSString
      let range   = NSRange(location: 0, length: nsInput.length)

      detector.enumerateMatches(in: input, options: [], range: range) { match, _, _ in
        guard let match = match, let date = match.date else { return }

        let start = match.range.location
        let end   = match.range.upperBound

        // Don't override an already-matched region
        if masked[start..<min(end, masked.count)].contains(true) { return }

        result["scheduled_at"] = ISO8601DateFormatter().string(from: date)
        spans.append(["start": start, "end": end, "kind": "Date"])
        for i in start..<min(end, masked.count) { masked[i] = true }
      }
    }

    // ── 2. NLTagger — relative temporal expressions ────────────────────────
    // (.temporalExpression is available iOS 14+)
    if #available(iOS 14.0, *) {
      let tagger = NLTagger(tagSchemes: [.temporalExpression])
      tagger.string = input

      let fullRange = input.startIndex..<input.endIndex
      tagger.enumerateTags(in: fullRange, unit: .word, scheme: .temporalExpression) { tag, range in
        guard tag != nil else { return true }

        let start = input.distance(from: input.startIndex, to: range.lowerBound)
        let end   = input.distance(from: input.startIndex, to: range.upperBound)

        if start < masked.count && !masked[start] {
          spans.append(["start": start, "end": end, "kind": "Date"])
          for i in start..<min(end, masked.count) { masked[i] = true }
        }
        return true
      }
    }

    // ── 3. Build cleaned title by removing masked regions ──────────────────
    var title = ""
    for (i, char) in input.enumerated() {
      let utf16Offset = input.utf16.distance(from: input.utf16.startIndex, to: input.utf16.index(input.utf16.startIndex, offsetBy: i))
      if utf16Offset < masked.count && !masked[utf16Offset] {
        title.append(char)
      }
    }

    // Collapse multiple spaces
    result["title"] = title
      .components(separatedBy: .whitespaces)
      .filter { !$0.isEmpty }
      .joined(separator: " ")

    result["spans"] = spans
    return result
  }
}
