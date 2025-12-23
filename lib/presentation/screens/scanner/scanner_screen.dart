import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../blocs/scanner/scanner_bloc.dart';
import '../../blocs/scanner/scanner_event.dart';
import '../../blocs/scanner/scanner_state.dart';
import '../../blocs/product/product_bloc.dart';
import '../../blocs/product/product_event.dart';
import '../../widgets/barcode_overlay.dart';
import '../../../data/local/search_history_local.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> with WidgetsBindingObserver {
  final MobileScannerController _scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
    torchEnabled: false,
  );

  SearchHistoryLocal? _historyLocal;
  final ImagePicker _imagePicker = ImagePicker();
  String? _lastScannedBarcode;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    context.read<ScannerBloc>().add(StartScanning());
    _initHistory();
  }

  Future<void> _initHistory() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _historyLocal = SearchHistoryLocal(prefs);
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _scannerController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_scannerController.value.isInitialized) return;

    switch (state) {
      case AppLifecycleState.resumed:
        _scannerController.start();
        break;
      case AppLifecycleState.inactive:
      case AppLifecycleState.paused:
        _scannerController.stop();
        break;
      default:
        break;
    }
  }

  /// ✅ DETECCIÓN DUAL: Código + Foto de respaldo
  void _onDetect(BarcodeCapture capture) async {
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty || _isProcessing) return;

    final String? code = barcodes.first.rawValue;
    
    if (code != null && code != _lastScannedBarcode) {
      _isProcessing = true;
      _lastScannedBarcode = code;

      try {
        // 1. Detenemos el scanner para estabilizar la cámara
        await _scannerController.stop();
        
        // 2. Tomamos una captura de alta calidad para la IA
        final captureFile = await _scannerController.takePicture();
        
        if (mounted) {
          context.read<ScannerBloc>().add(BarcodeDetected(code));
          
          // 3. Navegamos a la pantalla de procesamiento enviando el pack completo
          // IMPORTANTE: Aquí NO llamamos a _searchProduct para evitar el GET antiguo
          context.push('/ai-search', extra: {
            'imagePath': captureFile.path,
            'barcode': code,
          }).then((_) {
            // Al regresar, reiniciamos el estado para permitir nuevos escaneos
            if (mounted) {
              _isProcessing = false;
              _lastScannedBarcode = null;
              _scannerController.start();
              context.read<ScannerBloc>().add(ResetScanner());
            }
          });
        }
      } catch (e) {
        debugPrint('❌ Error en captura dual: $e');
        // Si falla la foto, intentamos búsqueda tradicional por si acaso
        _searchProduct(code);
      }
    }
  }

  /// Búsqueda tradicional (Solo se usa si falla la captura de foto)
  Future<void> _searchProduct(String barcode) async {
    context.read<ProductBloc>().add(SearchProductByBarcode(barcode));
    context.push('/results');
  }

  /// ✅ BUSCAR POR FOTO (Botón Azul)
  Future<void> _searchByPhoto() async {
    try {
      await _scannerController.stop();

      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1024, 
        imageQuality: 85,
      );

      if (image != null && mounted) {
        context.push('/ai-search', extra: {
          'imagePath': image.path,
          'barcode': null, // Es identificación pura por imagen
        }).then((_) {
          if (mounted) _scannerController.start();
        });
      } else {
        await _scannerController.start();
      }
    } catch (e) {
      _showError('Error al capturar foto: $e');
      await _scannerController.start();
    }
  }

  Future<void> _scanFromGallery() async {
    try {
      final XFile? image = await _imagePicker.pickImage(source: ImageSource.gallery);

      if (image != null && mounted) {
        // Intentamos ver si hay un código en la foto de la galería
        final BarcodeCapture? capture = await _scannerController.analyzeImage(image.path);

        if (capture != null && capture.barcodes.isNotEmpty) {
          final String? code = capture.barcodes.first.rawValue;
          context.push('/ai-search', extra: {
            'imagePath': image.path,
            'barcode': code,
          });
        } else {
          // Si no hay código, preguntamos si usar IA
          _askForAISearch(image.path);
        }
      }
    } catch (e) {
      _showError('Error al cargar imagen: $e');
    }
  }

  Future<void> _askForAISearch(String imagePath) async {
    final bool? useAI = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Código no detectado'),
        content: const Text('¿Deseas identificar el producto usando Inteligencia Artificial?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('NO')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('SÍ, USAR IA')),
        ],
      ),
    );

    if (useAI == true && mounted) {
      context.push('/ai-search', extra: {
        'imagePath': imagePath,
        'barcode': null,
      });
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: _buildCircleAction(Icons.arrow_back, () => context.pop()),
        actions: [
          _buildCircleAction(Icons.history, () => context.push('/history')),
          const SizedBox(width: 8),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _scannerController,
            onDetect: _onDetect,
          ),
          
          // Overlay visual del escáner
          BlocBuilder<ScannerBloc, ScannerState>(
            builder: (context, state) {
              return BarcodeOverlay(
                isDetecting: state is ScannerDetecting,
                detectedBarcode: state is ScannerDetecting ? state.barcode : null,
              );
            },
          ),

          // Controles Inferiores
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Column(
              children: [
                _buildMainPhotoButton(),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildFlashControl(),
                    _buildSecondaryButton(Icons.photo_library, 'Galería', _scanFromGallery),
                    _buildSecondaryButton(Icons.keyboard, 'Manual', _showManualInputDialog),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCircleAction(IconData icon, VoidCallback onTap) {
    return IconButton(
      icon: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
        child: Icon(icon, color: Colors.white),
      ),
      onPressed: onTap,
    );
  }

  Widget _buildMainPhotoButton() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 60),
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _isProcessing ? null : _searchByPhoto,
        icon: const Icon(Icons.camera_alt, size: 28),
        label: const Text('IDENTIFICAR POR FOTO', 
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.blueAccent,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 18),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
          elevation: 8,
        ),
      ),
    );
  }

  Widget _buildFlashControl() {
    return BlocBuilder<ScannerBloc, ScannerState>(
      builder: (context, state) {
        final isFlashOn = state.isFlashOn;
        return _buildSecondaryButton(
          isFlashOn ? Icons.flash_on : Icons.flash_off,
          'Flash',
          () {
            _scannerController.toggleTorch();
            context.read<ScannerBloc>().add(ToggleFlash());
          },
          color: isFlashOn ? Colors.yellow : Colors.white,
        );
      },
    );
  }

  Widget _buildSecondaryButton(IconData icon, String label, VoidCallback? onTap, {Color color = Colors.white}) {
    return Column(
      children: [
        CircleAvatar(
          backgroundColor: Colors.black87,
          radius: 28,
          child: IconButton(icon: Icon(icon, color: color), onPressed: onTap),
        ),
        const SizedBox(height: 8),
        Text(label, style: const TextStyle(color: Colors.white, fontSize: 12)),
      ],
    );
  }

  void _showManualInputDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Código Manual'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(hintText: 'Ej: 775123456789'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('CANCELAR')),
          ElevatedButton(
            onPressed: () {
              final code = controller.text.trim();
              if (code.isNotEmpty) {
                Navigator.pop(context);
                _onDetect(BarcodeCapture(barcodes: [Barcode(rawValue: code)]));
              }
            }, 
            child: const Text('BUSCAR')
          ),
        ],
      ),
    );
  }
}