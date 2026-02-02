import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Calendar as CalendarIcon, Image as ImageIcon, 
  Map, BookOpen, LogIn, LogOut, User 
} from 'lucide-react';
import { 
  collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy 
} from "firebase/firestore";
import { signInWithPopup, signOut } from "firebase/auth";
import { db, auth, googleProvider, appId } from '../lib/firebase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { DEFAULT_TAGS } from '../lib/utils';

export default function Dashboard({ user, onSelectTrip }) {
  const [trips, setTrips] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTrip, setNewTrip] = useState({ name: '', startDate: new Date().toISOString().split('T')[0], days: 3, coverImage: null });

  // Auth Handling
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
      alert("登入失敗，請檢查 Firebase Console 設定");
    }
  };

  const handleLogout = async () => {
    if (confirm("確定要登出嗎？")) {
      await signOut(auth);
    }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'trips'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => setTrips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsubscribe();
  }, [user]);

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'trips'), {
        ...newTrip, 
        days: Number(newTrip.days), 
        createdAt: new Date().toISOString(),
        tags: DEFAULT_TAGS
      });
      setIsModalOpen(false);
      setNewTrip({ name: '', startDate: new Date().toISOString().split('T')[0], days: 3, coverImage: null });
    } catch (error) { alert("建立失敗"); }
  };

  const handleDeleteTrip = async (e, tripId) => {
    e.stopPropagation();
    if (confirm("確定要撕掉這一頁行程嗎？(無法復原)")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'trips', tripId));
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.size < 500 * 1024) {
      const reader = new FileReader();
      reader.onloadend = () => setNewTrip(prev => ({ ...prev, coverImage: reader.result }));
      reader.readAsDataURL(file);
    } else { alert("圖片需小於 500KB"); }
  };

  return (
    <div className="min-h-screen bg-[#f5f0e1] p-6 font-serif text-[#4a453e]" style={{ backgroundImage: 'radial-gradient(#e5e0d1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      <div className="max-w-5xl mx-auto">
        {/* User Status Bar */}
        <div className="flex justify-end mb-4">
          {user && !user.isAnonymous ? (
             <div className="flex items-center gap-3 bg-[#fdfbf7] px-4 py-2 rounded-full border border-[#d6d3cb] shadow-sm">
               {user.photoURL ? (
                 <img src={user.photoURL} className="w-6 h-6 rounded-full" alt="avatar" />
               ) : (
                 <User size={18} className="text-[#8c7b6c]"/>
               )}
               <span className="text-sm font-bold text-[#5c554b]">{user.displayName || user.email}</span>
               <div className="w-px h-4 bg-[#d6d3cb] mx-1"></div>
               <button onClick={handleLogout} className="text-xs text-[#8a4a4a] hover:underline flex items-center gap-1">
                 <LogOut size={12}/> 登出
               </button>
             </div>
          ) : (
             <Button onClick={handleLogin} variant="primary" className="!py-1.5 !px-3 !text-xs shadow-md">
               <LogIn size={14}/> 登入以同步資料
             </Button>
          )}
        </div>

        <div className="flex justify-between items-end mb-10 border-b-2 border-[#8c7b6c] pb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2c2825] flex items-center gap-3">
              <BookOpen size={32} /> 旅行手帳
            </h1>
            <p className="text-[#6e685e] mt-2 italic">"紀錄每一個想去的地方..."</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}><Plus size={20} /> 寫新行程</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {trips.map(trip => (
            <div key={trip.id} onClick={() => onSelectTrip(trip.id)} className="group bg-[#fdfbf7] rounded-sm shadow-[3px_3px_0px_rgba(0,0,0,0.1)] border border-[#d6d3cb] overflow-hidden cursor-pointer hover:-translate-y-1 transition-all relative">
              <div className="p-3 pb-0">
                <div className="h-40 bg-[#f0eadd] overflow-hidden relative border border-[#d6d3cb]">
                  {trip.coverImage ? <img src={trip.coverImage} alt={trip.name} className="w-full h-full object-cover sepia-[.3]" /> : <div className="w-full h-full flex items-center justify-center text-[#d6d3cb]"><Map size={48} /></div>}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-xl text-[#2c2825] mb-1">{trip.name}</h3>
                <div className="flex items-center gap-2 text-sm text-[#8c7b6c]"><CalendarIcon size={14} /><span>{trip.startDate} · {trip.days} 天</span></div>
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-[#e8e4d9] opacity-80 rotate-[-2deg] shadow-sm pointer-events-none"></div>
              <button onClick={(e) => handleDeleteTrip(e, trip.id)} className="absolute top-2 right-2 p-2 text-[#a8a49d] hover:text-[#8a4a4a] transition-colors"><Trash2 size={16} /></button>
            </div>
          ))}
          <button onClick={() => setIsModalOpen(true)} className="border-2 border-dashed border-[#d6d3cb] rounded-sm h-full min-h-[250px] flex flex-col items-center justify-center text-[#a8a49d] hover:border-[#8c7b6c] hover:text-[#8c7b6c] hover:bg-[#fcfbf9] transition-all bg-[#f5f0e1]/50"><Plus size={32} /><span className="mt-2 font-medium">貼上新頁面</span></button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#2c2825]/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-[#fdfbf7] rounded-md shadow-xl w-full max-w-md p-8 border border-[#d6d3cb] relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-[#e8e4d9] opacity-90 shadow-sm"></div>
            <h2 className="text-2xl font-bold mb-6 text-[#2c2825] border-b border-[#d6d3cb] pb-2">準備出發</h2>
            <form onSubmit={handleCreateTrip} className="space-y-6">
              <div><label className="block text-sm font-bold text-[#6e685e] mb-2">行程主題</label><Input required value={newTrip.name} onChange={e => setNewTrip({...newTrip, name: e.target.value})} placeholder="例如：京都散策" /></div>
              <div className="grid grid-cols-2 gap-6">
                <div><label className="block text-sm font-bold text-[#6e685e] mb-2">出發日期</label><Input type="date" required value={newTrip.startDate} onChange={e => setNewTrip({...newTrip, startDate: e.target.value})} /></div>
                <div><label className="block text-sm font-bold text-[#6e685e] mb-2">天數</label><Input type="number" min="1" max="30" required value={newTrip.days} onChange={e => setNewTrip({...newTrip, days: e.target.value})} /></div>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#6e685e] mb-2">封面照片</label>
                <div className="border-2 border-dashed border-[#d6d3cb] rounded-lg p-4 text-center cursor-pointer hover:bg-[#f5f0e1] relative transition-colors"><input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload} /><div className="flex flex-col items-center text-[#8c7b6c] text-sm"><ImageIcon size={24} className="mb-2" /><span>{newTrip.coverImage ? "照片已夾入" : "夾入照片"}</span></div></div>
              </div>
              <div className="flex justify-end gap-3 pt-4"><Button variant="secondary" onClick={() => setIsModalOpen(false)}>暫時擱置</Button><Button variant="primary" type="submit">開始規劃</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}