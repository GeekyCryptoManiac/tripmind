import type { FC } from 'react';

const HomePage: FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Welcome to TripMind
      </h1>
      <p className="text-gray-600">
        Your AI-powered travel planning assistant
      </p>
    </div>
  );
};

export default HomePage;