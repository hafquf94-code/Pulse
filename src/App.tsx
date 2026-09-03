/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import LandingPage from '../app/page';
import DashboardPage from '../app/dashboard/page';
import NotFoundPage from '../app/not-found';
import ErrorBoundary from '../app/error';

function AnimatedRoutes() {
  const location = useLocation();
  
  const pageTransition = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  };

  return (
    <AnimatePresence mode="wait">
      {/* @ts-expect-error - React Router 6 Routes type doesn't include key, but React elements do */}
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<motion.div key="landing" className="h-full" {...pageTransition}><LandingPage /></motion.div>} />
        <Route path="/dashboard" element={<motion.div key="dashboard" className="h-full" {...pageTransition}><DashboardPage /></motion.div>} />
        <Route path="*" element={<motion.div key="not-found" className="h-full" {...pageTransition}><NotFoundPage /></motion.div>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
