import React, { Suspense } from 'react';
import HomePage from '@/pages/HomePage';

const Home = () => (
  <Suspense fallback={null}>
    <HomePage />
  </Suspense>
);

export default Home;