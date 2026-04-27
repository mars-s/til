import SwiftUI

extension Color {
    // Surfaces
    static let ink    = Color(hex: "#080808")
    static let ink2   = Color(hex: "#101010")
    static let ink3   = Color(hex: "#161616")
    static let ink4   = Color(hex: "#1e1e1e")
    static let smoke  = Color(hex: "#282828")
    static let ash    = Color(hex: "#363636")

    // Text hierarchy
    static let text1  = Color(hex: "#f0e8dc")
    static let text2  = Color(hex: "#a89880")
    static let text3  = Color(hex: "#6a6058")
    static let text4  = Color(hex: "#3d3830")

    // Accents
    static let amber      = Color(hex: "#e8a842")
    static let amberLight = Color(hex: "#f0bc64")
    static let jade       = Color(hex: "#3eb58a")
    static let rose       = Color(hex: "#e05555")
    static let sky        = Color(hex: "#5b9cf0")
    static let violet     = Color(hex: "#9b74d4")
    static let sand       = Color(hex: "#d7c7ad")

    // Border
    static let border  = Color.white.opacity(0.055)
    static let border2 = Color.white.opacity(0.09)

    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8)  & 0xFF) / 255
        let b = Double(int & 0xFF)          / 255
        self.init(red: r, green: g, blue: b)
    }
}

extension TaskPriority {
    var color: Color {
        switch self {
        case .low: .jade
        case .medium: .sky
        case .high: .amber
        case .urgent: .rose
        }
    }
}

extension CalendarInfo {
    var swiftUIColor: Color {
        guard let color else { return .sky }
        return Color(hex: color)
    }
}

extension CalendarEventRecord {
    var swiftUIColor: Color {
        Color(hex: displayColorHex)
    }
}
