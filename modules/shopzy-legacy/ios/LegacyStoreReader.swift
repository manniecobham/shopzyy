import Foundation
import SQLite3

/// Reads what the original Swift Shopzy app stored on this device: the SwiftData store
/// (`Shopzy-v2.store`, a Core Data SQLite file) and a few UserDefaults. **Read-only**: the store is
/// copied to a temporary folder first, so the original files (and the CloudKit data they mirror)
/// are never touched.
///
/// The result is plain JSON-compatible dictionaries; interpretation lives in TypeScript where it is
/// unit-tested. Only the byte-level decoding that needs Apple APIs happens here:
///  - UUID BLOBs (16 bytes)            → "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
///  - `ZSECTIONORDER` (NSKeyedArchiver) → [String]
///  - `ZCUSTOMIMAGE` (Core Data external binary: 0x01 + bytes, or 0x02 + file name) → base64 string
/// Dates stay as Core Data seconds since 2001-01-01; relationships stay as Z_PK integers.
public enum LegacyStoreReader {
    public static let storeName = "Shopzy-v2.store"

    static let tables: [(key: String, table: String)] = [
        ("households", "ZHOUSEHOLD"),
        ("members", "ZHOUSEHOLDMEMBER"),
        ("options", "ZCUSTOMOPTION"),
        ("items", "ZGROCERYITEM"),
        ("purchases", "ZPURCHASERECORD"),
        ("tripTotals", "ZTRIPTOTAL"),
    ]

    public static func defaultStoreURL() -> URL? {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?.appendingPathComponent(storeName)
    }

    /// nil when the app has no old store (a fresh install).
    public static func readDefaultStore() -> [String: Any]? {
        guard let url = defaultStoreURL(), FileManager.default.fileExists(atPath: url.path) else { return nil }
        return read(storeURL: url)
    }

    public static func read(storeURL: URL) -> [String: Any]? {
        let fm = FileManager.default
        let workDir = fm.temporaryDirectory.appendingPathComponent("ShopzyLegacy-\(UUID().uuidString)", isDirectory: true)
        defer { try? fm.removeItem(at: workDir) }
        do {
            try fm.createDirectory(at: workDir, withIntermediateDirectories: true)
            let copy = workDir.appendingPathComponent(storeURL.lastPathComponent)
            try fm.copyItem(at: storeURL, to: copy)
            for suffix in ["-wal", "-shm"] {
                let source = URL(fileURLWithPath: storeURL.path + suffix)
                if fm.fileExists(atPath: source.path) { try? fm.copyItem(at: source, to: URL(fileURLWithPath: copy.path + suffix)) }
            }

            var db: OpaquePointer?
            guard sqlite3_open_v2(copy.path, &db, SQLITE_OPEN_READWRITE, nil) == SQLITE_OK, let db else { return nil }
            defer { sqlite3_close(db) }

            let externalDir = storeURL.deletingLastPathComponent()
                .appendingPathComponent(".\(storeURL.deletingPathExtension().lastPathComponent)_SUPPORT")
                .appendingPathComponent("_EXTERNAL_DATA")

            var result: [String: Any] = [:]
            for (key, table) in tables { result[key] = rows(db: db, table: table, externalDir: externalDir) }
            return result
        } catch {
            return nil
        }
    }

    // MARK: Rows

    private static func rows(db: OpaquePointer, table: String, externalDir: URL) -> [[String: Any]] {
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db, "SELECT * FROM \(table)", -1, &statement, nil) == SQLITE_OK, let statement else { return [] }
        defer { sqlite3_finalize(statement) }

        var out: [[String: Any]] = []
        let columnCount = sqlite3_column_count(statement)
        while sqlite3_step(statement) == SQLITE_ROW {
            var row: [String: Any] = [:]
            for i in 0..<columnCount {
                guard let cName = sqlite3_column_name(statement, i) else { continue }
                let name = String(cString: cName)
                switch sqlite3_column_type(statement, i) {
                case SQLITE_INTEGER: row[name] = Int(sqlite3_column_int64(statement, i))
                case SQLITE_FLOAT: row[name] = sqlite3_column_double(statement, i)
                case SQLITE_TEXT: row[name] = sqlite3_column_text(statement, i).map { String(cString: $0) } ?? NSNull()
                case SQLITE_BLOB:
                    let length = Int(sqlite3_column_bytes(statement, i))
                    let data = length > 0 && sqlite3_column_blob(statement, i) != nil
                        ? Data(bytes: sqlite3_column_blob(statement, i), count: length) : Data()
                    if let value = decodeBlob(column: name, data: data, externalDir: externalDir) { row[name] = value }
                default: row[name] = NSNull()
                }
            }
            out.append(row)
        }
        return out
    }

    private static func decodeBlob(column: String, data: Data, externalDir: URL) -> Any? {
        switch column {
        case "ZCKSYSTEMFIELDS":
            return nil // CloudKit change tags: meaningless to Firebase.
        case "ZSECTIONORDER":
            return decodeStringArray(data)
        case "ZCUSTOMIMAGE":
            return decodeExternalBinary(data, externalDir: externalDir) ?? NSNull()
        default:
            // Every other BLOB is a UUID (ZID, ZHOUSEHOLDID).
            return uuidString(data) ?? NSNull()
        }
    }

    static func uuidString(_ data: Data) -> String? {
        guard data.count == 16 else { return nil }
        let hex = data.map { String(format: "%02X", $0) }.joined()
        let a = hex.prefix(8), b = hex.dropFirst(8).prefix(4), c = hex.dropFirst(12).prefix(4)
        let d = hex.dropFirst(16).prefix(4), e = hex.dropFirst(20)
        return "\(a)-\(b)-\(c)-\(d)-\(e)"
    }

    /// SwiftData stores `[String]` as an NSKeyedArchiver archive of an NSArray.
    static func decodeStringArray(_ data: Data) -> [String] {
        if data.isEmpty { return [] }
        if let array = try? NSKeyedUnarchiver.unarchivedArrayOfObjects(ofClass: NSString.self, from: data) {
            return array.map { $0 as String }
        }
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String] { return json }
        return []
    }

    /// Core Data external binary storage: 0x01 + the bytes inline, or 0x02 + the name of a file in `_EXTERNAL_DATA`.
    static func decodeExternalBinary(_ data: Data, externalDir: URL) -> String? {
        guard let flag = data.first else { return nil }
        let body = data.dropFirst()
        switch flag {
        case 0x01:
            return body.isEmpty ? nil : Data(body).base64EncodedString()
        case 0x02:
            guard let name = String(data: Data(body), encoding: .utf8)?.trimmingCharacters(in: .controlCharacters.union(.whitespaces)),
                  !name.isEmpty, !name.contains("/") else { return nil }
            return (try? Data(contentsOf: externalDir.appendingPathComponent(name)))?.base64EncodedString()
        default:
            return data.base64EncodedString() // not flagged: treat the whole value as image bytes
        }
    }

    // MARK: UserDefaults

    /// The settings the old app kept in UserDefaults (same app container, same bundle id).
    public static func readDefaults() -> [String: Any] {
        let d = UserDefaults.standard
        var out: [String: Any] = [:]
        for key in ["userRecordName", "currentHouseholdID", "deviceID"] {
            if let v = d.string(forKey: "shopzy.\(key)") { out[key] = v }
        }
        if let data = d.data(forKey: "shopzy.profile"), let json = String(data: data, encoding: .utf8) { out["profile"] = json }
        for key in ["hasSeenWelcome", "notifyPurchases", "notifyRestock"] {
            if d.object(forKey: "shopzy.\(key)") != nil { out[key] = d.bool(forKey: "shopzy.\(key)") }
        }
        if let announced = d.dictionary(forKey: "shopzy.announcedTrips") as? [String: Int] { out["announcedTrips"] = announced }
        if let skipped = d.stringArray(forKey: "shopzy.skippedTrips") { out["skippedTrips"] = skipped }
        return out
    }
}
