import 'package:sqflite/sqflite.dart';
import 'database_helper.dart';
import '../models/search_history.dart';

class SearchHistoryDao {
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;

  Future<int> insert(SearchHistory history) async {
    final db = await _dbHelper.database;
    return await db.insert('search_history', history.toMap());
  }

  Future<List<SearchHistory>> getAll() async {
    final db = await _dbHelper.database;
    final result = await db.query(
      'search_history',
      orderBy: 'searchedAt DESC',
      limit: 50,
    );
    return result.map((map) => SearchHistory.fromMap(map)).toList();
  }

  Future<List<SearchHistory>> getByBarcode(String barcode) async {
    final db = await _dbHelper.database;
    final result = await db.query(
      'search_history',
      where: 'barcode = ?',
      whereArgs: [barcode],
      orderBy: 'searchedAt DESC',
      limit: 1,
    );
    return result.map((map) => SearchHistory.fromMap(map)).toList();
  }

  Future<int> delete(int id) async {
    final db = await _dbHelper.database;
    return await db.delete(
      'search_history',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<int> deleteAll() async {
    final db = await _dbHelper.database;
    return await db.delete('search_history');
  }

  // Estadísticas
  Future<int> getCount() async {
    final db = await _dbHelper.database;
    final result = await db.rawQuery('SELECT COUNT(*) FROM search_history');
    return Sqflite.firstIntValue(result) ?? 0;
  }
}
