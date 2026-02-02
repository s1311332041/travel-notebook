import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from './lib/firebase';
import Dashboard from './pages/Dashboard';
import Planner from './pages/Planner';

export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 監聽登入狀態
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const navigateToPlanner = (tripId) => {
    setSelectedTripId(tripId);
    setCurrentView('planner');
  };

  const navigateToDashboard = () => {
    setSelectedTripId(null);
    setCurrentView('dashboard');
  };

  if (loading) return <div className="h-screen flex items-center justify-center">載入中...</div>;

  return (
    <div className="min-h-screen bg-[#f5f0e1] text-[#4a453e] font-serif selection:bg-[#d4b06a] selection:text-white">
      {currentView === 'dashboard' ? (
        <Dashboard user={user} onSelectTrip={navigateToPlanner} />
      ) : (
        <Planner user={user} tripId={selectedTripId} onBack={navigateToDashboard} />
      )}
    </div>
  );
}
