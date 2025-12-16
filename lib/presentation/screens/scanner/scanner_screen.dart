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
import '../../blocs/product/product_state.dart';
import '../../widgets/barcode_overlay.dart';
import '../../../data/local/search_history_local.dart';
import '../../../data/models/search_history.dart';
import '../../../data/models/price_result.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen>
    with WidgetsBindingObserver {
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
    if (!_scannerController.value.isInitialized) {
      return;
    }

    switch (state) {
      case AppLifecycleState.resumed:
        _scannerController.start();
        break;
      case AppLifecycleState.inactive:
      case AppLifecycleState.paused:
      case AppLifecycleState.detached:
        _scannerController.stop();
        break;
      case AppLifecycleState.hidden:
        break;
    }
  }

  void _onDetect(BarcodeCapture capture) {
    final List<Barcode> barcodes = capture.barcodes;

    if (barcodes.isEmpty || _isProcessing) return;

    for (final barcode in barcodes) {
      final String? code = barcode.rawValue;
      if (code != null && code != _lastScannedBarcode) {
        _lastScannedBarcode = code;
        _isProcessing = true;

        // Notificar al BLoC
        context.read<ScannerBloc>().add(BarcodeDetected(code));

        // Buscar producto
        _searchProduct(code);
        break;
      }
    }
  }

  Future<void> _searchProduct(String barcode) async {
    context.read<ProductBloc>().add(SearchProductByBarcode(barcode));
  }

  Future<void> _scanFromGallery() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
      );

      if (image != null) {
        final BarcodeCapture? capture = await _scannerController.analyzeImage(
          image.path,
        );

        if (capture != null && capture.barcodes.isNotEmpty) {
          final String? code = capture.barcodes.first.rawValue;
          if (code != null) {
            _onDetect(capture);
          } else {
            _showError('No se detectó código de barras en la imagen');
          }
        }
      }
    } catch (e) {
      _showError('Error al cargar imagen: $e');
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  Future<void> _saveToHistory(ProductSearchResult result) async {
    if (_historyLocal == null) return;
    
    final history = SearchHistory(
      barcode: result.product.barcode,
      productName: result.product.name,
      imageUrl: result.product.imageUrl,
      lowestPrice: result.lowestPrice?.totalPrice,
      platform: result.lowestPrice?.platform,
      searchedAt: DateTime.now(),
    );

    await _historyLocal!.insert(history);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.5),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.arrow_back, color: Colors.white),
          ),
          onPressed: () => context.pop(),
        ),
        actions: [
          // Historial
          IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.5),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.history, color: Colors.white),
            ),
            onPressed: () => context.push('/history'),
          ),
        ],
      ),
      body: MultiBlocListener(
        listeners: [
          BlocListener<ProductBloc, ProductState>(
            listener: (context, state) async {
              if (state is ProductSearchSuccess) {
                // Guardar en historial
                await _saveToHistory(state.result);

                // Navegar a resultados
                if (mounted) {
                  context.push('/results');
                }

                // Reset para siguiente escaneo
                Future.delayed(const Duration(milliseconds: 500), () {
                  if (mounted) {
                    _isProcessing = false;
                    _lastScannedBarcode = null;
                    context.read<ScannerBloc>().add(ResetScanner());
                  }
                });
              } else if (state is ProductSearchError) {
                _showError(state.message);
                _isProcessing = false;
                _lastScannedBarcode = null;
              }
            },
          ),
        ],
        child: Stack(
          children: [
            // Cámara
            MobileScanner(
              controller: _scannerController,
              onDetect: _onDetect,
            ),

            // Overlay con área de escaneo
            BlocBuilder<ScannerBloc, ScannerState>(
              builder: (context, state) {
                return BarcodeOverlay(
                  isDetecting: state is ScannerDetecting,
                  detectedBarcode: state is ScannerDetecting ? state.barcode : null,
                );
              },
            ),

            // Controles inferiores
            Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: BlocBuilder<ScannerBloc, ScannerState>(
                builder: (context, scannerState) {
                  return BlocBuilder<ProductBloc, ProductState>(
                    builder: (context, productState) {
                      final isSearching = productState is ProductSearching;

                      return Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          // Flash
                          _ControlButton(
                            icon: scannerState.isFlashOn
                                ? Icons.flash_on
                                : Icons.flash_off,
                            label: 'Flash',
                            isActive: scannerState.isFlashOn,
                            onPressed: () {
                              _scannerController.toggleTorch();
                              context.read<ScannerBloc>().add(ToggleFlash());
                            },
                          ),

                          // Galería
                          _ControlButton(
                            icon: Icons.photo_library,
                            label: 'Galería',
                            onPressed: isSearching ? null : _scanFromGallery,
                          ),

                          // Manual
                          _ControlButton(
                            icon: Icons.keyboard,
                            label: 'Manual',
                            onPressed: isSearching
                                ? null
                                : () => _showManualInputDialog(),
                          ),
                        ],
                      );
                    },
                  );
                },
              ),
            ),

            // Loading indicator
            BlocBuilder<ProductBloc, ProductState>(
              builder: (context, state) {
                if (state is ProductSearching) {
                  return Container(
                    color: Colors.black54,
                    child: const Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircularProgressIndicator(color: Colors.white),
                          SizedBox(height: 16),
                          Text(
                            'Buscando producto...',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }
                return const SizedBox.shrink();
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showManualInputDialog() {
    final controller = TextEditingController();

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Ingresar código manualmente'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Código de barras',
            hintText: '7501055363124',
          ),
          keyboardType: TextInputType.number,
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              final code = controller.text.trim();
              if (code.isNotEmpty) {
                Navigator.pop(dialogContext);
                _lastScannedBarcode = code;
                _isProcessing = true;
                context.read<ScannerBloc>().add(BarcodeDetected(code));
                _searchProduct(code);
              }
            },
            child: const Text('Buscar'),
          ),
        ],
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback? onPressed;

  const _ControlButton({
    required this.icon,
    required this.label,
    this.isActive = false,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            color: isActive
                ? Colors.blue
                : Colors.black.withOpacity(0.7),
            shape: BoxShape.circle,
            border: isActive
                ? Border.all(color: Colors.white, width: 2)
                : null,
          ),
          child: IconButton(
            icon: Icon(icon, color: Colors.white),
            onPressed: onPressed,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
