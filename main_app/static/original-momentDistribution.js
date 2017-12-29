/* Don't forget description of what all this is
*/

var momentDist = (function () {

'use strict';

// Constants to be used by several functions
const tableNames = {
    nodes: 'nodes',
    df: 'df',
    cof: 'cof',
    initialMoments: 'init',
    appliedMoments: 'moments'
}

// Constants for types of tags a data-holding cell can have
const cellTypes = {
    inputText: 'input-text',
    inputNumber: 'input-number'
}

// The labels for the structure's nodes will be used by an event handler
var nodeLabelsArray = [];

function makeTable(rows, cols, footer=true) {
    // i -> loop over rows
    // j -> loop over columns
    let i, j;

    // Create an empty html table
    let table = document.createElement('table');
    let tableHead = document.createElement('thead');
    let tableFoot;
    if (footer) {
        tableFoot = document.createElement('tfoot');
    }
    let tableBody = document.createElement('tbody');

    // Construct the table header row
    let header = document.createElement('tr');
    for (j = 0; j < cols; j++) {
        let th = document.createElement('th');
        header.appendChild(th);
    }
    // Append the header row to the head of the table
    tableHead.appendChild(header);

    // Construct the table footer row
    if (footer) {
        let footerRow = document.createElement('tr');
        for (j = 0; j < cols; j++) {
            let td = document.createElement('td');
            footerRow.appendChild(td);
        }
        // Append the footer row to the foot of the table
        tableFoot.appendChild(footerRow);
    }

    // Create the rest of the rows
    let dataRows = rows - 1;
    if (footer) {
        dataRows = rows - 2;
    }
    for (i = 0; i < dataRows; i++) {
        let row = document.createElement('tr');
        // Create table cells
        for (j = 0; j < cols; j++) {
            let cell = document.createElement('td');
            row.appendChild(cell);
        }
        // Append row to the table body
        tableBody.appendChild(row);
    }

    // Append head, foot and body to the table
    table.appendChild(tableHead);
    if (footer) {
        table.appendChild(tableFoot);
    }
    table.appendChild(tableBody);

    return table;
}

function addTagsToTable(table, tableName, type=null, footer=true) {
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
        dataCell.type = inputTagType;
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
                    cell.id = tableName + '-header-' + j;
                } else if (i == table.rows.length-1 && footer) {
                    // footer
                    cell.id = tableName + '-footer-' + j;
                } else if (j == 0) {
                    // row label that isn't in the header or footer
                    cell.id = tableName + '-row-' + (i-1);
                }
            } else {
                // Create clones of dataCell to be appended to the table
                cell = dataCell.cloneNode(true);
                // Set id attribute of data-holding cell.
                // This naming format is for data-holding cells of the table.
                // Set id attribute to the value tableName-x-x. x is a digit.
                cell.id = tableName + '-' + (i-1) + '-' + (j-1);
            }
            row.cells[j].appendChild(cell);
        }
    }
    return table;
}

function makeContentTable(numberOfNodes, tableName, type=null,footer=true) {
    // Create a 2D table to contain input or computed data

    // id will be used to identify table cells
    let id;
    // There numberOfNodes + 1 columns, extra column is for row labels.
    let totalCols = numberOfNodes + 1;
    // totalRows will be a row for each node, plus the header and footer.
    let totalRows;
    if (footer) {
        totalRows = numberOfNodes + 2;
    } else {
        totalRows = numberOfNodes + 1;
    }

    let tableSkeleton = makeTable(totalRows, totalCols);
    // Fill in tableSkeleton with tags to display and input data
    let dataTable = addTagsToTable(tableSkeleton, tableName, type, footer);

    // Add labels to the table

    // Add name attribute to the <table> tag
    dataTable.setAttribute('name', tableName);
    // Add number-of-nodes attribute to <table> tag for use by other functions
    dataTable.setAttribute('number-of-nodes', numberOfNodes);

    /* Unhide to add placeholder values in the number box
    // 0 to numberOfNodes - 1
    for (let i = 0; i < numberOfNodes; i++) {
        for (let j = 0; j < numberOfNodes; j++) {
            id = '#' + tableName + '-' + i + '-' + j;
            dataTable.querySelector(id).setAttribute('value', i);
        }
    }
    */

    // Populate the header and row label with appropriate values.
    // Also add class 'node-label-x' to each <span> in the table whose value is
    // a node label taken from the table named 'nodes'.

    // Top-left cell of table will have the table name
    id = '#' + tableName + '-header-0';
    dataTable.querySelector(id).textContent = tableName;

    // Header labels
    for (let j = 1; j < totalCols; j++) {
        id = '#' + tableName + '-header-' + j;
        let cell = dataTable.querySelector(id);
        cell.textContent = nodeLabelsArray[j-1];
        cell.setAttribute('class', 'node-label-' + (j-1));
    }

    // Footer labels
    if (footer) {
        // Bottom-left cell of table will have the text 'Sum'
        id = '#' + tableName + '-footer-0';
        dataTable.querySelector(id).textContent = 'Sum';
        /* Unhide to add placeholder text in the footer
        for (let j = 1; j < totalCols; j++) {
            id = '#' + tableName + '-footer-' + j;
            dataTable.querySelector(id).textContent = j + 'f';
        }
        */
    }

    // Row labels
    for (let i = 0; i < numberOfNodes; i++) {
        let id = '#' + tableName + '-row-' + i;
        let cell = dataTable.querySelector(id);
        cell.textContent = nodeLabelsArray[i];
        cell.setAttribute('class', 'node-label-' + i);
    }

    return dataTable;
}

function makeNodeTable(numberOfNodes) {
    // Create table that will accept names of joints.
    // During table creation, store the default values in the table's input
    // boxes in an array. This array will be used by an event listener
    // (replaceLabel) See the event listener replaceLabel for its function.

    // id will be used to identify table cells
    let id;
    // The `joints` table will have 2 columns: Numeric name of joint, and
    // alphabetic name of joints
    const totalCols = 2;
    // totalRows will be a row for each node, plus the header.
    const totalRows = numberOfNodes + 1;
    const tableName = tableNames.nodes;
    let tableSkeleton = makeTable(totalRows, totalCols, false);
    // Fill in tableSkeleton with tags to display and input data
    let nodeTable = addTagsToTable(
        tableSkeleton, tableName, 'input-text', false
    );

    // Add labels to the table

    // Add name attribute to the <table> tag
    nodeTable.setAttribute('name', tableName);
    // Add number-of-nodes attribute to <table> tag for use by other functions
    nodeTable.setAttribute('number-of-nodes', numberOfNodes);

    // Attributes for the text input boxes
    const textBoxSize = 3;
    const maxChars = 3;
    // baseAlphabet will be used to create placeholder text in input text boxes
    const ord_a = 'a'.charCodeAt(0);

    // Set attributes to the input boxes in the table.
    // Each input box id is of the form tableName-x where x is a number from
    // 0 to numberOfNodes - 1
    for (let i = 0; i < numberOfNodes; i++) {
        id = '#' + tableName + '-' + i + '-' +'0';
        let box = nodeTable.querySelector(id);
        box.setAttribute('size', textBoxSize);
        box.setAttribute('maxlength', maxChars);
        // Set initial value in the input boxes
        box.setAttribute('value', String.fromCharCode(ord_a + i));
        // Store the initial value in the global variable nodeLabelsArray
        nodeLabelsArray[i] = String.fromCharCode(ord_a + i);
        // Add the 'input' event to input boxes so that their value can be used
        // by other tables with the 'node-label-x' class name, where x is a
        // number from 0 to numberOfNodes-1
        box.addEventListener('input', replaceLabel, false);
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

function makeAppliedMomentsTable(numberOfNodes) {
    // Create table that will accept applied moments at a node

    // id will be used to identify table cells
    let id;
    // The 'moments' table will have 2 columns: Alphabetic name of joint, and
    // moments at joints
    const totalCols = 2;
    // totalRows will be a row for each node, plus the header.
    const totalRows = numberOfNodes + 1;
    const tableName = tableNames.appliedMoments;
    let tableSkeleton = makeTable(totalRows, totalCols, false);
    // Fill in tableSkeleton with tags to display and input data
    let nodeTable = addTagsToTable(
        tableSkeleton, tableName, cellTypes.inputNumber, false
    );

    // Add labels to the table

    // Add name attribute to the <table> tag
    nodeTable.setAttribute('name', tableName);
    // Add number-of-nodes attribute to <table> tag for use by other functions
    nodeTable.setAttribute('number-of-nodes', numberOfNodes);

    /* Unhide to add default value to input box
    for (let i = 0; i < numberOfNodes; i++) {
        id = '#' + tableName + '-' + i + '-' +'0';
        nodeTable.querySelector(id).setAttribute('value', i);
    }
    */

    // Populate the header and row label with appropriate values

    // Header
    id = '#' + tableName + '-header-0';
    nodeTable.querySelector(id).textContent = 'Alphabetic Label';
    id = '#' + tableName + '-header-1';
    nodeTable.querySelector(id).textContent = 'Moment at node';

    // Row labels
    for (let i = 0; i < numberOfNodes; i++) {
        let id = '#' + tableName + '-row-' + i;
        let cell = nodeTable.querySelector(id);
        cell.textContent = nodeLabelsArray[i];
        // Add 'node-label-x' class to cell so the replaceLabel event listener
        // can apply the correct label to it.
        cell.setAttribute('class', 'node-label-' + i);
    }

    return nodeTable;
}

function disableDiagonal(table) {
    // For tables df, cof & init, input boxes on a diagonal cannot have a value
    let numberOfNodes = Number(table.getAttribute('number-of-nodes'));
    let tableName = table.getAttribute('name');
    for (let i = 0; i < numberOfNodes; i++) {
        let id = table.querySelector('#' + tableName + '-' + i + '-' + i);
        id.disabled = true;
    }
}

function replaceLabel(event) {
        // Respond to 'input' event of the input boxes of the 'nodes' table and
        // apply the changes to all cells with the class name 'nodes-lable-x'.
        // Keep the value of the current value in the input box so that it can be
        // compared to the new value. If the new value is the same as the previous
        // value, then don't change the DOM.

        // Determine what element triggered event.
        let inputBox = this;

        // Compare new value in the input box with the previous value in that
        // box

        // Extract new value of label
        let newLabel = inputBox.value;

        // re is the regular expression used to find out the index needed to
        // extract the correct stored value in nodeLabelsArray.
        let re = /-(\d+)-/;
        // exec returns and array. The capture group is at index 1.
        let index = Number(re.exec(inputBox.id)[1]);
        // Extract old value
        let oldLabel = nodeLabelsArray[index];

        if (newLabel === oldLabel) {
            // Don't modify DOM
            return;
        }

        // Update nodeLabelsArray with the new value
        nodeLabelsArray[index] = newLabel;

        // Get all elements with 'node-label-index' as a class name
        let labelElements = document.querySelectorAll('.node-label-' + index);
        // Apply new labels to those elements
        for (let i = 0; i < labelElements.length; i++) {
            labelElements[i].textContent = newLabel;
        }
    }

function generateInputTables(event) {
    // Create all input tables to run the moment distribution method.

    // Create the table for the names of each joint
    let numberOfNodes = Number(
        document.getElementById('number-of-nodes').value
    );

    let nodeTable = makeNodeTable(numberOfNodes);
    // Read initial node labels so function calls below can use nodeLabelsArray
    document.getElementById('input-tables').appendChild(nodeTable);

    // Create distribution factor input table
    let dfTable = makeContentTable(
        numberOfNodes, tableNames.df, cellTypes.inputNumber
    )
    disableDiagonal(dfTable);
    document.getElementById('input-tables').appendChild(dfTable);

    // Create carry-over factor input table
    let cofTable = makeContentTable(
        numberOfNodes, tableNames.cof, cellTypes.inputNumber, false
    )
    disableDiagonal(cofTable);
    document.getElementById('input-tables').appendChild(cofTable);

    // Create initial moments input table
    let initialMomentsTable = makeContentTable(
        numberOfNodes, tableNames.initialMoments, cellTypes.inputNumber
    )
    disableDiagonal(initialMomentsTable);
    document.getElementById('input-tables').appendChild(initialMomentsTable);

    // Create applied moments input table
    let appliedMomentsTable = makeAppliedMomentsTable(numberOfNodes);
    document.getElementById('input-tables').appendChild(appliedMomentsTable);
}

return {
    genTables: generateInputTables
};

})();
