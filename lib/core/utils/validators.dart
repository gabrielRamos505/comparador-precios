class Validators {
  
  // ✅ Validar Email (Mejorado)
  static String? email(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'El email es requerido';
    }
    // Regex más robusto para emails
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    if (!emailRegex.hasMatch(value.trim())) {
      return 'Ingresa un email válido (ej: usuario@correo.com)';
    }
    return null;
  }

  // ✅ Validar Contraseña
  static String? password(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'La contraseña es requerida';
    }
    if (value.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    return null;
  }

  // ✅ Validar Nombre (Con Trim)
  static String? name(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'El nombre es requerido';
    }
    if (value.trim().length < 2) {
      return 'Ingresa un nombre válido';
    }
    return null;
  }

  // ✅ NUEVO: Validar Precios (Para tus Alertas de Precio)
  static String? price(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Ingresa un precio';
    }
    
    // Reemplazar coma por punto por si el teclado está en español
    final cleanValue = value.replaceAll(',', '.');
    final number = double.tryParse(cleanValue);

    if (number == null) {
      return 'Ingresa un número válido';
    }
    if (number <= 0) {
      return 'El precio debe ser mayor a 0';
    }
    return null;
  }

  // ✅ NUEVO: Comparar contraseñas (Para Registro)
  static String? confirmPassword(String? value, String originalPassword) {
    if (value == null || value.isEmpty) {
      return 'Confirma tu contraseña';
    }
    if (value != originalPassword) {
      return 'Las contraseñas no coinciden';
    }
    return null;
  }
}