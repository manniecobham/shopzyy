import ExpoModulesCore

public class ShopzyLegacyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ShopzyLegacy")

    AsyncFunction("readStore") { () -> [String: Any]? in
      LegacyStoreReader.readDefaultStore()
    }

    AsyncFunction("readDefaults") { () -> [String: Any] in
      LegacyStoreReader.readDefaults()
    }
  }
}
