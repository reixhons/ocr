// import { useNavigate } from 'react-router-dom'
// import { File, Search } from "lucide-react";
// import { useState } from 'react';


// const tifFiles = [
//   { id: '1', name: 'image-1.tif', url: '/tiff/image-1.tif' },
// ];

// function Home() {
//   const navigate = useNavigate()

//   const [searchQuery, setSearchQuery] = useState('')

//   const filteredTIFs = tifFiles.filter(tif =>
//     tif.name.toLowerCase().includes(searchQuery.toLowerCase())
//   )

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <header className="bg-white shadow">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
//           <div className="flex items-center justify-between">
//             <h1 className="text-2xl font-semibold text-gray-900">My TIFs</h1>
//             <div className="relative">
//               <input
//                 type="text"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 placeholder="Search PDFs..."
//                 className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//               />
//               <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
//             </div>
//           </div>
//         </div>
//       </header>

//       {/* Main Content */}
//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {filteredTIFs.length === 0 ? (
//           <div className="text-center py-12">
//             <File className="mx-auto h-12 w-12 text-gray-400" />
//             <h3 className="mt-2 text-sm font-medium text-gray-900">No PDFs found</h3>
//             <p className="mt-1 text-sm text-gray-500">
//               Try adjusting your search query
//             </p>
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
//             {filteredTIFs.map((tif) => (
//               <div
//                 key={tif.id}
//                 onClick={() => navigate(`/view/${tif.name}`)}
//                 className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 cursor-pointer p-4"
//               >
//                 <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg mb-4">
//                   <File className="h-16 w-16 text-blue-500" />
//                 </div>
//                 <div className="space-y-1">
//                   <h3 className="font-medium text-gray-900 truncate">{tif.name}</h3>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </main>
//     </div>
//   )
// }

// export default Home