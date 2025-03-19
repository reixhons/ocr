import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X, Info, AlertCircle, ZoomIn, ZoomOut, Maximize, Trash2, Plus, Square } from 'lucide-react';

// Fallback demo rectangles if no JSON data is provided
const demoRectangles = [
    {
        id: 1,
        x: 50,
        y: 50,
        width: 100,
        height: 80,
        color: 'rgba(255, 0, 0, 0.4)',
        label: 'Region 1',
        info: 'This is a sample annotation area containing text.'
    },
    {
        id: 2,
        x: 200,
        y: 150,
        width: 150,
        height: 100,
        color: 'rgba(0, 255, 0, 0.4)',
        label: 'Region 2',
        info: 'Another important section of the document.'
    },
    {
        id: 3,
        x: 100,
        y: 300,
        width: 200,
        height: 120,
        color: 'rgba(0, 0, 255, 0.4)',
        label: 'Region 3',
        info: 'This contains key information that needs attention.'
    },
];

// These colors will be used for JSON-based rectangles
const RECTANGLE_COLORS = [
    'rgba(255, 0, 0, 0.4)',   // Red
    'rgba(0, 255, 0, 0.4)',   // Green
    'rgba(0, 0, 255, 0.4)',   // Blue
    'rgba(255, 165, 0, 0.4)', // Orange
    'rgba(128, 0, 128, 0.4)', // Purple
    'rgba(255, 192, 203, 0.4)', // Pink
    'rgba(0, 128, 128, 0.4)', // Teal
    'rgba(255, 255, 0, 0.4)', // Yellow
];

function ImageViewer({ imageUrl, imageData, onClose }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const imageRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [selectedRect, setSelectedRect] = useState(null);
    const [pageWidth, setPageWidth] = useState(0);
    const [pageHeight, setPageHeight] = useState(0);
    const [scaleFactorX, setScaleFactorX] = useState(1);
    const [scaleFactorY, setScaleFactorY] = useState(1);
    const [clickStartPos, setClickStartPos] = useState({ x: 0, y: 0 });
    const [hasMovedDuringClick, setHasMovedDuringClick] = useState(false);
    const [rectangles, setRectangles] = useState([]);
    const [drawingMode, setDrawingMode] = useState(false);
    const [drawStartPos, setDrawStartPos] = useState({ x: 0, y: 0 });
    const [tempRect, setTempRect] = useState(null);
    const [nextRectId, setNextRectId] = useState(1);

    // Process JSON data to create rectangles
    const processJsonData = useMemo(() => {
        if (!imageData?.jsonData) return demoRectangles;

        try {
            // Check if the data is in the expected format
            if (Array.isArray(imageData.jsonData)) {
                // Handle array format (multiple pages)
                const firstPage = imageData.jsonData[0];
                if (firstPage && firstPage.results && Array.isArray(firstPage.results)) {
                    // Extract page dimensions if available
                    if (firstPage.page_width && firstPage.page_heigth) {
                        setPageWidth(firstPage.page_width);
                        setPageHeight(firstPage.page_heigth);
                    }

                    // Map the JSON data to our rectangle format
                    return firstPage.results.map((item, index) => {
                        // Calculate rectangle coordinates from vertices
                        const vertices = item.vertices || [];
                        if (vertices.length !== 4) {
                            return null;
                        }

                        // Calculate bounding box
                        const xs = vertices.map(v => v[0]);
                        const ys = vertices.map(v => v[1]);
                        const minX = Math.min(...xs);
                        const minY = Math.min(...ys);
                        const maxX = Math.max(...xs);
                        const maxY = Math.max(...ys);

                        return {
                            id: index + 1,
                            x: minX,
                            y: minY,
                            width: maxX - minX,
                            height: maxY - minY,
                            color: RECTANGLE_COLORS[index % RECTANGLE_COLORS.length],
                            label: `Text ${index + 1}`,
                            text: item.text || 'No text available',
                            confidence: item.confidence || 'N/A',
                            vertices: item.vertices || []
                        };
                    }).filter(Boolean); // Remove any null values
                }
            } else if (imageData.jsonData.results && Array.isArray(imageData.jsonData.results)) {
                // Handle single page format
                if (imageData.jsonData.page_width && imageData.jsonData.page_heigth) {
                    setPageWidth(imageData.jsonData[0].page_width);
                    setPageHeight(imageData.jsonData[0].page_heigth);
                }

                return imageData.jsonData.results.map((item, index) => {
                    // Calculate rectangle coordinates from vertices
                    const vertices = item.vertices || [];
                    if (vertices.length !== 4) {
                        return null;
                    }

                    // Calculate bounding box
                    const xs = vertices.map(v => v[0]);
                    const ys = vertices.map(v => v[1]);
                    const minX = Math.min(...xs);
                    const minY = Math.min(...ys);
                    const maxX = Math.max(...xs);
                    const maxY = Math.max(...ys);

                    return {
                        id: index + 1,
                        x: minX,
                        y: minY,
                        width: maxX - minX,
                        height: maxY - minY,
                        color: RECTANGLE_COLORS[index % RECTANGLE_COLORS.length],
                        label: `Text ${index + 1}`,
                        text: item.text || 'No text available',
                        confidence: item.confidence || 'N/A',
                        vertices: item.vertices || []
                    };
                }).filter(Boolean);
            }
        } catch (error) {
            console.error("Error processing JSON data:", error);
        }

        // Fallback to demo rectangles if JSON processing fails
        return demoRectangles;
    }, [imageData]);

    // Use effect to set rectangles when processJsonData changes
    useEffect(() => {
        setRectangles(processJsonData);
    }, [processJsonData]);

    // Calculate scaling factors when page dimensions and image dimensions are available
    useEffect(() => {
        if (pageWidth && pageHeight && imageData?.width && imageData?.height) {
            setScaleFactorX(imageData.width / pageWidth);
            setScaleFactorY(imageData.height / pageHeight);
        }
    }, [pageWidth, pageHeight, imageData]);

    // Draw everything (image + rectangles)
    const drawCanvas = () => {
        const canvas = canvasRef.current;
        const image = imageRef.current;

        if (!canvas || !image) return;

        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw image
        ctx.drawImage(image, 0, 0);

        // Draw rectangles with scaling applied if needed
        rectangles.forEach(rect => {
            // Use a different style for the selected rectangle
            if (selectedRect && selectedRect.id === rect.id) {
                ctx.fillStyle = rect.color.replace('0.4', '0.6');
                ctx.strokeStyle = '#FFFF00';
                ctx.lineWidth = 3;
            } else {
                ctx.fillStyle = rect.color;
                ctx.strokeStyle = rect.color.replace('0.4', '0.8');
                ctx.lineWidth = 2;
            }

            // Apply scaling factors for JSON-based coordinates
            const x = rect.x * scaleFactorX;
            const y = rect.y * scaleFactorY;
            const width = rect.width * scaleFactorX;
            const height = rect.height * scaleFactorY;

            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);

            // Add a label to each rectangle
            ctx.font = '12px Arial';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 0.5;
            ctx.strokeText(rect.label, x + 5, y + 15);
            ctx.fillText(rect.label, x + 5, y + 15);
        });

        // Draw temporary rectangle during drawing
        if (drawingMode && tempRect) {
            ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
            ctx.strokeStyle = 'rgba(0, 100, 255, 0.8)';
            ctx.lineWidth = 2;

            const x = tempRect.x * scaleFactorX;
            const y = tempRect.y * scaleFactorY;
            const width = tempRect.width * scaleFactorX;
            const height = tempRect.height * scaleFactorY;

            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);
        }
    };

    // Calculate the fitting scale for the initial view
    const calculateFitScale = () => {
        if (!containerRef.current || !imageRef.current) return 1;

        const container = containerRef.current;
        const image = imageRef.current;

        // Reduce padding to maximize visible area
        const containerWidth = container.clientWidth - 20; // Minimal padding
        const containerHeight = container.clientHeight - 20; // Minimal padding

        // Calculate scale factors to fit image in container
        const scaleX = containerWidth / image.width;
        const scaleY = containerHeight / image.height;

        // Use the smaller of the two to ensure the entire image fits
        let fitScale = Math.min(scaleX, scaleY);

        // Don't cap at 1 for TIF files to ensure they're fully visible
        // This allows proper scaling for very large TIF images
        return fitScale;
    };

    // Reset view to fit the entire image on screen
    const handleFitToScreen = () => {
        const fitScale = calculateFitScale();

        // Center the image after fitting
        const container = containerRef.current;
        const image = imageRef.current;

        if (container && image) {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const scaledWidth = image.width * fitScale;
            const scaledHeight = image.height * fitScale;

            // Center position calculation - ensure the image is truly centered
            const newPosX = (containerWidth - scaledWidth) - (0.5 * containerWidth)
            const newPosY = (containerHeight - scaledHeight) / 2;


            setScale(fitScale);
            setPosition({ x: newPosX, y: newPosY });
        } else {
            setScale(fitScale);
            setPosition({ x: 0, y: 0 });
        }
    };

    // First check if we're clicking on a rectangle before deciding it's a pan
    const isClickOnRectangle = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return false;

        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - position.x) / scale;
        const mouseY = (e.clientY - rect.top - position.y) / scale;

        // Check if click is inside any rectangle
        for (const rectangle of rectangles) {
            const rectX = rectangle.x * scaleFactorX;
            const rectY = rectangle.y * scaleFactorY;
            const rectWidth = rectangle.width * scaleFactorX;
            const rectHeight = rectangle.height * scaleFactorY;

            if (
                mouseX >= rectX &&
                mouseX <= rectX + rectWidth &&
                mouseY >= rectY &&
                mouseY <= rectY + rectHeight
            ) {
                return true;
            }
        }
        return false;
    };

    // Toggle drawing mode for adding new rectangles
    const toggleDrawingMode = () => {
        setDrawingMode(!drawingMode);
        // Clear any selected rectangle when entering drawing mode
        if (!drawingMode) {
            setSelectedRect(null);
            setTempRect(null);
        }
    };

    // Handle mouse down for dragging or drawing
    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Only handle left mouse button

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left);
        const canvasY = (e.clientY - rect.top);

        // Convert to image coordinates (accounting for current scale and position)
        const imageX = (canvasX / scale);
        const imageY = (canvasY / scale);

        const clickPos = { x: e.clientX, y: e.clientY };
        setClickStartPos(clickPos);

        if (drawingMode) {
            // Start drawing a new rectangle
            const startPosInImage = {
                x: imageX / scaleFactorX, // Convert back to original coordinates
                y: imageY / scaleFactorY
            };

            setDrawStartPos(startPosInImage);
            setTempRect({
                x: startPosInImage.x,
                y: startPosInImage.y,
                width: 0,
                height: 0
            });

            return;
        }

        // If we're clicking on a rectangle, prioritize selection over panning
        if (isClickOnRectangle(e)) {
            setHasMovedDuringClick(false);
            handleCanvasClick(e);
            return;
        }

        // Otherwise, prepare for panning
        setHasMovedDuringClick(false);
        setIsDragging(true);
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    // Handle mouse move for dragging or drawing
    const handleMouseMove = (e) => {
        if (drawingMode && tempRect) {
            // We're drawing a new rectangle
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;

            // Convert to image coordinates
            const imageX = canvasX / scale;
            const imageY = canvasY / scale;

            // Convert to original coordinates
            const currentPosInImage = {
                x: imageX / scaleFactorX,
                y: imageY / scaleFactorY
            };

            setTempRect({
                x: Math.min(drawStartPos.x, currentPosInImage.x),
                y: Math.min(drawStartPos.y, currentPosInImage.y),
                width: Math.abs(currentPosInImage.x - drawStartPos.x),
                height: Math.abs(currentPosInImage.y - drawStartPos.y)
            });

            // Force redraw to show the temporary rectangle
            requestAnimationFrame(drawCanvas);
            return;
        }

        if (!isDragging) return;

        // Check if we've moved significantly from the click start position
        const moveDistance = Math.sqrt(
            Math.pow(e.clientX - clickStartPos.x, 2) +
            Math.pow(e.clientY - clickStartPos.y, 2)
        );

        // If moved more than 5px, consider it a drag, not a click
        if (moveDistance > 5) {
            setHasMovedDuringClick(true);
        }

        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    // Handle mouse up to end dragging or complete drawing
    const handleMouseUp = (e) => {
        if (drawingMode && tempRect) {
            // Finish drawing the rectangle if it has a reasonable size
            if (tempRect.width > 10 && tempRect.height > 10) {
                const newRect = {
                    id: nextRectId,
                    x: tempRect.x,
                    y: tempRect.y,
                    width: tempRect.width,
                    height: tempRect.height,
                    color: RECTANGLE_COLORS[(nextRectId - 1) % RECTANGLE_COLORS.length],
                    label: `Text ${nextRectId}`,
                    text: 'New text region',
                    confidence: 1.0
                };

                setNextRectId(nextRectId + 1);
                setRectangles(prevRects => [...prevRects, newRect]);
                setSelectedRect(newRect);
            }

            setTempRect(null);
            setDrawingMode(false);
            return;
        }

        if (isDragging && !hasMovedDuringClick) {
            // This was a click, not a drag - handle region selection
            handleCanvasClick(e);
        }

        setIsDragging(false);
    };

    // Handle canvas click to detect rectangle selections
    const handleCanvasClick = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        // Get the click position on the canvas (already includes parent's translation)
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        // Map from canvas coordinates to image coordinates
        const imageX = canvasX / scale;
        const imageY = canvasY / scale;

        console.log('Click at image coordinates:', imageX, imageY);

        let clickedRect = null;

        // Process rectangles in reverse order to select the top-most one first
        for (let i = rectangles.length - 1; i >= 0; i--) {
            const rectangle = rectangles[i];

            // Apply scaling factors for JSON-based coordinates
            const rectX = rectangle.x * scaleFactorX;
            const rectY = rectangle.y * scaleFactorY;
            const rectWidth = rectangle.width * scaleFactorX;
            const rectHeight = rectangle.height * scaleFactorY;

            if (
                imageX >= rectX &&
                imageX <= rectX + rectWidth &&
                imageY >= rectY &&
                imageY <= rectY + rectHeight
            ) {
                clickedRect = rectangle;
                console.log('Selected rectangle:', rectangle.id);
                break;
            }
        }

        setSelectedRect(clickedRect);
    };

    // Handle zoom in/out
    const handleZoom = (zoomIn) => {
        setScale(prevScale => {
            const zoomFactor = zoomIn ? 1.1 : 0.9; // Smaller increments
            const newScale = prevScale * zoomFactor;
            return Math.max(0.1, Math.min(newScale, 5));
        });
    };

    // Handle zoom via slider
    const handleZoomSlider = (e) => {
        const zoomValue = parseFloat(e.target.value);
        setScale(zoomValue);
    };

    // Handle mouse wheel for zooming - disabled as requested
    const handleWheel = (e) => {
        // Only prevent default to avoid page scrolling, but don't zoom
        e.preventDefault();
    };

    // Handle keyboard shortcuts for zoom
    const handleKeyDown = (e) => {
        if (e.key === '+' || e.key === '=') {
            // Plus key pressed - zoom in
            handleZoom(true);
        } else if (e.key === '-' || e.key === '_') {
            // Minus key pressed - zoom out
            handleZoom(false);
        }
    };

    // Handle text edit for the selected rectangle
    const handleTextEdit = (e) => {
        if (!selectedRect) return;

        const updatedText = e.target.value;
        const updatedRectangles = rectangles.map(rect =>
            rect.id === selectedRect.id
                ? { ...rect, text: updatedText }
                : rect
        );

        setRectangles(updatedRectangles);
        setSelectedRect({ ...selectedRect, text: updatedText });
    };

    // Delete the selected rectangle
    const handleDeleteRect = () => {
        if (!selectedRect) return;

        const updatedRectangles = rectangles.filter(rect => rect.id !== selectedRect.id);
        setRectangles(updatedRectangles);
        setSelectedRect(null);
    };

    // Initialize nextRectId based on existing rectangles
    useEffect(() => {
        if (rectangles.length > 0) {
            const maxId = Math.max(...rectangles.map(rect => rect.id));
            setNextRectId(maxId + 1);
        }
    }, [rectangles]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        const container = containerRef.current;

        if (!canvas || !image || !imageUrl || !container) return;

        // When image loads, set up canvas and draw
        image.onload = () => {
            // Set canvas dimensions to match image
            canvas.width = image.width;
            canvas.height = image.height;

            // Calculate fitting scale and center the image
            const fitScale = calculateFitScale();
            setScale(fitScale);

            // Center the image
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const scaledWidth = image.width * fitScale;
            const scaledHeight = image.height * fitScale;

            // Ensure image is properly centered with a minimum margin
            const newPosX = Math.max((containerWidth - scaledWidth) / 2, 10);
            const newPosY = Math.max((containerHeight - scaledHeight) / 2, 10);

            setPosition({
                x: newPosX,
                y: newPosY
            });

            // Draw image and rectangles
            drawCanvas();

            // Call handleFitToScreen again after a short delay to ensure proper centering
            setTimeout(handleFitToScreen, 100);
        };

        // Set image source to trigger load
        image.src = imageUrl;

        // Add event listener for wheel events to prevent default behavior only
        container.addEventListener('wheel', handleWheel, { passive: false });

        // Add keyboard event listener for zoom shortcuts
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            // Clean up event listeners
            container.removeEventListener('wheel', handleWheel);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [imageUrl]);

    // Redraw when selected rectangle, scale, scaling factors or rectangles change
    useEffect(() => {
        drawCanvas();
    }, [selectedRect, scale, scaleFactorX, scaleFactorY, rectangles]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm p-2">
            <div className="relative w-full h-full bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col">
                <div className="bg-indigo-700 text-white p-4 flex justify-between items-center">
                    <h3 className="font-medium">Image Viewer with Annotations</h3>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={toggleDrawingMode}
                            className={`px-3 py-1 rounded flex items-center gap-1 ${drawingMode ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-800 hover:bg-indigo-900'}`}
                            title="Add new text region"
                        >
                            {drawingMode ? (
                                <>
                                    <Square className="w-4 h-4" />
                                    <span>Drawing...</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    <span>Add</span>
                                </>
                            )}
                        </button>
                        {selectedRect && (
                            <button
                                onClick={handleDeleteRect}
                                className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 flex items-center gap-1"
                                title="Delete selected region"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                            </button>
                        )}
                        <button
                            onClick={handleFitToScreen}
                            className="px-3 py-1 bg-indigo-800 rounded hover:bg-indigo-900 flex items-center gap-1"
                            title="Fit to screen"
                        >
                            <Maximize className="w-4 h-4" />
                            <span>Fit</span>
                        </button>
                        <div className="flex items-center bg-indigo-800 rounded px-2 py-1">
                            <button
                                onClick={() => handleZoom(false)}
                                className="text-white hover:text-gray-200 p-1"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>
                            <input
                                type="range"
                                min="0.1"
                                max="5"
                                step="0.1"
                                value={scale}
                                onChange={handleZoomSlider}
                                className="w-24 mx-2"
                            />
                            <button
                                onClick={() => handleZoom(true)}
                                className="text-white hover:text-gray-200 p-1"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                            <span className="ml-2 text-xs">{Math.round(scale * 100)}%</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-red-200 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Canvas Container */}
                    <div
                        ref={containerRef}
                        className={`flex-1 p-1 bg-gray-800 overflow-hidden flex justify-center items-center ${drawingMode ? 'cursor-crosshair' : 'cursor-grab'}`}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {drawingMode && (
                            <div className="absolute top-4 left-4 bg-green-600 text-white text-sm px-3 py-1 rounded-md shadow-md flex items-center gap-1 animate-pulse">
                                <Square className="w-4 h-4" />
                                <span>Click and drag to create a new text region</span>
                            </div>
                        )}
                        <div
                            className="relative touch-none"
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px)`,
                            }}
                        >
                            {/* Hidden image used to load and size the canvas */}
                            <img
                                ref={imageRef}
                                src={imageUrl}
                                alt="Original"
                                className="hidden"
                            />
                            {/* Canvas where image and rectangles are drawn */}
                            <canvas
                                ref={canvasRef}
                                style={{
                                    transform: `scale(${scale})`,
                                    transformOrigin: 'center',
                                    cursor: isDragging && hasMovedDuringClick ? 'grabbing' : (drawingMode ? 'crosshair' : 'pointer')
                                }}
                            />
                        </div>
                    </div>

                    {/* Info Panel */}
                    <div className="w-80 bg-gray-100 p-4 overflow-y-auto border-l border-gray-300">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Annotations</h3>

                        {imageData?.jsonData ? (
                            <div className="mb-4 bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
                                <p className="font-medium">JSON Data Loaded</p>
                                <p className="text-xs mt-1">
                                    {rectangles.length} text regions detected
                                </p>
                            </div>
                        ) : (
                            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-700 flex items-start">
                                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                <p>Using demo annotations. Upload a matching JSON file to see actual text regions.</p>
                            </div>
                        )}

                        {selectedRect ? (
                            <div className="bg-white p-4 rounded-lg shadow-md">
                                <h4 className="font-medium text-indigo-700 mb-2 flex items-center">
                                    <span
                                        className="w-3 h-3 rounded-full mr-2"
                                        style={{ backgroundColor: selectedRect.color.replace('0.4', '1') }}
                                    ></span>
                                    {selectedRect.label}
                                </h4>

                                <div className="mb-3 text-sm">
                                    <div className="grid grid-cols-2 gap-1 text-gray-600">
                                        <span>Position:</span>
                                        <span>X:{Math.round(selectedRect.x)}, Y:{Math.round(selectedRect.y)}</span>
                                        <span>Size:</span>
                                        <span>{Math.round(selectedRect.width)}×{Math.round(selectedRect.height)}</span>

                                        {selectedRect.confidence && (
                                            <>
                                                <span>Confidence:</span>
                                                <span>{(selectedRect.confidence * 100).toFixed(2)}%</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t pt-2">
                                    <p className="font-medium text-sm text-gray-700 mb-1">Detected Text:</p>
                                    <textarea
                                        value={selectedRect.text || selectedRect.info}
                                        onChange={handleTextEdit}
                                        className="text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 w-full min-h-[150px] max-h-[300px] resize-y font-normal text-base leading-relaxed focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        placeholder="Edit detected text here..."
                                    />
                                </div>

                                {selectedRect.vertices && selectedRect.vertices.length > 0 && (
                                    <div className="mt-3 border-t pt-2">
                                        <p className="font-medium text-sm text-gray-700 mb-1">Vertices:</p>
                                        <div className="text-xs bg-gray-50 p-2 rounded border border-gray-100 font-mono">
                                            {selectedRect.vertices.map((v, i) => (
                                                <div key={i}>[{v[0]}, {v[1]}]</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                                <Info className="w-8 h-8 mb-2" />
                                <p>Click on a colored region to view details</p>
                            </div>
                        )}

                        <div className="mt-6">
                            <h4 className="font-medium text-gray-700 mb-2">All Regions</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {rectangles.map(rect => (
                                    <div
                                        key={rect.id}
                                        className={`p-2 rounded cursor-pointer flex items-center ${selectedRect?.id === rect.id ? 'bg-indigo-100 border border-indigo-300' : 'bg-white hover:bg-gray-50'}`}
                                        onClick={() => setSelectedRect(rect)}
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full mr-2"
                                            style={{ backgroundColor: rect.color.replace('0.4', '1') }}
                                        ></span>
                                        <div className="flex-1 truncate">
                                            <span className="mr-2">{rect.label}</span>
                                            <span className="text-xs text-gray-500 truncate">
                                                {rect.text ? `"${rect.text}"` : ''}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ImageViewer; 