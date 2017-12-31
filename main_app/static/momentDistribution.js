/* momentDistribution.js

Author: Clinton Magano
email: code.clinton.magano@gmail.com

This script calculates the bending moments in a structure using the
Moment Distribution approximate method. This is mostly for final year
Civil Engineering students at the University of the Witwatersrand,
Johannesburg, South Africa.

Given a structure such as the below,
___________________
▀a       ▀b       ▀c
joints a, b, c are fixed. If there are forces between a, b, and c,
then the compute the initial moments at each joint using the
appropriate moment table. In this case, the moment table for a fixed-
ended beam will be used.
Mab will be the moment at joint a within beam ab, Mba will be the
moment at b within beam ab, Mbc will be the moment at b within beam
bc, Mcb will be the moment at c within beam bc.

In the input tables, the initial moments, carry-over facors and
distribution factors are applicable from the joint in the column of
the table to the joint in the row of the table.

E.g let a cell in the table me represented by two joints so that
moment Mab is the moment at a in beam ab. Using the beam above, the
carry-over factor from b to a will be represented by cell(a, b) in
carry-over factor table, where a is row in the table and b is the
column.
The distribution factor from b to a will be in cell(a, b) in the
distribution factor table. The distribution factor from b to c
will be in cell(c, b) in the table.

If there are moments applied at the joints themselves, the value of
the moments can be specified in the Applied Moments table.

When the Compute Moments button is pressed, the moments distribution
algorithm will run and output a table showing the moments at each
joint per iteration of the moment until the desired error or number
of iterations is reached. The moments specified in the Total M row
of the output table will be the true moments in the structure for
the applied forces specified.

*/

// TODO: Add minimum and maximum values to input boxes and enforce them.
// Add tick boxes at nodes table to determine connection between nodes

var momentDist = (function () {

'use strict';

// Some global variables

// Some constants
const constant = {
    NODES_MIN: 3,
    NODES_MAX: 20,
    NUM_NODES_DEFAULT: 5,
};

// Contains variable names and values used in various places in the code
var cfg = {
    // nodeLabelsArray is used to keep all <td> tags with the class name
    // 'node-label-x' updated.
    nodeLabelsArray: [],

    // Contains the number of nodes typed in #number-of-nodes input box
    numberOfNodes: constant.NUM_NODES_DEFAULT,

    // Contains names of tables
    tbl: {
        nodes: 'nodes',
        df: 'df',
        cof: 'cof',
        init: 'init',
        moments: 'moments',
    },

    // Contains names of classes
    cls: {
        nodeLabel: 'node-label',
        diagonal: 'input-diagonal',
    },

    // All html id values in the html file, hardcoded or generated.
    htmlId: {
        inputNodes: 'input-nodes',
        numberOfNodes: 'number-of-nodes',
        inputTables: 'input-tables',
        nodeCheckbox: 'node-checkbox',
    },

    // All html name values hardcoded in the html file
    htmlName: {
        makeTables: 'make-tables',
    },

    // All event handlers
    handlers: {
        replaceLabel: function(event) {
            // Respond to 'input' event of the input boxes of the 'nodes' table
            // and apply the changes to all cells with the class name
            // 'nodes-lable-x'. Keep the value of the current value in the
            // input box so that it can be compared to the new value. If the
            // new value is the same as the previous value, then don't change
            // the DOM.

            // Determine what element triggered event.
            let inputBox = this;

            // Compare new value in the input box with the previous value in
            // that box.

            // Extract new value of label
            let newLabel = inputBox.value;

            // re is the regular expression used to find out the index needed
            // to extract the correct stored value in nodeLabelsArray.
            let re = /-(\d+)-/;
            // exec returns and array. The capture group is at index 1.
            let index = Number(re.exec(inputBox.id)[1]);
            // Extract old value
            let oldLabel = cfg.nodeLabelsArray[index];

            if (newLabel === oldLabel) {
                // Don't modify DOM
                return;
            }

            // Update nodeLabelsArray with the new value
            cfg.nodeLabelsArray[index] = newLabel;

            // Get all elements with 'node-label-index-0' as a class name
            let labelElements = document.querySelectorAll(
                '.' + cfg.cls.nodeLabel + '-' + index + '-0'
            );
                // Apply new labels to those elements
                for (let i = 0; i < labelElements.length; i++) {
                    labelElements[i].textContent = newLabel;
                }
        },

        checkNodes: function(event) {
            // Ensure #number-of-nodes input box has a value >2 and <=20.
            // If not, disable the button[name="make-tables"] button
            let nodes = document.getElementById('number-of-nodes');
            let button = document.getElementsByName('make-tables')[0];
            if (Number(nodes.value)<constant.NODES_MIN ||
            Number(nodes.value)>constant.NODES_MAX) {
                button.disabled = true;
            } else {
                button.disabled = false;
            }
        },

        makeInputTables: function(event) {

            // Remove existing tables if present
            clearInputTables();

            // Get the number of nodes from document
            let numberOfNodes = Number(
                document.getElementById('number-of-nodes').value
            );

            // Update the current number of nodes
            cfg.numberOfNodes = numberOfNodes;

            // Create node table where labels for each node will be typed
            let nodes = makeNodeTable(numberOfNodes);

            // Create distribution factor table
            let df = makeContentTable(cfg.tbl.df, numberOfNodes);
            df.SetCaption('Distribution Factor');

            // Create carry-over factor table
            let cof = makeContentTable(cfg.tbl.cof, numberOfNodes);
            cof.SetCaption('Carry-over Factor');
            // Hide footer, not needed.
            cof.table.tFoot.hidden = true;

            // Create initial moments table
            let init = makeContentTable(cfg.tbl.init, numberOfNodes);
            init.SetCaption('Initial Moments');

            // Create applied moments table
            let moments = makeMomentsTable(cfg.tbl.moments, numberOfNodes);
            moments.SetCaption('Applied Moments');
            // Hide footer, not needed.
            moments.table.tFoot.hidden = true;

            // Append the tables to a <div> with id 'input-tables'
            let inputTablesDiv = document.getElementById('input-tables');
            inputTablesDiv.appendChild(nodes.table);
            inputTablesDiv.appendChild(df.table);
            inputTablesDiv.appendChild(cof.table);
            inputTablesDiv.appendChild(init.table);
            inputTablesDiv.appendChild(moments.table);

            // Create a button to start the moment distribution method once
            // data has been entered into the tables.

            let runButton = document.createElement('button');
            runButton.type = 'button';
            runButton.textContent = "Run Calcs";
            runButton.addEventListener('click', cfg.handlers.runMethod, false);
            // Button is part of the tables, append to inputTablesDiv
            inputTablesDiv.appendChild(runButton);
        },

        runMethod: function(event) {
            // Start the moment distribution method

            let inputs = getInputs();
            console.log(inputs);
        },
    },
}


// Some setup code that accesses the DOM; must run upon script load.

// Add 'input' event listener to #number-of-nodes input box'
document.getElementById('number-of-nodes').addEventListener(
    'input', cfg.handlers.checkNodes, false
);

// Add 'click' event listener to button['make-tables'] button
document.getElementsByName('make-tables')[0].addEventListener(
    'click', cfg.handlers.makeInputTables, false
);


class Table {
    constructor(name, rows, cols) {
        this.name = name;
        this.rows = rows;
        this.cols = cols;
        this.table = this.makeTable(rows, cols);
    }

    makeTable(rows, cols) {
        // Create a table with a caption, header, footer and body.

        // i -> loop over rows
        // j -> loop over columns
        let i, j;

        // Create an empty html table
        let table = document.createElement('table');
        let caption = table.createCaption();
        let tableHead = table.createTHead();
        let tableFoot = table.createTFoot();
        let tableBody = table.createTBody();

        // Set the name attribute to name
        table.setAttribute('name', this.name);

        // Construct the table header row
        let header = document.createElement('tr');
        for (j = 0; j < cols; j++) {
            let th = document.createElement('th');
            header.appendChild(th);
        }
        // Append the header row to the head of the table
        tableHead.appendChild(header);

        // Construct the table footer row
        let footerRow = document.createElement('tr');
        for (j = 0; j < cols; j++) {
            let td = document.createElement('td');
            footerRow.appendChild(td);
        }
        // Append the footer row to the foot of the table
        tableFoot.appendChild(footerRow);

        // Create the rest of the rows. Just clone the footer's row.
        // rows-2 to account for the header and footer.
        for (i = 0; i < rows-2; i++) {
            let row = tableFoot.rows[0].cloneNode(true);
            tableBody.appendChild(row);
        }

        return table;
    }

    getInnerCell(x, y) {
        // Choose the tag that is the firstChild of a specific <td> element.

        return this.table.rows[x].cells[y].firstChild;
    }

    SetCaption(caption) {
        // Set the table's caption.
        this.table.caption.textContent = caption;
    }

    setTag(tag, start, size={x: 1, y: 1}) {
        // Append tag to each td/th specified.

        // tag is an html DOM element.
        // Start appending from td 'start' where start = {x:val, y: val}.
        // size is the object {x:val, y:val} where size['x'] is the number
        // of rows that will have tag appended, and size['y'] is the
        // number of columns that will have tag appended. These rows and
        // columns are inclusive of the row in which 'start' belongs.
        // This means size = {x:1, y:1} represents just one td: the specified
        // by 'start'.

        for (let i = start.x; i < start.x+size.x; i++) {
            for (let j = start.y; j < start.y+size.y; j++) {
                this.table.rows[i].cells[j].appendChild(tag.cloneNode(true));
            }
        }
    }

    setIdClass(
        className,
        start,
        size={x: 1, y: 1},
        offset={x: 0, y: 0},
        swap=false,
        attachCoords=true
    ) {
        // Add a class to the specified cells.

        // The class will be in the form className-x-y where x and y are
        // the x,y index of the td containing the tag whose class is being
        // updated.
        // offset is the offset in x or y of the class name from the x
        // y index of the td. E.g. cell (2,2) in the table will have
        // the name className-2-2  normally, but with an offset of
        // {x: -1, y: -2}, the new name will have an (x,y) of x=x+offset.x,
        // y=y+offset.y setting it to className-1-0
        // swap will swap the positions of x and y in the class name creation.
        // If set to true, then the x and y values in the supplied offset must
        // be swapped too.
        // attachCoords determines whether the <td>'s xy index must be attached
        // to the class name.

        for (let i = start.x; i < start.x+size.x; i++) {
            for (let j = start.y; j < start.y+size.y; j++) {
                let xInc = swap ? j : i;
                let yInc = swap ? i : j;
                if (attachCoords) {
                    this.getInnerCell(i, j).classList.add(
                      className + '-' + (xInc+offset.x) + '-' + (yInc+offset.y)
                    );
                } else {
                    this.getInnerCell(i, j).classList.add(className);
                }
            }
        }
    }

    setId(idName, start, size={x: 1, y: 1}, offset={x: 0, y: 0}) {
        // Add an id to the specified cells.

        // The id will be in the form idName-x-y where x and y are
        // the x,y index of the td containing the tag whose id is being
        // updated.
        // offset is the offset in x or y of the id name from the x
        // y index of the td. E.g. cell (2,2) in the table will have
        // the name idName-2-2  normally, but with an offset of
        // {x: -1, y: -2}, the new name will have an (x,y) of x=x+offset.x,
        // y=y+offset.y setting it to idName-1-0

        for (let i = start.x; i < start.x+size.x; i++) {
            for (let j = start.y; j < start.y+size.y; j++) {
                this.getInnerCell(i, j).id =
                    idName + '-' + (i+offset.x) + '-' + (j+offset.y);
            }
        }
    }
}

function clearInputTables() {
    // Remove all input tables from the #input-tables div

    let inputTables = document.getElementById('input-tables');
    if (inputTables) {
        while (inputTables.firstChild) {
            inputTables.removeChild(inputTables.firstChild);
        }
    }
}

function makeNodeTable(numberOfNodes) {
    // Create the table for labelling nodes. Create the checkboxes for
    // establishing connections between the nodes.

    // This table will be used to set the textContent of the <span> of td
    // tags that have the class 'node-label-x-0' on them.

    // Create the nodes table

    // cols = 1st column for row labels +       (1 column)
    //        input boxes for node labels +     (1 column)
    //        number of possible connections    (1 less than numberOfNodes)
    //        one node can have with another
    //        i.e. if 3 nodes a,b,c:
    //        a can connect to b,c;
    //        b can connect to a,c;
    //        c can connect to a,b;
    let cols = 1 + 1 + (numberOfNodes - 1);
    let nodes = new Table(cfg.tbl.nodes, numberOfNodes+2, cols);

    // Hide the footer as not needed
    nodes.table.tFoot.hidden = true;

    // Add input tags to table
    let inputNumber = document.createElement('input');
    inputNumber.type = 'text';
    inputNumber.size = 3;
    inputNumber.setAttribute('maxlength', 3);
    let start = {x: 1, y: 1};
    let size = {x: numberOfNodes, y: 1};
    nodes.setTag(inputNumber, start, size);

    // Add id to each input box for use by event handler replaceLabel
    start = {x: 1, y: 1};
    size = {x: numberOfNodes, y: 1};
    let offset = {x: -1, y: -1};
    nodes.setId(nodes.name, start, size, offset);

    // Add <span> tags to header
    let span = document.createElement('span');
    start = {x: 0, y: 0};
    size = {x: 1, y: nodes.cols};
    nodes.setTag(span, start, size);

    // Add <span> tags for row labels
    start = {x: 1, y: 0};
    size = {x: numberOfNodes, y: 1};
    nodes.setTag(span, start, size);

    // Add initial values to header, row labels and input boxes
    // Header
    nodes.getInnerCell(0, 0).textContent = "Joint Number";
    nodes.getInnerCell(0, 1).textContent = "Alphabetic label";

    // Row labels and input boxes.
    // Row labels: single column of cells in the first column and not in the
    // header or footer.
    const ord_a = 'a'.charCodeAt(0);
    for (let i = 1; i <= numberOfNodes; i++) {
        nodes.getInnerCell(i, 0).textContent = i;
        let box = nodes.getInnerCell(i, 1);
        box.setAttribute('value', String.fromCharCode(ord_a + i-1));
        // Store the initial value in the global variable nodeLabelsArray
        cfg.nodeLabelsArray[i-1] = String.fromCharCode(ord_a + i-1);
        // Add the 'input' event to input boxes so that their value can be used
        // by other tables with the 'node-label-x-0' class name, where x is a
        // number from 0 to numberOfNodes-1
        box.addEventListener('input', cfg.handlers.replaceLabel, false);
    }

    // Create the checkboxes

    let labelledBox = document.createElement('label');
    let checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    labelledBox.appendChild(checkbox);

    // Append checkboxes to the remaining <td> tags in the table
    start = {x: 1, y: 2};
    size = {x: numberOfNodes, y: numberOfNodes-1};
    nodes.setTag(labelledBox, start, size);

    // Set checkbox attributes
    // Set id for each checkbox
    // The id is in the form 'node-checkbox-x-y' where x,y are nodes as entered
    // in the 'nodes' table.
    // i,j are used to navigate the nodes table. But also:
    // 'i' represents current node, node represents the node i is connected to.
    for (let i = 0; i < numberOfNodes; i++) {
        let node = 0;
        for (let j = 0; j < numberOfNodes-1; j++) {
            if (i === j) {
                node += 1;
            }
            // 2+j: 2 is to skip first 2 columns, which are not for checkboxes.
            let label = nodes.getInnerCell(i+1, 2+j);
            label.firstChild.id = (
                `${cfg.htmlId.nodeCheckbox}`
                + `-${cfg.nodeLabelsArray[i]}-${cfg.nodeLabelsArray[node]}`
            );

            // Set the text inside each label to the node represented by j
            let span = document.createElement('span');
            span.textContent = cfg.nodeLabelsArray[node];
            // Set class 'node-label-x-0' to each span in the label
            span.classList.add(`${cfg.cls.nodeLabel}-${node}-0`);
            // Append child to ensure the innerHTML of label contains the
            // checkbox first, then the span second. The order is important.
            label.appendChild(span.cloneNode(true));

            // Set node to select the next label from nodeLabelsArray
            node += 1;
        }
    }

    // Set heading above the check boxes to 'Node Connection'
    let checkboxHeading = nodes.table.rows[0].cells[2];
    checkboxHeading.textContent = 'Node Connection';
    // Set colspan to 4
    checkboxHeading.setAttribute('colspan', numberOfNodes-1);
    // Hide the remaining (numberOfNodes-2) columns of the table
    for (let i = 0; i < numberOfNodes-2; i++) {
        nodes.table.rows[0].cells[3+i].hidden = true;
    }

    return nodes;
}

function makeContentTable(name, numberOfNodes, inputTag=true) {
    // Create a table with labelled headers and rows, a footer and a central
    // area to receive data or display it.

    // Iteration variable
    let i = 0;

    let tbl = new Table(name, numberOfNodes+2, numberOfNodes+1);

    // Add <input> tags if inputTag, else add <span> tags
    let tagType = inputTag ? 'input' : 'span';
    let dataCell = document.createElement(tagType);
    dataCell.type = inputTag ? 'number' : null;
    let start = {x: 1, y: 1};
    let size = {x: numberOfNodes, y: numberOfNodes};
    tbl.setTag(dataCell, start, size);

    // Add <span> tags to header, footer and first column
    // Header
    let span = document.createElement('span');
    start = {x: 0, y: 0};
    size = {x: 1, y: tbl.cols};
    tbl.setTag(span, start, size);
    // Footer
    start = {x: tbl.rows-1, y: 0};
    size = {x: 1, y: tbl.cols};
    tbl.setTag(span, start, size);
    // Row label
    start = {x: 1, y: 0};
    size = {x: numberOfNodes, y: 1};
    tbl.setTag(span, start, size);

    // First cell of table will have table name
    tbl.getInnerCell(0, 0).textContent = name;
    // Bottom-left cell in footer will have the text 'Sum'
    tbl.getInnerCell(tbl.rows-1, 0).textContent = 'Sum';
    // Add header and row label
    for (i = 1; i <= numberOfNodes; i++) {
        tbl.getInnerCell(0, i).textContent = cfg.nodeLabelsArray[i-1];
        tbl.getInnerCell(i, 0).textContent = cfg.nodeLabelsArray[i-1];
    }

    // Add class name to header and row labels for detection by replaceLabel
    // Header
    start = {x: 0, y: 1};
    size = {x: 1, y: numberOfNodes};
    let offset = {x: -1, y: 0};
    let swap = true;
    tbl.setIdClass(cfg.cls.nodeLabel, start, size, offset, swap);
    // Row label
    start = {x: 1, y: 0};
    size = {x: numberOfNodes, y: 1};
    offset = {x: -1, y: 0};
    tbl.setIdClass(cfg.cls.nodeLabel, start, size, offset);

    // Disable diagonal input boxes as they shouldn't hold any value
    // Add class 'input-diagonal' for detection through CSS
    for (i = 1; i <= numberOfNodes; i++) {
        tbl.getInnerCell(i, i).classList.add(cfg.cls.diagonal);
        tbl.getInnerCell(i, i).disabled = true;
    }

    return tbl;
}

function makeMomentsTable(name, numberOfNodes) {
    // Create table that will accept moments applied at the nodes.

    let moments = new Table(name, numberOfNodes+2, 2);

    // Hide the footer as not needed
    moments.table.tFoot.hidden = true;

    // Add input tags to table
    let inputNumber = document.createElement('input');
    inputNumber.type = 'number';
    let start = {x: 1, y: 1};
    let size = {x: numberOfNodes, y: 1};
    moments.setTag(inputNumber, start, size);

    // Add <span> tags to header
    let span = document.createElement('span');
    start = {x: 0, y: 0};
    size = {x: 1, y: moments.cols};
    moments.setTag(span, start, size);

    // Add <span> tags for row labels
    start = {x: 1, y: 0};
    size = {x: numberOfNodes, y: 1};
    moments.setTag(span, start, size);

    // Add initial values to header, row labels and input boxes
    // Header
    moments.getInnerCell(0, 0).textContent = "Alphabetic label";
    moments.getInnerCell(0, 1).textContent = "Moment at node";

    // Row labels and input boxes.
    // Row labels: single column of cells in the first column and not in the
    // header or footer.
    const ord_a = 'a'.charCodeAt(0);
    for (let i = 1; i <= numberOfNodes; i++) {
        moments.getInnerCell(i, 0).textContent = String.fromCharCode(
            ord_a + i-1
        );

    }

    // Add 'node-label-x-0' class for detection by replaceLabel
    start = {x: 1, y: 0};
    size = {x: numberOfNodes, y: 1};
    let offset = {x: -1, y: 0};
    moments.setIdClass(cfg.cls.nodeLabel, start, size, offset);

    return moments;
}

function getInputs() {
    // Read the data entered into the input tables.
    // Return an object with arrays containing the data in each table.

    let i = 0;
    // Object that will contain arrays with data from each input table.
    let inputs = {};
    // All 2D arrays except moments
    let df = [];
    let cof = [];
    let init = [];
    let moments = [];

    // Read inputs from the tables
    let dfInputs = document
        .getElementsByName(cfg.tbl.df)[0]
        .getElementsByTagName('input');

    let cofInputs = document
        .getElementsByName(cfg.tbl.cof)[0]
        .getElementsByTagName('input');

    let initInputs = document
        .getElementsByName(cfg.tbl.init)[0]
        .getElementsByTagName('input');

    let momentsInputs = document
        .getElementsByName(cfg.tbl.moments)[0]
        .getElementsByTagName('input');

    // Store current row's data in this array
    let dfRow = [];
    let cofRow = [];
    let initRow = [];
    // There are numberOfNodes^2 input blocks per df, cof, or init table.
    for (i = 0; i < cfg.numberOfNodes**2; i++) {
        dfRow.push(Number(dfInputs[i].value));
        cofRow.push(Number(cofInputs[i].value));
        initRow.push(Number(initInputs[i].value));
        // Push row to main array once entire row has been accessed
        if ((i % cfg.numberOfNodes) == (cfg.numberOfNodes - 1)) {
            df.push(dfRow);
            cof.push(cofRow);
            init.push(initRow);
            dfRow = [];
            cofRow = [];
            initRow = [];
        }
    }

    // Read input from the moments table
    for (i = 0; i < cfg.numberOfNodes; i++) {
        moments.push(Number(momentsInputs[i].value));
    }

    // Add the arrays to the main object so it can be returned
    inputs[cfg.tbl.df] = df;
    inputs[cfg.tbl.cof] = cof;
    inputs[cfg.tbl.init] = init;
    inputs[cfg.tbl.moments] = moments;

    return inputs;
}

})();
