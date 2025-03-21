import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X, Info, AlertCircle, ZoomIn, ZoomOut, Maximize, Trash2, Plus, Square, Save, Download, Settings, Sliders, PaintBucket, Type, Brush, Eye, EyeOff, Check } from 'lucide-react';

// Fallback demo rectangles if no JSON data is provided
const demoRectangles = [
    {
        id: 1,
        x: 50,
        y: 50,
        width: 100,
        height: 80,
        color: 'rgba(255, 0, 0, 0.2)',
        label: 'Region 1',
        info: 'This is a sample annotation area containing text.'
    },
    {
        id: 2,
        x: 100,
        y: 300,
        width: 200,
        height: 120,
        color: 'rgba(0, 0, 255, 0.2)',
        label: 'Region 3',
        info: 'This contains key information that needs attention.'
    },
];

// These colors will be used for JSON-based rectangles
const RECTANGLE_COLORS = [
    'rgba(255, 0, 0, 0.2)',   // Red
    // 'rgba(0, 200, 0, 0.2)',   // Green
    'rgba(0, 0, 255, 0.2)',   // Blue
    // 'rgba(255, 140, 0, 0.2)', // Orange
    // 'rgba(128, 0, 128, 0.2)', // Purple
    // 'rgba(255, 120, 213, 0.2)', // Pink
    // 'rgba(0, 128, 128, 0.2)', // Teal
    // 'rgba(255, 205, 0, 0.2)', // Yellow
];

// Constants for the application
const MIN_RECT_SIZE = 5; // Minimum size for rectangles in original coordinates

function ImageViewer({ imageUrl, imageName, imageData, onClose }) {
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
    const [styleSettingsOpen, setStyleSettingsOpen] = useState(false);
    const initialStyleSettings = {
        fillOpacity: 0.15,
        strokeWidth: 2,
        labelBgOpacity: 0.8,
        fontSize: 16,
        fontColor: "#ffffff",
        showLabels: true,
        colors: ["rgba(255, 0, 0, 0.2)", "rgba(0, 0, 255, 0.2)"]
    };
    const [styleSettings, setStyleSettings] = useState(initialStyleSettings);
    const [pendingColor, setPendingColor] = useState(null);
    const previewRectRef = useRef(null);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [selectedRects, setSelectedRects] = useState([]);
    const [multiSelectBox, setMultiSelectBox] = useState(null);

    // Process JSON data to create rectangles
    const processJsonData = useMemo(() => {
        if (!imageData?.jsonData) return demoRectangles;

        try {
            // Check if the data is in the NEW expected format with image_width, image_height, and ocr_results
            if (imageData.jsonData.ocr_results && Array.isArray(imageData.jsonData.ocr_results)) {
                // Extract image dimensions if available
                if (imageData.jsonData.image_width && imageData.jsonData.image_height) {
                    setPageWidth(imageData.jsonData.image_width);
                    setPageHeight(imageData.jsonData.image_height);
                }

                // Map the ocr_results to our rectangle format
                return imageData.jsonData.ocr_results.map((item, index) => {
                    // Calculate rectangle coordinates from vertices
                    const vertices = item.vertices || [];
                    if (vertices.length !== 4) {
                        return null;
                    }

                    // Calculate bounding box for label positioning and selection
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
                        vertices: vertices,
                        isQuad: true, // Flag to identify shapes from JSON with vertices
                        marked: false // Add marked property, default to false
                    };
                }).filter(Boolean); // Remove any null values
            }

            // LEGACY FORMAT SUPPORT - for backward compatibility
            // Check if the data is in the old array format (multiple pages)
            else if (Array.isArray(imageData.jsonData)) {
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

                        // Calculate bounding box for label positioning and selection
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
                            vertices: vertices,
                            isQuad: true, // Flag to identify shapes from JSON with vertices
                            marked: false // Add marked property, default to false
                        };
                    }).filter(Boolean); // Remove any null values
                }
            }
            // LEGACY FORMAT SUPPORT - for backward compatibility
            else if (imageData.jsonData.results && Array.isArray(imageData.jsonData.results)) {
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

                    // Calculate bounding box for label positioning and selection
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
                        vertices: vertices,
                        isQuad: true, // Flag to identify shapes from JSON with vertices
                        marked: false // Add marked property, default to false
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

    // Draw a preview rectangle for style settings
    const drawPreviewRect = () => {
        const canvas = previewRectRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background grid to show transparency
        const gridSize = 10;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#EEEEEE';
        for (let x = 0; x < canvas.width; x += gridSize * 2) {
            for (let y = 0; y < canvas.height; y += gridSize * 2) {
                ctx.fillRect(x, y, gridSize, gridSize);
                ctx.fillRect(x + gridSize, y + gridSize, gridSize, gridSize);
            }
        }

        // Set up drawing styles based on current settings
        const demoColor = styleSettings.colors[0] || 'rgba(255, 0, 0, 0.2)';

        // Draw demo rectangle
        ctx.fillStyle = demoColor.replace(/[\d.]+\)$/, `${styleSettings.fillOpacity})`);
        // Set stroke color to match fill color but with 1.0 opacity
        ctx.strokeStyle = demoColor.replace(/[\d.]+\)$/, '1.0)');
        ctx.lineWidth = styleSettings.strokeWidth;

        // Rectangle dimensions
        const rectX = 20;
        const rectY = 40;
        const rectWidth = canvas.width - 40;
        const rectHeight = canvas.height - 70;

        ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
        ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);

        // Draw label if enabled
        if (styleSettings.showLabels) {
            const labelText = "Sample Text";

            ctx.font = `${styleSettings.fontBold ? 'bold' : 'normal'} ${styleSettings.fontSize}px Arial`;
            const textMetrics = ctx.measureText(labelText);
            const textWidth = textMetrics.width;

            // Draw label background
            const labelY = rectY - 20;
            const labelBgColor = demoColor.replace(/[\d.]+\)$/, `${styleSettings.labelBgOpacity})`);
            ctx.fillStyle = labelBgColor;
            ctx.fillRect(rectX, labelY, textWidth + 10, 20);

            // Add shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 2;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;

            // Draw label text
            ctx.fillStyle = styleSettings.fontColor;
            ctx.fillText(labelText, rectX + 5, labelY + 14);

            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
    };

    // Update preview when style settings change
    useEffect(() => {
        if (styleSettingsOpen && previewRectRef.current) {
            drawPreviewRect();
        }
    }, [styleSettings, styleSettingsOpen]);

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
            // Check if rectangle is selected (either single or in multi-select)
            const isSelected = (selectedRect && selectedRect.id === rect.id) ||
                (selectedRects.includes(rect.id));

            // Use a different style for the selected rectangle
            if (isSelected) {
                ctx.fillStyle = rect.color.replace(/[\d.]+\)$/, `${styleSettings.fillOpacity * 2})`);
                ctx.strokeStyle = '#FFFF00';
                ctx.lineWidth = styleSettings.strokeWidth + 1;
            } else {
                ctx.fillStyle = rect.color.replace(/[\d.]+\)$/, `${styleSettings.fillOpacity})`);
                // Set stroke color to match fill color but with 1.0 opacity
                ctx.strokeStyle = rect.color.replace(/[\d.]+\)$/, '1.0)');
                ctx.lineWidth = styleSettings.strokeWidth;
            }

            // Apply scaling factors for JSON-based coordinates
            if (rect.isQuad && rect.vertices && rect.vertices.length === 4) {
                // Draw as quadrilateral using the vertices
                const scaledVertices = rect.vertices.map(v => [
                    v[0] * scaleFactorX,
                    v[1] * scaleFactorY
                ]);

                // Draw the quadrilateral
                ctx.beginPath();
                ctx.moveTo(scaledVertices[0][0], scaledVertices[0][1]);
                for (let i = 1; i < 4; i++) {
                    ctx.lineTo(scaledVertices[i][0], scaledVertices[i][1]);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else {
                // Draw as a regular rectangle for user-drawn shapes
                const x = rect.x * scaleFactorX;
                const y = rect.y * scaleFactorY;
                const width = rect.width * scaleFactorX;
                const height = rect.height * scaleFactorY;

                ctx.fillRect(x, y, width, height);
                ctx.strokeRect(x, y, width, height);
            }

            // Draw mark indicator if the rectangle is marked - make it more visible
            if (rect.marked) {
                const x = rect.x * scaleFactorX;
                const y = rect.y * scaleFactorY;

                // Draw a more prominent checkmark indicator
                ctx.fillStyle = 'rgba(0, 255, 0, 0.5)'; // Bright green background
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;

                // Draw circle background - larger and more visible
                ctx.beginPath();
                ctx.arc(x + 15, y + 15, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Draw checkmark - thicker and more visible
                ctx.beginPath();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 3;
                ctx.moveTo(x + 10, y + 15);
                ctx.lineTo(x + 14, y + 19);
                ctx.lineTo(x + 20, y + 11);
                ctx.stroke();
            }

            // Only draw labels if the setting is enabled
            if (styleSettings.showLabels) {
                // Get coordinates for label positioning
                const x = rect.x * scaleFactorX;
                const y = rect.y * scaleFactorY;

                // Add a better label above each rectangle with text content
                // Create label background
                const labelText = rect.text || rect.info || '';
                const truncatedText = labelText.length > 25 ? labelText.substring(0, 25) + '...' : labelText;

                ctx.font = `${styleSettings.fontBold ? 'bold' : 'normal'} ${styleSettings.fontSize}px Arial`;
                const textMetrics = ctx.measureText(truncatedText);
                const textWidth = textMetrics.width;

                // Determine if label should be above or inside the rectangle (if near top of image)
                const labelY = y < 25 ? y + 5 : y - 20;

                // Draw label background
                const labelBgColor = rect.color.replace(/[\d.]+\)$/, `${styleSettings.labelBgOpacity})`);
                ctx.fillStyle = labelBgColor;
                ctx.fillRect(x, labelY, textWidth + 10, 20);

                // Add a subtle shadow to the text for better visibility
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 2;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;

                // Draw label text with the configured font color
                ctx.fillStyle = styleSettings.fontColor;
                ctx.font = `${styleSettings.fontBold ? 'bold' : 'normal'} ${styleSettings.fontSize}px Arial`;
                ctx.fillText(truncatedText, x + 5, labelY + 14);

                // Reset shadow for other drawing operations
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
        });

        // Draw temporary rectangle during drawing
        if (drawingMode && tempRect) {
            // Use a different color if the rectangle is too small
            if (tempRect.isTooSmall) {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.strokeStyle = 'rgba(255, 0, 0, 1.0)';
            } else {
                ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
                ctx.strokeStyle = 'rgba(0, 100, 255, 1.0)';
            }
            ctx.lineWidth = 2;

            const x = tempRect.x * scaleFactorX;
            const y = tempRect.y * scaleFactorY;
            const width = tempRect.width * scaleFactorX;
            const height = tempRect.height * scaleFactorY;

            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);

            // Show minimum size warning if needed
            if (tempRect.isTooSmall) {
                const warningText = 'Too small!';
                ctx.font = 'bold 12px Arial';

                // Create background for warning text
                const textMetrics = ctx.measureText(warningText);
                const textWidth = textMetrics.width;

                ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.fillRect(x, y - 20, textWidth + 10, 20);

                // Add shadow for text visibility
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 2;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;

                // Draw warning text
                ctx.fillStyle = 'white';
                ctx.fillText(warningText, x + 5, y - 6);

                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
        }

        // Draw multi-select box if active - make it more visible while dragging
        if (multiSelectBox && isMultiSelectMode && isDragging) {
            ctx.strokeStyle = 'rgba(0, 102, 255, 0.8)'; // More visible blue
            ctx.fillStyle = 'rgba(0, 102, 255, 0.1)'; // Light blue fill
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);

            // Calculate normalized dimensions (handling negative width/height)
            const x = multiSelectBox.width < 0 ? multiSelectBox.x + multiSelectBox.width : multiSelectBox.x;
            const y = multiSelectBox.height < 0 ? multiSelectBox.y + multiSelectBox.height : multiSelectBox.y;
            const width = Math.abs(multiSelectBox.width);
            const height = Math.abs(multiSelectBox.height);

            // Draw filled rectangle with border
            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);
            ctx.setLineDash([]);
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
            if (rectangle.isQuad && rectangle.vertices && rectangle.vertices.length === 4) {
                // For quadrilaterals, test if point is inside using point-in-polygon algorithm
                const scaledVertices = rectangle.vertices.map(v => [
                    v[0] * scaleFactorX,
                    v[1] * scaleFactorY
                ]);

                if (isPointInPolygon(mouseX, mouseY, scaledVertices)) {
                    return true;
                }
            } else {
                // For rectangles, use the simpler bounding box check
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

        if (isMultiSelectMode) {
            // Start drawing multi-select box
            const rect = canvasRef.current.getBoundingClientRect();
            const canvasX = (e.clientX - rect.left) / scale;
            const canvasY = (e.clientY - rect.top) / scale;

            setMultiSelectBox({
                x: canvasX,
                y: canvasY,
                width: 0,
                height: 0
            });

            setIsDragging(true);
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

            const width = Math.abs(currentPosInImage.x - drawStartPos.x);
            const height = Math.abs(currentPosInImage.y - drawStartPos.y);

            // Visual feedback for minimum size
            const isTooSmall = width < MIN_RECT_SIZE || height < MIN_RECT_SIZE;

            setTempRect({
                x: Math.min(drawStartPos.x, currentPosInImage.x),
                y: Math.min(drawStartPos.y, currentPosInImage.y),
                width: width,
                height: height,
                isTooSmall: isTooSmall
            });

            // Force redraw to show the temporary rectangle
            requestAnimationFrame(drawCanvas);
            return;
        }

        if (isDragging && isMultiSelectMode && multiSelectBox) {
            // Update multi-select box dimensions
            const rect = canvasRef.current.getBoundingClientRect();
            const canvasX = (e.clientX - rect.left) / scale;
            const canvasY = (e.clientY - rect.top) / scale;

            setMultiSelectBox(prev => ({
                x: prev.x,
                y: prev.y,
                width: canvasX - prev.x,
                height: canvasY - prev.y
            }));

            // Redraw canvas to show the selection box
            requestAnimationFrame(drawCanvas);

            // Set flag that we've moved during this click
            setHasMovedDuringClick(true);
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
            if (tempRect.width >= MIN_RECT_SIZE && tempRect.height >= MIN_RECT_SIZE) {
                const newRect = {
                    id: nextRectId,
                    x: tempRect.x,
                    y: tempRect.y,
                    width: tempRect.width,
                    height: tempRect.height,
                    color: RECTANGLE_COLORS[(nextRectId - 1) % RECTANGLE_COLORS.length],
                    label: `Text ${nextRectId}`,
                    text: 'New text region',
                    confidence: 1.0,
                    isQuad: false, // Mark as a regular rectangle
                    marked: false // Add marked property, default to false
                };

                setNextRectId(nextRectId + 1);
                setRectangles(prevRects => [...prevRects, newRect]);
                setSelectedRect(newRect);
            }

            setTempRect(null);
            setDrawingMode(false);
            return;
        }

        if (isDragging && isMultiSelectMode && multiSelectBox) {
            // Calculate which rectangles are inside the selection box
            const selectedIds = rectangles
                .filter(rect => {
                    // Normalize the selection box in case of negative width/height
                    const selBox = {
                        x: multiSelectBox.width < 0 ? multiSelectBox.x + multiSelectBox.width : multiSelectBox.x,
                        y: multiSelectBox.height < 0 ? multiSelectBox.y + multiSelectBox.height : multiSelectBox.y,
                        width: Math.abs(multiSelectBox.width),
                        height: Math.abs(multiSelectBox.height)
                    };

                    // Check if rectangle is inside selection box
                    return (
                        rect.x * scaleFactorX >= selBox.x &&
                        rect.y * scaleFactorY >= selBox.y &&
                        (rect.x + rect.width) * scaleFactorX <= selBox.x + selBox.width &&
                        (rect.y + rect.height) * scaleFactorY <= selBox.y + selBox.height
                    );
                })
                .map(rect => rect.id);

            setSelectedRects(selectedIds);
            setSelectedRect(null); // Clear single selection
            setMultiSelectBox(null);
            setIsDragging(false);
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

            if (rectangle.isQuad && rectangle.vertices && rectangle.vertices.length === 4) {
                // For quadrilaterals, test if point is inside using point-in-polygon algorithm
                const scaledVertices = rectangle.vertices.map(v => [
                    v[0] * scaleFactorX,
                    v[1] * scaleFactorY
                ]);

                if (isPointInPolygon(imageX, imageY, scaledVertices)) {
                    clickedRect = rectangle;
                    console.log('Selected quadrilateral:', rectangle.id);
                    break;
                }
            } else {
                // For rectangles, use the simpler bounding box check
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
        }

        setSelectedRect(clickedRect);
    };

    // Helper function to check if a point is inside a polygon
    // Uses the ray casting algorithm
    const isPointInPolygon = (x, y, vertices) => {
        let inside = false;

        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i][0], yi = vertices[i][1];
            const xj = vertices[j][0], yj = vertices[j][1];

            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;
        }

        return inside;
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

    // Add this new wheel handler function
    const handleWheel = (e) => {
        e.preventDefault();

        // Use percentage-based scaling (4% per scroll event)
        const zoomFactor = e.deltaY < 0 ? 1.06 : 0.94; // 4% zoom in or out
        const newScale = Math.max(0.1, Math.min(10, scale * zoomFactor)); // Limit scale between 0.1 and 10

        if (newScale !== scale) {
            // Calculate mouse position relative to canvas
            const rect = containerRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Calculate new position that keeps the point under mouse in same relative position
            const scaleChange = newScale / scale;
            const newX = mouseX - (mouseX - position.x) * scaleChange;
            const newY = mouseY - (mouseY - position.y) * scaleChange;

            setScale(newScale);
            setPosition({ x: newX, y: newY });
        }
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

    // Function to prepare data for export in the new format
    const prepareExportData = () => {
        // New JSON structure
        const exportData = {
            image_width: pageWidth || (imageData?.width || 0),
            image_height: pageHeight || (imageData?.height || 0),
            ocr_results: []
        };

        // Convert our rectangles to the expected output format
        exportData.ocr_results = rectangles.map(rect => {
            const result = {
                text: rect.text || '',
                confidence: rect.confidence || 1.0,
                marked: rect.marked || false // Add marked property to export
            };

            // If we have vertices (from imported data or calculated), use them
            if (rect.isQuad && rect.vertices && rect.vertices.length === 4) {
                result.vertices = rect.vertices;
            } else {
                // For user-drawn rectangles, create vertices from the bounding box
                // This creates a rectangular quadrilateral from the bounds
                result.vertices = [
                    [rect.x, rect.y],                         // Top-left
                    [rect.x + rect.width, rect.y],            // Top-right
                    [rect.x + rect.width, rect.y + rect.height], // Bottom-right
                    [rect.x, rect.y + rect.height]            // Bottom-left
                ];
            }

            return result;
        });

        return exportData;
    };

    // Handle export to JSON file
    const handleExport = () => {
        // Prepare the data in the new format
        const exportData = prepareExportData();

        // Log the export data structure for verification
        console.log('Exporting data structure:', exportData);

        // Convert to JSON string with nice formatting
        const jsonString = JSON.stringify(exportData, null, 2);

        // Create a Blob with the JSON data
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Create a URL for the Blob
        const url = URL.createObjectURL(blob);

        // Create a temporary anchor element to trigger the download
        const a = document.createElement('a');
        a.href = url;

        // Use the original image filename with .json extension
        let filename = 'ocr-export.json';

        if (imageName) {
            // Use the imageName that was passed from the parent component (from HomeTwo)
            // This preserves the original filename (like file-1.tif) but changes extension to .json
            console.log('Using original filename:', imageName);
            filename = imageName.replace(/\.[^/.]+$/, '.json');
        }

        // Log the final filename for verification
        console.log('Exporting to:', filename);

        a.download = filename;

        // Append the anchor to the document, click it, and remove it
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Release the Blob URL to free up resources
        URL.revokeObjectURL(url);
    };

    // Apply current style settings to all rectangles in order
    const applyColorsToRectangles = () => {
        if (rectangles.length === 0 || styleSettings.colors.length === 0) return;

        const updatedRectangles = rectangles.map((rect, index) => {
            // Assign colors in sequence, cycling through the available colors
            const colorIndex = index % styleSettings.colors.length;
            return {
                ...rect,
                color: styleSettings.colors[colorIndex]
            };
        });

        setRectangles(updatedRectangles);
    };

    // Remove color from palette
    const removeColor = (indexToRemove) => {
        if (styleSettings.colors.length <= 1) {
            // Don't remove the last color
            return;
        }

        setStyleSettings(prev => ({
            ...prev,
            colors: prev.colors.filter((_, index) => index !== indexToRemove)
        }));
    };

    // Toggle style settings panel
    const toggleStyleSettings = (shouldApply = false) => {
        if (!styleSettingsOpen) {
            // Opening the panel - nothing special needed
            setStyleSettingsOpen(true);
        } else {
            // Closing the panel
            if (shouldApply === true) {
                // Apply button was clicked - apply colors to rectangles
                applyColorsToRectangles();
                setStyleSettingsOpen(false);
            } else if (shouldApply === false) {
                // Reset button was clicked - reset to initial values
                setStyleSettings(initialStyleSettings);
                // Keep the panel open to show the reset values
            } else {
                // X button was clicked - just close without applying
                setStyleSettingsOpen(false);
            }
        }
    };

    // Handle style settings changes
    const handleStyleChange = (property, value) => {
        setStyleSettings(prev => ({
            ...prev,
            [property]: value
        }));
    };

    // Add a handler for marking/unmarking selected rectangles
    const toggleMarkSelectedRects = () => {
        if (selectedRects.length > 0) {
            setRectangles(prevRects =>
                prevRects.map(rect => {
                    if (selectedRects.includes(rect.id)) {
                        return { ...rect, marked: !rect.marked };
                    }
                    return rect;
                })
            );
            // Clear selection after marking
            setSelectedRects([]);
            setIsMultiSelectMode(false);
        } else if (selectedRect) {
            setRectangles(prevRects =>
                prevRects.map(rect => {
                    if (rect.id === selectedRect.id) {
                        return { ...rect, marked: !rect.marked };
                    }
                    return rect;
                })
            );
            // Clear selection after marking
            setSelectedRect(null);
        }
    };

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
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4 overflow-hidden">
            <div className="relative w-full h-full bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col">
                <div className="bg-indigo-700 text-white p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h3 className="font-medium">Image Viewer with Annotations</h3>
                        <button
                            onClick={toggleStyleSettings}
                            className="px-3 cursor-pointer py-1 bg-indigo-800 rounded hover:bg-indigo-900 flex items-center gap-1"
                            title="Style Settings"
                        >
                            <Settings className="w-4 h-4" />
                            <span>Style</span>
                        </button>

                        <button
                            onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                            className={`px-3 py-1 cursor-pointer  rounded ${isMultiSelectMode ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'} flex items-center gap-1`}
                            title="Toggle multi-select mode"
                        >
                            <Square className="w-4 h-4" />
                            <span>Select</span>
                        </button>

                        {(selectedRect || selectedRects.length > 0) && (
                            <button
                                onClick={toggleMarkSelectedRects}
                                className={`px-3 py-1 cursor-pointer  rounded bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1`}
                                title={`${selectedRects.length > 0 ? `Mark ${selectedRects.length} regions` : 'Mark region'}`}
                            >
                                <Check className="w-4 h-4" />
                                <span>Mark</span>
                            </button>
                        )}

                    </div>
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

                <div className="flex flex-1 overflow-hidden relative">
                    {/* Style Settings Panel as a popup dialog */}
                    {styleSettingsOpen && (
                        <div className="fixed inset-0 bg-black/50 bg-opacity-30 flex items-center justify-center z-30">
                            <div className="bg-white rounded-lg shadow-2xl w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
                                <div className="bg-indigo-700 text-white p-3 flex justify-between items-center">
                                    <h3 className="font-semibold">Style Settings</h3>
                                    <button
                                        onClick={() => toggleStyleSettings(null)}
                                        className="text-white hover:text-gray-200"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex flex-1 overflow-hidden">
                                    {/* Settings Controls */}
                                    <div className="w-[60%] p-4 overflow-y-auto border-r">
                                        <div className="space-y-5">
                                            {/* Fill Settings */}
                                            <div className="space-y-2">
                                                <h4 className="font-medium text-gray-800 flex items-center gap-1">
                                                    <PaintBucket className="w-4 h-4" />
                                                    Fill Settings
                                                </h4>
                                                <div className="flex items-center">
                                                    <span className="text-sm text-gray-600 w-20">Opacity:</span>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="1"
                                                        step="0.05"
                                                        value={styleSettings.fillOpacity}
                                                        onChange={(e) => handleStyleChange('fillOpacity', parseFloat(e.target.value))}
                                                        className="flex-1 mx-2"
                                                    />
                                                    <span className="text-xs w-10 text-gray-600">{Math.round(styleSettings.fillOpacity * 100)}%</span>
                                                </div>
                                            </div>

                                            {/* Stroke Settings */}
                                            <div className="space-y-2">
                                                <h4 className="font-medium text-gray-800 flex items-center gap-1">
                                                    <Brush className="w-4 h-4" />
                                                    Stroke Settings
                                                </h4>
                                                <div className="flex items-center">
                                                    <span className="text-sm text-gray-600 w-20">Width:</span>
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="10"
                                                        step="1"
                                                        value={styleSettings.strokeWidth}
                                                        onChange={(e) => handleStyleChange('strokeWidth', parseInt(e.target.value))}
                                                        className="flex-1 mx-2"
                                                    />
                                                    <span className="text-xs w-10 text-gray-600">{styleSettings.strokeWidth}px</span>
                                                </div>
                                                <div className="text-xs text-gray-500 ml-20">Border color uses the same color with 100% opacity</div>
                                            </div>

                                            {/* Label Settings */}
                                            <div className="space-y-2">
                                                <h4 className="font-medium text-gray-800 flex items-center gap-1">
                                                    <Type className="w-4 h-4" />
                                                    Label Settings
                                                </h4>
                                                <div className="flex items-center">
                                                    <span className="text-sm text-gray-600 w-20">Show Labels:</span>
                                                    <label className="flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={styleSettings.showLabels}
                                                            onChange={(e) => handleStyleChange('showLabels', e.target.checked)}
                                                            className="mr-2"
                                                        />
                                                        <span className="text-sm">{styleSettings.showLabels ? <Eye className="w-4 h-4 inline" /> : <EyeOff className="w-4 h-4 inline" />}</span>
                                                    </label>
                                                </div>

                                                {styleSettings.showLabels && (
                                                    <>
                                                        <div className="flex items-center">
                                                            <span className="text-sm text-gray-600 w-20">BG Opacity:</span>
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="1"
                                                                step="0.05"
                                                                value={styleSettings.labelBgOpacity}
                                                                onChange={(e) => handleStyleChange('labelBgOpacity', parseFloat(e.target.value))}
                                                                className="flex-1 mx-2"
                                                            />
                                                            <span className="text-xs w-10 text-gray-600">{Math.round(styleSettings.labelBgOpacity * 100)}%</span>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <span className="text-sm text-gray-600 w-20">Font Size:</span>
                                                            <input
                                                                type="range"
                                                                min="8"
                                                                max="20"
                                                                step="1"
                                                                value={styleSettings.fontSize}
                                                                onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value))}
                                                                className="flex-1 mx-2"
                                                            />
                                                            <span className="text-xs w-10 text-gray-600">{styleSettings.fontSize}px</span>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <span className="text-sm text-gray-600 w-20">Bold:</span>
                                                            <label className="flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={styleSettings.fontBold}
                                                                    onChange={(e) => handleStyleChange('fontBold', e.target.checked)}
                                                                    className="mr-2"
                                                                />
                                                                <span className={`text-sm ${styleSettings.fontBold ? 'font-bold' : 'font-normal'}`}>Text Style</span>
                                                            </label>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <span className="text-sm text-gray-600 w-20">Font Color:</span>
                                                            <div className="flex items-center">
                                                                <div
                                                                    className="w-6 h-6 rounded border border-gray-300 mr-2"
                                                                    style={{ backgroundColor: styleSettings.fontColor }}
                                                                ></div>
                                                                <input
                                                                    type="color"
                                                                    value={styleSettings.fontColor}
                                                                    onChange={(e) => handleStyleChange('fontColor', e.target.value)}
                                                                    className="w-16"
                                                                />
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Color Palette */}
                                            <div className="space-y-2">
                                                <h4 className="font-medium text-gray-800">Color Palette</h4>
                                                <p className="text-xs text-gray-500 mb-2">Colors will be applied to all regions in sequence when you click "Apply & Close"</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {styleSettings.colors.map((color, index) => {
                                                        // Extract RGB values
                                                        const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                                                        if (!rgbMatch) return null;

                                                        const [_, r, g, b] = rgbMatch;
                                                        const hexColor = `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;

                                                        return (
                                                            <div
                                                                key={index}
                                                                className="w-8 h-8 rounded border border-gray-300 cursor-pointer flex items-center justify-center relative group"
                                                                style={{ backgroundColor: hexColor }}
                                                                title={`Color ${index + 1}`}
                                                            >
                                                                <div
                                                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeColor(index);
                                                                    }}
                                                                    title="Remove color"
                                                                >
                                                                    <span className="text-white text-xs font-bold">-</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Add new color UI */}
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center overflow-hidden"
                                                                style={{ backgroundColor: pendingColor || '#FF5733' }}
                                                            >
                                                                <input
                                                                    type="color"
                                                                    value={pendingColor || '#FF5733'}
                                                                    onChange={(e) => setPendingColor(e.target.value)}
                                                                    className="opacity-0 absolute w-8 h-8 cursor-pointer"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    if (pendingColor) {
                                                                        // Convert hex to rgba
                                                                        const r = parseInt(pendingColor.slice(1, 3), 16);
                                                                        const g = parseInt(pendingColor.slice(3, 5), 16);
                                                                        const b = parseInt(pendingColor.slice(5, 7), 16);
                                                                        const newColor = `rgba(${r}, ${g}, ${b}, ${styleSettings.fillOpacity})`;

                                                                        setStyleSettings(prev => ({
                                                                            ...prev,
                                                                            colors: [...prev.colors, newColor]
                                                                        }));

                                                                        setPendingColor(null);
                                                                    }
                                                                }}
                                                                className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                                                                disabled={!pendingColor}
                                                            >
                                                                Save Color
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div className="w-[40%] p-4 bg-gray-50 overflow-hidden flex flex-col">
                                        <h4 className="font-medium text-gray-700 mb-2">Preview</h4>
                                        <div className="flex-1 flex items-center justify-center">
                                            <canvas
                                                ref={previewRectRef}
                                                width={200}
                                                height={200}
                                                className="border border-gray-200 rounded"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t p-3 flex justify-end bg-gray-50">
                                    <button
                                        onClick={() => toggleStyleSettings(false)}
                                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 mr-2"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        onClick={() => toggleStyleSettings(null)}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 mr-2"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => toggleStyleSettings(true)}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                    >
                                        Apply & Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Canvas Container */}
                    <div
                        ref={containerRef}
                        className={`flex-1 p-1 bg-gray-800 overflow-hidden flex justify-center items-center ${drawingMode ? 'cursor-crosshair' : 'cursor-grab'}`}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onWheel={handleWheel}
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

                        {/* Export Button - Bottom Right */}
                        <div className="absolute bottom-4 right-4 z-10">
                            <button
                                onClick={handleExport}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
                                title="Save & Export changes"
                            >
                                <Save className="w-4 h-4" />
                                <span>Save & Export</span>
                                <Download className="w-4 h-4" />
                            </button>
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
                                        style={{ backgroundColor: selectedRect.color.replace('0.2', '1') }}
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
                                        className={`p-2 rounded cursor-pointer flex items-center 
                                            ${(selectedRect?.id === rect.id || selectedRects.includes(rect.id))
                                                ? 'bg-indigo-100 border border-indigo-300' : 'bg-white hover:bg-gray-50'}`}
                                        onClick={() => {
                                            if (isMultiSelectMode) {
                                                setSelectedRects(prev =>
                                                    prev.includes(rect.id)
                                                        ? prev.filter(id => id !== rect.id)
                                                        : [...prev, rect.id]
                                                );
                                            } else {
                                                setSelectedRect(rect);
                                                setSelectedRects([]);
                                            }
                                        }}
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full mr-2"
                                            style={{ backgroundColor: rect.color.replace('0.2', '1') }}
                                        ></span>
                                        <div className="flex-1 truncate">
                                            <span className="mr-2">{rect.label}</span>
                                            <span className="text-xs text-gray-500 truncate">
                                                {rect.text ? `"${rect.text}"` : ''}
                                            </span>
                                        </div>
                                        {rect.marked && (
                                            <Check className="w-4 h-4 text-green-500 ml-2" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top toolbar - Move buttons to top left */}


            {/* Show info when in multi-select mode */}
            {isMultiSelectMode && (
                <div className="absolute top-22 left-8 bg-blue-600 text-white text-sm px-3 py-1 rounded-md shadow-md flex items-center gap-1">
                    <Square className="w-4 h-4" />
                    <span>Drag to select multiple regions</span>
                </div>
            )}
        </div>
    );
}

export default ImageViewer; 