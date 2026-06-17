import React from 'react';
import { Complex } from '@/types';
import styles from './ComplexCard.module.css';

interface ComplexCardProps {
  complex: Complex;
  isActive: boolean;
  onClick: () => void;
}

export default function ComplexCard({ complex, isActive, onClick }: ComplexCardProps) {
  return (
    <div 
      className={`${styles['complex-card']} ${isActive ? styles.active : ''}`}
      onClick={onClick}
    >
      <span className={styles['complex-name']}>{complex.name}</span>
      <span className={styles['complex-address']}>📍 {complex.address}</span>
    </div>
  );
}
