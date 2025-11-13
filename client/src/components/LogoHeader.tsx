import React from 'react';
import { CarAnimation } from './CarAnimation';

export const LogoHeader: React.FC = () => {
  return (
    <div className="logo-header">
      <div className="logo-container">
        {/* Logo Image */}
        <img
          src={`/logo.webp?v=${import.meta.env.VITE_BUILD_VERSION || Date.now()}`}
          alt="Drift cash Logo"
          style={{
            width: '100%',
            height: 'auto',
            maxWidth: '400px',
            display: 'block',
            margin: '0 auto 20px auto'
          }}
        />

        <CarAnimation />
      </div>
    </div>
  );
};
