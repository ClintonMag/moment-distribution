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

    // Create the rest of the rows
    for (i = 1; i < rows; i++) {
        let row = document.createElement('tr');
        // Create table cells
        for (j = 0; j < cols; j++) {
            let cell = document.createElement('td');
            row.appendChild(cell);
        }
        // Append row to the table body
        tbody.appendChild(row);
    }

    // Append header and body to the table
    table.appendChild(header);
    table.appendChild(tbody);

    return table;
}

function addNodesToTable(table, tableName, dims=2, type='output', footer=true) {
    /* table is a <table> DOM element with <thead>, <tbody>, <th>, <tr> and
     * <td> elements.
     * table_name will be used to name the <table> tag.
     * type is the type of data the table will be used for.
     *   type='text' means table will have <input> tags of type text
     *   type='number' means table will have <input> tags of type number
     *   type='output' means table will have textNodes in all <tr> and <th>
     * dims determines if the table has a 2D grid of inputs or just a single
     * column of inputs.
     * footer determines if the last row of the table is just text information
     */

    // Iteration variables
    let i, j;
    // The value of the type attribute of an <input> tag
    let inputTagType;

    // textNode to be added to appropriate <tr> elements
    let textNode = document.createTextNode('');
    // Tag to be appended to <tr> tags that contain the table data
    let dataCell = document.createElement('input');

    // Determine appropriate tag and tag's type attribute for cells containing
    // content of table.
    switch (type) {
        case 'text':
            // <input> tags to be added to appropriate <tr> elements
            inputTagType = 'text';
            break;
        case 'number':
            inputTagType = 'number';
            break;
        default:
            // Change tableDataNode to a textNode that will be used for output
            dataCell = textNode;
    }

    // Create type attribute of cell if cell contains an input element
    // True if dataCell is an <input> tag
    if (typeof dataCell.tagName !== 'undefined') {
        let inputTagAttribute = document.createAttribute('type');
        inputTagAttribute.value = inputTagType;
        dataCell.setAttributeNode(inputTagAttribute);
    }
    // Create id attribute of the value tableName-00-00. The digits will be
    // added when appending to all cells. The digits refer to the data-
    // holding cells of the table. Two pairs of double digits if dims=2
    let cellId = document.createAttribute('id');
    cellId.value = tableName + '-';
    dataCell.setAttributeNode(cellId);

    for (i = 0; i < table.rows.length; i++) {
        let row = table.rows[i];
        for (j = 0; j < row.cells.length; j++) {
            row.cells[j].appendChild(dataCell);
        }
    }

    return table;
}

// TODO: Create node list table, extract node labels from it, populate input
// tables with the node data.

function generateInputTables() {
    /*
    Get number of joints
    Make joint labels table
    Create input tables, continuosly check labels table for updated labels
    Once all input is done, run the simulations
    */
    // Create table that will accept names of joints
    let numberOfNodes = document.getElementById('number-of-nodes');
    // The `joints` table will have 2 columns: Numeric name of joint, and
    // alphabetic name of joints
    let node_cols = 2;
    let node_table = makeTable(numberOfNodes, node_cols);
    // Fill in node_table with labels and input boxes
    node_table = addNodesToTable(node_table, 'joints', 2, 'input')
    // Add table to the DOM
    document.getElementById('input-tables').appendChild(node_table);
}
