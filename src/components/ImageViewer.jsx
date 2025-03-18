import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X, Info, AlertCircle } from 'lucide-react';

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
    const [selectedRect, setSelectedRect] = useState(null);
    const [pageWidth, setPageWidth] = useState(0);
    const [pageHeight, setPageHeight] = useState(0);
    const [scaleFactorX, setScaleFactorX] = useState(1);
    const [scaleFactorY, setScaleFactorY] = useState(1);

    // Process JSON data to create rectangles
    const rectangles = useMemo(() => {
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
                    setPageWidth(imageData.jsonData.page_width);
                    setPageHeight(imageData.jsonData.page_heigth);
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
    };

    // Handle canvas click to detect rectangle selections
    const handleCanvasClick = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        // Check if click is inside any rectangle
        let clickedRect = null;
        for (const rectangle of rectangles) {
            // Apply scaling factors for JSON-based coordinates
            const rectX = rectangle.x * scaleFactorX;
            const rectY = rectangle.y * scaleFactorY;
            const rectWidth = rectangle.width * scaleFactorX;
            const rectHeight = rectangle.height * scaleFactorY;

            if (
                x >= rectX &&
                x <= rectX + rectWidth &&
                y >= rectY &&
                y <= rectY + rectHeight
            ) {
                clickedRect = rectangle;
                break;
            }
        }

        setSelectedRect(clickedRect);
    };

    // Handle zoom in/out
    const handleZoom = (zoomIn) => {
        setScale(prevScale => {
            const newScale = zoomIn ? prevScale * 1.2 : prevScale / 1.2;
            return Math.max(0.5, Math.min(newScale, 3)); // Limit zoom between 0.5x and 3x
        });
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;

        if (!canvas || !image || !imageUrl) return;

        // When image loads, set up canvas and draw
        image.onload = () => {
            // Set canvas dimensions to match image
            canvas.width = image.width;
            canvas.height = image.height;

            // Draw image and rectangles
            drawCanvas();
        };

        // Set image source to trigger load
        image.src = imageUrl;
    }, [imageUrl]);

    // Redraw when selected rectangle, scale or scaling factors change
    useEffect(() => {
        drawCanvas();
    }, [selectedRect, scale, scaleFactorX, scaleFactorY]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="relative max-w-6xl w-full bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
                <div className="bg-indigo-700 text-white p-4 flex justify-between items-center">
                    <h3 className="font-medium">Image Viewer with Annotations</h3>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => handleZoom(true)}
                            className="px-3 py-1 bg-indigo-800 rounded hover:bg-indigo-900"
                        >
                            Zoom +
                        </button>
                        <button
                            onClick={() => handleZoom(false)}
                            className="px-3 py-1 bg-indigo-800 rounded hover:bg-indigo-900"
                        >
                            Zoom -
                        </button>
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
                        className="flex-1 p-4 bg-gray-800 overflow-auto flex justify-center items-center"
                    >
                        <div className="relative">
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
                                onClick={handleCanvasClick}
                                style={{
                                    transform: `scale(${scale})`,
                                    transformOrigin: 'top left',
                                    cursor: 'pointer'
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
                                    <p className="text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">
                                        {selectedRect.text || selectedRect.info}
                                    </p>
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