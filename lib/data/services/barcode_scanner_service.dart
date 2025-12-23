import 'package:google_mlkit_barcode_scanning/google_mlkit_barcode_scanning.dart';
import 'package:flutter/foundation.dart';

class BarcodeScannerService {
  final BarcodeScanner _barcodeScanner = BarcodeScanner();

  /// Procesa una imagen y extrae el primer código de barras encontrado
  Future<String?> processImage(String path) async {
    try {
      final inputImage = InputImage.fromFilePath(path);
      final List<Barcode> barcodes = await _barcodeScanner.processImage(inputImage);
      
      // Priorizar códigos EAN/UPC (más comunes en retail)
      for (Barcode barcode in barcodes) {
        if (barcode.type == BarcodeType.ean13 || 
            barcode.type == BarcodeType.ean8 ||
            barcode.type == BarcodeType.upcA ||
            barcode.type == BarcodeType.upcE) {
          final code = barcode.rawValue;
          if (code != null && code.isNotEmpty) {
            debugPrint('✅ Barcode detectado: $code (${barcode.type})');
            return code;
          }
        }
      }
      
      // Fallback: retornar cualquier código detectado
      for (Barcode barcode in barcodes) {
        final code = barcode.rawValue;
        if (code != null && code.isNotEmpty) {
          debugPrint('✅ Barcode detectado (otros): $code');
          return code;
        }
      }
      
      debugPrint('⚠️ No se detectó ningún código de barras en la imagen');
      return null;
    } catch (e) {
      debugPrint('❌ Error en BarcodeScannerService: $e');
      return null;
    }
  }

  void dispose() {
    _barcodeScanner.close();
  }
}