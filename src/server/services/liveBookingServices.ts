import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { firebasePhotoStore } from "../repositories/firebasePhotoStore";
import { firestoreBookingRepository } from "../repositories/firestoreBookingRepository";
import { firestoreOfferRepository } from "../repositories/firestoreOfferRepository";
import { firestoreProfileRepository } from "../repositories/firestoreProfileRepository";
import { createBookingService, type BookingService } from "./bookingService";
import { createOfferService, type OfferService } from "./offerService";

/** A 6-digit code (000000 to 999999) and a 144-bit token, from the operating system's secure random source. */
const newSecrets = () => ({ checkInCode: String(randomInt(0, 1_000_000)).padStart(6, "0"), shareToken: randomBytes(18).toString("base64url") });

/** The offer and booking services wired to Firestore and Storage. Routes use these; tests use fakes. */
export function liveOfferService(): OfferService {
  return createOfferService({ offers: firestoreOfferRepository, profiles: firestoreProfileRepository, newSecrets, now: () => new Date() });
}

export function liveBookingService(): BookingService {
  return createBookingService({ bookings: firestoreBookingRepository, photos: firebasePhotoStore, now: () => new Date() });
}
