import ExpoModulesCore
import ImageIO
import UIKit
import Vision

private extension CGImagePropertyOrientation {
  init(_ o: UIImage.Orientation) {
    switch o {
    case .up: self = .up
    case .upMirrored: self = .upMirrored
    case .down: self = .down
    case .downMirrored: self = .downMirrored
    case .left: self = .left
    case .leftMirrored: self = .leftMirrored
    case .right: self = .right
    case .rightMirrored: self = .rightMirrored
    @unknown default: self = .up
    }
  }
}

public class ReceiptOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReceiptOcr")

    AsyncFunction("recognize") { (path: String) -> [String: Any] in
      let url = path.hasPrefix("file://") ? (URL(string: path) ?? URL(fileURLWithPath: path)) : URL(fileURLWithPath: path)
      guard let data = try? Data(contentsOf: url), let image = UIImage(data: data), let cgImage = image.cgImage else {
        throw Exception(name: "ReceiptOcrError", description: "The image could not be loaded")
      }

      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = false

      let handler = VNImageRequestHandler(cgImage: cgImage, orientation: CGImagePropertyOrientation(image.imageOrientation))
      try handler.perform([request])

      let upright = image.imageOrientation.rawValue >= 4
      let width = upright ? cgImage.height : cgImage.width
      let height = upright ? cgImage.width : cgImage.height

      let fragments: [[String: Any]] = (request.results ?? []).compactMap { observation in
        guard let text = observation.topCandidates(1).first?.string else { return nil }
        let box = observation.boundingBox
        return ["text": text, "x": box.minX, "y": 1 - box.maxY, "width": box.width, "height": box.height]
      }
      return ["width": width, "height": height, "fragments": fragments]
    }
  }
}
