
CREATE TABLE Type (
    code TEXT PRIMARY KEY,
    parent_code TEXT,
    title TEXT,
    datatype TEXT,
    format TEXT
);

CREATE TABLE Document (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT,
    parent_id INTEGER,
    sts TEXT,
    who TEXT,
    whn DATETIME,
    FOREIGN KEY (code) REFERENCES type(code)
);

CREATE TABLE Parameter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id INTEGER,
    code TEXT,
    value TEXT,
    sts TEXT,
    FOREIGN KEY (doc_id) REFERENCES document(id),
    FOREIGN KEY (code) REFERENCES type(code)
);