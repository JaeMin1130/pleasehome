import React from 'react';
import { Complex } from '@/types';
import styles from './ComplexCard.module.css';

interface ComplexCardProps {
  complex: Complex;
  isActive: boolean;
  onClick: () => void;
}

export default function ComplexCard({ 
  complex, 
  isActive, 
  onClick 
}: ComplexCardProps) {
  return (
    <div 
      className={`${styles['complex-card']} ${isActive ? styles.active : ''}`}
      onClick={onClick}
    >
      <div className={styles['card-top-row']}>
        <span className={styles['complex-name']}>{complex.name}</span>
      </div>
      <span className={styles['complex-address']}>
        <svg 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        {complex.address}
      </span>
    </div>
  );
}

