import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Eye, EyeOff, Flag } from 'lucide-react';
import { PageHeader, Avatar } from '../components/ui';
import { statsApi } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const mockReviews = [
  { id: '1', user: { name: 'Rahul Sharma' }, barber: { name: 'Raja Kumar', salon: { name: 'Raja Barber Shop' } }, rating: 5, comment: 'Great fade, clean beard line. Will definitely come back! Best barber in Haldwani.', isPublished: true, createdAt: new Date().toISOString() },
  { id: '2', user: { name: 'Amit Singh' }, barber: { name: 'Gagan Sharma', salon: { name: 'Gents Galaxy Salon' } }, rating: 4, comment: 'Quick service, no waiting. Loved the experience.', isPublished: true, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', user: { name: 'Deepak Mehra' }, barber: { name: 'Mohan Verma', salon: { name: 'Modern Look Studio' } }, rating: 2, comment: 'Had to wait 45 minutes even with appointment. Not happy.', isPublished: true, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '4', user: { name: 'Vikas Tiwari' }, barber: { name: 'Raja Kumar', salon: { name: 'Raja Barber Shop' } }, rating: 5, comment: 'Brilliant work on my hair. Precise and professional.', isPublished: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '5', user: { name: 'Neha Rawat' }, barber: { name: 'Suresh Jat', salon: { name: 'Smart Cuts' } }, rating: 3, comment: 'Average experience. The place was clean but stylist was in a hurry.', isPublished: false, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={13}
          className={s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState(mockReviews);
  const [filter, setFilter] = useState<'ALL' | 'PUBLISHED' | 'HIDDEN'>('ALL');

  const filtered = reviews.filter((r) => {
    if (filter === 'PUBLISHED') return r.isPublished;
    if (filter === 'HIDDEN') return !r.isPublished;
    return true;
  });

  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  const togglePublish = async (id: string, current: boolean) => {
    try {
      await statsApi.moderateReview(id, !current);
      setReviews((prev) => prev.map((r) => r.id === id ? { ...r, isPublished: !current } : r));
      toast.success(current ? 'Review hidden' : 'Review published');
    } catch {
      // Update locally in dev mode
      setReviews((prev) => prev.map((r) => r.id === id ? { ...r, isPublished: !current } : r));
      toast.success(current ? 'Review hidden' : 'Review published');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Reviews" subtitle={`${reviews.length} total · avg ${avgRating.toFixed(1)}⭐`} />

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total reviews', value: reviews.length, color: 'text-gray-900' },
          { label: 'Average rating', value: `${avgRating.toFixed(1)} ⭐`, color: 'text-yellow-600' },
          { label: 'Published', value: reviews.filter((r) => r.isPublished).length, color: 'text-green-600' },
          { label: 'Hidden', value: reviews.filter((r) => !r.isPublished).length, color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['ALL', 'PUBLISHED', 'HIDDEN'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {f === 'ALL' ? 'All reviews' : f === 'PUBLISHED' ? 'Published' : 'Hidden'}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      <div className="space-y-3">
        {filtered.map((review) => (
          <div key={review.id} className={`card p-4 ${!review.isPublished ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Avatar name={review.user.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-900">{review.user.name}</span>
                    <StarRating rating={review.rating} />
                    {!review.isPublished && (
                      <span className="badge-gray text-xs">Hidden</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    {review.barber.name} @ {review.barber.salon.name} · {format(new Date(review.createdAt), 'd MMM, h:mm a')}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => togglePublish(review.id, review.isPublished)}
                  className={`p-1.5 rounded-lg transition-colors ${review.isPublished ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50' : 'text-green-500 hover:text-green-600 hover:bg-green-50'}`}
                  title={review.isPublished ? 'Hide review' : 'Publish review'}
                >
                  {review.isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button className="p-1.5 rounded-lg text-gray-300 hover:text-orange-500 hover:bg-orange-50 transition-colors" title="Flag review">
                  <Flag size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="card p-12 text-center">
            <Star size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No reviews in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
