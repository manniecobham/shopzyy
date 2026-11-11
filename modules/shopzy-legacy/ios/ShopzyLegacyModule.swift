import ExpoModulesCore

/// One-time, read-only bridge to what the original Swift Shopzy app left on this device.
public class ShopzyLegacyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ShopzyLegacy")

    /// The old SwiftData store as plain rows, or null when this phone never had the old app.
    AsyncFunction("readStore") { () -> [String: Any]? in
      LegacyStoreReader.readDefaultStore()
    }

    /// The old app's UserDefaults (identity, profile, preferences).
    AsyncFunction("readDefaults") { () -> [String: Any] in
      LegacyStoreReader.readDefaults()
    }
  }
}
