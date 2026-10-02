import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, MapPin, Clock, XCircle } from 'lucide-react';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/bookings');
      setBookings(res.data.bookings);
    } catch (err) {
      setError('Failed to fetch your bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }

    setCancelLoading(bookingId);
    try {
      await axios.post(`http://localhost:5000/api/bookings/${bookingId}/cancel`);
      await fetchBookings(); 
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelLoading(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20">Loading your bookings...</div>;
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-red-50 rounded-lg text-red-600 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Bookings</h1>
      
      {bookings.length === 0 ? (
        <div className="bg-white p-10 rounded-xl shadow-sm text-center border border-gray-100">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No bookings yet</h3>
          <p className="text-gray-500">You haven't made any seat reservations yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => (
            <div key={booking.id} className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col md:flex-row gap-6 ${booking.status === 'CANCELLED' ? 'border-gray-200 bg-gray-50 opacity-75' : 'border-indigo-100'}`}>
              <div className="flex-grow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{booking.event.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${booking.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {booking.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{new Date(booking.event.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{booking.event.time}</span>
                  </div>
                  <div className="flex items-center md:col-span-2">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{booking.event.location}</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-2">Seats ({booking.bookingSeats.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {booking.bookingSeats.map(bs => (
                      <span key={bs.id} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-medium text-sm">
                        {bs.seatNumber}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col justify-end md:w-48 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                <p className="text-xs text-gray-400 mb-4 text-center md:text-left">
                  Booked on {new Date(booking.createdAt).toLocaleDateString()}
                </p>
                
                {booking.status === 'ACTIVE' && (
                  <button 
                    onClick={() => handleCancel(booking.id)}
                    disabled={cancelLoading === booking.id}
                    className="flex items-center justify-center w-full py-2 px-4 border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {cancelLoading === booking.id ? 'Canceling...' : 'Cancel Booking'}
                  </button>
                )}
                
                {booking.status === 'CANCELLED' && booking.cancelledAt && (
                  <p className="text-xs text-red-500 text-center md:text-left font-medium">
                    Cancelled on {new Date(booking.cancelledAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
