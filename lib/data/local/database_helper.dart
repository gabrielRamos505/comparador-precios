import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('comparador_ra.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE search_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode TEXT NOT NULL,
        productName TEXT NOT NULL,
        imageUrl TEXT,
        lowestPrice REAL,
        platform TEXT,
        searchedAt INTEGER NOT NULL
      )
    ''');

    // Índice para búsquedas rápidas
    await db.execute('''
      CREATE INDEX idx_barcode ON search_history(barcode)
    ''');

    await db.execute('''
      CREATE INDEX idx_searchedAt ON search_history(searchedAt DESC)
    ''');
  }

  Future close() async {
    final db = await instance.database;
    db.close();
  }
}
