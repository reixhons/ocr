import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import UTIF from 'utif';
import ImageViewer from '../components/ImageViewer';

function HomeTwo() {
    const [images, setImages] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedImageName, setSelectedImageName] = useState(null);
    const [selectedImageData, setSelectedImageData] = useState(null);
    const fileInputRef = useRef(null);
    const jsonFileInputRef = useRef(null);

    const convertTiffToCanvas = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    // Parse TIFF using UTIF
                    const ifds = UTIF.decode(e.target.result);

                    // Get the first image
                    const firstImage = ifds[0];

                    // Process image data
                    UTIF.decodeImage(e.target.result, firstImage);

                    // Create canvas with proper dimensions
                    const canvas = document.createElement('canvas');
                    canvas.width = firstImage.width;
                    canvas.height = firstImage.height;

                    // Get the canvas context and render TIFF
                    const ctx = canvas.getContext('2d');

                    // Convert the TIFF data to RGBA format
                    const rgba = UTIF.toRGBA8(firstImage);

                    // Create ImageData object
                    const imageData = new ImageData(
                        new Uint8ClampedArray(rgba),
                        firstImage.width,
                        firstImage.height
                    );

                    // Put the image data on the canvas
                    ctx.putImageData(imageData, 0, 0);

                    // Convert canvas to data URL
                    const dataUrl = canvas.toDataURL('image/png');
                    resolve({
                        url: dataUrl,
                        width: firstImage.width,
                        height: firstImage.height
                    });
                } catch (error) {
                    console.error('Error processing TIFF:', error);
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    };

    const parseJsonFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    resolve(jsonData);
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read JSON file'));
            reader.readAsText(file);
        });
    };

    const handleFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const tiffFiles = Array.from(e.target.files)
                .filter(file => file.type === 'image/tiff' || file.name.toLowerCase().endsWith('.tif') || file.name.toLowerCase().endsWith('.tiff'));

            if (tiffFiles.length === 0) {
                alert('Please select TIF or TIFF files only.');
                return;
            }

            try {
                const newImages = await Promise.all(
                    tiffFiles.map(async (file) => {
                        try {
                            const imageResult = await convertTiffToCanvas(file);

                            // Look for corresponding JSON file with the same name
                            const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
                            const jsonFileName = `${baseName}.json`;

                            // Check if there's a JSON file with the same name in the selected files
                            const jsonFile = Array.from(e.target.files).find(f =>
                                f.name.toLowerCase() === jsonFileName.toLowerCase()
                            );

                            let jsonData = null;
                            if (jsonFile) {
                                jsonData = await parseJsonFile(jsonFile);
                            }

                            return {
                                file,
                                url: imageResult.url,
                                width: imageResult.width,
                                height: imageResult.height,
                                jsonData
                            };
                        } catch (error) {
                            console.error(`Error processing file ${file.name}:`, error);
                            alert(`Error processing file ${file.name}: ${error.message}`);
                            return null;
                        }
                    })
                );

                // Filter out any failed conversions
                const validImages = newImages.filter(img => img !== null);

                if (validImages.length === 0) {
                    alert('Could not process any of the selected files.');
                    return;
                }

                setImages(prev => [...prev, ...validImages]);
            } catch (error) {
                console.error('Error processing files:', error);
                alert('Error processing files. Please try again.');
            }
        }
    };

    const handleJsonUpload = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const jsonFiles = Array.from(e.target.files)
                .filter(file => file.type === 'application/json' || file.name.toLowerCase().endsWith('.json'));

            if (jsonFiles.length === 0) {
                alert('Please select JSON files only.');
                return;
            }

            try {
                // Process each JSON file
                for (const jsonFile of jsonFiles) {
                    try {
                        const jsonData = await parseJsonFile(jsonFile);

                        // Find the corresponding image by name
                        const baseName = jsonFile.name.substring(0, jsonFile.name.lastIndexOf('.'));
                        const imageIndex = images.findIndex(img =>
                            img.file.name.substring(0, img.file.name.lastIndexOf('.')).toLowerCase() === baseName.toLowerCase()
                        );

                        if (imageIndex !== -1) {
                            // Update the image with the JSON data
                            setImages(prev => {
                                const newImages = [...prev];
                                newImages[imageIndex] = {
                                    ...newImages[imageIndex],
                                    jsonData
                                };
                                return newImages;
                            });
                        }
                    } catch (error) {
                        console.error(`Error processing JSON file ${jsonFile.name}:`, error);
                    }
                }
            } catch (error) {
                console.error('Error processing JSON files:', error);
                alert('Error processing JSON files. Please try again.');
            }
        }
    };

    const removeImage = (index) => {
        setImages(prev => {
            const newImages = [...prev];
            newImages.splice(index, 1);
            return newImages;
        });
        if (selectedImage === images[index].url) {
            setSelectedImage(null);
            setSelectedImageData(null);
            setSelectedImageName(null);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        if (e.dataTransfer.files) {
            const allFiles = Array.from(e.dataTransfer.files);
            const tiffFiles = allFiles.filter(file =>
                file.type === 'image/tiff' ||
                file.name.toLowerCase().endsWith('.tif') ||
                file.name.toLowerCase().endsWith('.tiff')
            );
            const jsonFiles = allFiles.filter(file =>
                file.type === 'application/json' ||
                file.name.toLowerCase().endsWith('.json')
            );

            if (tiffFiles.length === 0) {
                alert('Please upload at least one TIF or TIFF file.');
                return;
            }

            try {
                const newImages = await Promise.all(
                    tiffFiles.map(async (file) => {
                        try {
                            const imageResult = await convertTiffToCanvas(file);

                            // Look for corresponding JSON file with the same name
                            const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
                            const jsonFileName = `${baseName}.json`;

                            // Find the JSON file with matching name
                            const jsonFile = jsonFiles.find(f =>
                                f.name.toLowerCase() === jsonFileName.toLowerCase()
                            );

                            let jsonData = null;
                            if (jsonFile) {
                                jsonData = await parseJsonFile(jsonFile);
                            }

                            return {
                                file,
                                url: imageResult.url,
                                width: imageResult.width,
                                height: imageResult.height,
                                jsonData
                            };
                        } catch (error) {
                            console.error(`Error processing file ${file.name}:`, error);
                            alert(`Error processing file ${file.name}: ${error.message}`);
                            return null;
                        }
                    })
                );

                // Filter out any failed conversions
                const validImages = newImages.filter(img => img !== null);
                setImages(prev => [...prev, ...validImages]);
            } catch (error) {
                console.error('Error processing files:', error);
                alert('Error processing files. Please try again.');
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleImageClick = (image) => {
        setSelectedImage(image.url);
        setSelectedImageName(image.file.name)
        setSelectedImageData({
            width: image.width,
            height: image.height,
            jsonData: image.jsonData
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-indigo-800 mb-2 tracking-tight">TIF Image OCR Results Editor</h1>
                    <p className="text-gray-600 max-w-xl mx-auto">Upload, view and edit your TIF images with  OCR annotations</p>
                </div>

                {/* Upload Area */}
                <div
                    className="bg-white p-8 rounded-xl shadow-lg mb-8 border-2 border-dashed border-indigo-300 transition-all hover:border-indigo-500 hover:shadow-xl"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                >
                    <div className="text-center">
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-8 h-8 text-indigo-600" />
                        </div>
                        <p className="text-xl font-semibold text-gray-800 mb-2">
                            Drag and drop your TIF images and JSON files here
                        </p>
                        <p className="text-gray-500 mb-4">or</p>
                        <div className="flex justify-center space-x-4">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".tif,.tiff,.json"
                                multiple
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium transition duration-200 shadow-md hover:shadow-lg"
                            >
                                Select Files
                            </button>

                            <input
                                type="file"
                                ref={jsonFileInputRef}
                                onChange={handleJsonUpload}
                                accept=".json"
                                multiple
                                className="hidden"
                            />
                            <button
                                onClick={() => jsonFileInputRef.current?.click()}
                                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition duration-200 shadow-md hover:shadow-lg"
                            >
                                Add JSON Only
                            </button>
                        </div>
                        <p className="text-gray-500 text-sm mt-4">
                            TIF and JSON files with matching names will be linked automatically
                        </p>
                    </div>
                </div>

                {/* Image Grid */}
                {images.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Images</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {images.map((image, index) => (
                                <div
                                    key={index}
                                    className="group relative bg-gray-50 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-200"
                                >
                                    <div className="aspect-square relative overflow-hidden">
                                        <img
                                            src={image.url}
                                            alt={`Upload ${index + 1}`}
                                            className="w-full h-full object-contain cursor-pointer transition-transform hover:scale-105"
                                            onClick={() => handleImageClick(image)}
                                        />
                                        {image.jsonData && (
                                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                                JSON
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <p className="text-sm text-gray-600 truncate">
                                            {image.file.name}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => removeImage(index)}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Image Preview Modal - replaced with ImageViewer component */}
                {selectedImage && (
                    <ImageViewer
                        imageUrl={selectedImage}
                        imageName={selectedImageName}
                        imageData={selectedImageData}
                        onClose={() => {
                            setSelectedImage(null);
                            setSelectedImageData(null);
                            setSelectedImageName(null)
                        }}
                    />
                )}

                {/* Empty State */}
                {images.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-xl shadow-lg">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ImageIcon className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-lg">No images uploaded yet</p>
                        <p className="text-gray-400 text-sm mt-2">Upload TIF images and JSON files to view them here</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default HomeTwo