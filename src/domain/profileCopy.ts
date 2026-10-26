import { RULES } from "@/config/rules";
import { BUTTON_LABELS } from "./buttonLabels";
import type { Language, Skill } from "./workerProfile";

/*
 * The words on the forms Step 2 added: "What I can do", languages, the
 * introduction, the owner's details and the camera. On their own so only
 * the screens with these forms load them. Copy rules: AGENTS.md.
 */

export const SKILL_LABELS: Record<Skill, string> = {
  customer_service: "Serving customers",
  stock_and_packing: "Stock and packing",
  cleaning: "Cleaning",
  admin: "Admin and paperwork",
  car_washing: "Washing cars",
  food_service: "Food and drinks",
  stall_setup: "Setting up stalls",
  social_media: "Social media posts",
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  english: "English",
  afrikaans: "Afrikaans",
  isizulu: "isiZulu",
  isixhosa: "isiXhosa",
  isindebele: "isiNdebele",
  sepedi: "Sepedi",
  sesotho: "Sesotho",
  setswana: "Setswana",
  siswati: "siSwati",
  tshivenda: "Tshivenda",
  xitsonga: "Xitsonga",
  sasl: "South African Sign Language",
};

export const ABOUT_COPY = {
  title: "What you can do",
  skills: "What I can do",
  skillsHint: `Choose up to ${RULES.skillsMax}. Businesses see these when you apply.`,
  languages: "Languages I speak",
  languagesHint: "Choose every language you can work in.",
  intro: "Introduce yourself in one line (optional)",
  introHint: `Up to ${RULES.introMaxChars} characters, like what you're good at. Leave out your number and links: a business gets your number once it books you.`,
  surname: "Surname, as on your ID",
  surnameHint: "Kept private. Businesses only ever see your first name.",
} as const;

export const OWNER_FORM_COPY = {
  title: "About you, the owner",
  intro: "Young people you book see your first name, your photo and this number, so they know who to ask for. We keep the rest private.",
  legalName: "Your full name, as on your ID",
  idNumber: "Your ID number",
  idHint: "We check you're 18 or older. We keep only the last four digits and a scrambled code that cannot be turned back into your number.",
  phone: "Your cellphone number",
  phoneHint: "Young people you book can message you on WhatsApp at this number.",
  cipc: "CIPC registration number (optional)",
  cipcHint: "Like 2015/123456/07, if your business is registered.",
  photoTitle: "Your photo",
  photoLabel: "A photo of your face",
  photoHint: "Young people you book see it, so they know who to ask for.",
  pageTitle: "Your details as the owner",
  pageIntro: "Young people you book see your first name, your photo and your number. Nobody else does.",
  saved: "Your details are saved.",
} as const;

export const CAMERA_COPY = {
  open: BUTTON_LABELS.openTheCamera,
  opening: "Opening the camera",
  take: BUTTON_LABELS.takeThePhoto,
  close: "Close the camera",
  tips: ["Use a plain background", "Face the light", "No sunglasses or hat"],
  faceView: "Camera view. Fit your face inside the frame.",
  shopView: "Camera view. Fit your shopfront inside the frame.",
  unavailable: "This browser cannot open the camera here, so your phone's own camera opens instead.",
  fallback: BUTTON_LABELS.takeAPhoto,
} as const;

export const skillOptions = (skills: readonly Skill[]) => skills.map((value) => ({ value, label: SKILL_LABELS[value] }));
export const languageOptions = (languages: readonly Language[]) => languages.map((value) => ({ value, label: LANGUAGE_LABELS[value] }));
