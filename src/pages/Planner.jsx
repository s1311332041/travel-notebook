import React, { useState, useEffect } from 'react';
import { 
  MapPin, Utensils, Bus, Plus, Trash2, X, 
  Calendar as CalendarIcon, Image as ImageIcon, 
  Cloud, ChevronLeft, Minus, 
  Tag, GripVertical, ExternalLink, Link as LinkIcon, Loader,
  MoveVertical
} from 'lucide-react';
import { 
  collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, query, orderBy, getDoc, arrayUnion
} from "firebase/firestore";
import { db, appId } from '../lib/firebase';
import { Button } from '../components/Button';
import { Input, Textarea } from '../components/Input';
import { 
  HOURS, timeToMinutes, minutesToTime, formatTimeFromHour, 
  getDisplayDate, TAG_COLORS, DEFAULT_TAGS 
} from '../lib/utils';

export default function Planner({ user, tripId, onBack }) {
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
  const [resizingEvent, setResizingEvent] = useState(null);
  const [resizePreview, setResizePreview] = useState(null);

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
      const event = events.find(ev => ev.id === draggedEventId);
      if (event) {
        const oldStartMins = timeToMinutes(event.time);
        const oldEndMins = timeToMinutes(event.endTime || minutesToTime(oldStartMins + 60));
        const durationMins = oldEndMins - oldStartMins;
        const newEndTimeStr = minutesToTime(newStartTimeMins + durationMins);

        setEvents(prev => prev.map(ev => ev.id === draggedEventId ? { ...ev, day: targetDay, time: newStartTimeStr, endTime: newEndTimeStr } : ev));
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'trips', tripId, 'events', draggedEventId), { 
          day: targetDay, time: newStartTimeStr, endTime: newEndTimeStr 
        });
      }
      setDraggedEventId(null);
    } else if (draggedLink) {
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
    e.stopPropagation();
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
}