import 'package:equatable/equatable.dart';

abstract class ScannerEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class StartScanning extends ScannerEvent {}

class StopScanning extends ScannerEvent {}

class BarcodeDetected extends ScannerEvent {
  final String barcode;

  BarcodeDetected(this.barcode);

  @override
  List<Object?> get props => [barcode];
}

class ToggleFlash extends ScannerEvent {}

class ScanFromGallery extends ScannerEvent {}

class ResetScanner extends ScannerEvent {}
