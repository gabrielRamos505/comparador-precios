import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:vibration/vibration.dart';
import 'scanner_event.dart';
import 'scanner_state.dart';

class ScannerBloc extends Bloc<ScannerEvent, ScannerState> {
  bool _isFlashOn = false;

  ScannerBloc() : super(ScannerInitial()) {
    on<StartScanning>(_onStartScanning);
    on<StopScanning>(_onStopScanning);
    on<BarcodeDetected>(_onBarcodeDetected);
    on<ToggleFlash>(_onToggleFlash);
    on<ResetScanner>(_onResetScanner);
  }

  void _onStartScanning(StartScanning event, Emitter<ScannerState> emit) {
    emit(ScannerReady(isFlashOn: _isFlashOn, isScanning: true));
  }

  void _onStopScanning(StopScanning event, Emitter<ScannerState> emit) {
    emit(ScannerReady(isFlashOn: _isFlashOn, isScanning: false));
  }

  Future<void> _onBarcodeDetected(
    BarcodeDetected event,
    Emitter<ScannerState> emit,
  ) async {
    // Vibrar al detectar
    if (await Vibration.hasVibrator() ?? false) {
      Vibration.vibrate(duration: 100);
    }

    emit(ScannerDetecting(event.barcode, isFlashOn: _isFlashOn));
  }

  void _onToggleFlash(ToggleFlash event, Emitter<ScannerState> emit) {
    _isFlashOn = !_isFlashOn;
    emit(ScannerReady(isFlashOn: _isFlashOn, isScanning: true));
  }

  void _onResetScanner(ResetScanner event, Emitter<ScannerState> emit) {
    emit(ScannerReady(isFlashOn: _isFlashOn, isScanning: true));
  }
}
