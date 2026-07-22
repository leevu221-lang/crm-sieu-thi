import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Star, 
  Send, 
  Sparkles, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  ThumbsUp, 
  MessageCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Layout,
  Bug,
  HelpCircle,
  CornerDownRight,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { cn } from './RTST/utils';

export interface FeedbackItem {
  id?: string;
  username: string;
  ma_kho: string;
  rating: number;
  category: string;
  comment: string;
  created_at?: any;
}

export interface ReplyItem {
  id?: string;
  feedback_id: string;
  username: string;
  ma_kho: string;
  content: string;
  created_at?: any;
}

const CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: MessageSquare, color: 'text-slate-500 bg-slate-100' },
  { id: 'ui', label: 'Giao diện & Trải nghiệm', icon: Layout, color: 'text-indigo-600 bg-indigo-50 border border-indigo-100' },
  { id: 'feature', label: 'Tính năng mới', icon: Sparkles, color: 'text-emerald-600 bg-emerald-50 border border-emerald-100' },
  { id: 'bug', label: 'Báo lỗi / Sự cố', icon: Bug, color: 'text-rose-600 bg-rose-50 border border-rose-100' },
  { id: 'other', label: 'Ý kiến đóng góp khác', icon: HelpCircle, color: 'text-amber-600 bg-amber-50 border border-amber-100' },
];

export default function FeedbackPage() {
  const { userProfile } = useAuth();
  
  // Form states
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [category, setCategory] = useState('ui');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Feed states
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [replies, setReplies] = useState<ReplyItem[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Replies states
  const [expandedFeedbackIds, setExpandedFeedbackIds] = useState<string[]>([]);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [submittingReplies, setSubmittingReplies] = useState<Record<string, boolean>>({});

  // Fetch feedbacks & replies
  const fetchFeedbacksAndReplies = async () => {
    setIsLoadingFeed(true);
    try {
      // 1. Fetch feedbacks
      const { data: feedbacksData, error: feedbacksError } = await supabase
        .from('website_feedbacks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (feedbacksError) throw feedbacksError;
      setFeedbacks(feedbacksData || []);

      // 2. Fetch replies
      const { data: repliesData, error: repliesError } = await supabase
        .from('website_feedback_replies')
        .select('*')
        .order('created_at', { ascending: true });

      if (repliesError) {
        console.warn('[FeedbackPage] Error loading replies, they might not exist yet:', repliesError);
      } else {
        setReplies(repliesData || []);
      }
    } catch (err) {
      console.error('[FeedbackPage] Fetch error:', err);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  useEffect(() => {
    fetchFeedbacksAndReplies();
  }, []);

  // Handle submit new feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    if (!comment.trim()) {
      setErrorMsg('Vui lòng nhập nội dung góp ý của bạn.');
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg('');
    
    try {
      const payload = {
        username: userProfile.username,
        ma_kho: userProfile.ma_kho || 'N/A',
        rating,
        category,
        comment: comment.trim(),
      };

      const { error } = await supabase.from('website_feedbacks').insert(payload);
      if (error) throw error;

      setShowSuccess(true);
      setComment('');
      setRating(5);
      // Reload feed
      fetchFeedbacksAndReplies();
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err: any) {
      console.error('[FeedbackPage] Submit error:', err);
      setErrorMsg(err.message || 'Có lỗi xảy ra khi gửi góp ý. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit reply to a feedback
  const handleSendReply = async (feedbackId: string) => {
    if (!userProfile) return;
    const text = replyInputs[feedbackId]?.trim();
    if (!text) return;

    setSubmittingReplies(prev => ({ ...prev, [feedbackId]: true }));
    try {
      const payload = {
        feedback_id: feedbackId,
        username: userProfile.username,
        ma_kho: userProfile.ma_kho || 'N/A',
        content: text
      };

      const { error } = await supabase.from('website_feedback_replies').insert(payload);
      if (error) throw error;

      // Clear input
      setReplyInputs(prev => ({ ...prev, [feedbackId]: '' }));
      // Reload feed to get new reply
      await fetchFeedbacksAndReplies();
      // Ensure replies view remains open
      if (!expandedFeedbackIds.includes(feedbackId)) {
        setExpandedFeedbackIds(prev => [...prev, feedbackId]);
      }
    } catch (err) {
      console.error('[FeedbackPage] Submit reply error:', err);
    } finally {
      setSubmittingReplies(prev => ({ ...prev, [feedbackId]: false }));
    }
  };

  const toggleRepliesView = (feedbackId: string) => {
    setExpandedFeedbackIds(prev => 
      prev.includes(feedbackId) ? prev.filter(id => id !== feedbackId) : [...prev, feedbackId]
    );
  };

  // Helper formatting dates
  const formatRelativeTime = (timestamp: any) => {
    if (!timestamp) return 'Vừa xong';
    
    let date: Date;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      return 'Vừa xong';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 30) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Filter logic
  const filteredFeedbacks = feedbacks.filter(fb => {
    const matchesCat = activeFilter === 'all' || fb.category === activeFilter;
    const matchesSearch = !searchQuery || 
      fb.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fb.ma_kho.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fb.comment.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Calculate summary metrics
  const totalCount = feedbacks.length;
  const avgRating = totalCount > 0 
    ? (feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / totalCount).toFixed(1) 
    : '5.0';

  const categoryStats = React.useMemo(() => {
    const stats: Record<string, number> = { ui: 0, feature: 0, bug: 0, other: 0 };
    feedbacks.forEach(fb => {
      if (stats[fb.category] !== undefined) {
        stats[fb.category]++;
      }
    });
    return stats;
  }, [feedbacks]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 min-h-screen">
      
      {/* Premium Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider shadow-sm animate-pulse">
          <Sparkles size={12} />
          <span>Website Premium Feedback</span>
        </div>
        <h1 className="text-[34px] font-black text-slate-800 tracking-tight leading-none uppercase">
          Góp ý & Nhận xét
        </h1>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          Ý kiến của bạn là động lực để chúng tôi nâng cấp hệ thống ngày một tốt hơn. Hãy để lại đánh giá của bạn nhé!
        </p>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rating score */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden flex items-center justify-between">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Điểm Đánh Giá TB</span>
            <div className="flex items-baseline gap-2">
              <span className="text-[44px] font-black leading-none">{avgRating}</span>
              <span className="text-lg font-black text-indigo-150">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1 text-amber-300">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star 
                  key={s} 
                  size={14} 
                  fill={s <= Math.round(Number(avgRating)) ? "currentColor" : "none"} 
                  className={s <= Math.round(Number(avgRating)) ? "fill-amber-300" : "text-white/25"}
                />
              ))}
            </div>
          </div>
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-4xl shadow-inner shadow-white/10">
            ⭐
          </div>
        </div>

        {/* Total Feedbacks */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tổng Số Lượt Góp Ý</span>
            <h2 className="text-[40px] font-black text-slate-800 leading-none">{totalCount}</h2>
            <p className="text-xs text-slate-500 font-medium">Lượt bình luận đóng góp từ siêu thị</p>
          </div>
          <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
            <Users size={28} />
          </div>
        </div>

        {/* Stats categories breakdown */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.03)] space-y-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phân loại góp ý</span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-indigo-50/50 p-2.5 rounded-2xl flex justify-between items-center border border-indigo-50">
              <span className="font-extrabold text-indigo-700">UI/UX:</span>
              <span className="font-black text-slate-800">{categoryStats.ui}</span>
            </div>
            <div className="bg-emerald-50/50 p-2.5 rounded-2xl flex justify-between items-center border border-emerald-50">
              <span className="font-extrabold text-emerald-700">Tính năng:</span>
              <span className="font-black text-slate-800">{categoryStats.feature}</span>
            </div>
            <div className="bg-rose-50/50 p-2.5 rounded-2xl flex justify-between items-center border border-rose-50">
              <span className="font-extrabold text-rose-700">Báo lỗi:</span>
              <span className="font-black text-slate-800">{categoryStats.bug}</span>
            </div>
            <div className="bg-amber-50/50 p-2.5 rounded-2xl flex justify-between items-center border border-amber-50">
              <span className="font-extrabold text-amber-700">Ý kiến khác:</span>
              <span className="font-black text-slate-800">{categoryStats.other}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Left, Feed Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Form: Rating & Comments */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.03)] space-y-6 relative overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <MessageSquare size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">Đánh giá & Đóng góp</h2>
                <p className="text-xs text-slate-400 font-medium">Bày tỏ trải nghiệm của bạn</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Star Rating Select */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Mức độ hài lòng</label>
                <div className="flex items-center gap-3 py-2 bg-slate-50 rounded-2xl px-4 border border-slate-100/50 justify-center">
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isLit = hoveredRating !== null 
                      ? starValue <= hoveredRating 
                      : starValue <= rating;
                    return (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => setRating(starValue)}
                        onMouseEnter={() => setHoveredRating(starValue)}
                        onMouseLeave={() => setHoveredRating(null)}
                        className="transition-transform duration-150 hover:scale-125 focus:outline-none"
                      >
                        <Star 
                          size={32}
                          className={cn(
                            "transition-colors duration-200",
                            isLit 
                              ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" 
                              : "text-slate-350 fill-none"
                          )}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-black text-slate-600 ml-2 w-20 text-center uppercase tracking-wide">
                    {rating === 5 ? 'Tuyệt vời 😍' :
                     rating === 4 ? 'Tốt lắm 😊' :
                     rating === 3 ? 'Bình thường 😐' :
                     rating === 2 ? 'Tệ hại 😞' : 'Quá tệ 😡'}
                  </span>
                </div>
              </div>

              {/* Feedback Category */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Loại đóng góp</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {CATEGORIES.slice(1).map((cat) => {
                    const isSelected = category === cat.id;
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-2xl text-left transition-all duration-300 font-extrabold text-[11px] border",
                          isSelected
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 scale-[1.02]"
                            : "bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50"
                        )}
                      >
                        <Icon size={14} className={isSelected ? 'text-white' : 'text-slate-400'} />
                        <span className="leading-tight">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Comments */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Ý kiến chi tiết</label>
                  <span className="text-[10px] font-bold text-slate-400">{comment.length} ký tự</span>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Nhập những góp ý xây dựng, cảm xúc trải nghiệm hoặc lỗi bạn gặp phải..."
                  maxLength={1000}
                  className="w-full p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none min-h-[120px]"
                />
              </div>

              {/* Error warning message */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-semibold"
                  >
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success Alert */}
              <AnimatePresence>
                {showSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-2.5 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-xs font-extrabold"
                  >
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span>Cảm ơn bạn! Đóng góp ý kiến của bạn đã được ghi nhận vào hệ thống.</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-indigo-150 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={14} />
                    <span>Gửi góp ý website</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Feed: List of Feedbacks */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.03)] space-y-6">
            
            {/* Header & Search */}
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <MessageCircle size={16} />
                  </div>
                  <h2 className="text-md font-black text-slate-800 uppercase tracking-wide">Nhật ký đóng góp</h2>
                </div>
                <span className="text-[10px] font-black px-2 py-1 bg-slate-100 rounded-lg text-slate-600">
                  {filteredFeedbacks.length} bình luận
                </span>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
                {CATEGORIES.map((cat) => {
                  const isActive = activeFilter === cat.id;
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveFilter(cat.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all duration-300 whitespace-nowrap border",
                        isActive
                          ? "bg-slate-800 border-slate-800 text-white scale-[1.02]"
                          : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100 hover:border-slate-200"
                      )}
                    >
                      <Icon size={12} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Text Search Input */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên user, siêu thị hoặc nội dung góp ý..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all"
              />
            </div>

            {/* List Feedbacks Container */}
            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
              {isLoadingFeed ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Đang tải nhật ký...</p>
                </div>
              ) : filteredFeedbacks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 border border-dashed border-slate-200 rounded-[24px] bg-slate-50/50">
                  <div className="text-3xl">💬</div>
                  <h3 className="text-sm font-black text-slate-700">Chưa tìm thấy góp ý nào</h3>
                  <p className="text-xs text-slate-400 font-medium max-w-xs">
                    Hãy là người đầu tiên đóng góp nhận xét cho website ở form bên cạnh nhé!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFeedbacks.map((fb, idx) => {
                    const feedbackId = fb.id || `fb-${idx}`;
                    const catObj = CATEGORIES.find(c => c.id === fb.category) || CATEGORIES[4];
                    const initials = fb.username.slice(0, 2).toUpperCase();
                    
                    // Simple deterministic color generation for avatar
                    const colors = [
                      'from-pink-500 to-rose-500', 
                      'from-purple-500 to-indigo-500', 
                      'from-blue-500 to-sky-500', 
                      'from-emerald-500 to-teal-500',
                      'from-amber-500 to-orange-500'
                    ];
                    const colorIndex = Math.abs(fb.username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % colors.length;
                    const avatarColor = colors[colorIndex];

                    // Find replies for this feedback
                    const feedbackReplies = replies.filter(r => r.feedback_id === feedbackId);
                    const hasReplies = feedbackReplies.length > 0;
                    const isExpanded = expandedFeedbackIds.includes(feedbackId);

                    return (
                      <div 
                        key={feedbackId}
                        className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 space-y-4 relative group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xs font-black shadow-md shadow-slate-150", avatarColor)}>
                              {initials}
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                                {fb.username}
                              </h3>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black tracking-wide uppercase">
                                <span>Kho: {fb.ma_kho}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />
                                  {formatRelativeTime(fb.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Star Display & Category Badge */}
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider", catObj.color)}>
                              {catObj.label}
                            </span>
                            <div className="flex items-center gap-0.5 text-amber-400">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star 
                                  key={s} 
                                  size={11} 
                                  fill={s <= fb.rating ? "currentColor" : "none"} 
                                  className={s <= fb.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Comment Content */}
                        <div className="text-xs text-slate-650 leading-relaxed font-medium bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          {fb.comment}
                        </div>

                        {/* Actions block: Reply trigger */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-500">
                          <button
                            onClick={() => toggleRepliesView(feedbackId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                          >
                            <MessageCircle size={14} className="text-slate-400" />
                            <span>
                              {feedbackReplies.length > 0 ? `${feedbackReplies.length} phản hồi` : 'Phản hồi / Bình luận'}
                            </span>
                          </button>
                        </div>

                        {/* Expanded Replies section */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden space-y-3 pl-3 border-l-2 border-slate-200 mt-2"
                            >
                              {/* Replies feed */}
                              {hasReplies && (
                                <div className="space-y-2 mt-2">
                                  {feedbackReplies.map((rep, rIdx) => {
                                    const repInitials = rep.username.slice(0, 2).toUpperCase();
                                    const repColorIndex = Math.abs(rep.username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % colors.length;
                                    const repAvatarColor = colors[repColorIndex];
                                    const isAdminRep = rep.username.toUpperCase() === 'ADMIN' || rep.username === '43751';

                                    return (
                                      <div key={rep.id || rIdx} className="bg-slate-50/55 p-3 rounded-xl border border-slate-100 space-y-1.5 relative">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <div className={cn("w-6 h-6 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-[8px] font-black", repAvatarColor)}>
                                              {repInitials}
                                            </div>
                                            <div>
                                              <span className="text-xs font-black text-slate-700 uppercase tracking-tight flex items-center gap-1">
                                                {rep.username}
                                                {isAdminRep && (
                                                  <span className="inline-flex items-center gap-0.5 bg-indigo-150 text-indigo-700 px-1 rounded font-black text-[8px]">
                                                    <ShieldCheck size={8} />
                                                    ADMIN
                                                  </span>
                                                )}
                                              </span>
                                              <div className="flex items-center gap-1.5 text-[8px] text-slate-400 font-bold uppercase">
                                                <span>Kho: {rep.ma_kho}</span>
                                                <span>•</span>
                                                <span>{formatRelativeTime(rep.created_at)}</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        <p className="text-[11px] font-medium text-slate-650 pl-8">
                                          {rep.content}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Quick Reply Form */}
                              <div className="flex gap-2 items-center mt-3 pt-2 border-t border-slate-100/60">
                                <input
                                  type="text"
                                  value={replyInputs[feedbackId] || ''}
                                  onChange={(e) => setReplyInputs(prev => ({ ...prev, [feedbackId]: e.target.value }))}
                                  placeholder="Viết phản hồi của bạn..."
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSendReply(feedbackId);
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all placeholder-slate-400"
                                />
                                <button
                                  onClick={() => handleSendReply(feedbackId)}
                                  disabled={submittingReplies[feedbackId] || !replyInputs[feedbackId]?.trim()}
                                  className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                >
                                  {submittingReplies[feedbackId] ? (
                                    <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Send size={12} />
                                  )}
                                </button>
                              </div>

                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
