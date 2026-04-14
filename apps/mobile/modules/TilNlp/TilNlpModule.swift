import ExpoModulesCore
import NaturalLanguage

public class TilNlpModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TilNlp")

    AsyncFunction("parseTask") { (input: String) -> [String: Any] in
      return TilNlpParser.parse(input)
    }
  }
}
