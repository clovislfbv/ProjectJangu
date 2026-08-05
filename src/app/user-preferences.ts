export const ENHANCED_EXPERIENCE_STORAGE_KEY = 'projectJanguHiddenLinksUnlocked';

export function hasEnhancedExperienceEnabled(): boolean {
    return typeof localStorage !== 'undefined' && localStorage.getItem(ENHANCED_EXPERIENCE_STORAGE_KEY) === 'true';
}