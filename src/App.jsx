import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MapPin, Utensils, Bus, Plus, Trash2, X, 
  Calendar as CalendarIcon, Clock, Image as ImageIcon, 
  Cloud, Save, ChevronLeft, Minus, MoreVertical, Map, BookOpen,
  StickyNote, Tag, GripVertical, ExternalLink, Link as LinkIcon, Loader,
  MoveVertical
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, onSnapshot, addDoc, 
  deleteDoc, updateDoc, doc, query, orderBy, getDoc, arrayUnion
} from "firebase/firestore";
import { 
  getAuth, signInAnonymously, signInWithCustomToken, 
  onAuthStateChanged 
} from "firebase/auth";

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyBS8lgDE-FGahGyvP8ycCz7QDsM6kv87M8",
  authDomain: "travel-notebook-eb1e5.firebaseapp.com",
  projectId: "travel-notebook-eb1e5",
  storageBucket: "travel-notebook-eb1e5.firebasestorage.app",
  messagingSenderId: "263641719156",
  appId: "1:263641719156:web:d353ce5f3ff05eea374c21",
  measurementId: "G-ZFG257YFXQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'travel-notebook-v1';

// --- Constants & Helpers ---
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// 時間轉換工具
const timeToMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60) % 24; // 確保在 24 小時內
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const formatTimeFromHour = (hour) => {
  const h = Math.floor(hour);
  return `${h.toString().padStart(2, '0')}:00`;
};

const getDisplayDate = (startDateStr, dayOffset) => {
  if (!startDateStr) return `Day ${dayOffset + 1}`;
  const date = new Date(startDateStr);
  date.setDate(date.getDate() + dayOffset);
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${date.getMonth() + 1}/${date.getDate()} (${weekDays[date.getDay()]})`;
};

// 紙膠帶標籤色系
const TAG_COLORS = [
  { id: 'green', bg: '#e2ebe0', text: '#4a5e45', border: '#7a9e75', name: '森林綠' },
  { id: 'blue', bg: '#e0e8eb', text: '#45525e', border: '#75909e', name: '迷霧藍' },
  { id: 'yellow', bg: '#f7f0e1', text: '#7d6842', border: '#d4b06a', name: '奶茶黃' },
  { id: 'red', bg: '#ebe0e0', text: '#5e4545', border: '#9e7575', name: '乾燥玫瑰' },
  { id: 'purple', bg: '#ebe0eb', text: '#5e455c', border: '#8e759e', name: '薰衣草' },
  { id: 'gray', bg: '#ebebeb', text: '#5e5e5e', border: '#9e9e9e', name: '石墨灰' },
];

const DEFAULT_TAGS = [
  { id: 'sightseeing', name: '景點', colorId: 'green' },
  { id: 'transport', name: '交通', colorId: 'blue' },
  { id: 'food', name: '飲食', colorId: 'yellow' }
];

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false, title = '' }) => {
  const baseStyle = "px-4 py-2 rounded-md font-serif font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed border-b-2 active:border-b-0 active:translate-y-[2px]";
  const variants = {
    primary: "bg-[#8c7b6c] text-[#fdfbf7] border-[#6e5d50] hover:bg-[#7a6a5d] shadow-sm",
    secondary: "bg-[#fdfbf7] text-[#5c554b] border-[#d6d3cb] hover:bg-[#f2efe9]",
    danger: "bg-[#e8dcd8] text-[#8a4a4a] border-[#d1b8b8] hover:bg-[#dfcfcb]",
    ghost: "bg-transparent text-[#8c7b6c] border-transparent hover:bg-[#f0eadd] active:translate-y-0"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`} title={title}>
      {children}
    </button>
  );
};

const Input = (props) => (
  <input 
    {...props}
    className={`w-full bg-transparent border-b-2 border-[#d6d3cb] px-2 py-2 text-[#4a453e] placeholder-[#a8a49d] focus:border-[#8c7b6c] focus:outline-none transition-colors font-serif ${props.className}`}
  />
);

const Textarea = (props) => (
  <textarea 
    {...props}
    className="w-full bg-[#fdfbf7] border-2 border-[#d6d3cb] rounded-lg px-3 py-2 text-[#4a453e] placeholder-[#a8a49d] focus:border-[#8c7b6c] focus:outline-none transition-colors resize-none font-serif leading-relaxed"
    style={{ backgroundImage: 'linear-gradient(#fdfbf7 95%, #f0f0f0 5%)', backgroundSize: '100% 2rem', lineHeight: '2rem' }}
  />
);

// --- Page 1: Dashboard ---
const TripDashboard = ({ user, onSelectTrip }) => {
  const [trips, setTrips] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTrip, setNewTrip] = useState({ name: '', startDate: new Date().toISOString().split('T')[0], days: 3, coverImage: null });

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
};

// --- Page 2: Planner ---
const TripPlanner = ({ user, tripId, onBack }) => {
  const [tripData, setTripData] = useState(null);
  const [events, setEvents] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals & Popovers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  
  // Editing & Forms
  const [currentEvent, setCurrentEvent] = useState(null);
  const [formData, setFormData] = useState({ name: '', tagId: '', day: 1, time: '09:00', endTime: '10:00', content: '', images: [] });
  const [newTagData, setNewTagData] = useState({ name: '', colorId: 'green' });
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [isFetchingLink, setIsFetchingLink] = useState(false);

  // DnD & Resize
  const [draggedEventId, setDraggedEventId] = useState(null);
  const [draggedLink, setDraggedLink] = useState(null);
  const [resizingEvent, setResizingEvent] = useState(null); // { id, originalTop, originalHeight, startY }
  const [resizePreview, setResizePreview] = useState(null); // { id, height, endTime } for live visual feedback

  // 1. Data Listeners
  useEffect(() => {
    if (!user || !tripId) return;
    
    const unsubscribeTrip = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'trips', tripId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data.tags) data.tags = DEFAULT_TAGS;
        setTripData(data);
      }
    });

    const qEvents = query(collection(db, 'artifacts', appId, 'users', user.uid, 'trips', tripId, 'events'));
    const unsubscribeEvents = onSnapshot(qEvents, (s) => setEvents(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qLinks = query(collection(db, 'artifacts', appId, 'users', user.uid, 'trips', tripId, 'links'), orderBy('createdAt', 'desc'));
    const unsubscribeLinks = onSnapshot(qLinks, (s) => {
      setLinks(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { unsubscribeTrip(); unsubscribeEvents(); unsubscribeLinks(); };
  }, [user, tripId]);

  // Global Resize Listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (resizingEvent) {
        e.preventDefault();
        const deltaY = e.clientY - resizingEvent.startY;
        // 1 minute = 1px (since 60 mins = 60px)
        const newDurationMins = Math.max(15, resizingEvent.originalDuration + deltaY); // Min 15 mins
        
        // Calculate new end time based on original start time + new duration
        const startTimeMins = timeToMinutes(resizingEvent.event.time);
        const newEndTimeMins = startTimeMins + newDurationMins;
        const newEndTime = minutesToTime(newEndTimeMins);

        setResizePreview({
          id: resizingEvent.id,
          height: newDurationMins, // height in px = minutes
          endTime: newEndTime
        });
      }
    };

    const handleGlobalMouseUp = async (e) => {
      if (resizingEvent && resizePreview) {
        e.preventDefault();
        // Commit change to Firestore
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'trips', tripId, 'events', resizingEvent.id), {
          endTime: resizePreview.endTime
        });
        setResizingEvent(null);
        setResizePreview(null);
      } else if (resizingEvent) {
        setResizingEvent(null); // Cancel if no move
      }
    };

    if (resizingEvent) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [resizingEvent, resizePreview, appId, user, tripId]);

  // --- CRUD Logic ---
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (timeToMinutes(formData.endTime) <= timeToMinutes(formData.time)) {
      alert("結束時間必須晚於開始時間");
      return;
    }

    const collectionRef = collection(db, 'artifacts', appId, 'users', user.uid, 'trips', tripId, 'events');
    try {
      if (currentEvent) {
        const { id, ...data } = formData;
        await updateDoc(doc(collectionRef, currentEvent.id), data);
      } else {
        await addDoc(collectionRef, { ...formData, createdAt: new Date().toISOString() });
      }
      setIsModalOpen(false);
    } catch (err) { alert("儲存失敗"); }
  };

  const handleDeleteEvent = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'trips', tripId, 'events', id));

  const handleAddTag = async () => {
    if (!newTagData.name) return;
    const newTag = { id: Date.now().toString(), name: newTagData.name, colorId: newTagData.colorId };
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'trips', tripId), { tags: arrayUnion(newTag) });
    setNewTagData({ name: '', colorId: 'green' });
    setIsTagManagerOpen(false);
  };

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!linkUrl) return;
    setIsFetchingLink(true);

    try {
      let title = linkTitle;
      let description = '';
      let image = '';
      let url = linkUrl;
      if (!linkUrl.startsWith('http')) url = 'https://' + linkUrl;

      try {
        const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        if (data.status === 'success') {
          if (!title) title = data.data.title || url;
          description = data.data.description || '';
          image = data.data.image?.url || '';
        }
      } catch (err) { console.warn("Metadata fetch failed", err); if (!title) title = url; }

      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'trips', tripId, 'links'), {
        url, title, description, image, createdAt: new Date().toISOString()
      });
      setLinkUrl(''); setLinkTitle('');
    } catch (err) { alert("新增失敗"); } finally { setIsFetchingLink(false); }
  };

  const handleDeleteLink = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'trips', tripId, 'links', id));

  // --- Drag & Drop & Resize Logic ---
  const handleDrop = async (e, targetDay, targetHour) => {
    e.preventDefault();
    const newStartTimeStr = formatTimeFromHour(targetHour);
    const newStartTimeMins = timeToMinutes(newStartTimeStr);

    if (draggedEventId) {
      // Find original event to calculate duration
      const event = events.find(ev => ev.id === draggedEventId);
      if (event) {
        const oldStartMins = timeToMinutes(event.time);
        const oldEndMins = timeToMinutes(event.endTime || minutesToTime(oldStartMins + 60));
        const durationMins = oldEndMins - oldStartMins;

        const newEndTimeStr = minutesToTime(newStartTimeMins + durationMins);

        // Optimistic update
        setEvents(prev => prev.map(ev => ev.id === draggedEventId ? { ...ev, day: targetDay, time: newStartTimeStr, endTime: newEndTimeStr } : ev));
        
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'trips', tripId, 'events', draggedEventId), { 
          day: targetDay, 
          time: newStartTimeStr,
          endTime: newEndTimeStr 
        });
      }
      setDraggedEventId(null);
    } else if (draggedLink) {
      // Create Event from Link (Default 1 hour)
      const newEndTimeStr = minutesToTime(newStartTimeMins + 60);
      const newEvent = {
        name: draggedLink.title || "新連結行程",
        tagId: tripData.tags[0]?.id || '',
        day: targetDay,
        time: newStartTimeStr,
        endTime: newEndTimeStr,
        content: `${draggedLink.description}\n\n來源: ${draggedLink.url}`,
        images: draggedLink.image ? [draggedLink.image] : [],
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'trips', tripId, 'events'), newEvent);
      setDraggedLink(null);
    }
  };

  const handleResizeStart = (e, event) => {
    e.stopPropagation(); // Prevent drag start
    const startMins = timeToMinutes(event.time);
    const endMins = timeToMinutes(event.endTime || minutesToTime(startMins + 60));
    setResizingEvent({
      id: event.id,
      event: event,
      originalDuration: endMins - startMins,
      startY: e.clientY
    });
  };

  // Helpers
  const openModal = (event = null, defaultDay = 1, defaultTime = '09:00') => {
    const defaultEndTime = minutesToTime(timeToMinutes(defaultTime) + 60);
    setFormData(event ? { ...event, endTime: event.endTime || minutesToTime(timeToMinutes(event.time) + 60) } : { 
      name: '', tagId: tripData.tags[0]?.id || 'sightseeing', day: defaultDay, time: defaultTime, endTime: defaultEndTime, content: '', images: [] 
    });
    setCurrentEvent(event);
    setIsModalOpen(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.size < 500 * 1024) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, images: [...prev.images, reader.result] }));
      reader.readAsDataURL(file);
    } else { alert("圖片需小於 500KB"); }
  };

  const updateTripDays = async (increment) => {
    const newDays = Math.max(1, tripData.days + increment);
    setTripData(prev => ({ ...prev, days: newDays }));
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'trips', tripId), { days: newDays });
  };

  const getTagStyle = (tagId) => {
    if (!tripData) return {};
    const tag = tripData.tags.find(t => t.id === tagId);
    const color = TAG_COLORS.find(c => c.id === (tag?.colorId || 'green')) || TAG_COLORS[0];
    return { backgroundColor: color.bg, color: color.text, borderLeft: `4px solid ${color.border}` };
  };

  if (loading || !tripData) return <div className="h-full flex items-center justify-center bg-[#f5f0e1] font-serif text-[#8c7b6c]">翻頁中...</div>;
  const daysArray = Array.from({ length: tripData.days }, (_, i) => i + 1);

  return (
    <div className="h-full flex flex-col bg-[#f5f0e1] font-serif text-[#4a453e]">
      {/* Header */}
      <div className="bg-[#fdfbf7] border-b border-[#d6d3cb] px-4 py-3 flex justify-between items-center shadow-sm shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-[#f5f0e1] rounded-full text-[#8c7b6c] transition-colors"><ChevronLeft size={24} /></button>
          <div>
            <h1 className="text-xl font-bold text-[#2c2825] flex items-center gap-2">
              {tripData.name}
              <span className="text-xs font-normal text-[#fdfbf7] bg-[#8c7b6c] px-2 py-0.5 rounded-sm shadow-sm transform -rotate-2">{tripData.startDate}</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center bg-[#f5f0e1] rounded-md p-1 border border-[#d6d3cb]">
             <Button variant="ghost" className="h-8 w-8 !p-0" onClick={() => updateTripDays(-1)} disabled={tripData.days <= 1}><Minus size={16} /></Button>
             <span className="text-sm font-medium px-3 text-[#5c554b]">{tripData.days} 天</span>
             <Button variant="ghost" className="h-8 w-8 !p-0" onClick={() => updateTripDays(1)}><Plus size={16} /></Button>
           </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto relative bg-[#fffef9] custom-scrollbar" style={{ backgroundImage: 'linear-gradient(#f0f0f0 1px, transparent 1px)', backgroundSize: '100% 30px' }}>
          {/* Days Header - Sticky */}
          <div className="flex border-b-2 border-[#d6d3cb] bg-[#fdfbf7] sticky top-0 z-30 shadow-sm min-w-max">
            {/* Corner Placeholder - Sticky Left */}
            <div className="w-16 border-r border-[#d6d3cb] bg-[#fdfbf7] sticky left-0 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"></div>
            {daysArray.map((day, idx) => (
              <div key={day} className="flex-1 text-center py-2 border-r border-dashed border-[#d6d3cb] last:border-r-0 min-w-[180px]">
                <div className="text-base font-bold text-[#2c2825]">{getDisplayDate(tripData.startDate, idx)}</div>
              </div>
            ))}
          </div>

          <div className="flex min-w-max" style={{ minHeight: '1440px' }}>
             {/* Time Column - Sticky Left */}
             <div className="w-16 flex-shrink-0 flex flex-col border-r-2 border-[#d6d3cb] bg-[#fdfbf7] sticky left-0 z-30 select-none shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
              {HOURS.map(hour => (
                <div key={hour} className="h-[60px] text-xs text-[#8c7b6c] text-right pr-2 relative -top-2 font-bold">{hour}:00</div>
              ))}
            </div>

            {daysArray.map(day => (
              <div key={day} className="flex-1 relative border-r border-dashed border-[#d6d3cb] last:border-r-0 min-w-[180px]">
                {HOURS.map(hour => (
                   <div key={hour} 
                        className={`h-[60px] border-b border-transparent hover:bg-[#8c7b6c]/5 transition-colors ${draggedEventId ? 'bg-[#f5f0e1]/50' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                        onDrop={(e) => handleDrop(e, day, hour)}
                        onClick={() => openModal(null, day, formatTimeFromHour(hour))}
                   />
                ))}
                
                {events.filter(ev => Number(ev.day) === day).map(ev => {
                  const startMins = timeToMinutes(ev.time);
                  const endMins = timeToMinutes(ev.endTime || minutesToTime(startMins + 60)); // Default to 1 hr duration if missing
                  
                  // If resizing this specific event, use the preview data
                  const isResizing = resizingEvent?.id === ev.id;
                  const displayEndMins = isResizing && resizePreview ? timeToMinutes(resizePreview.endTime) : endMins;
                  const durationMins = Math.max(15, displayEndMins - startMins); // Min 15 mins height
                  
                  // 1 minute = 1px height
                  const height = durationMins; 

                  return (
                    <div 
                      key={ev.id} 
                      draggable={!isResizing} // Disable drag while resizing
                      onDragStart={(e) => { setDraggedEventId(ev.id); e.target.style.opacity='0.5'; }} 
                      onDragEnd={(e) => { setDraggedEventId(null); e.target.style.opacity='1'; }}
                      onClick={(e) => { e.stopPropagation(); openModal(ev); }}
                      className={`absolute left-1 right-1 px-3 py-1 select-none overflow-hidden hover:z-20 group transition-shadow hover:shadow-md rounded-sm border-b-2 border-black/5 ${isResizing ? 'shadow-lg z-50 cursor-ns-resize' : 'cursor-move'}`}
                      style={{ 
                        top: `${startMins}px`, 
                        height: `${height}px`, 
                        ...getTagStyle(ev.tagId),
                        zIndex: isResizing ? 100 : 10
                      }}
                    >
                      <div className="flex justify-between items-start h-full relative">
                        <div className="flex-1 min-w-0">
                           <div className="font-bold text-xs truncate flex items-center gap-1">
                             <span className="opacity-75 font-mono">{ev.time}-{isResizing && resizePreview ? resizePreview.endTime : ev.endTime || minutesToTime(startMins + 60)}</span>
                           </div>
                           <div className="font-bold text-sm truncate leading-tight mt-0.5">{ev.name}</div>
                           {height > 40 && <div className="text-xs opacity-80 truncate mt-1">{ev.content?.split('\n')[0]}</div>}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id); }} className="opacity-0 group-hover:opacity-100 text-[#8a4a4a] hover:bg-[#8a4a4a]/10 p-0.5 rounded shrink-0"><Trash2 size={14}/></button>
                        
                        {/* Resize Handle */}
                        <div 
                          className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex justify-center items-end hover:bg-black/5"
                          onMouseDown={(e) => handleResizeStart(e, ev)}
                        >
                           <MoveVertical size={10} className="opacity-0 group-hover:opacity-50 text-current mb-0.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar: Links Collector */}
        <div className="w-80 bg-[#fdfbf7] border-l-2 border-[#d6d3cb] flex flex-col shadow-xl z-20">
          <div className="p-4 border-b border-[#d6d3cb] bg-[#f8f6f2]">
            <h3 className="font-bold text-[#2c2825] flex items-center gap-2">
              <LinkIcon size={18} /> 參考連結
            </h3>
            <p className="text-xs text-[#8c7b6c] mt-1">貼上住宿或景點網址，拖曳至行事曆排程。</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#f5f0e1]">
            {links.map(link => (
              <div 
                key={link.id}
                draggable
                onDragStart={(e) => { setDraggedLink(link); e.target.style.opacity='0.5'; }}
                onDragEnd={(e) => { setDraggedLink(null); e.target.style.opacity='1'; }}
                className="bg-white rounded-sm border border-[#d6d3cb] shadow-sm cursor-move hover:-translate-y-1 transition-transform group relative overflow-hidden"
              >
                 {link.image && <div className="h-24 w-full bg-gray-100 overflow-hidden border-b border-[#f0f0f0]"><img src={link.image} className="w-full h-full object-cover" /></div>}
                 <div className="p-3">
                   <div className="flex gap-2 items-start mb-1">
                     <GripVertical size={14} className="text-[#d6d3cb] mt-1 shrink-0" />
                     <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-[#2c2825] hover:text-[#8c7b6c] hover:underline line-clamp-2 leading-snug flex-1 block" onClick={e => e.stopPropagation()}>
                       {link.title} <ExternalLink size={10} className="inline ml-1 opacity-50"/>
                     </a>
                   </div>
                   {link.description && <p className="text-xs text-[#8c7b6c] line-clamp-2 pl-6">{link.description}</p>}
                 </div>
                 <button onClick={() => handleDeleteLink(link.id)} className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-[#8a4a4a] opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
              </div>
            ))}
            {links.length === 0 && (
              <div className="text-center text-[#d6d3cb] py-10 border-2 border-dashed border-[#e5e0d1] rounded-sm mx-4">
                <LinkIcon size={32} className="mx-auto mb-2 opacity-50"/>
                <p className="text-sm">尚未收藏任何網頁</p>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[#d6d3cb] bg-[#f8f6f2]">
            <form onSubmit={handleAddLink} className="flex flex-col gap-2">
              <input 
                className="bg-white border border-[#d6d3cb] rounded px-2 py-1.5 text-sm focus:border-[#8c7b6c] outline-none" 
                placeholder="顯示名稱 (選填)"
                value={linkTitle}
                onChange={e => setLinkTitle(e.target.value)}
              />
              <div className="flex gap-2">
                <input 
                  className="flex-1 bg-white border border-[#d6d3cb] rounded px-2 py-1.5 text-sm focus:border-[#8c7b6c] outline-none" 
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  disabled={isFetchingLink}
                />
                <Button type="submit" variant="primary" className="!px-3" disabled={isFetchingLink}>
                  {isFetchingLink ? <Loader size={16} className="animate-spin"/> : <Plus size={16}/>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#2c2825]/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-[#fdfbf7] rounded-md shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] border border-[#d6d3cb] relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#d4b06a] opacity-90 shadow-sm rotate-1"></div>
            
            <div className="px-6 py-5 border-b border-[#d6d3cb] flex justify-between items-center">
              <h3 className="font-bold text-xl text-[#2c2825]">{currentEvent ? '編輯筆記' : '寫新筆記'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#a8a49d] hover:text-[#2c2825]"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSaveEvent} className="p-6 overflow-y-auto space-y-5">
              <div><label className="block text-sm font-bold text-[#6e685e] mb-2">標題</label><Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="例如：喝咖啡" /></div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-[#6e685e] mb-2">日期</label>
                  <select className="w-full bg-transparent border-b-2 border-[#d6d3cb] px-2 py-2 font-serif outline-none focus:border-[#8c7b6c]" value={formData.day} onChange={e => setFormData({...formData, day: Number(e.target.value)})}>
                    {daysArray.map(d => <option key={d} value={d}>{getDisplayDate(tripData.startDate, d-1)}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-sm font-bold text-[#6e685e] mb-2">開始</label><Input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} /></div>
                  <div><label className="block text-sm font-bold text-[#6e685e] mb-2">結束</label><Input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} /></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-[#6e685e]">標籤分類</label>
                  <button type="button" onClick={() => setIsTagManagerOpen(true)} className="text-xs text-[#8c7b6c] underline hover:text-[#5c554b]">管理標籤</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tripData.tags.map(tag => {
                    const color = TAG_COLORS.find(c => c.id === tag.colorId) || TAG_COLORS[0];
                    const isSelected = formData.tagId === tag.id;
                    return (
                      <button key={tag.id} type="button" onClick={() => setFormData({...formData, tagId: tag.id})}
                        className={`px-3 py-1.5 rounded-sm text-sm border transition-all flex items-center gap-1 ${isSelected ? 'ring-2 ring-[#8c7b6c] ring-offset-1' : 'opacity-70 hover:opacity-100'}`}
                        style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}>
                        <Tag size={12}/> {tag.name}
                      </button>
                    )
                  })}
                  <button type="button" onClick={() => setIsTagManagerOpen(true)} className="px-3 py-1.5 rounded-sm text-sm border border-dashed border-[#d6d3cb] text-[#a8a49d] hover:border-[#8c7b6c] hover:text-[#8c7b6c]"><Plus size={14}/></button>
                </div>
              </div>

              {isTagManagerOpen && (
                <div className="bg-[#f0eadd] p-3 rounded-md border border-[#d6d3cb]">
                   <h4 className="text-xs font-bold text-[#6e685e] mb-2">新增自訂標籤</h4>
                   <div className="flex gap-2 mb-2">
                     <input className="flex-1 border border-[#d6d3cb] rounded px-2 text-sm" placeholder="標籤名稱" value={newTagData.name} onChange={e => setNewTagData({...newTagData, name: e.target.value})} />
                     <Button onClick={handleAddTag} className="!py-1 !px-2 text-xs">新增</Button>
                   </div>
                   <div className="flex gap-1">
                     {TAG_COLORS.map(color => (
                       <button key={color.id} type="button" onClick={() => setNewTagData({...newTagData, colorId: color.id})} className={`w-6 h-6 rounded-full border border-black/10 ${newTagData.colorId === color.id ? 'ring-2 ring-[#8c7b6c] ring-offset-1' : 'opacity-70 hover:opacity-100'}`} style={{ backgroundColor: color.bg }} title={color.name}></button>
                     ))}
                   </div>
                   <button type="button" onClick={() => setIsTagManagerOpen(false)} className="text-xs text-[#a8a49d] mt-2 underline w-full text-right">關閉</button>
                </div>
              )}

              <div><label className="block text-sm font-bold text-[#6e685e] mb-2">隨筆 / 備註</label><Textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} rows={3} placeholder="記下細節..." /></div>
              
              <div>
                  <label className="block text-sm font-bold text-[#6e685e] mb-2">照片與票根</label>
                  <label className="cursor-pointer bg-[#f5f0e1] hover:bg-[#e8e4d9] px-4 py-2 rounded-md text-sm inline-flex items-center gap-2 text-[#5c554b] transition-colors font-bold"><ImageIcon size={16}/> 夾入附件 <input type="file" hidden accept="image/*" onChange={handleImageUpload} /></label>
                  {formData.images.length > 0 && <div className="flex gap-3 mt-3 overflow-x-auto pb-2">{formData.images.map((src, i) => (<div key={i} className="relative w-16 h-16 shrink-0 bg-white p-1 shadow-sm border border-[#d6d3cb]"><img src={src} className="w-full h-full object-cover sepia-[.2]"/><button type="button" onClick={() => setFormData(p => ({...p, images: p.images.filter((_, idx) => idx !== i)}))} className="absolute -top-2 -right-2 bg-[#8a4a4a] text-white p-1 rounded-full"><X size={10}/></button></div>))}</div>}
              </div>

              <div className="flex justify-end gap-3 pt-2"><Button variant="secondary" onClick={() => setIsModalOpen(false)}>取消</Button><Button variant="primary" type="submit">寫入</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- App Root ---
export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedTripId, setSelectedTripId] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
      else await signInAnonymously(auth);
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  const navigateToPlanner = (tripId) => { setSelectedTripId(tripId); setCurrentView('planner'); };
  const navigateToDashboard = () => { setSelectedTripId(null); setCurrentView('dashboard'); };

  return (
    <div className="min-h-screen bg-[#f5f0e1] text-[#4a453e] font-serif selection:bg-[#d4b06a] selection:text-white">
      {!user ? <div className="h-screen flex items-center justify-center text-[#8c7b6c] animate-pulse">連線中...</div> : currentView === 'dashboard' ? <TripDashboard user={user} onSelectTrip={navigateToPlanner} /> : <TripPlanner user={user} tripId={selectedTripId} onBack={navigateToDashboard} />}
    </div>
  );
}