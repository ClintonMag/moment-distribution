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

// Some global variables

// nodeLabelsArray is used to keep all <td> tags with the class name
// 'node-label-x' updated.
var nodeLabelsArray = [];

var momentDist = (function () {

'use strict';

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
        className, start, size={x: 1, y: 1}, offset={x: 0, y: 0}, swap=false
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

        for (let i = start.x; i < start.x+size.x; i++) {
            for (let j = start.y; j < start.y+size.y; j++) {
                let xInc = swap ? j : i;
                let yInc = swap ? i : j;
                this.getInnerCell(i, j).classList.add(
                    className + '-' + (xInc+offset.x) + '-' + (yInc+offset.y)
                );
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

function makeNodeTable(numberOfNodes) {
    // Create the table for labelling nodes.

    // This table will be used to set the textContent of the <span> of td
    // tags that have the class 'node-label-x-0' on them.

    // Create the nodes table
    let nodes = new Table('nodes', numberOfNodes+2, 2);

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
        nodeLabelsArray[i-1] = String.fromCharCode(ord_a + i-1);
        // Add the 'input' event to input boxes so that their value can be used
        // by other tables with the 'node-label-x-0' class name, where x is a
        // number from 0 to numberOfNodes-1
        box.addEventListener('input', replaceLabel, false);
    }

    return nodes;
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

        // Get all elements with 'node-label-index-0' as a class name
        let labelElements = document.querySelectorAll(
            '.node-label-' + index + '-0');
        // Apply new labels to those elements
        for (let i = 0; i < labelElements.length; i++) {
            labelElements[i].textContent = newLabel;
        }
    }

function makeDFTable(numberOfNodes) {
    // Create distribution factor table

    // Iteration variable
    let i = 0;

    let name = 'df';
    let df = new Table(name, numberOfNodes+2, numberOfNodes+1);
    df.SetCaption('Distribution Factor');

    // Add input boxes
    let inBox = document.createElement('input');
    inBox.type = 'number';
    let start = {x: 1, y: 1};
    let size = {x: numberOfNodes, y: numberOfNodes};
    df.setTag(inBox, start, size);

    // Add <span> tags to header, footer and first column
    // Header
    let span = document.createElement('span');
    start = {x: 0, y: 0};
    size = {x: 1, y: df.cols};
    df.setTag(span, start, size);
    // Footer
    start = {x: df.rows-1, y: 0};
    size = {x: 1, y: df.cols};
    df.setTag(span, start, size);
    // Row label
    start = {x: 1, y: 0};
    size = {x: numberOfNodes, y: 1};
    df.setTag(span, start, size);

    // First cell of table will have table name
    df.getInnerCell(0, 0).textContent = 'DF';
    // Bottom-left cell in footer will have the text 'Sum'
    df.getInnerCell(df.rows-1, 0).textContent = 'Sum';
    // Add header and row label
    for (i = 1; i <= numberOfNodes; i++) {
        df.getInnerCell(0, i).textContent = nodeLabelsArray[i-1];
        df.getInnerCell(i, 0).textContent = nodeLabelsArray[i-1];
    }

    // Add class name to header and row labels for detection by replaceLabel
    // Header
    start = {x: 0, y: 1};
    size = {x: 1, y: numberOfNodes};
    let offset = {x: -1, y: 0};
    let swap = true;
    df.setIdClass('node-label', start, size, offset, swap);
    // Row label
    start = {x: 1, y: 0};
    size = {x: numberOfNodes, y: 1};
    offset = {x: -1, y: 0};
    df.setIdClass('node-label', start, size, offset);

    return df;
}

function makeInputTables() {

    // Get the number of nodes from document
    let numberOfNodes = Number(
        document.getElementById('number-of-nodes').value
    );

    // Create node table where labels for each node will be typed
    let nodes = makeNodeTable(numberOfNodes);
    document.getElementById('input-tables').appendChild(nodes.table);

    // Create distribution factor table
    let df = makeDFTable(numberOfNodes);
    document.getElementById('input-tables').appendChild(df.table);

}

return {
    makeInTables: makeInputTables
}

})();
