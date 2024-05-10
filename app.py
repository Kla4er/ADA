from flask import Flask, request, jsonify, render_template, redirect, url_for
import sqlite3

app = Flask(__name__)


def get_db_connection():
    conn = sqlite3.connect('ada.db')
    conn.row_factory = sqlite3.Row
    return conn


# HTML templates

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/documents-page')
def documents_page():
    return render_template('documents.html')


@app.route('/add_document', methods=['GET'])
def add_docpage():
    return render_template('add_document.html')


@app.route('/add_type', methods=['GET', 'POST'])
def add_type():
    if request.method == 'POST':
        code = request.form['code']
        parent_code = request.form.get('parent_code', None)
        title = request.form['title']
        datatype = request.form['datatype']
        format_ = request.form['format']

        if parent_code == "None" or parent_code is None:
            parent_code = ""

        conn = get_db_connection()
        conn.execute('INSERT INTO Type (code, parent_code, title, datatype, format) VALUES (?, ?, ?, ?, ?)',
                     (code, parent_code, title, datatype, format_))
        conn.commit()
        conn.close()

        return redirect(url_for('index'))
    return render_template('add_type.html')

# Dokumentu parvalde


@app.route('/documents', methods=['GET'])
def get_documents():
    conn = get_db_connection()
    documents = conn.execute('SELECT d.id, d.code, t.title, d.sts, d.parent_id FROM Document d, Type t WHERE t.code = d.code').fetchall()
    conn.close()
    return jsonify([dict(row) for row in documents])


@app.route('/document', methods=['POST'])
def add_document():
    data = request.json
    code = data.get('code')
    title = data.get('title')
    if not code or not title:
        return jsonify({'message': 'Code and title are required'}), 400

    sts = data.get('sts', 'A')
    who = data.get('who', 'AdnrejsSohins')  # TBA
    whn = data.get('whn', 'now')

    conn = get_db_connection()
    conn.execute(
        'INSERT INTO Document (code, sts, who, whn) VALUES (?, ?, ?, ?)',
        (code, sts, who, whn)
    )
    conn.commit()
    conn.close()
    return jsonify({'message': 'Document created successfully'}), 201


@app.route('/document/<int:id>/parameters', methods=['GET'])
def get_document_parameters(id):
    conn = get_db_connection()
    parameters = conn.execute('SELECT id, code, value, sts FROM Parameter WHERE doc_id = ?', (id,)).fetchall()
    conn.close()
    return jsonify([dict(row) for row in parameters])


@app.route('/document/<int:parent_id>/subdoc/<string:code>', methods=['GET'])
def get_subdoc_id(parent_id, code):
    conn = get_db_connection()
    subdoc = conn.execute('SELECT id FROM Document WHERE parent_id = ? AND code = ?', (parent_id, code)).fetchone()
    conn.close()
    if subdoc:
        return jsonify({'id': subdoc['id']})
    else:
        return jsonify({'message': 'Subdocument not found'}), 404


@app.route('/document/<int:parent_id>/subdoc', methods=['POST'])
def add_subdoc(parent_id):
    data = request.json
    code = data.get('code')
    if not code:
        return jsonify({'message': 'Code is required'}), 400

    sts = data.get('sts', 'A')
    who = data.get('who', 'AndrejsSohins')  # TBA
    whn = data.get('whn', 'now')

    conn = get_db_connection()
    conn.execute(
        'INSERT INTO Document (code, parent_id, sts, who, whn) VALUES (?, ?, ?, ?, ?)',
        (code, parent_id, sts, who, whn)
    )
    conn.commit()
    conn.close()
    return jsonify({'message': 'Subdocument created successfully'}), 201


@app.route('/document/<int:id>/parameters', methods=['POST'])
def update_or_create_document_parameters(id):
    parameters = request.json.get('parameters', [])
    conn = get_db_connection()
    cur = conn.cursor()

    for param in parameters:
        code = param['code']
        value = param['value']

        cur.execute('SELECT COUNT(*) FROM Parameter WHERE doc_id = ? AND code = ?', (id, code))
        count = cur.fetchone()[0]

        if count == 0:
            cur.execute('INSERT INTO Parameter (doc_id, code, value, sts) VALUES (?, ?, ?, ?)',
                        (id, code, value, "A"))
        else:
            cur.execute('UPDATE Parameter SET value = ?, sts = ? WHERE doc_id = ? AND code = ?',
                        (value, "A", id, code))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Parameters updated or created successfully'}), 200


@app.route('/document/<int:doc_id>/close', methods=['POST'])
def close_document(doc_id):
    conn = get_db_connection()
    conn.execute('UPDATE Document SET sts = ? WHERE id = ?', ('C', doc_id))
    conn.commit()

# Tipu parvalde


@app.route('/document/types', methods=['GET'])
def get_root_types():
    conn = get_db_connection()
    root_types = conn.execute('SELECT code, title FROM Type WHERE parent_code IS NULL OR parent_code = ?',("",)).fetchall()
    conn.close()
    return jsonify([dict(row) for row in root_types])


@app.route('/<string:code>/types', methods=['GET'])
def get_sub_types(code):
    conn = get_db_connection()
    sub_types = conn.execute('SELECT code, title, datatype, format FROM Type WHERE parent_code = ?', (code,)).fetchall()
    parent_info = conn.execute('SELECT code, title, parent_code FROM Type WHERE code = ?', (code,)).fetchone()
    conn.close()
    return jsonify({
        'parent_parent_code': parent_info['parent_code'] if parent_info else None,
        'parent_code': parent_info['code'] if parent_info else None,
        'title': parent_info['title'] if parent_info else '',
        'sub_types': [dict(row) for row in sub_types]
    })


@app.route('/type', methods=['POST'])
def create_type():
    request_data = request.get_json()
    code = request_data['code']
    parent_code = request_data.get('parent_code', None)
    title = request_data['title']
    datatype = request_data['datatype']
    format_ = request_data['format']

    conn = get_db_connection()
    conn.execute('INSERT INTO Type (code, parent_code, title, datatype, format) VALUES (?, ?, ?, ?, ?)',
                 (code, parent_code, title, datatype, format_))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Type created successfully'}), 201


if __name__ == '__main__':
    app.run(debug=True)
