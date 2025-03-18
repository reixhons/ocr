import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import UTIF from 'utif';
import ImageViewer from '../components/ImageViewer';

function HomeTwo() {
    const [images, setImages] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const fileInputRef = useRef(null);

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
                    resolve(dataUrl);
                } catch (error) {
                    console.error('Error processing TIFF:', error);
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
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
                            const url = await convertTiffToCanvas(file);
                            return { file, url };
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

    const removeImage = (index) => {
        setImages(prev => {
            const newImages = [...prev];
            newImages.splice(index, 1);
            return newImages;
        });
        if (selectedImage === images[index].url) {
            setSelectedImage(null);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        if (e.dataTransfer.files) {
            const tiffFiles = Array.from(e.dataTransfer.files)
                .filter(file => file.type === 'image/tiff' || file.name.toLowerCase().endsWith('.tif') || file.name.toLowerCase().endsWith('.tiff'));

            if (tiffFiles.length === 0) {
                alert('Please upload TIF or TIFF files only.');
                return;
            }

            try {
                const newImages = await Promise.all(
                    tiffFiles.map(async (file) => {
                        try {
                            const url = await convertTiffToCanvas(file);
                            return { file, url };
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-indigo-800 mb-2 tracking-tight">TIF Image Viewer</h1>
                    <p className="text-gray-600 max-w-xl mx-auto">Upload, view and manage your TIF images with ease</p>
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
                            Drag and drop your TIF images here
                        </p>
                        <p className="text-gray-500 mb-4">or</p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".tif,.tiff"
                            multiple
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium transition duration-200 shadow-md hover:shadow-lg"
                        >
                            Select Files
                        </button>
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
                                            onClick={() => setSelectedImage(image.url)}
                                        />
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
                        onClose={() => setSelectedImage(null)}
                    />
                )}

                {/* Empty State */}
                {images.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-xl shadow-lg">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ImageIcon className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-lg">No images uploaded yet</p>
                        <p className="text-gray-400 text-sm mt-2">Upload TIF images to view them here</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default HomeTwo