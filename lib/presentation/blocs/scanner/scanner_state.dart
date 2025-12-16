import 'package:equatable/equatable.dart';

abstract class ScannerState extends Equatable {
  final bool isFlashOn;
  final bool isScanning;

  const ScannerState({
    this.isFlashOn = false,
    this.isScanning = false,
  });

  @override
  List<Object?> get props => [isFlashOn, isScanning];
}

class ScannerInitial extends ScannerState {}

class ScannerReady extends ScannerState {
  const ScannerReady({super.isFlashOn, super.isScanning});
}

class ScannerDetecting extends ScannerState {
  final String barcode;

  const ScannerDetecting(this.barcode, {super.isFlashOn});

  @override
  List<Object?> get props => [barcode, isFlashOn];
}

class ScannerError extends ScannerState {
  final String message;

  const ScannerError(this.message);

  @override
  List<Object?> get props => [message];
}
