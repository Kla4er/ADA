import sqlite3

def create_database():
    conn = sqlite3.connect('ada.db')

    cur = conn.cursor()

    create_type_table = """
        CREATE TABLE IF NOT EXISTS type (
            code TEXT PRIMARY KEY,
            parent_code TEXT,
            title TEXT,
            datatype TEXT,
            format TEXT
        );
    """

    create_document_table = """
    CREATE TABLE IF NOT EXISTS document (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT,
        parent_id INTEGER,
        sts TEXT,
        who TEXT,
        whn DATETIME,
        FOREIGN KEY (code) REFERENCES type(code)
    );
    """

    create_parameter_table = """
    CREATE TABLE IF NOT EXISTS parameter (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id INTEGER,
        code TEXT,
        value TEXT,
        sts TEXT,
        FOREIGN KEY (doc_id) REFERENCES document(id),
        FOREIGN KEY (code) REFERENCES type(code)
    );
    """

    cur.execute(create_type_table)
    cur.execute(create_document_table)
    cur.execute(create_parameter_table)

    conn.commit()

    conn.close()

if __name__ == "__main__":
    create_database()
