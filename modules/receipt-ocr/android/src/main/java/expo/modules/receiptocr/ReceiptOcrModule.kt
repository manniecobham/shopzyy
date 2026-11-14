package expo.modules.receiptocr

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class ReceiptOcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ReceiptOcr")

    AsyncFunction("recognize") { path: String, promise: Promise ->
      try {
        val context = appContext.reactContext ?: throw Exception("No context")
        val file = File(path.removePrefix("file://"))
        if (!file.exists()) throw Exception("File not found")
        val image = InputImage.fromFilePath(context, Uri.fromFile(file))
        val width = image.width
        val height = image.height
        val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

        recognizer.process(image)
          .addOnSuccessListener { result ->
            val fragments = result.textBlocks.flatMap { it.lines }.mapNotNull { line ->
              val box = line.boundingBox ?: return@mapNotNull null
              mapOf(
                "text" to line.text,
                "x" to box.left.toDouble() / width,
                "y" to box.top.toDouble() / height,
                "width" to box.width().toDouble() / width,
                "height" to box.height().toDouble() / height
              )
            }
            promise.resolve(mapOf("width" to width, "height" to height, "fragments" to fragments))
          }
          .addOnFailureListener { error -> promise.reject(CodedException("RECOGNITION_FAILED", error.message ?: "Recognition failed", error)) }
      } catch (error: Exception) {
        promise.reject(CodedException("UNKNOWN_ERROR", error.message ?: "Unknown error", error))
      }
    }
  }
}
