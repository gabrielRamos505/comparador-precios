import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:io';
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

// 1. Modificamos la detección para ser más inteligente
  void _onDetect(BarcodeCapture capture) async {
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty || _isProcessing) return;

    final String? code = barcodes.first.rawValue;
    
    if (code != null && code != _lastScannedBarcode) {
      _isProcessing = true;
      _lastScannedBarcode = code;

      try {
        // ✅ MEJORA: Al detectar un código, capturamos una imagen 
        // para tener el respaldo de IA por si el barcode no existe en base de datos.
        final captureFile = await _scannerController.takePicture();
        
        if (mounted) {
          // Bloqueamos el scanner visualmente
          context.read<ScannerBloc>().add(BarcodeDetected(code));
          
          // ✅ Navegamos a la pantalla de IA enviando AMBOS datos
          // Así, la AISearchScreen se encarga de la lógica dual.
          context.push('/ai-search', extra: {
            'imagePath': captureFile.path,
            'barcode': code,
          });
        }
      } catch (e) {
        // Si falla la foto, al menos intentamos la búsqueda tradicional
        _searchProduct(code);
      } finally {
        // Reset tras un delay para permitir nuevos escaneos después
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) _isProcessing = false;
        });
      }
    }
  }

  Future<void> _searchProduct(String barcode) async {
    context.read<ProductBloc>().add(SearchProductByBarcode(barcode));
  }

// 2. Ajuste en la función de Búsqueda por Foto (Botón Azul)
  Future<void> _searchByPhoto() async {
    try {
      // Detenemos el scanner para no consumir recursos mientras se usa la cámara de fotos
      await _scannerController.stop();

      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1024, // Bajamos un poco la resolución para subir más rápido a la IA
        imageQuality: 80,
      );

      if (image != null && mounted) {
        // Navegar enviando un mapa para mantener consistencia
        context.push('/ai-search', extra: {
          'imagePath': image.path,
          'barcode': null, // No hay barcode porque fue una foto manual
        });
      }
      
      // Reiniciamos el scanner al volver
      await _scannerController.start();
    } catch (e) {
      _showError('Error al capturar foto: $e');
    }
  }

  /// FUNCIÓN: Escanear desde galería
  Future<void> _scanFromGallery() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
      );

      if (image != null) {
        // Intentar detectar código de barras primero
        final BarcodeCapture? capture = await _scannerController.analyzeImage(
          image.path,
        );

        if (capture != null && capture.barcodes.isNotEmpty) {
          final String? code = capture.barcodes.first.rawValue;
          if (code != null) {
            _onDetect(capture);
          } else {
            // Si no hay código de barras, preguntar si quiere usar IA
            _askForAISearch(image.path);
          }
        } else {
          // No se detectó código, ofrecer búsqueda por IA
          _askForAISearch(image.path);
        }
      }
    } catch (e) {
      _showError('Error al cargar imagen: $e');
    }
  }

  Future<void> _askForAISearch(String imagePath) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('No se detectó código de barras'),
        content: const Text(
          '¿Quieres usar IA para identificar el producto en la imagen?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Usar IA'),
          ),
        ],
      ),
    );

    if (result == true && mounted) {
      context.push('/ai-search', extra: imagePath);
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
      brand: result.product.brand,
      category: result.product.category,
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
                await _saveToHistory(state.result);

                if (mounted) {
                  context.push('/results');
                }

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

            // Overlay
            BlocBuilder<ScannerBloc, ScannerState>(
              builder: (context, state) {
                return BarcodeOverlay(
                  isDetecting: state is ScannerDetecting,
                  detectedBarcode:
                      state is ScannerDetecting ? state.barcode : null,
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

                      return Column(
                        children: [
                          // Botón principal: Capturar foto para IA (NUEVO)
                          Container(
                            margin: const EdgeInsets.symmetric(horizontal: 60),
                            child: ElevatedButton.icon(
                              onPressed: isSearching ? null : _searchByPhoto,
                              icon: const Icon(Icons.camera_alt, size: 28),
                              label: const Text(
                                'BUSCAR POR FOTO',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  vertical: 16,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(30),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Botones secundarios
                          Row(
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
                                onPressed:
                                    isSearching ? null : _showManualInputDialog,
                              ),
                            ],
                          ),
                        ],
                      );
                    },
                  );
                },
              ),
            ),

            // Loading
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
                            style: TextStyle(color: Colors.white, fontSize: 16),
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
            color: isActive ? Colors.blue : Colors.black.withOpacity(0.7),
            shape: BoxShape.circle,
            border: isActive ? Border.all(color: Colors.white, width: 2) : null,
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