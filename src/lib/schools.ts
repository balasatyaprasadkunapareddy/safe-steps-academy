export const LOCATIONS = [
  "Bhimavaram",
  "Narsapuram",
  "Eluru",
  "Razole",
  "Visakhapatnam",
  "Rajahmundry",
  "Kakinada",
  "Vijayawada",
  "Tanuku",
  "Palakollu",
] as const;

export type SchoolLocation = (typeof LOCATIONS)[number];

export const SCHOOLS = [
  "Sri Chaitanya School",
  "Abhyass School",
  "Delhi Public School (DPS)",
  "Aditya School",
  "Vishwakavi School",
  "ZPH High School",
  "Government High School",
  "Narayana School",
  "Bhashyam School",
  "Kendriya Vidyalaya",
  "Municipal High School",
] as const;

export type SchoolName = (typeof SCHOOLS)[number];

export const CLASSES = [
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
] as const;

export type ClassName = (typeof CLASSES)[number];

/**
 * Formats standard full school branch label: e.g. "Sri Chaitanya School - Bhimavaram"
 */
export function formatSchoolWithLocation(school: string, location: string): string {
  const cleanSchool = school.trim();
  const cleanLoc = location.trim();
  if (!cleanLoc) return cleanSchool;
  if (!cleanSchool) return cleanLoc;
  if (cleanSchool.toLowerCase().includes(cleanLoc.toLowerCase())) return cleanSchool;
  return `${cleanSchool} - ${cleanLoc}`;
}
