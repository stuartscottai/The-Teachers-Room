import React from 'react';
import { Star } from 'lucide-react';
import { PlayfulTitleAccent } from './PlayfulTitleAccent';

/** Shared illustrated heading for the classroom-paper pages. */
export const PlayfulHeading: React.FC<{
  title: React.ReactNode;
  description?: React.ReactNode;
  icon: React.ReactNode;
  centered?: boolean;
}> = ({ title, description, icon, centered = false }) => (
  <header className={`playful-page-heading${centered ? ' playful-page-heading-centered' : ''}`}>
    <div className="playful-heading-icon" aria-hidden="true">{icon}<Star className="playful-heading-star" size={22} fill="currentColor" /></div>
    <div className="min-w-0">
      <h1><PlayfulTitleAccent>{title}</PlayfulTitleAccent></h1>
      {description && <p className="playful-heading-description">{description}</p>}
    </div>
  </header>
);
