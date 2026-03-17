import { generateWorkout } from "./flows/generateWorkout";

// Workout generation
export { generateWorkout };

// Auth triggers
export { onUserCreated } from "./auth/onUserCreated";

// Image sync triggers
export { onMasterImageCertified } from "./images/onMasterImageCertified";
export { onMasterImageDeleted } from "./images/onMasterImageDeleted";
