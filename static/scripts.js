document.addEventListener('DOMContentLoaded', function () {

    async function fetchRootTypes() {
        const response = await fetch('/document/types');
        if (response.ok) {
            const data = await response.json();
            updateTypeList('Main documents:', null,null, data);
        }
    }

    async function fetchSubTypes(parentCode) {
        if (!parentCode) {
            await fetchRootTypes();
            return;
        }
        const response = await fetch(`/${parentCode}/types`);
        if (response.ok) {
            const data = await response.json()
            updateTypeList(data.title, data.parent_parent_code, data.parent_code, data.sub_types);
        }
    }

    function updateTypeList(title,parentParentCode, parentCode, types) {
        const titleElement = document.getElementById('current-type-title');
        const backLink = document.getElementById('back-link');
        const typesList = document.getElementById('types-list');
        const addTypeButton = document.getElementById('add-type-button');

        titleElement.textContent = title;

        if (parentCode) {
            backLink.style.display = 'block';
            backLink.onclick = () => fetchSubTypes(parentParentCode);
        } else {
            backLink.style.display = 'none';
        }

        if (parentCode) {
            addTypeButton.href = `/add_type?parent_code=${parentCode}`;
        } else {
            addTypeButton.href = '/add_type';
        }

        typesList.innerHTML = '';

        types.forEach((type) => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = `${type.title} (${type.code})`;
            link.addEventListener('click', () => fetchSubTypes(type.code));

            listItem.appendChild(link);
            typesList.appendChild(listItem);
        });
    }


    const addTypeForm = document.getElementById('add-type-form');
    if (addTypeForm) {
        addTypeForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const formData = new FormData(addTypeForm);

            const newType = {
                code: formData.get('code'),
                parent_code: formData.get('parent_code') || null,
                title: formData.get('title'),
                datatype: formData.get('datatype'),
                format: formData.get('format')
            };

            const response = await fetch('/type', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newType)
            });

            if (response.ok) {
                window.location.href = '/';
            }
        });
    }

    async function fetchDocuments() {

        const response = await fetch('/documents');
        if (response.ok) {
            const data = await response.json();
            const documentsList = document.getElementById('documents-list');
            if (documentsList) {
                data.forEach((tdocument) => {
                    if (!tdocument.parent_id) {
                        const listItem = document.createElement('li');
                        const link = document.createElement('a');
                        link.href = '#';
                        link.textContent = `${tdocument.id}. ${tdocument.title} (${tdocument.code})`;
                        link.addEventListener('click', () => fetchDocumentStructure(tdocument.id, tdocument.code, tdocument.title, tdocument.sts));

                        listItem.appendChild(link);
                        documentsList.appendChild(listItem);
                    }
                });

            }
        }
    }

async function fetchDocumentStructure(docId, docCode, docTitle, docStatus) {
    const structureResponse = await fetch(`/${docCode}/types`);
    const parametersResponse = await fetch(`/document/${docId}/parameters`);

    const documentsList = document.getElementById('documents-list');
    const structureList = document.getElementById('document-structure-list');
    const structureTitle = document.getElementById('document-structure-title');
    const editButton = document.getElementById('edit-document-button');
    const structureForm = document.getElementById('document-structure-form');
    const closeAllButton =  document.getElementById('save-document-button');
    const editList = document.getElementById('document-structure-edit-list');
    const currentTitle = document.getElementById('current-document-title');
    const addDocButton = document.getElementById('add-document-button');

    addDocButton.style.display = 'none';

    documentsList.style.display = 'none';
    structureList.innerHTML = '';
    editList.innerHTML = '';

    if (structureResponse.ok && parametersResponse.ok) {
        const structureData = await structureResponse.json();
        const parametersData = await parametersResponse.json();

        const parametersMap = {};
        parametersData.forEach((param) => {
            parametersMap[param.code] = param.value;
        });

        currentTitle.textContent = `${docId}. ${docTitle} (${docCode})`;

        structureTitle.style.display = 'block';
        structureList.style.display = 'block';


        if (docStatus === 'A'){
            editButton.style.display = 'block';
            closeAllButton.style.display = 'block';
        }

        for (const type of structureData.sub_types) {
            const listItem = document.createElement('li');
            if (type.datatype === 'subdoc') {
                const subdocId = await getSubdocIdByCode(docId, type.code);
                const subdocStatus = await getDocStatus(subdocId);
                const subdocCode = type.code;
                if (subdocId) {
                    const link = document.createElement('a');
                    link.href = '#';
                    link.textContent = `${type.title} - subdoc`;
                    link.addEventListener('click', () => fetchSubdocumentStructure(subdocCode, subdocId, subdocStatus, listItem));
                    listItem.appendChild(link);
                } else {
                    const addButton = document.createElement('button');
                    addButton.textContent = `+ ${type.title} (Datatype: ${type.datatype}, Format: ${type.format})`;
                    addButton.addEventListener('click', async () => {
                        const response = await fetch(`/document/${docId}/subdoc`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code: subdocCode })
                        });
                        if (response.ok) {
                            alert(`Subdocument ${subdocCode} created successfully!`);
                            fetchDocumentStructure(docId, docCode, docTitle, docStatus);
                        }
                    });
                    listItem.appendChild(addButton);
                }
            } else {
                const value = parametersMap[type.code] || 'empty';
                listItem.textContent = `${type.title}: ${value}`;
            }

            structureList.appendChild(listItem);

            if (type.datatype !== "subdoc") {
                const editItem = document.createElement('li');
                const label = document.createElement('label');
                label.textContent = `${type.title}: `;

                const input = document.createElement('input');
                input.type = 'text';
                input.name = type.code;
                input.value = parametersMap[type.code] || '';

                editItem.appendChild(label);
                editItem.appendChild(input);
                editList.appendChild(editItem);
            }
        }

        closeAllButton.addEventListener('click', async () => {
            await closeAllDocuments(docId, docCode);
            fetchDocumentStructure(docId, docCode, docTitle, docStatus);
        });

        editButton.onclick = function () {
            structureList.style.display = 'none';
            editButton.style.display = 'none';
            closeAllButton.style.display = 'none';
            structureForm.style.display = 'block';
        };
        structureForm.onsubmit = async function (event) {
            event.preventDefault();

            const formData = new FormData(structureForm);
            const parameters = [];
            structureData.sub_types.forEach((type) => {
                parameters.push({
                    code: type.code,
                    value: formData.get(type.code) || ''
                });
            });

            const response = await fetch(`/document/${docId}/parameters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parameters })
            });

            if (response.ok) {
                alert('Changes are saved successfully');
                structureList.style.display = 'block';
                editButton.style.display = 'block';
                closeAllButton.style.display = 'block';
                structureForm.style.display = 'none';
                fetchDocumentStructure(docId, docCode, docTitle, docStatus);
            } else {
                alert('Error during saving the changes');
            }
        };
    }
}

async function getSubdocIdByCode(parentId, subdocCode) {
    const response = await fetch(`/document/${parentId}/subdoc/${subdocCode}`);
    if (response.ok) {
        const data = await response.json();
        return data.id;
    }
}

async function getDocStatus(parentId, subdocCode) {
    return "C";
}


async function fetchSubdocumentStructure(subdocCode, susubdocId, subdocStatus, parentListItem) {
    let subdocList = parentListItem.querySelector('ul');
    if (subdocList) {
        parentListItem.removeChild(subdocList);
    } else {
        const structureResponse = await fetch(`/${subdocCode}/types`);
        const parametersResponse = await fetch(`/document/${susubdocId}/parameters`);

        if (structureResponse.ok && parametersResponse.ok) {
            const structureData = await structureResponse.json();
            const parametersData = await parametersResponse.json();
            const parametersMap = {};
            let documentStatus = 'A';

            parametersData.forEach((param) => {
                parametersMap[param.code] = param.value;
                if (param.code === 'sts') {
                    documentStatus = param.value;
                }
            });

            subdocList = document.createElement('ul');

            const editableItems = [];

            for (const type of structureData.sub_types) {
                const listItem = document.createElement('li');

                if (type.datatype === 'subdoc') {
                    const subsubdocCode = type.code;
                    const subsubdocId = await getSubdocIdByCode(susubdocId, subsubdocCode);
                    const subsubdocStatus = await getDocStatus(subsubdocId);

                    if (subsubdocId) {
                        const link = document.createElement('a');
                        link.href = '#';
                        link.textContent = `${type.title} (Type: ${type.datatype}, Format: ${type.format}) - Subdocument`;

                        link.addEventListener('click', () => fetchSubdocumentStructure(subsubdocCode, subsubdocId, subsubdocStatus, listItem));
                        listItem.appendChild(link);
                    } else {
                        const addButton = document.createElement('button');
                        addButton.textContent = `+ ${type.title} (Type: ${type.datatype}, Format: ${type.format})`;
                        addButton.addEventListener('click', async () => {
                            const response = await fetch(`/document/${susubdocId}/subdoc`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ code: subsubdocCode })
                            });
                            if (response.ok) {
                                alert(`Subdoc ${subsubdocCode} created successfully`);
                                await fetchSubdocumentStructure(subsubdocCode, susubdocId, subdocStatus, parentListItem);
                            }
                        });
                        listItem.appendChild(addButton);
                    }
                } else {
                    const value = parametersMap[type.code] || 'empty';
                    const label = document.createElement('label');
                    label.textContent = `${type.title} (Type: ${type.datatype}, Format: ${type.format}): `;

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.name = type.code;
                    input.value = value;
                    input.disabled = true;

                    editableItems.push(input);

                    listItem.appendChild(label);
                    listItem.appendChild(input);
                }

                subdocList.appendChild(listItem);
            }


            const editButton = document.createElement('button');
            editButton.textContent = 'Update';
            let isEditing = false;


            editButton.addEventListener('click', async () => {
                if (isEditing) {
                    const parameters = [];
                    editableItems.forEach((input) => {
                        parameters.push({
                            code: input.name,
                            value: input.value
                        });
                        input.disabled = true;
                    });

                    const response = await fetch(`/document/${susubdocId}/parameters`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ parameters })
                    });

                    if (response.ok) {
                        alert('Changes are saved successfully');
                        editButton.textContent = 'Update';
                        isEditing = false;
                    }
                } else {
                    editableItems.forEach((input) => {
                        input.disabled = false;
                    });
                    editButton.textContent = 'Save';
                    isEditing = true;
                }
            });

            if (subdocStatus === 'A') subdocList.appendChild(editButton);

            parentListItem.appendChild(subdocList);
        }
    }
}

async function loadDocumentTypes(selectElementId) {
    const response = await fetch('/document/types');
    if (response.ok) {
        const types = await response.json();
        const selectElement = document.getElementById(selectElementId);
        types.forEach((type) => {
            const option = document.createElement('option');
            option.value = type.code;
            option.textContent = `${type.title} (${type.code})`;
            selectElement.appendChild(option);
        });
    }
}


async function submitAddDocumentForm(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const newDocument = {
        code: formData.get('document-type'),
        title: formData.get('document-title'),
        sts: formData.get('document-sts') || 'A'
    };

    const response = await fetch('/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDocument)
    });

    if (response.ok) {
        alert('Document saved successfully');
        window.location.reload();
    } else {
        alert('Error during saving document');
    }
}

    const addDocumentForm = document.getElementById('add-document-form');
    if (addDocumentForm) {
        loadDocumentTypes('document-type-select');
        addDocumentForm.addEventListener('submit', submitAddDocumentForm);
    }

async function closeAllDocuments(docId, docCode) {
    const structureResponse = await fetch(`/${docCode}/types`);

    await fetch(`/document/${docId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });

    if (structureResponse.ok) {
        const structureData = await structureResponse.json();

        for (const type of structureData.sub_types) {

            if (type.datatype === 'subdoc') {
                const subdocCode = type.code;
                const subdocId = await getSubdocIdByCode(docId, subdocCode);

                if (subdocId) {
                    await closeAllDocuments(subdocId, subdocCode);
                }
            }
        }

    }
}


    fetchDocuments();

    fetchRootTypes();


});
