'use strict';

function makeTable(rows, cols) {
    // i -> loop over rows
    // j -> loop over columns
    let i, j;

    // Create an empty html table
    let table = document.createElement('table');
    let tableHead = document.createElement('thead');
    let tableBody = document.createElement('tbody');

    // Construct the table header row
    let header = document.createElement('tr');
    for (j = 0; j < cols; j++) {
        let th = document.createElement('th');
        header.appendChild(th);
    }
    // Append the header row to the head of the table
    tableHead.appendChild(header);

    // Create the rest of the rows
    for (i = 1; i < rows; i++) {
        let row = document.createElement('tr');
        // Create table cells
        for (j = 0; j < cols; j++) {
            let cell = document.createElement('td');
            row.appendChild(cell);
        }
        // Append row to the table body
        tableBody.appendChild(row);
    }

    // Append head and body to the table
    table.appendChild(tableHead);
    table.appendChild(tableBody);

    return table;
}

function addNodesToTable(table, tableName, dims=2, type='span', footer=true) {
    /* table is a <table> DOM element with <thead>, <tbody>, <th>, <tr> and
     * <td> elements.
     * table_name will be used to name the <table> tag.
     * type is the type of data the table will be used for.
     *   type='text' means table will have <input> tags of type text
     *   type='number' means table will have <input> tags of type number
     *   type='span' means table will have <span> in all appropriate <tr> tags
     * dims determines if the table has a 2D grid of inputs or just a single
     * column of inputs.
     * footer determines if the last row of the table is just text information
     */

    // Headers, footers and row labels are non-data-holding cells as they only
    // contain information about the table.

    // The value of the type attribute of an <input> tag
    let inputTagType;
    // textNode to be added to appropriate <tr> elements, and the <span> tags
    // of all non-data-containing cells in the table.
    let textNode = document.createTextNode('');
    // span is the <span> tag to be used in headers, footers and row labels.
    let span = document.createElement('span');
    span.appendChild(textNode);
    // Tag to be appended to <tr> tags that contain the table data. May be
    // changed to another tag later.
    let dataCell = document.createElement('input');

    // Determine appropriate tag and it's type attribute for cells containing
    // data.
    switch (type) {
        case 'input-text':
            // <input> tags to be added to appropriate <tr> elements
            inputTagType = 'text';
            break;
        case 'input-number':
            inputTagType = 'number';
            break;
        default:
            // Change dataCell to a <span> tag that will be used for output
            dataCell = span;
    }
    // Create type attribute of cell if cell contains an input element
    // True if dataCell is an <input> tag
    if (typeof inputTagType !== 'undefined') {
        dataCell.setAttribute('type', inputTagType);
    }

    // Append the dataCells to each <th> or <td> in the table
    for (let i = 0; i < table.rows.length; i++) {
        let row = table.rows[i];
        for (let j = 0; j < row.cells.length; j++) {
            // cell is an element to be appended to a <th> or <td> tag.
            let cell;
            // The first row of all tables is the header with text only.
            // If a footer is added to the table, the last row is text only.
            // The first column of all rows is a row label, contains text only.
            if (i == 0 || (j == 0) || (i == table.rows.length-1 && footer)) {
                cell = span.cloneNode(true);
                // Header id will be in the form tableName-header-x; x is a
                // number that starts with 0.
                // Footer id will be in the form tableName-footer-x
                // Row label id will be in the form tableName-row-x
                if (i == 0) {
                    // header
                    cell.setAttribute('id', tableName + '-header-' + j);
                } else if (i == table.rows.length-1 && footer) {
                    // footer
                    cell.setAttribute('id', tableName + '-footer-' + j);
                } else if (j == 0) {
                    // row label that isn't in the header or footer
                    cell.setAttribute('id', tableName + '-row-' + (i-1));
                }
            } else {
                // Create clones of dataCell to be appended to the table
                cell = dataCell.cloneNode(true);

                // Set id attribute of data-holding cell.
                // This naming format is for data-holding cells of the table.
                // Set id attribute to the value tableName-x-x. x is a digit.
                // One x if dims=1, two if dims=2.
                switch (dims) {
                    case 1:
                        cell.setAttribute('id', tableName + '-' + (i-1));
                        break;
                    case 2:
                        cell.setAttribute(
                            'id', tableName + '-' + (i-1) + '-' + (j-1)
                        );
                }
            }
            row.cells[j].appendChild(cell);
        }
    }
    return table;
}

function makeNodeTable(numberOfNodes) {
    // Create table that will accept names of joints

    // id will be used to identify table cells
    let id;
    // The `joints` table will have 2 columns: Numeric name of joint, and
    // alphabetic name of joints
    const totalCols = 2;
    // totalRows will be a row for each node, plus the header.
    const totalRows = numberOfNodes + 1;
    const tableName = 'nodes';
    let tableSkeleton = makeTable(totalRows, totalCols);
    // Fill in tableSkeleton with tags to display and input data
    let nodeTable = addNodesToTable(
        tableSkeleton, tableName, 1, 'input-text', false
    );

    // Add labels to the table

    // Attributes for the text input boxes
    const textBoxSize = 3;
    const minChars = 1;
    const maxChars = 3;
    // baseAlphabet will be used to create placeholder text in input text boxes
    const ord_a = 'a'.charCodeAt(0);
    // Set attributes to the input boxes in the table
    // Each input box id is of the form tableName-x where x is a number from
    // 0 to numberOfNodes - 1
    for (let i = 0; i < numberOfNodes; i++) {
        id = '#' + tableName + '-' + i;
        nodeTable.querySelector(id).setAttribute('size', textBoxSize);
        nodeTable.querySelector(id).setAttribute('minlength', minChars);
        nodeTable.querySelector(id).setAttribute('maxlength', maxChars);
        nodeTable.querySelector(id).setAttribute(
            'value', String.fromCharCode(ord_a + i)
        );
    }
    // Populate the header and row label with appropriate values
    // Header
    id = '#' + tableName + '-header-0';
    nodeTable.querySelector(id).textContent = 'Joint Number';
    id = '#' + tableName + '-header-1';
    nodeTable.querySelector(id).textContent = 'Alphabetic Label';
    // Row labels
    for (let i = 0; i < nodeTable.rows.length-1; i++) {
        let id = '#' + tableName + '-row-' + i;
        nodeTable.querySelector(id).textContent = i;
    }
    return nodeTable;
}
/*
function readNodeLabels() {
    // Reads input text boxes for node labels

    // Array of node labels
    let nodeLabelsArray;

    // Get the node labels table
    let nodeTable = document.
    for (let i = 0; )
}
*/
function generateInputTables() {
    // Create all input tables to run the moment distribution method.

    // Create the table for the names of each joint
    let numberOfNodes = Number(
        document.getElementById('number-of-nodes').value
    );
    let nodeTable = makeNodeTable(numberOfNodes);
    document.getElementById('input-tables').appendChild(nodeTable);

    // TODO: add an event listener to elements of nodeTable so that their
    // values are constantly updated in the web application if they change.
    // The listener will keep checking the node labels. If they change, they
    // must be sent to all tags that use them. All such tags will need a way
    // to be identified.

    // Read joint labels
    // let nodeLabelsArray = readNodeLabels();
    // Create distribution factor input table
    // let dfTable = makeDFTable(numberOfNodes);


    // Create carry-over factor table
    // Create initial moments table
}
