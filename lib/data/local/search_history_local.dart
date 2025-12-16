import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/search_history.dart';

/// Implementación compatible con web usando SharedPreferences
class SearchHistoryLocal {
  static const String _key = 'search_history';
  final SharedPreferences _prefs;

  SearchHistoryLocal(this._prefs);

  Future<void> insert(SearchHistory history) async {
    final list = await getAll();
    
    // Agregar al inicio (más reciente primero)
    list.insert(0, history);
    
    // Limitar a 50 elementos
    if (list.length > 50) {
      list.removeRange(50, list.length);
    }
    
    await _saveList(list);
  }

  Future<List<SearchHistory>> getAll() async {
    final jsonString = _prefs.getString(_key);
    if (jsonString == null) return [];
    
    try {
      final List<dynamic> jsonList = json.decode(jsonString);
      return jsonList
          .map((item) => SearchHistory.fromMap(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      print('Error loading history: $e');
      return [];
    }
  }

  Future<List<SearchHistory>> getByBarcode(String barcode) async {
    final all = await getAll();
    return all.where((h) => h.barcode == barcode).toList();
  }

  Future<bool> delete(String barcode, DateTime searchedAt) async {
    final list = await getAll();
    list.removeWhere(
      (h) => h.barcode == barcode && h.searchedAt == searchedAt,
    );
    await _saveList(list);
    return true;
  }

  Future<bool> deleteAll() async {
    await _prefs.remove(_key);
    return true;
  }

  Future<int> getCount() async {
    final list = await getAll();
    return list.length;
  }

  Future<void> _saveList(List<SearchHistory> list) async {
    final jsonList = list.map((h) => h.toMap()).toList();
    final jsonString = json.encode(jsonList);
    await _prefs.setString(_key, jsonString);
  }
}
