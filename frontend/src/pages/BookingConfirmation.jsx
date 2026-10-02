import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Calendar, MapPin, Clock } from 'lucide-react';

const BookingConfirmation = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/bookings/${id}`);
        setBooking(res.data.booking);
      } catch (err) {
        setError('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading confirmation...</div>;
  }

  if (error || !booking) {
    return (
      <div className="text-center p-8 bg-red-50 rounded-lg text-red-600 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p>{error}</p>
        <Link to="/" className="text-indigo-600 underline mt-4 inline-block">Return Home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
        <p className="text-gray-600 mb-8">Your reservation has been successfully processed.</p>
        
        <div className="bg-gray-50 rounded-lg p-6 text-left border border-gray-100">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
            <span className="text-sm text-gray-500 font-medium">Booking ID:</span>
            <span className="font-mono font-bold text-indigo-700">#{booking.id}</span>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-4">{booking.event.name}</h3>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center text-gray-700">
              <Calendar className="w-5 h-5 mr-3 text-indigo-500" />
              <span>{new Date(booking.event.date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Clock className="w-5 h-5 mr-3 text-indigo-500" />
              <span>{booking.event.time}</span>
            </div>
            <div className="flex items-center text-gray-700">
              <MapPin className="w-5 h-5 mr-3 text-indigo-500" />
              <span>{booking.event.location}</span>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500 mb-2">Selected Seats:</p>
            <div className="flex flex-wrap gap-2">
              {booking.bookingSeats.map(bs => (
                <span key={bs.id} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-md font-bold">
                  {bs.seatNumber}
                </span>
              ))}
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4 mt-4 flex justify-between items-center text-sm">
            <span className="text-gray-500">Status:</span>
            <span className={`px-2 py-1 rounded font-bold ${booking.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {booking.status}
            </span>
          </div>
          <div className="mt-2 flex justify-between items-center text-sm">
            <span className="text-gray-500">Booked At:</span>
            <span className="text-gray-800 font-medium">{new Date(booking.createdAt).toLocaleString()}</span>
          </div>
        </div>
        
        <div className="mt-8 flex gap-4 justify-center">
          <Link to="/my-bookings" className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors">
            View My Bookings
          </Link>
          <Link to="/" className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
