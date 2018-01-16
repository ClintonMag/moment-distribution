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

// TODO: Using CSS if possible, highlight currently select row and column label
// in the input cells.

(function () {

'use strict';

// Some global variables

// Some constants
const constant = {
    NODES_MIN: 2,
    NODES_MAX: 20,
    NUM_NODES_DEFAULT: 5,
    TEXT_MAXLENGTH: 3,
    MIN_ITERATIONS: 1,
    MAX_ITERATIONS: 50,
    MIN_ERROR: 0.001,
    STEP: 0.00001,
};

// Contains variable names and values used in various places in the code
var cfg = {
    // nodeLabelsArray is used to keep all <td> tags with the class name
    // 'node-label-x' updated.
    nodeLabelsArray: [],

    // Contains the number of nodes typed in #number-of-nodes input box
    numberOfNodes: constant.NUM_NODES_DEFAULT,

    // Contains maximum iterations for the method
    maxIterations: constant.MAX_ITERATIONS,

    // Contains minimum error stopping condition for the method
    minError: constant.MIN_ERROR,

    // Keeps track of number of bad inputs in the input tables
    badInputs: 0,

    // Contains names of input tables
    tbl: {
        nodes: 'nodes',
        connections: 'connections',
        df: 'df',
        cof: 'cof',
        init: 'init',
        moments: 'moments',
        outputs: 'outputs',
    },

    // Contains names of keys used in the object containing the output of the
    // method
    out: {
        bal: 'bal',
        cof: 'cof',
        tot: 'total',
        err: 'err',
        iter: 'iter',
    },

    // Contains names of classes
    cls: {
        nodeLabel: 'node-label',
        forceLabelBase: 'force-label-base',
        forceLabel: 'force-label',
        diagonal: 'input-diagonal',
        nodeSpacer: 'node-spacer',
        inputError: 'input-error',
    },

    // All html id values in the html file, hardcoded or generated.
    htmlId: {
        inputNodes: 'input-nodes',
        minError: 'error',
        maxIterations: 'iterations',
        numberOfNodes: 'number-of-nodes',
        inputTables: 'input-tables',
        outputTable: 'output-table',
        nodeCheckbox: 'node-checkbox',
        makeTables: 'make-tables',
        runCalculations: 'run-calcs',
        inputError: 'input-error',
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
                // Don't modify DOM if the label hasn't changed despite event
                // being triggered.
                return;
            }

            // Update nodeLabelsArray with the new value
            cfg.nodeLabelsArray[index] = newLabel;

            // Get all elements with 'node-label-index-0' as a class name
            let labelElements = document.querySelectorAll(
                `.${cfg.cls.nodeLabel}-${index}-0`
            );
                // Apply new labels to those elements
                for (let i = 0; i < labelElements.length; i++) {
                    labelElements[i].textContent = newLabel;
                }
        },

        checkInputBoxes: function(event) {
            // Ensure #number-of-nodes input box has a value >2 and <=20.
            // If not, disable the #make-tables button
            let nodes = document.getElementById(cfg.htmlId.numberOfNodes);
            let iterations = document.getElementById(cfg.htmlId.maxIterations);
            let error = document.getElementById(cfg.htmlId.minError);
            let button = document.getElementById(cfg.htmlId.makeTables);
            // console.log(nodes, iterations, error, button);
            if (Number(nodes.value)<constant.NODES_MIN
                || Number(nodes.value)>constant.NODES_MAX
                || Number(iterations.value)<constant.MIN_ITERATIONS
                || Number(iterations.value)>constant.MAX_ITERATIONS
                || Number(error.value)<constant.MIN_ERROR)
            {
                button.disabled = true;
            } else {
                button.disabled = false;
            }
        },

        checkCheckboxes: function (event) {
            // Automatically checks a checkbox with a connection to another

            // Regular expression to capture index of checkbox
            let re = /-(\d+)-(\d+)/;
            // console.log(event.target, typeof event.target);
            let boxIndices = re.exec(event.target.id);
            // Automatically check/uncheck the box with id:
            // `${cfg.htmlId.nodeCheckbox}-${boxIndices[2]}-${boxIndices[1]}`
            document.getElementById(
                `${cfg.htmlId.nodeCheckbox}-${boxIndices[2]}-${boxIndices[1]}`
            )
            .checked = event.target.checked;
        },

        makeInputTables: function(event) {

            // Remove existing tables if present
            clearInputTables();

            // Get initial values from document
            cfg.numberOfNodes = Number(
                document.getElementById('number-of-nodes').value
            );

            cfg.maxIterations = Number(
                document.getElementById(cfg.htmlId.maxIterations).value
            )

            cfg.minError = Number(
                document.getElementById(cfg.htmlId.minError).value
            )

            // Create node table where labels for each node will be typed
            let nodes = makeNodeTable(cfg.numberOfNodes);
            nodes.SetCaption('Joint Names');
            // Create distribution factor table
            let df = makeContentTable(cfg.tbl.df, cfg.numberOfNodes);
            df.SetCaption('Distribution Factor');
            // Hide footer, not needed (for now).
            df.table.tFoot.hidden = true;

            // Create carry-over factor table
            let cof = makeContentTable(cfg.tbl.cof, cfg.numberOfNodes);
            cof.SetCaption('Carry-over Factor');
            // Hide footer, not needed.
            cof.table.tFoot.hidden = true;

            // Create initial moments table
            let init = makeContentTable(cfg.tbl.init, cfg.numberOfNodes);
            init.SetCaption('Initial Moments');
            // Hide footer, not needed (for now).
            init.table.tFoot.hidden = true;

            // Create applied moments table
            let moments = makeMomentsTable(cfg.tbl.moments, cfg.numberOfNodes);
            moments.SetCaption('Applied Moments');
            // Hide footer, not needed.
            moments.table.tFoot.hidden = true;

            // Append the tables to a <div> with id 'input-tables'
            let inputTablesDiv = document.getElementById(
                cfg.htmlId.inputTables
            );
            inputTablesDiv.appendChild(nodes.table);
            inputTablesDiv.appendChild(df.table);
            inputTablesDiv.appendChild(cof.table);
            inputTablesDiv.appendChild(init.table);
            inputTablesDiv.appendChild(moments.table);

            // Create a button to start the moment distribution method once
            // data has been entered into the tables.

            let runButton = document.createElement('button');
            runButton.id = cfg.htmlId.runCalculations;
            runButton.type = 'button';
            runButton.textContent = "Run Calculations";
            runButton.addEventListener('click', cfg.handlers.runMethod, false);
            // Button is part of the tables, append to inputTablesDiv
            inputTablesDiv.appendChild(runButton);

            // Add <span> next to the button to receive error messages about
            // inputs typed in the input tables.
            let span = document.createElement('span');
            span.id = cfg.htmlId.inputError;
            span.classList.add(cfg.cls.inputError);
            inputTablesDiv.appendChild(span);

            // Switch to input tables tab
            document.querySelectorAll('.tabs li a')[1].click();


            // Fill in some test values
            // testCase();
        },

        runMethod: function(event) {
            // Start the moment distribution method

            // Read inputs
            let inputs = getInputs();
            // Check if inputs are valid
            if (!checkInputs(inputs)) {
                return;
            }
            // Clear previous outputs if inputs are valid
            clearOutputTable();
            // Run the method to completion
            let calcs = startIterations(inputs);
            // Show the results
            showResults(inputs, calcs);
            // Switch to tab with the results
            document.querySelectorAll('.tabs li a')[2].click();
        },
    },
}


// Some setup code that accesses the DOM; must run upon script load.

// Add 'input' event listener to initial input boxes'
document.getElementById(cfg.htmlId.numberOfNodes).addEventListener(
    'input', cfg.handlers.checkInputBoxes, false
);

document.getElementById(cfg.htmlId.maxIterations).addEventListener(
    'input', cfg.handlers.checkInputBoxes, false
);

document.getElementById(cfg.htmlId.minError).addEventListener(
    'input', cfg.handlers.checkInputBoxes, false
);

// Add 'click' event listener to #make-tables button
document.getElementById(cfg.htmlId.makeTables).addEventListener(
    'click', cfg.handlers.makeInputTables, false
);

// Add 'click' event listener to tabs
var tabs = document.querySelectorAll('.content .tabs li a');
var panels = document.querySelectorAll('.content .panels div');
for(let i = 0; i < tabs.length; i++) {
    var tab = tabs[i];
    setTabHandler(tab, i);
}

function setTabHandler(tab, tabPos) {
    tab.onclick = function() {
        for(let i = 0; i < tabs.length; i++) {
            tabs[i].className = '';
        }

        tab.className = 'active';

        for(let i = 0; i < panels.length; i++) {
            panels[i].className = '';
        }

        panels[tabPos].className = 'active-panel';
    }
}

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
                        `${className}-${xInc+offset.x}-${yInc+offset.y}`
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
                `${idName}-${i+offset.x}-${j+offset.y}`;
            }
        }
    }
}

function clearInputTables() {
    // Remove all input tables from the #input-tables div

    let inputTables = document.getElementById(cfg.htmlId.inputTables);
    if (inputTables) {
        while (inputTables.firstChild) {
            inputTables.removeChild(inputTables.firstChild);
        }
    }
}

function clearOutputTable() {
    // Remove the output table to accommodate new inputs

    let outputTable = document.getElementById(cfg.htmlId.outputTable);
    if (outputTable) {
        while (outputTable.firstChild) {
            outputTable.removeChild(outputTable.firstChild);
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
    inputNumber.setAttribute('maxlength', constant.TEXT_MAXLENGTH);
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
    const ord_a = 'A'.charCodeAt(0);
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
                `${cfg.htmlId.nodeCheckbox}` + `-${i}-${node}`
            );
            // Add 'change' event listener to checkbox
            label.firstChild.addEventListener(
                'change', cfg.handlers.checkCheckboxes, false
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
    let dataCell;
    if (inputTag) {
        dataCell = document.createElement('input');
        dataCell.type = 'number';
        dataCell.setAttribute('step', constant.STEP);
    } else {
        dataCell = document.createElement('span');
    }
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
    inputNumber.setAttribute('step', constant.STEP);
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
    const ord_a = 'A'.charCodeAt(0);
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

    cfg.numberOfNodes = Number(
        document.getElementById('number-of-nodes').value
    );

    cfg.maxIterations = Number(
        document.getElementById(cfg.htmlId.maxIterations).value
    )

    cfg.minError = Number(
        document.getElementById(cfg.htmlId.minError).value
    )

    let i = 0;
    // Object that will contain arrays with data from each input table.
    let inputs = {};
    // All 2D arrays except moments which is 1D.
    // connections[x][y]: y=0 -> boolean; y=1 -> node that x is connected to.
    let connections = [];
    let df = [];
    let cof = [];
    let init = [];
    let moments = [];

    let maxIterations = 0;
    let minError = 0;

    // Read inputs from the tables

    // Read checkboxes
    let ord_a = 'A'.charCodeAt(0);
    for (let i = 0; i < cfg.numberOfNodes; i++) {
        // Used to select the node that node 'i' is connected to. See
        // makeNodeTable for similar technique.
        let node = 0;
        let row = [];
        for (let j = 0; j < cfg.numberOfNodes-1; j++) {
            if (i === j) {
                node += 1;
            }
            let checkbox = document.getElementById(
                `${cfg.htmlId.nodeCheckbox}-${i}-${node}`
            );
            row.push([checkbox.checked, node]);
            node += 1;
        }
        // Append row checkbox states
        connections.push(row);
    }

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
        // If a non-numeric value is detected, store 'Bad input' for detection
        // bad the checkInputs function later.
        dfRow.push(
            dfInputs[i].validity.badInput
            ? 'Bad Input'
            : Number(dfInputs[i].value)
        );

        cofRow.push(
            cofInputs[i].validity.badInput
            ? 'Bad Input'
            : Number(cofInputs[i].value)
        );

        initRow.push(
            initInputs[i].validity.badInput
            ? 'Bad Input'
            : Number(initInputs[i].value)
        );

        // Push row to main array once entire row has been accessed
        if ((i % cfg.numberOfNodes) === (cfg.numberOfNodes - 1)) {
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
        moments.push(
            momentsInputs[i].validity.badInput
            ? 'Bad Input'
            : Number(momentsInputs[i].value)
        );
    }

    // Add the arrays to the main object so it can be returned
    inputs[cfg.tbl.connections] = connections;
    inputs[cfg.tbl.df] = df;
    inputs[cfg.tbl.cof] = cof;
    inputs[cfg.tbl.init] = init;
    inputs[cfg.tbl.moments] = moments;

    return inputs;
}

function checkInputs(inputs) {
    // Check inputs typed in tables for validity

    // Clear previous error message
    document.getElementById(cfg.htmlId.inputError).textContent = '';

    // Check if every node has at least one connection to another
    for (let row in inputs[cfg.tbl.connections]) {
        let emptyRow = true;
        for (let cell in inputs[cfg.tbl.connections][row]) {
            if (inputs[cfg.tbl.connections][row][cell][0]) {
                emptyRow = false;
            }
        }
        // If entire row has no true value, it means the current node has no
        // connection to the other.
        if (emptyRow) {
            // This creates 3 spans with varying textContent. The span with the
            // node label that isn't connected to any other has the
            // 'node-label' class so it's content can change if labels change.
            let nodeLabel = document.createElement('span');
            nodeLabel.classList.add(`${cfg.cls.nodeLabel}-${row}-0`);
            nodeLabel.textContent = cfg.nodeLabelsArray[row];

            let span = document.createElement('span');
            span.textContent = 'Joint ';
            document.getElementById(cfg.htmlId.inputError).appendChild(span);
            document.getElementById(cfg.htmlId.inputError).appendChild(
                nodeLabel
            );
            span = span.cloneNode(false);
            span.textContent = ' is not connected to any other node. ' +
                'Tick appropriate checkbox.';
            document.getElementById(cfg.htmlId.inputError).appendChild(span);

            return false;
        }
    }

    // Check distribution factors
    let tableName = '';
    for (let arr in inputs) {
        switch (arr) {
            case cfg.tbl.df:
                tableName = 'the Distribution Factor table';
                break;
            case cfg.tbl.cof:
                tableName = 'the Carry-over Factor table';
                break;
            case cfg.tbl.init:
                tableName = 'the Initial Moments table';
                break;
            case cfg.tbl.moments:
                tableName = 'the Applied Moments table';
                break;
            default:
                tableName = 'the input tables';
        }

        let errMsg = `A value in ${tableName} is not a valid number.`;
        if (arr === cfg.tbl.connections){
            continue;
        }
        if (arr === cfg.tbl.moments) {
            for (let cell in inputs[arr]) {
                if (Number(inputs[arr][cell]) !== 0
                    && !Number(inputs[arr][cell]))
                {
                    // Send error message to #input-error <span> tag
                    document.getElementById(cfg.htmlId.inputError)
                    .textContent = errMsg;

                    return false;
                }
            }
            continue;
        }
        for (let row in inputs[arr]) {
            for (let cell in inputs[arr][row]) {
                if (Number(inputs[arr][row][cell]) !== 0
                    && !Number(inputs[arr][row][cell]))
                {
                    // Send error message to #input-error <span> tag
                    document.getElementById(cfg.htmlId.inputError)
                    .textContent = errMsg;

                    return false;
                }
            }
        }
    }
    return true;
}

function startIterations(inputs) {
    // Run the method until maximum iterations reached, or error is less
    // than the minimum.

    // Object containing all the arrays after method has run except iterations.
    // The values of each key in calcs is a 3D array.
    let calcs = {};
    calcs[cfg.out.bal] = [];
    calcs[cfg.out.cof] = [];
    calcs[cfg.out.tot] = [];
    calcs[cfg.out.err] = [0];
    calcs[cfg.out.iter] = 0;

    // Current calculated balance for a node
    let tmpBal = 0;
    // Current calculated carry-over factor moment transferred to a node
    let tmpCof = 0;
    // Current calculated sum of previous moment at a joint, current balance at
    // that joint, and carry-over moment transferred to that node.
    let tmpTot = 0;
    // Error calculated for the current moment
    let tmpErr = 0;
    // The bal array for the current iteration
    let iterBal = [];
    // The cof array for the current iteration
    let iterCof = [];
    // The running total of moments at joint at the current iteration
    let iterTot = [];
    // Error at moment for all moments for the current iteration
    let iterErr = [];
    // Contains sum of elements in each column of the init array
    let initTotal = [];
    // Multidimension array that carries data from each iteration; contains
    // multiple iterBal arrays.
    let bal = [];
    // Used to compute the balance for the current iteration
    let curBal = [];
    // Used to compute the current moment carried over to connecting joint
    let curCof = [];
    // Contains current running total of the moment at a joint
    let curTot = [];
    // Contains error for all moment connected to joint represented by i.
    let curErr = [];

    // Calculate sum of elements in each column of the init array. Required
    // in the first iteration
    initTotal = sumOfColumns(inputs.init);

    // First iteration

    // iterCof requires iterBal to be populated, so iterBal is populated here.
    for (let i = 0; i < cfg.numberOfNodes; i++) {
        curBal = [];
        for (let j = 0; j < cfg.numberOfNodes; j++) {
            tmpBal = inputs.df[i][j] * (inputs.moments[j] - initTotal[j]);
            curBal.push(tmpBal);
        }
        iterBal.push(curBal);
    }

    // iterCof
    for (let i = 0; i < cfg.numberOfNodes; i++) {
        curCof = [];
        for (let j = 0; j < cfg.numberOfNodes; j++) {
            tmpBal = iterBal[j][i];
            tmpCof = inputs.cof[j][i] * tmpBal;
            curCof.push(tmpCof);
        }
        iterCof.push(curCof);
    }

    // iterTot
    for (let i = 0; i < cfg.numberOfNodes; i++) {
        curTot = [];
        for (let j = 0; j < cfg.numberOfNodes; j++) {
            tmpTot = inputs.init[i][j] + iterBal[i][j] + iterCof[i][j];
            curTot.push(tmpTot);
        }
        iterTot.push(curTot);
    }

    // Push the first iteration arrays to the calcs object
    calcs[cfg.out.bal].push(iterBal);
    calcs[cfg.out.cof].push(iterCof);
    calcs[cfg.out.tot].push(iterTot);
    calcs[cfg.out.iter] = 1;
    // First iteration complete

    if (cfg.maxIterations === 1) {
        return calcs;
    }

    // Remaining iterations

    let iteration = 1;
    // Highest % error of all moments for the current iteration
    let maxError = 0;
    while (iteration < cfg.maxIterations) {
        // Clear for new iteration
        iterBal = [];
        iterCof = [];
        iterTot = [];
        iterErr = [];
        maxError = 0;
        // The sum of the columns of the iterTot array from previous iteration
        let sumOfTot = sumOfColumns(calcs[cfg.out.tot][iteration-1]);

        for (let i = 0; i < cfg.numberOfNodes; i++) {
            curBal = [];
            for (let j = 0; j < cfg.numberOfNodes; j++) {
                tmpBal = inputs.df[i][j] * (inputs.moments[j] - sumOfTot[j]);
                curBal.push(tmpBal);
            }
            iterBal.push(curBal);
        }

        // iterCof
        for (let i = 0; i < cfg.numberOfNodes; i++) {
            curCof = [];
            for (let j = 0; j < cfg.numberOfNodes; j++) {
                tmpBal = iterBal[j][i];
                tmpCof = inputs.cof[j][i] * tmpBal;
                curCof.push(tmpCof);
            }
            iterCof.push(curCof);
        }

        // iterTot
        for (let i = 0; i < cfg.numberOfNodes; i++) {
            curTot = [];
            for (let j = 0; j < cfg.numberOfNodes; j++) {
                tmpTot = calcs[cfg.out.tot][iteration-1][i][j]
                         + iterBal[i][j]
                         + iterCof[i][j];
                curTot.push(tmpTot);
            }
            iterTot.push(curTot);
        }

        // Check error
        for (let i = 0; i < cfg.numberOfNodes; i++) {
            curErr = [];
            for (let j = 0; j < cfg.numberOfNodes; j++) {
                tmpBal = iterBal[i][j];
                tmpCof = iterCof[i][j];
                tmpTot = iterTot[i][j];
                let prevCof = calcs[cfg.out.cof][iteration-1][i][j];
                if (tmpTot !== 0
                    && tmpBal !== 0
                    && Math.abs(tmpTot) >= Math.abs(tmpBal))
                {
                    // Use bal to calculate error
                    tmpErr = (tmpBal / tmpTot) * 100;
                }
                else if (tmpTot !== 0
                    && prevCof !== 0
                    && Math.abs(tmpTot) >= Math.abs(prevCof))
                {
                    // If bal unavailable use COF to calculate error
                    tmpErr = (prevCof / tmpTot) * 100;
                }
                else if (prevCof !== 0)
                {
                    // Inflate the error so that iterations continue. This is
                    // done because we're using abs. value of bal as stopping
                    // condition if the normal error can't be calculated.
                    tmpErr = prevCof * 100;
                }
                else if (tmpBal !== 0)
                {
                    // Last resort if normal error can't be computed.
                    tmpErr = tmpBal * 100;
                }
                else
                {
                    // If both bal and COF unavailable, like at pin, then
                    // err = 0
                    tmpErr = 0;
                }

                if (Math.abs(tmpErr) > maxError) {
                    maxError = Math.abs(tmpErr);
                }

                curErr.push(tmpErr);
            }
            iterErr.push(curErr);
        }

        iteration += 1;

        // Push the current iteration arrays to the calcs object
        calcs[cfg.out.bal].push(iterBal);
        calcs[cfg.out.cof].push(iterCof);
        calcs[cfg.out.tot].push(iterTot);
        calcs[cfg.out.err].push(iterErr);
        calcs[cfg.out.iter] = iteration;

        if (maxError < cfg.minError) {
            return calcs;
        }
    }

    return calcs;
}

function showResults(inputs, calcs) {
    // Organize and display the outputs to the 'output-table' div

    // Keeps index of empty columns that separate nodes in the table
    let emptyIndices = [];

    // Used to traverse 'output' defined below
    let col = 0,
        row = 0,
        curNode = 0,
        iteration = 0;

    // Determine output table width
    // forces is the number of forces (moments) in the structure. This is the
    // number of input checkboxes that have been ticked.
    let forces = 0;
    for (let row of inputs[cfg.tbl.connections]) {
        for (let box of row) {
            // Increase number of forces if checkbox is ticked.
            forces += box[0] ? 1 : 0;
        }
    }

    // 1: for the first column of row labels,
    // forces: each force takes up a column in the output table
    // (cfg.numberOfNodes-1): There is a column of empty space between the
    // forces of each node in the table, except the last node which doesn't
    // need it.
    let cols = 1 + forces + (cfg.numberOfNodes-1)

    // 5: First 5 rows are labels for each column
    // calcs.iterations*2 - 1: each iteration creates a 'bal' and 'cof' row,
    // except the last row which only has a 'bal'.
    // 2: After output of the iterations, there is 1 blank row, then a row with
    // the final calculated moments at each node.
    let rows = 5 + calcs[cfg.out.iter]*2 - 1 + 2;
    let output = new Table(cfg.tbl.outputs, rows, cols);
    output.SetCaption('Moment Distribution Calculation Results');

    // Add <span> tags
    let span = document.createElement('span');
    let start = {x: 0, y: 0};
    let size = {x: rows, y: cols};
    output.setTag(span, start, size);

    // Add labels to header and last row
    output.getInnerCell(0, 0).textContent = 'Joint';
    output.getInnerCell(1, 0).textContent = 'Moment';
    output.getInnerCell(2, 0).textContent = 'DF';
    output.getInnerCell(3, 0).textContent = 'COF';
    output.getInnerCell(4, 0).textContent = 'Init M';
    output.getInnerCell(rows-1, 0).textContent = 'Total';

    col = 1;
    curNode = 0;
    // This loop populates the header of the output table
    while (true) {
        // First row
        output.getInnerCell(0, col).classList.add(
            `${cfg.cls.nodeLabel}-${curNode}-0`
        );
        output.getInnerCell(0, col).textContent = cfg.nodeLabelsArray[curNode];

        for (let connectingNode of inputs[cfg.tbl.connections][curNode]) {
            // Enter only if curNode has a node connected to it
            if (connectingNode[0]) {
                // Add class 'force-label-base' to existing span
                output.getInnerCell(1, col).classList.add(
                    cfg.cls.forceLabelBase
                );
                // The 'M' will be used for formatting as base to characters
                // that are subscripted next to it.
                output.getInnerCell(1, col).textContent = `M`;

                // Additional 2 <span> tags for rows with force labels. These
                // tags will have the 'force-label' class name for
                // formatting into a subscript.

                // First span tag, containing alphabetic label of current node.
                let spanForceLabel = document.createElement('span');
                spanForceLabel.classList.add(
                    `${cfg.cls.forceLabel}`,
                    `${cfg.cls.nodeLabel}-${curNode}-0`
                )
                spanForceLabel.textContent = `${cfg.nodeLabelsArray[curNode]}`;
                output.table.rows[1].cells[col].appendChild(spanForceLabel);

                // Second span tag, containing alphabetic label of node
                // connected to current node.
                spanForceLabel = document.createElement('span');
                spanForceLabel.classList.add(
                    `${cfg.cls.forceLabel}`,
                    `${cfg.cls.nodeLabel}-${connectingNode[1]}-0`
                );
                spanForceLabel.textContent = `${
                    cfg.nodeLabelsArray[connectingNode[1]]
                }`;
                output.table.rows[1].cells[col].appendChild(spanForceLabel);

                output.getInnerCell(2, col).textContent = inputs[cfg.tbl.df]
                    [connectingNode[1]][curNode];

                output.getInnerCell(3, col).textContent = inputs[cfg.tbl.cof]
                    [curNode][connectingNode[1]];

                output.getInnerCell(4, col).textContent = inputs[cfg.tbl.init]
                    [connectingNode[1]][curNode];
                col += 1;
            }
        }

        curNode += 1;
        emptyIndices.push(col);
        col += 1;
        if (col >= cols) {
            break;
        }
    }

    // For first row of table containing labels of each node:
    // Set colspan of first cell at node to number of forces at that node.
    // Hide the cells whose space is taken up by the enlarged cell.
    col = 1;
    let nodeForces = 0;
    // startCol is column index in the table of the first force of all
    // forces at the current node.
    let startCol = 1;
    for (let index of emptyIndices) {
        if (emptyIndices.indexOf(index) === 0) {
            startCol = 1;
            nodeForces = index - 1;
            output.table.rows[0].cells[1].setAttribute('colspan', nodeForces);
            col = startCol+1;
            // nodeForces-1 is the number of columns to hide after the current
            // column.
            while (col < startCol+nodeForces) {
                output.table.rows[0].cells[col].hidden = true;
                col += 1;
            }
            continue;
        }

        if (emptyIndices.indexOf(index) === 1) {
            nodeForces = index - emptyIndices[0] - 1;
        } else {
            nodeForces = index - emptyIndices[emptyIndices.indexOf(index)-1]-1;
        }
        startCol = emptyIndices[emptyIndices.indexOf(index)-1] + 1;
        output.table.rows[0].cells[startCol].setAttribute(
            'colspan', nodeForces
        );
        col = startCol + 1;
        while (col < startCol+nodeForces) {
            output.table.rows[0].cells[col].hidden = true;
            col += 1;
        }
    }

    // Pop last column of emptyIndices as its value is out of table width
    emptyIndices.pop();

    // This loop adds class 'node-spacer' to columns that contain empty space
    // to divide the nodes in the ouput table. Will be formatted with CSS.
    // The class is also added to the empty row that separates the last 'bal'
    // and the 'Total' row, which is located at rows-2.
    // (Just practising use of the comma operator, and 'do' loop)
    row = 0;
    do {
        let index = 0;
        do {
            output.table.rows[row].cells[emptyIndices[index]].classList.add(
                cfg.cls.nodeSpacer
            );
        } while (index++, index < emptyIndices.length);
    } while (row++, row < rows);

    col = 0;
    do {
        output.table.rows[row-2].cells[col].classList.add(cfg.cls.nodeSpacer);
    } while (col++, col < cols);

    // This loop fills the remaining cells with the calculated data
    iteration = 0;
    row = 5;
    while (row < rows-2) {
        col = 0;
        curNode = 0;
        // Each row label to alternate between 'Bal' and 'COF'
        output.getInnerCell(row, col).textContent = 'Balance';
        output.getInnerCell(row+1, col).textContent = 'COF';
        col += 1;
        while (col < cols) {
            for (let connectingNode of inputs[cfg.tbl.connections][curNode]) {
                // If there's a node connected to curNode, then we read its
                // bal and cof value so it can be displayed in the output.
                if (connectingNode[0]) {
                    let balCell = output.getInnerCell(row, col);
                    let cofCell = output.getInnerCell(row+1, col);

                    // This technique is used to represent numbers to 3 decimal
                    // places with almost accurate rounding. Not always
                    // accurate due to floating point precision issues.
                    balCell.textContent = Math.round((calcs[cfg.out.bal]
                        [iteration][connectingNode[1]][curNode] + 0.00001)
                        * 1000) / 1000;

                    cofCell.textContent = Math.round((calcs[cfg.out.cof]
                        [iteration][connectingNode[1]][curNode] + 0.00001)
                        * 1000) / 1000;

                    col += 1;
                }
            }
            // Skip empty column
            col += 1;

            curNode += 1;
        }

        iteration += 1;
        row = 5 + 2*iteration;
    }

    // Clear second-last row as it was filled with cof values.
    output.getInnerCell(rows-2, 0).textContent = '';
    // Populate last row with value of moments at each node.
    col = 1;
    curNode = 0;
    while (col < cols) {
        for (let connectingNode of inputs[cfg.tbl.connections][curNode]) {
            if (connectingNode[0]) {
                output.getInnerCell(rows-2, col).textContent = '';

                output.getInnerCell(rows-1, col)
                .textContent = Math.round((calcs[cfg.out.tot]
                    [calcs[cfg.out.iter]-1][connectingNode[1]][curNode]
                    + 0.0001) * 1000) / 1000;

                col += 1;
            }
        }
        col += 1;
        curNode += 1;
    }

    document.getElementById(cfg.htmlId.outputTable).appendChild(output.table);
}

function sumOfColumns(my2DArray) {
    // Calculate the sum of the columns of a 2D array. Return 1D array.

    let sums = [];
    for (let i = 0; i < my2DArray.length; i++) {
        let total = 0;
        for (let j = 0; j < my2DArray.length; j++) {
            total += my2DArray[j][i];
        }
        sums.push(total);
    }
    return sums;
}

function testCase() {
    // Automatically enters numbers in the appropriate cells
    let df = document.getElementsByName(cfg.tbl.df)[0];
    df.tBodies[0].rows[0].cells[2].firstChild.value = 0.364;
    df.tBodies[0].rows[1].cells[3].firstChild.value = 0.273;
    df.tBodies[0].rows[1].cells[5].firstChild.value = 0.571;
    df.tBodies[0].rows[2].cells[2].firstChild.value = 0.273;
    df.tBodies[0].rows[2].cells[6].firstChild.value = 0.571;
    df.tBodies[0].rows[3].cells[2].firstChild.value = 0.364;
    df.tBodies[0].rows[3].cells[3].firstChild.value = 0.364;
    df.tBodies[0].rows[4].cells[6].firstChild.value = 0.429;
    df.tBodies[0].rows[5].cells[3].firstChild.value = 0.364;
    df.tBodies[0].rows[5].cells[5].firstChild.value = 0.429;

    df = document.getElementsByName(cfg.tbl.cof)[0];
    df.tBodies[0].rows[0].cells[2].firstChild.value = 0.5;
    df.tBodies[0].rows[1].cells[3].firstChild.value = 0.5;
    df.tBodies[0].rows[1].cells[5].firstChild.value = 0.5;
    df.tBodies[0].rows[2].cells[2].firstChild.value = 0.5;
    df.tBodies[0].rows[2].cells[6].firstChild.value = 0.5;
    df.tBodies[0].rows[3].cells[3].firstChild.value = 0.5;
    df.tBodies[0].rows[4].cells[2].firstChild.value = 0.5;
    df.tBodies[0].rows[4].cells[6].firstChild.value = 0.5;
    df.tBodies[0].rows[5].cells[3].firstChild.value = 0.5;
    df.tBodies[0].rows[5].cells[5].firstChild.value = 0.5;

    df = document.getElementsByName(cfg.tbl.init)[0];
    df.tBodies[0].rows[0].cells[2].firstChild.value = 26.25;
    df.tBodies[0].rows[1].cells[1].firstChild.value = -26.25;
    df.tBodies[0].rows[1].cells[5].firstChild.value = 18.75;
    df.tBodies[0].rows[4].cells[2].firstChild.value = -18.75;
}

})();
