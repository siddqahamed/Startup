from pathlib import Path
import sqlite3
import sys


ROOT = Path(__file__).resolve().parents[1]
DATABASE = ROOT / "wendersbengaluru.db"


def main():
    if "--reset" in sys.argv and DATABASE.exists():
        DATABASE.unlink()
    connection = sqlite3.connect(DATABASE)
    try:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.executescript((ROOT / "sql" / "schema.sql").read_text(encoding="utf-8"))
        connection.executescript((ROOT / "sql" / "seed.sql").read_text(encoding="utf-8"))
        connection.commit()
        print(f"Database ready: {DATABASE}")
    finally:
        connection.close()


if __name__ == "__main__":
    main()