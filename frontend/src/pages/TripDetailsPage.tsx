import type { FC } from 'react';
import { useParams } from 'react-router-dom';

const TripDetailsPage: FC = () => {
  const { tripId } = useParams<{ tripId: string }>();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Trip Details
      </h1>
      <p className="text-gray-600">
        Viewing trip ID: {tripId}
      </p>
    </div>
  );
};

export default TripDetailsPage;