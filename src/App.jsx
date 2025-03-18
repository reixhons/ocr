import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomeTwo from './pages/HomeTwo'


function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeTwo />} />
      </Routes>
    </Router>
  )
}

export default App
