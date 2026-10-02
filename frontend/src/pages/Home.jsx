import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Calendar, MapPin, Clock } from 'lucide-react';
import clsx from 'clsx';

const Home = () => {
  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchEventData();
  }, []);

  const fetchEventData = async () => {
    try {
      const eventsRes = await axios.get('http://localhost:5000/api/events');
      if (!eventsRes.data.events || eventsRes.data.events.length === 0) {
        throw new Error('No events found');
      }
      const firstEvent = eventsRes.data.events[0];
      setEvent(firstEvent);
      
      const seatsRes = await axios.get(`http://localhost:5000/api/events/${firstEvent.id}/seats`);
      setSeats(seatsRes.data.seats);
    } catch (err) {
      setError('Failed to load event data. Make sure backend is running and database is seeded.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSeatSelection = (seatId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(id => id !== seatId));
    } else {
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const handleBook = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (selectedSeats.length === 0) return;

    setError('');
    setSuccess('');
    setBookingLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/bookings', {
        eventId: event.id,
        seatIds: selectedSeats
      });
      
      setSuccess('Booking confirmed successfully!');
      setSelectedSeats([]);
      navigate(`/booking-confirmation/${res.data.booking.id}`);
      await fetchEventData(); 
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed. Someone might have booked the seat before you.');
      await fetchEventData(); 
      
      const latestSeats = (await axios.get(`http://localhost:5000/api/events/${event.id}/seats`)).data.seats;
      const bookedSeatIds = latestSeats.filter(s => s.status === 'BOOKED').map(s => s.id);
      setSelectedSeats(prev => prev.filter(id => !bookedSeatIds.includes(id)));
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading event...</div>;
  }

  if (!event) {
    return (
      <div className="text-center p-8 bg-red-50 rounded-lg text-red-600">
        <h2 className="text-xl font-bold mb-2">Event Not Found</h2>
        <p>{error}</p>
      </div>
    );
  }

  const selectedSeatNumbers = seats
    .filter(s => selectedSeats.includes(s.id))
    .map(s => s.seatNumber)
    .join(', ');

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      
      <div className="lg:w-1/3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.name}</h1>
          <p className="text-gray-600 mb-6">{event.description}</p>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center text-gray-700">
              <Calendar className="w-5 h-5 mr-3 text-indigo-500" />
              <span>{new Date(event.date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Clock className="w-5 h-5 mr-3 text-indigo-500" />
              <span>{event.time}</span>
            </div>
            <div className="flex items-center text-gray-700">
              <MapPin className="w-5 h-5 mr-3 text-indigo-500" />
              <span>{event.location}</span>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-lg mb-4">Your Selection</h3>
            
            {!user ? (
              <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-600 mb-4">
                Please <button onClick={() => navigate('/login')} className="text-indigo-600 font-medium hover:underline">login</button> to book seats.
              </div>
            ) : selectedSeats.length === 0 ? (
              <p className="text-gray-500 italic mb-6">No seats selected</p>
            ) : (
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-1">{selectedSeats.length} seat(s) selected:</p>
                <p className="font-medium text-gray-900">{selectedSeatNumbers}</p>
              </div>
            )}

            {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}
            {success && <div className="mb-4 text-sm text-green-600 bg-green-50 p-3 rounded-md">{success}</div>}

            <button 
              onClick={handleBook}
              disabled={selectedSeats.length === 0 || bookingLoading || !user}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {bookingLoading ? 'Booking...' : `Book ${selectedSeats.length} Ticket${selectedSeats.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>

      
      <div className="lg:w-2/3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Select Your Seats</h2>
            
            
            <div className="w-full max-w-lg mx-auto h-12 bg-gray-200 rounded-t-3xl flex items-center justify-center mb-12 shadow-inner">
              <span className="text-gray-500 font-medium tracking-widest uppercase">Stage</span>
            </div>

            
            <div className="flex justify-center gap-6 mb-8 text-sm font-medium">
              <div className="flex items-center"><div className="w-4 h-4 rounded-sm bg-green-100 border border-green-400 mr-2"></div> Available</div>
              <div className="flex items-center"><div className="w-4 h-4 rounded-sm bg-yellow-400 border border-yellow-500 mr-2"></div> Selected</div>
              <div className="flex items-center"><div className="w-4 h-4 rounded-sm bg-red-500 border border-red-600 mr-2 opacity-75 cursor-not-allowed"></div> Booked</div>
            </div>

            
            <div className="flex justify-center">
              <div className="grid grid-cols-10 gap-2 sm:gap-3">
                {seats.map((seat) => {
                  const isAvailable = seat.status === 'AVAILABLE';
                  const isSelected = selectedSeats.includes(seat.id);
                  const isBooked = seat.status === 'BOOKED';

                  return (
                    <button
                      key={seat.id}
                      disabled={!isAvailable}
                      onClick={() => toggleSeatSelection(seat.id)}
                      title={`Seat ${seat.seatNumber}`}
                      className={clsx(
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-t-lg rounded-b-sm flex items-center justify-center text-xs font-bold transition-all",
                        {
                          'bg-green-100 border-2 border-green-400 text-green-800 hover:bg-green-200 hover:border-green-500': isAvailable && !isSelected,
                          'bg-yellow-400 border-2 border-yellow-500 text-yellow-900 shadow-md transform -translate-y-1': isSelected,
                          'bg-red-500 border-2 border-red-600 text-white cursor-not-allowed opacity-75': isBooked
                        }
                      )}
                    >
                      {seat.seatNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
