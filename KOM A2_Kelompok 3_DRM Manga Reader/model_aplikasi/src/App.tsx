/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Library from './pages/Library';
import Search from './pages/Search';
import History from './pages/History';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ComicDetail from './pages/ComicDetail';
import Reader from './pages/Reader';
import Login from './pages/Login';
import Downloads from './pages/Downloads';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Library />} />
              <Route path="search" element={<Search />} />
              <Route path="history" element={<History />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="downloads" element={<Downloads />} />
              <Route path="comic/:id" element={<ComicDetail />} />
              <Route path="login" element={<Login />} />
            </Route>
            <Route path="/read/:comicId/:chapterId" element={<Reader />} />
          </Routes>
        </HashRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
