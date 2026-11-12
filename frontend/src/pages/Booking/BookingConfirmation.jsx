import React, { useState , useEffect } from 'react';

function BookingConfirmation() {
    const [confirmationData, setConfirmationData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const bookingId = new URLSearchParams(window.location.search).get('bookingId');
    const [event, setEvent] = useState(null);

    useEffect(() => {
        const fetchBookingConfirmation = async () => {
            try {
                const response = await fetch(`/api/bookings/${bookingId}/confirmation`);
                if (!response.ok) {
                    throw new Error('Failed to fetch booking confirmation');
                }
                const data = await response.json();
                setConfirmationData(data);
                setEvent(data.event);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBookingConfirmation();
    }, [bookingId]);
    if (loading) return <p>Loading confirmation...</p>;
    if (error) return <p className="text-red-500">{error}</p>;
    if (!confirmationData) return <p>No confirmation data available</p>;

    return (
        <div className="confirmation-page">
            <h1 className="text-2xl font-bold">Booking Confirmation</h1>
            <p className="mt-4">Thank you for your booking!</p>
            <p className="mt-2">Your booking ID is: <strong>{confirmationData._id}</strong></p>
            <p className="mt-2">Event: {event.title}</p>
            <p className="mt-2">Date: {new Date(event.date).toLocaleDateString()}</p>
            <p className="mt-2">Location: {event.location}</p>
            <p className="mt-2">Total Price: ${confirmationData.totalPrice.toFixed(2)}</p>
        </div>
    )
}
export default BookingConfirmation;