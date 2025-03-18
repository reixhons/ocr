import React, { useEffect, useRef, useState } from 'react';
import { X, Info } from 'lucide-react';

// Demo rectangles data - in a real app, this would come from props or API
const demoRectangles = [
    { id: 1, x: 50, y: 50, width: 100, height: 80, color: 'rgba(255, 0, 0, 0.4)', label: 'Region 1', info: 'This is a sample annotation area containing text.' },
    { id: 2, x: 200, y: 150, width: 150, height: 100, color: 'rgba(0, 255, 0, 0.4)', label: 'Region 2', info: 'Another important section of the document.' },
    { id: 3, x: 100, y: 300, width: 200, height: 120, color: 'rgba(0, 0, 255, 0.4)', label: 'Region 3', info: 'This contains key information that needs attention.' },
];

function ImageViewer({ imageUrl, onClose }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const imageRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [selectedRect, setSelectedRect] = useState(null);

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

        // Draw rectangles
        demoRectangles.forEach(rect => {
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

            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

            // Add a label to each rectangle
            ctx.font = '12px Arial';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 0.5;
            ctx.strokeText(rect.label, rect.x + 5, rect.y + 15);
            ctx.fillText(rect.label, rect.x + 5, rect.y + 15);
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
        for (const rectangle of demoRectangles) {
            if (
                x >= rectangle.x &&
                x <= rectangle.x + rectangle.width &&
                y >= rectangle.y &&
                y <= rectangle.y + rectangle.height
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

    // Redraw when selected rectangle or scale changes
    useEffect(() => {
        drawCanvas();
    }, [selectedRect, scale]);

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
                                        <span>X:{selectedRect.x}, Y:{selectedRect.y}</span>
                                        <span>Size:</span>
                                        <span>{selectedRect.width}×{selectedRect.height}</span>
                                    </div>
                                </div>
                                <p className="text-gray-700 border-t pt-2">{selectedRect.info}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                                <Info className="w-8 h-8 mb-2" />
                                <p>Click on a colored region to view details</p>
                            </div>
                        )}

                        <div className="mt-6">
                            <h4 className="font-medium text-gray-700 mb-2">All Regions</h4>
                            <div className="space-y-2">
                                {demoRectangles.map(rect => (
                                    <div
                                        key={rect.id}
                                        className={`p-2 rounded cursor-pointer flex items-center ${selectedRect?.id === rect.id ? 'bg-indigo-100 border border-indigo-300' : 'bg-white hover:bg-gray-50'}`}
                                        onClick={() => setSelectedRect(rect)}
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full mr-2"
                                            style={{ backgroundColor: rect.color.replace('0.4', '1') }}
                                        ></span>
                                        <span>{rect.label}</span>
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