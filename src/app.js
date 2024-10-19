const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
const clearBoard = document.getElementById('clearBoard');
const undoButton = document.getElementById('undo');
const redoButton = document.getElementById('redo');
const settingsButton = document.getElementById('settingsButton');
const settingsMenu = document.getElementById('settingsMenu');
const lineWidthSlider = document.getElementById('lineWidth');
const lineColorPicker = document.getElementById('lineColor');
const cursor = document.createElement('div'); // Custom cursor element
const eraserButton = document.getElementById('eraser');
const eraserWidthSlider = document.getElementById('eraserWidth');

let drawing = false;
let panning = false;
let panX = 0, panY = 0; // Track the panning offset
let startPanX, startPanY; // Track where the panning started
let scale = 1; // Zoom level
let minScale = 0.2; // Minimum zoom level
let maxScale = 5; // Maximum zoom level
let lineWidth = parseInt(lineWidthSlider.value); // Initial line width from the slider
let lineColor = lineColorPicker.value; // Initial pen color
let isEraser = false; // Track if eraser is active
let eraserWidth = 10; // Initial width of the eraser

let lastX = 0; // Last mouse X position
let lastY = 0; // Last mouse Y position
let paths = []; // Store all drawing paths
let drawingHistory = []; // Store history for undo/redo

// Set up the custom cursor
cursor.style.position = 'absolute';
cursor.style.width = `${lineWidth}px`;
cursor.style.height = `${lineWidth}px`;
cursor.style.borderRadius = '50%';
cursor.style.backgroundColor = lineColor;
cursor.style.pointerEvents = 'none';
cursor.style.zIndex = '1000'; // Ensure the cursor is on top
document.body.appendChild(cursor);

// Set the initial size of the canvas
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Save the initial state of the canvas
saveState();

// Event listeners for mouse events
canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
        startDrawing(event);
    } else if (event.button === 1) {
        startPanning(event);
    }
});
canvas.addEventListener('mouseup', stopAction);
canvas.addEventListener('mousemove', (event) => {
    // Hide both menus when drawing starts
    settingsMenu.style.display = 'none';
    eraserMenu.style.display = 'none';
    moveCursor(event);
    if (drawing) {
        draw(event);
    } else if (panning) {
        pan(event);
    }
});
canvas.addEventListener('wheel', zoom);

// Prevent the context menu from showing on right-click
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

// Event listeners for toolbar buttons
clearBoard.addEventListener('click', clearCanvas);
undoButton.addEventListener('click', undo);
redoButton.addEventListener('click', redo);

// Event listener for line width and color picker
lineWidthSlider.addEventListener('input', (event) => {
    lineWidth = parseInt(event.target.value);
    updateCursorColor();
});

lineColorPicker.addEventListener('input', (event) => {
    lineColor = event.target.value;
    updateCursorColor();
});

// Event listener for the settings button
settingsButton.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent event from closing the dropdown immediately
    toggleDropdown();
});

// Event listener for Eraser button
eraserButton.addEventListener('click', () => {
    isEraser = !isEraser; // Toggle the eraser state
    if (isEraser) {
        lineColor = '#f0f0f0'; // Set to the background color
        lineWidth = eraserWidth; // Set the eraser width
        eraserButton.style.backgroundColor = '#0056b3';
        document.getElementById('eraserMenu').style.display = 'block'; // Show eraser menu
        document.getElementById('settingsMenu').style.display = 'none'; // Hide pen menu
    } else {
        lineColor = lineColorPicker.value; // Revert to the pen color
        lineWidth = penWidth; // Revert to pen width
        eraserButton.style.backgroundColor = '#007bff';
        document.getElementById('eraserMenu').style.display = 'none'; // Hide eraser menu
    }
    updateCursorColor();
});

// Update the eraser width when the slider changes
eraserWidthSlider.addEventListener('input', (e) => {
    eraserWidth = e.target.value;
    if (isEraser) {
        lineWidth = eraserWidth;
        updateCursorColor(); // Update the cursor size
    }
});

// Event listener to close the settings menu when clicking outside
document.addEventListener('click', (event) => {
    // Close the pen settings menu if clicked outside
    if (settingsMenu.style.display === 'flex' && !settingsMenu.contains(event.target) && event.target !== settingsButton) {
        settingsMenu.style.display = 'none';
    }

    // Close the eraser menu if clicked outside
    if (eraserMenu.style.display === 'block' && !eraserMenu.contains(event.target) && event.target !== eraserButton) {
        eraserMenu.style.display = 'none';
    }
});


function toggleDropdown() {
    settingsMenu.style.display = settingsMenu.style.display === 'none' || settingsMenu.style.display === '' ? 'flex' : 'none';
}

// Event listener for keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        undo();
    }
    if (event.ctrlKey && event.key === 'y') {
        event.preventDefault();
        redo();
    }
});

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    redrawCanvas();
}

function startDrawing(event) {
    drawing = true;
    lastX = (event.clientX - panX) / scale;
    lastY = (event.clientY - panY) / scale;
    paths.push({ color: lineColor, width: lineWidth, points: [[lastX, lastY]] });
}

function stopAction() {
    if (drawing) {
        drawing = false;
        saveState();
    }
    if (panning) {
        panning = false;
    }
}

function draw(event) {
    if (!drawing) return;
    const x = (event.clientX - panX) / scale;
    const y = (event.clientY - panY) / scale;

    const currentPath = paths[paths.length - 1];
    currentPath.points.push([x, y]);

    // Clear and redraw the canvas with smooth lines
    redrawCanvas();
}

function startPanning(event) {
    panning = true;
    startPanX = event.clientX - panX;
    startPanY = event.clientY - panY;
}

function pan(event) {
    panX = event.clientX - startPanX;
    panY = event.clientY - startPanY;
    redrawCanvas();
}

// Function to zoom in and out
function zoom(event) {
    event.preventDefault();
    const zoomFactor = 0.1;
    const delta = event.deltaY < 0 ? 1 : -1;
    const newScale = scale + delta * zoomFactor * scale;

    // Limit the zoom level
    if (newScale >= minScale && newScale <= maxScale) {
        const mouseX = (event.clientX - panX) / scale;
        const mouseY = (event.clientY - panY) / scale;

        scale = newScale;

        // Adjust pan position to zoom relative to the mouse position
        panX = event.clientX - mouseX * scale;
        panY = event.clientY - mouseY * scale;

        redrawCanvas();
    }
}

function redrawCanvas() {
    ctx.setTransform(scale, 0, 0, scale, panX, panY);
    ctx.clearRect(-panX / scale, -panY / scale, canvas.width / scale, canvas.height / scale);

    // Redraw all paths with smooth lines
    paths.forEach((path) => {
        ctx.beginPath();
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.width / scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round'; // Smooth out corners

        path.points.forEach(([x, y], index) => {
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                // Use quadraticCurveTo for smooth lines
                const prevPoint = path.points[index - 1];
                const midPointX = (prevPoint[0] + x) / 2;
                const midPointY = (prevPoint[1] + y) / 2;
                ctx.quadraticCurveTo(prevPoint[0], prevPoint[1], midPointX, midPointY);
            }
        });

        // For the last segment, ensure the line reaches the final point
        if (path.points.length > 1) {
            const lastPoint = path.points[path.points.length - 1];
            ctx.lineTo(lastPoint[0], lastPoint[1]);
        }

        ctx.stroke();
    });
}

// Function to move the custom cursor
function moveCursor(event) {
    const x = event.clientX;
    const y = event.clientY;
    cursor.style.left = `${x - lineWidth / 2}px`;
    cursor.style.top = `${y - lineWidth / 2}px`;
}

// Function to update the cursor size when the line width changes
function updateCursorSize() {
    cursor.style.width = `${lineWidth}px`;
    cursor.style.height = `${lineWidth}px`;
}

// Function to update the cursor color when the line color changes
function updateCursorColor() {
    if (isEraser) {
        cursor.style.width = `${eraserWidth}px`;
        cursor.style.height = `${eraserWidth}px`;
        cursor.style.backgroundColor = 'transparent';
        cursor.style.border = '1px dotted black'; // Square with dotted border for eraser
        cursor.style.borderRadius = '0'; // No rounded edges for eraser
    } else {
        cursor.style.width = `${lineWidth}px`;
        cursor.style.height = `${lineWidth}px`;
        cursor.style.backgroundColor = lineColor; // Color matches pen color
        cursor.style.border = 'none'; // No border for pen
        cursor.style.borderRadius = '50%'; // Circle shape for pen
    }
}


function saveState() {
    drawingHistory.push(JSON.parse(JSON.stringify(paths)));
    redoHistory = []; // Clear redo history when a new state is saved
}

function undo() {
    if (drawingHistory.length > 1) {
        redoHistory.push(drawingHistory.pop());
        paths = JSON.parse(JSON.stringify(drawingHistory[drawingHistory.length - 1]));
        redrawCanvas();
    }
}

function redo() {
    if (redoHistory.length > 0) {
        const redoState = redoHistory.pop();
        drawingHistory.push(redoState);
        paths = JSON.parse(JSON.stringify(redoState));
        redrawCanvas();
    }
}

function clearCanvas() {
    paths = [];
    saveState();
    redrawCanvas();
}
