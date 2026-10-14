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
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
] as const;

export type ClassName = (typeof CLASSES)[number];

export const SECTIONS = [
  "Section A",
  "Section B",
  "Section C",
  "Section D",
  "Section E",
] as const;

export type SectionName = (typeof SECTIONS)[number];

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

/**
 * Formats class and section: e.g. "Class 10 - Section A"
 */
export function formatClassWithSection(className: string, section?: string): string {
  const cleanClass = className.trim();
  const cleanSec = (section ?? "").trim();
  if (!cleanSec || cleanSec.toLowerCase() === "all sections" || cleanSec.toLowerCase() === "all") {
    return cleanClass;
  }
  if (!cleanClass || cleanClass.toLowerCase() === "all classes") {
    return cleanClass;
  }
  if (cleanClass.toLowerCase().includes(cleanSec.toLowerCase())) {
    return cleanClass;
  }
  return `${cleanClass} - ${cleanSec}`;
}

/**
 * Parses a combined class string into class and section
 */
export function parseClassAndSection(combined?: string | null): { className: string; section: string } {
  if (!combined) return { className: CLASSES[5], section: SECTIONS[0] };
  const clean = combined.trim();
  const parts = clean.split(/\s*-\s*/);
  const baseClass = parts[0]?.trim() || CLASSES[5];
  const secPart = parts[1]?.trim() || "";

  const matchedClass = CLASSES.find((c) => c.toLowerCase() === baseClass.toLowerCase()) || baseClass;
  const matchedSec =
    SECTIONS.find(
      (s) =>
        s.toLowerCase() === secPart.toLowerCase() ||
        s.toLowerCase().endsWith(secPart.toLowerCase()) ||
        secPart.toLowerCase().endsWith(s.toLowerCase().replace("section ", "")),
    ) || SECTIONS[0];

  return { className: matchedClass, section: secPart ? matchedSec : SECTIONS[0] };
}

/**
 * Displays class label cleanly without duplicate "Class Class"
 */
export function formatClassDisplay(className?: string | null): string {
  if (!className) return "";
  const clean = className.trim();
  if (!clean) return "";
  if (/^class\b/i.test(clean)) return clean;
  return `Class ${clean}`;
}

/**
 * Matches a student's class and section against teacher/filter scope
 */
export function matchClassAndSection(
  studentClassRaw?: string | null,
  filterClassRaw?: string | null,
): boolean {
  if (!filterClassRaw) return true;
  const filter = filterClassRaw.trim().toLowerCase();
  if (!filter || filter === "all classes" || filter === "all") return true;

  if (!studentClassRaw) return false;
  const student = studentClassRaw.trim().toLowerCase();
  if (student === filter) return true;

  const [filterBase, filterSec] = filter.split(/\s*-\s*/).map((s) => s.trim());
  const [studentBase, studentSec] = student.split(/\s*-\s*/).map((s) => s.trim());

  const norm = (s: string) => (s || "").replace(/^class\s+/i, "").replace(/^section\s+/i, "");

  const baseMatches = norm(filterBase || "") === norm(studentBase || "");
  if (!baseMatches) return false;

  // If filter specifies no section or "all sections", any section of this base class matches
  if (!filterSec || filterSec.includes("all")) return true;

  // If filter specifies a section, student section must match
  if (!studentSec) return false;
  return norm(filterSec || "") === norm(studentSec || "");
}
