import 'package:google_mlkit_barcode_scanning/google_mlkit_barcode_scanning.dart';

class BarcodeScannerService {
  final BarcodeScanner _barcodeScanner = BarcodeScanner();

  Future<String?> processImage(String path) async {
    final inputImage = InputImage.fromFilePath(path);
    
    try {
      final List<Barcode> barcodes = await _barcodeScanner.processImage(inputImage);
      
      for (Barcode barcode in barcodes) {
        final String? code = barcode.rawValue;
        if (code != null && code.isNotEmpty) {
          return code;
        }
      }
      return null;
    } catch (e) {
      print('Error en BarcodeScannerService: $e');
      return null;
    }
  }

  void dispose() {
    _barcodeScanner.close();
  }
}
